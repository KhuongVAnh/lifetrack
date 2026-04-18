/*
Tác dụng:
- Kiểm thử độ khớp beat-level inference của Node so với baseline Python.

Vấn đề file này giải quyết:
- Cần biết model CNN trên Node có dự đoán gần với baseline Python hay không khi đầu vào segment đã được cắt đúng sẵn.
- Cách làm: lấy `segment_start/segment_end` từ baseline, dựng lại segment trên cùng slice ECG, gọi `predictBeatSegmentsForTest`, rồi so label/confidence với baseline.

Cách chạy:
- Từ thư mục `server`, chạy: `node services/ecgCnnBaselineTestService.js`

Function chính:
- loadEnvForTest: nạp env cho phiên test.
- buildAllSignalFromReadings: ghép readings thành một tín hiệu dài.
- buildSegmentsFromBaseline: dựng lại các segment từ baseline Python.
- calculateMetrics: tính accuracy và confidence MAE so với baseline.
- runBaselineAccuracyTest: chạy toàn bộ bài test beat-level parity.
*/

const fs = require("fs")
const path = require("path")
const dotenv = require("dotenv")
const { initModel, predictBeatSegmentsForTest } = require("./ecgCnnService")

const SERVER_ROOT = path.resolve(__dirname, "..")
const PROJECT_ROOT = path.resolve(SERVER_ROOT, "..")

// Nạp biến môi trường theo thứ tự ưu tiên giống backend: server/.env trước, root .env sau.
const loadEnvForTest = () => {
  dotenv.config({ path: path.resolve(SERVER_ROOT, ".env") })
  dotenv.config({ path: path.resolve(PROJECT_ROOT, ".env"), override: false })
}

// Đọc file JSON từ ổ đĩa và trả về object đã parse.
const readJsonFile = (filePath) => {
  const raw = fs.readFileSync(filePath, "utf8")
  return JSON.parse(raw)
}

// Resolve đường dẫn tuyệt đối từ env path hoặc fallback tương đối trong server.
const resolveServerPath = (envValue, fallbackRelative) => {
  const value = String(envValue || fallbackRelative || "").trim()
  return path.isAbsolute(value) ? value : path.resolve(SERVER_ROOT, value)
}

// Chuyển một giá trị bất kỳ về mảng số hợp lệ để phục vụ dựng tín hiệu ECG.
const toNumberArray = (value) => {
  if (!Array.isArray(value)) return []
  return value.map((item) => Number(item)).filter(Number.isFinite)
}

// Ghép tất cả reading thành một tín hiệu dài theo đúng pipeline baseline trước đó.
const buildAllSignalFromReadings = (readingsData) => {
  if (!Array.isArray(readingsData)) return []
  const chunks = readingsData
    .map((record) => toNumberArray(record?.reading))
    .filter((reading) => reading.length > 0)
  return chunks.length > 0 ? chunks.flat() : []
}

// Dựng các segment từ baseline (segment_start/segment_end) trên tín hiệu đã cắt.
const buildSegmentsFromBaseline = (slicedSignal, baselineRows) => {
  const validRows = []
  const segments = []

  for (const row of baselineRows) {
    const start = Number(row?.segment_start)
    const end = Number(row?.segment_end)
    if (!Number.isInteger(start) || !Number.isInteger(end)) continue
    if (start < 0 || end > slicedSignal.length || end <= start) continue

    const segment = slicedSignal.slice(start, end)
    if (segment.length !== end - start) continue

    segments.push(segment)
    validRows.push(row)
  }

  return { validRows, segments }
}

// Tính độ chính xác nhãn dự đoán so với baseline và thống kê confidence sai lệch.
const calculateMetrics = (baselineRows, predictions) => {
  const total = Math.min(baselineRows.length, predictions.length)
  let matched = 0
  let confidenceAbsErrorSum = 0
  const mismatches = []

  for (let i = 0; i < total; i += 1) {
    const expected = baselineRows[i]
    const actual = predictions[i]
    const expectedLabel = String(expected?.label || "")
    const predictedLabel = String(actual?.label_code || "")

    if (expectedLabel === predictedLabel) {
      matched += 1
    } else if (mismatches.length < 20) {
      mismatches.push({
        beat_index: expected?.beat_index,
        expected_label: expectedLabel,
        predicted_label: predictedLabel,
      })
    }

    const expectedConf = Number(expected?.confidence)
    const predictedConf = Number(actual?.confidence)
    if (Number.isFinite(expectedConf) && Number.isFinite(predictedConf)) {
      confidenceAbsErrorSum += Math.abs(expectedConf - predictedConf)
    }
  }

  const accuracyPercent = total > 0 ? Number(((matched / total) * 100).toFixed(2)) : 0
  const confidenceMae = total > 0 ? Number((confidenceAbsErrorSum / total).toFixed(6)) : null

  return {
    total_compared: total,
    matched,
    mismatched: total - matched,
    accuracy_percent: accuracyPercent,
    confidence_mae: confidenceMae,
    mismatches_preview: mismatches,
  }
}

// Chạy kiểm thử baseline: infer beat-level bằng model hiện tại và trả về % accuracy so với baseline.
const runBaselineAccuracyTest = async (options = {}) => {
  loadEnvForTest()

  // Ép bật AI cho phiên kiểm thử, tránh bị skip vì AI_ENABLE=false trong env.
  if (options.forceEnableAI !== false) {
    process.env.AI_ENABLE = "true"
  }

  const baselinePath = resolveServerPath(
    options.baselinePath,
    "model_CNN/baseline_p0_t05.json"
  )
  const readingsPath = resolveServerPath(
    options.readingsPath,
    "model_CNN/ecg/readings_with_id.json"
  )
  const sliceStart = Number.isInteger(options.sliceStart) ? options.sliceStart : 30000
  const sliceEnd = Number.isInteger(options.sliceEnd) ? options.sliceEnd : 59000

  const baselineRows = readJsonFile(baselinePath)
  const readingsData = readJsonFile(readingsPath)
  const allSignal = buildAllSignalFromReadings(readingsData)
  const slicedSignal = allSignal.slice(sliceStart, sliceEnd)

  if (!Array.isArray(baselineRows) || baselineRows.length === 0) {
    throw new Error("Baseline rỗng hoặc sai định dạng.")
  }
  if (slicedSignal.length === 0) {
    throw new Error("Không dựng được tín hiệu ECG từ readings_with_id.json.")
  }

  const { validRows, segments } = buildSegmentsFromBaseline(slicedSignal, baselineRows)
  if (segments.length === 0) {
    throw new Error("Không dựng được segment hợp lệ từ baseline.")
  }

  const initState = await initModel()
  if (!initState.loaded) {
    throw new Error(`Model chưa sẵn sàng: ${initState.reason || "UNKNOWN"}`)
  }

  const inferResult = await predictBeatSegmentsForTest(segments)
  if (inferResult.skipped) {
    throw new Error(`Suy luận bị skip: ${inferResult.reason || "UNKNOWN"}`)
  }

  const metrics = calculateMetrics(validRows, inferResult.predictions || [])
  return {
    meta: {
      baseline_path: baselinePath,
      readings_path: readingsPath,
      slice_start: sliceStart,
      slice_end: sliceEnd,
      baseline_rows: baselineRows.length,
      valid_rows: validRows.length,
      infer_rows: Array.isArray(inferResult.predictions) ? inferResult.predictions.length : 0,
      infer_ms: inferResult.infer_ms,
    },
    ...metrics,
  }
}

// Cho phép chạy trực tiếp bằng lệnh node để xem nhanh kết quả kiểm thử.
// Lệnh: node services/ecgCnnBaselineTestService.js
if (require.main === module) {
  runBaselineAccuracyTest()
    .then((result) => {
      console.log("=== KET QUA KIEM THU BASELINE ===")
      console.log(`Accuracy: ${result.accuracy_percent}%`)
      console.log(`Matched: ${result.matched}/${result.total_compared}`)
      console.log(`Confidence MAE: ${result.confidence_mae}`)
      console.log(JSON.stringify(result, null, 2))
    })
    .catch((error) => {
      console.error("Kiem thu baseline that bai:", error)
      process.exit(1)
    })
}

module.exports = {
  runBaselineAccuracyTest,
}


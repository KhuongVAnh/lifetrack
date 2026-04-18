/*
Tác dụng:
- Kiểm thử độ khớp preprocessing của Node so với baseline Python.

Vấn đề file này giải quyết:
- Beat-level parity không chứng minh được phần filter, detect peak và cắt segment của Node là đúng, nên cần một bài test riêng cho preprocessing.
- Cách làm: lấy cùng slice ECG như baseline Python, gọi `preprocessReadingForTest`, rồi so `peak_sample`, `segment_start`, `segment_end` với baseline.

Cách chạy:
- Từ thư mục `server`, chạy: `node services/ecgCnnPreprocessParityTestService.js`

Function chính:
- loadEnvForTest: nạp env cho phiên test.
- buildAllSignalFromReadings: ghép readings thành một tín hiệu dài.
- calculatePreprocessMetrics: tính độ khớp peak/segment giữa Node và baseline.
- runPreprocessParityTest: chạy toàn bộ bài test filter -> peak -> segment parity.
*/

const fs = require("fs")
const path = require("path")
const dotenv = require("dotenv")
const { preprocessReadingForTest } = require("./ecgCnnPreprocessService")

const SERVER_ROOT = path.resolve(__dirname, "..")
const PROJECT_ROOT = path.resolve(SERVER_ROOT, "..")

// Nạp biến môi trường theo thứ tự ưu tiên giống backend hiện tại.
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

// Chuyển một giá trị bất kỳ về mảng số hợp lệ để dựng tín hiệu ECG.
const toNumberArray = (value) => {
  if (!Array.isArray(value)) return []
  return value.map((item) => Number(item)).filter(Number.isFinite)
}

// Ghép tất cả reading thành một tín hiệu dài đúng theo pipeline baseline.
const buildAllSignalFromReadings = (readingsData) => {
  if (!Array.isArray(readingsData)) return []
  const chunks = readingsData
    .map((record) => toNumberArray(record?.reading))
    .filter((reading) => reading.length > 0)
  return chunks.length > 0 ? chunks.flat() : []
}

// Tính độ khớp giữa peak/segment của Node với baseline Python.
const calculatePreprocessMetrics = (baselineRows, segments) => {
  const total = Math.min(baselineRows.length, segments.length)
  let peakMatched = 0
  let segmentMatched = 0
  let fullMatched = 0
  const mismatches = []

  for (let index = 0; index < total; index += 1) {
    const expected = baselineRows[index]
    const actual = segments[index]
    const peakMatch = Number(expected?.peak_sample) === Number(actual?.peak_sample)
    const startMatch = Number(expected?.segment_start) === Number(actual?.start_sample)
    const endMatch = Number(expected?.segment_end) === Number(actual?.end_sample)
    const segmentMatch = startMatch && endMatch

    if (peakMatch) peakMatched += 1
    if (segmentMatch) segmentMatched += 1
    if (peakMatch && segmentMatch) {
      fullMatched += 1
      continue
    }

    if (mismatches.length < 20) {
      mismatches.push({
        beat_index: index,
        expected_peak: Number(expected?.peak_sample),
        actual_peak: Number(actual?.peak_sample),
        expected_start: Number(expected?.segment_start),
        actual_start: Number(actual?.start_sample),
        expected_end: Number(expected?.segment_end),
        actual_end: Number(actual?.end_sample),
      })
    }
  }

  return {
    total_compared: total,
    peak_matched: peakMatched,
    segment_matched: segmentMatched,
    fully_matched: fullMatched,
    peak_accuracy_percent: total > 0 ? Number(((peakMatched / total) * 100).toFixed(2)) : 0,
    segment_accuracy_percent: total > 0 ? Number(((segmentMatched / total) * 100).toFixed(2)) : 0,
    full_accuracy_percent: total > 0 ? Number(((fullMatched / total) * 100).toFixed(2)) : 0,
    mismatches_preview: mismatches,
  }
}

// Chạy kiểm thử parity cho pipeline filter -> peak -> segment của Node so với baseline Python.
const runPreprocessParityTest = (options = {}) => {
  loadEnvForTest()

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

  const preprocessResult = preprocessReadingForTest(slicedSignal)
  if (preprocessResult.skipped) {
    throw new Error(`Preprocess bị skip: ${preprocessResult.reason || "UNKNOWN"}`)
  }

  const metrics = calculatePreprocessMetrics(
    baselineRows,
    Array.isArray(preprocessResult.segments) ? preprocessResult.segments : []
  )

  return {
    meta: {
      baseline_path: baselinePath,
      readings_path: readingsPath,
      slice_start: sliceStart,
      slice_end: sliceEnd,
      baseline_rows: baselineRows.length,
      node_segments: Array.isArray(preprocessResult.segments) ? preprocessResult.segments.length : 0,
      node_peaks: Array.isArray(preprocessResult.peaks) ? preprocessResult.peaks.length : 0,
      input_len: preprocessResult.input_len,
    },
    ...metrics,
  }
}

// Cho phép chạy trực tiếp bằng lệnh node để xem nhanh kết quả kiểm thử preprocessing.
if (require.main === module) {
  try {
    const result = runPreprocessParityTest()
    console.log("=== KET QUA KIEM THU PREPROCESS PARITY ===")
    console.log(`Peak accuracy: ${result.peak_accuracy_percent}%`)
    console.log(`Segment accuracy: ${result.segment_accuracy_percent}%`)
    console.log(`Full accuracy: ${result.full_accuracy_percent}%`)
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error("Kiem thu preprocess parity that bai:", error)
    process.exit(1)
  }
}

module.exports = {
  runPreprocessParityTest,
}

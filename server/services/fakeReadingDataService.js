/*
Tác dụng:
- Tạo dữ liệu ECG giả phục vụ test/demo và tạo tín hiệu dự phòng khi thiếu telemetry thật.

Vấn đề file này giải quyết:
- Cần dữ liệu fake đủ giống nhịp ECG thật để test backend mà không phụ thuộc thiết bị.
- Cách làm: lấy segment từ baseline Python, ghép thành reading 5 giây, và giữ thêm một bộ sinh tín hiệu dự phòng đơn giản.

Function chính:
- resolveModelCnnPath: dựng path tuyệt đối vào thư mục `model_CNN`.
- readJsonFile: đọc file JSON local.
- resolveReadingsJsonPath: tìm file readings nguồn trong `model_CNN/ecg`.
- getBaselineSegmentPool: tải và cache pool segment từ baseline.
- generateFakeECGData: ghép các segment baseline thành một reading fake 5 giây.
- generateFallbackECGSignal: tạo tín hiệu dự phòng đơn giản khi không có ECG hợp lệ.
*/

const fs = require("fs")
const path = require("path")

const BASELINE_SAMPLE_RATE = 250
const BASELINE_READING_SECONDS = 5
const BASELINE_SEGMENT_SECONDS = 0.5
const BASELINE_SEGMENT_LENGTH = Math.floor(BASELINE_SAMPLE_RATE * BASELINE_SEGMENT_SECONDS)
const BASELINE_TOTAL_SAMPLES = BASELINE_SAMPLE_RATE * BASELINE_READING_SECONDS
const BASELINE_SEGMENTS_PER_READING = 5
const BASELINE_SLICE_START = 30000
const BASELINE_SLICE_END = 59000
const NORMAL_BASELINE_LABELS = new Set(["N", "Q"])

let cachedBaselineSegmentPool = null

// Hàm dựng đường dẫn tuyệt đối vào thư mục model_CNN.
const resolveModelCnnPath = (...parts) => path.resolve(__dirname, "..", "model_CNN", ...parts)

// Hàm đọc JSON từ đĩa và parse an toàn.
const readJsonFile = (filePath) => {
  const raw = fs.readFileSync(filePath, "utf8")
  return JSON.parse(raw)
}

// Hàm tìm path readings hợp lệ theo các tên file hiện có trong model_CNN/ecg.
const resolveReadingsJsonPath = () => {
  const candidates = [
    resolveModelCnnPath("ecg", "readings_with_id.json"),
    resolveModelCnnPath("ecg", "reading_with_id.json"),
  ]
  const existingPath = candidates.find((candidate) => fs.existsSync(candidate))
  if (!existingPath) {
    throw new Error("Khong tim thay file readings_with_id.json hoac reading_with_id.json trong model_CNN/ecg")
  }
  return existingPath
}

// Hàm tải và cache pool segment baseline để tạo dữ liệu fake ổn định.
const getBaselineSegmentPool = () => {
  if (Array.isArray(cachedBaselineSegmentPool) && cachedBaselineSegmentPool.length > 0) {
    return cachedBaselineSegmentPool
  }

  const baselinePath = resolveModelCnnPath("baseline_p0_t05.json")
  if (!fs.existsSync(baselinePath)) {
    throw new Error("Khong tim thay file baseline_p0_t05.json trong model_CNN")
  }
  const baselineRows = readJsonFile(baselinePath)

  if (!Array.isArray(baselineRows) || baselineRows.length === 0) {
    throw new Error("Du lieu baseline_p0_t05.json khong hop le hoac rong")
  }

  const readingsPath = resolveReadingsJsonPath()
  const readingsPayload = readJsonFile(readingsPath)
  if (!Array.isArray(readingsPayload) || readingsPayload.length === 0) {
    throw new Error("Du lieu readings json khong hop le hoac rong")
  }

  const allSignal = readingsPayload
    .flatMap((record) => (Array.isArray(record?.reading) ? record.reading : []))
    .map((value) => Number(value))
    .filter(Number.isFinite)

  if (allSignal.length <= BASELINE_SLICE_START) {
    throw new Error("Tong so mau ECG khong du de cat doan baseline [30000:59000]")
  }

  const slicedSignal = allSignal.slice(BASELINE_SLICE_START, BASELINE_SLICE_END)
  const segmentPool = baselineRows
    .map((row) => {
      const start = Number.parseInt(row?.segment_start, 10)
      const end = Number.parseInt(row?.segment_end, 10)
      if (!Number.isInteger(start) || !Number.isInteger(end)) return null
      const segment = slicedSignal.slice(start, end)
      if (segment.length !== BASELINE_SEGMENT_LENGTH) return null
      const label = String(row?.label || "").trim().toUpperCase()
      return {
        values: segment,
        label: label || "N",
        isAbnormal: label ? !NORMAL_BASELINE_LABELS.has(label) : false,
      }
    })
    .filter(Boolean)

  if (segmentPool.length === 0) {
    throw new Error("Khong trich xuat duoc segment hop le tu baseline de tao fake reading")
  }

  cachedBaselineSegmentPool = segmentPool
  return cachedBaselineSegmentPool
}

// Hàm tạo fake reading 5 giây từ 5 segment baseline và khoảng lặng 0.5 giây.
const generateFakeECGData = () => {
  const segmentPool = getBaselineSegmentPool()
  const abnormalPool = segmentPool.filter((item) => item.isAbnormal)
  const selectedSegments = []

  if (abnormalPool.length > 0) {
    const randomAbnormalIndex = Math.floor(Math.random() * abnormalPool.length)
    selectedSegments.push(abnormalPool[randomAbnormalIndex])
  }

  while (selectedSegments.length < BASELINE_SEGMENTS_PER_READING) {
    const randomIndex = Math.floor(Math.random() * segmentPool.length)
    selectedSegments.push(segmentPool[randomIndex])
  }

  for (let i = selectedSegments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = selectedSegments[i]
    selectedSegments[i] = selectedSegments[j]
    selectedSegments[j] = temp
  }

  const data = []
  for (const segment of selectedSegments) {
    data.push(...segment.values)
    data.push(...new Array(BASELINE_SEGMENT_LENGTH).fill(0))
  }

  if (data.length > BASELINE_TOTAL_SAMPLES) {
    return data.slice(0, BASELINE_TOTAL_SAMPLES)
  }
  if (data.length < BASELINE_TOTAL_SAMPLES) {
    data.push(...new Array(BASELINE_TOTAL_SAMPLES - data.length).fill(0))
  }
  return data
}

// Hàm tạo tín hiệu ECG dự phòng khi telemetry không gửi dữ liệu hợp lệ.
const generateFallbackECGSignal = (length = 100) => {
  const arr = []
  for (let i = 0; i < length; i++) {
    const t = i / 10
    const noise = (Math.random() - 0.5) * 0.2
    arr.push(Math.sin(t) + noise)
  }
  return arr
}

module.exports = {
  BASELINE_SAMPLE_RATE,
  generateFakeECGData,
  generateFallbackECGSignal,
}

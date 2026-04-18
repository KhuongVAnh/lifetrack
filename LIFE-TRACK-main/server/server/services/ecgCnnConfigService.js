/*
Tác dụng:
- Tách riêng phần đọc, validate và cache cấu hình AI ECG khỏi `ecgCnnService`.

Vấn đề file này giải quyết:
- `ecgCnnService` cần tập trung vào infer, còn việc đọc env/path/preprocess_config/label_map nên được gom về một nơi để dễ kiểm soát và test.
- Cách làm: cung cấp các getter chuẩn hóa cho trạng thái AI, path model, preprocess config, tham số runtime và label map.

Function chính:
- isAIEnabled: kiểm tra cờ bật/tắt AI từ env.
- getModelPaths: trả về path model/config/label map.
- getMaxSignalSamples: đọc giới hạn số mẫu ECG cho một lần infer.
- getValidatedPreprocessConfig: đọc và validate preprocess config rồi cache lại.
- getRuntimeNumericConfig: chuẩn hóa các tham số số học dùng cho runtime infer.
- getBandpassFilterConfig: lấy cấu hình filter `b_coeffs/a_coeffs` đã chuẩn hóa.
- getLabelMap, getLabelText: đọc và tra cứu label text của model.
- resetConfigCacheForTest: xóa cache config để phục vụ test/reload có kiểm soát.
*/

const fs = require("fs")
const path = require("path")

const DEFAULT_MAX_SIGNAL_SAMPLES = 10000

let preprocessConfig = null
let labelMap = null

// Đọc nội dung text từ file và loại bỏ BOM nếu có.
const readTextFile = (filePath) => {
  const raw = fs.readFileSync(filePath)
  let text = raw.toString("utf8")
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }
  return text
}

// Đọc và parse file JSON từ đường dẫn local.
const readJsonFile = (filePath) => JSON.parse(readTextFile(filePath))

// Resolve đường dẫn env thành path tuyệt đối tính từ root server.
const resolveServerPath = (envValue, fallbackRelative) => {
  const serverRoot = path.resolve(__dirname, "..")
  const value = String(envValue || fallbackRelative || "").trim()
  return path.isAbsolute(value) ? value : path.resolve(serverRoot, value)
}

// Kiểm tra cờ bật/tắt AI inference qua biến môi trường.
const isAIEnabled = () => String(process.env.AI_ENABLE || "false").toLowerCase() === "true"

// Lấy bộ đường dẫn chuẩn của model và config AI.
const getModelPaths = () => {
  return {
    modelPath: resolveServerPath(process.env.AI_MODEL_PATH, "model_CNN/ecg_tfjs/model.json"),
    preprocessPath: resolveServerPath(
      process.env.AI_PREPROCESS_CONFIG_PATH,
      "model_CNN/ecg/preprocess_config.json"
    ),
    labelMapPath: resolveServerPath(
      process.env.AI_LABEL_MAP_PATH,
      "model_CNN/ecg/label_map.json"
    ),
  }
}

// Lấy ngưỡng số mẫu ECG tối đa cho một lần infer.
const getMaxSignalSamples = () => {
  const parsed = Number.parseInt(process.env.AI_MAX_SIGNAL_SAMPLES, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_SIGNAL_SAMPLES
}

// Chuẩn hóa danh sách hệ số filter từ config thành mảng số hợp lệ.
const normalizeFilterCoefficients = (values, keyName) => {
  if (!Array.isArray(values) || values.length < 2) {
    throw new Error(`Invalid preprocess_config.${keyName}`)
  }

  const normalized = values.map((value) => Number(value))
  if (!normalized.every(Number.isFinite)) {
    throw new Error(`Invalid preprocess_config.${keyName}`)
  }

  return normalized
}

// Xác thực preprocess_config có đủ key bắt buộc và dữ liệu hợp lệ.
const validatePreprocessConfig = (config) => {
  const requiredKeys = [
    "fs",
    "half_window",
    "segment_len",
    "lowcut",
    "highcut",
    "filter_order",
    "b_coeffs",
    "a_coeffs",
    "rpeak_min_distance_sec",
    "rpeak_min_height",
    "classes",
    "scaler_mean",
    "scaler_scale",
  ]

  for (const key of requiredKeys) {
    if (!(key in config)) {
      throw new Error(`Missing preprocess_config key: ${key}`)
    }
  }

  if (!Array.isArray(config.classes) || config.classes.length === 0) {
    throw new Error("Invalid preprocess_config.classes")
  }

  const scalerScale = Number(config.scaler_scale)
  if (!Number.isFinite(scalerScale) || scalerScale === 0) {
    throw new Error("Invalid preprocess_config.scaler_scale")
  }

  const segmentLength = Number(config.segment_len)
  const halfWindow = Number(config.half_window)
  if (!Number.isInteger(segmentLength) || !Number.isInteger(halfWindow) || segmentLength !== halfWindow * 2 + 1) {
    throw new Error("Invalid preprocess_config.segment_len")
  }

  const bCoeffs = normalizeFilterCoefficients(config.b_coeffs, "b_coeffs")
  const aCoeffs = normalizeFilterCoefficients(config.a_coeffs, "a_coeffs")
  if (bCoeffs.length !== aCoeffs.length) {
    throw new Error("Invalid preprocess_config filter coefficient length")
  }
  if (aCoeffs[0] === 0) {
    throw new Error("Invalid preprocess_config.a_coeffs")
  }
}

// Chuẩn hóa các tham số số học runtime để dùng lại ở service infer.
const validateRuntimeNumericConfig = (config) => {
  const fsHz = Number(config.fs)
  const lowcut = Number(config.lowcut)
  const highcut = Number(config.highcut)
  const filterOrder = Number(config.filter_order)
  const segmentLength = Number(config.segment_len)
  const halfWindow = Number(config.half_window)
  const rpeakMinDistanceSec = Number(config.rpeak_min_distance_sec)
  const rpeakMinHeight = Number(config.rpeak_min_height)
  const scalerMean = Number(config.scaler_mean)
  const scalerScale = Number(config.scaler_scale)
  const bCoeffs = normalizeFilterCoefficients(config.b_coeffs, "b_coeffs")
  const aCoeffs = normalizeFilterCoefficients(config.a_coeffs, "a_coeffs")

  const isValid =
    Number.isFinite(fsHz) && fsHz > 0 &&
    Number.isFinite(lowcut) && lowcut > 0 &&
    Number.isFinite(highcut) && highcut > lowcut &&
    Number.isFinite(filterOrder) && filterOrder > 0 &&
    Number.isFinite(segmentLength) && segmentLength > 1 &&
    Number.isFinite(halfWindow) && halfWindow > 0 &&
    Number.isFinite(rpeakMinDistanceSec) && rpeakMinDistanceSec > 0 &&
    Number.isFinite(rpeakMinHeight) &&
    Number.isFinite(scalerMean) &&
    Number.isFinite(scalerScale) && scalerScale !== 0 &&
    aCoeffs[0] !== 0 &&
    bCoeffs.length === aCoeffs.length

  return {
    isValid,
    values: {
      fsHz,
      lowcut,
      highcut,
      filterOrder,
      segmentLength,
      halfWindow,
      rpeakMinDistanceSec,
      rpeakMinHeight,
      scalerMean,
      scalerScale,
    },
  }
}

// Đọc và cache preprocess_config đã qua validate.
const getValidatedPreprocessConfig = () => {
  if (preprocessConfig) return preprocessConfig

  const paths = getModelPaths()
  const loadedConfig = readJsonFile(paths.preprocessPath)
  validatePreprocessConfig(loadedConfig)
  preprocessConfig = loadedConfig
  return preprocessConfig
}

// Trả về bộ tham số runtime dạng số đã được validate.
const getRuntimeNumericConfig = () => validateRuntimeNumericConfig(getValidatedPreprocessConfig())

// Trả về hệ số filter đã chuẩn hóa để áp dụng đúng bộ lọc từ Python.
const getBandpassFilterConfig = () => {
  const config = getValidatedPreprocessConfig()
  const bCoeffs = normalizeFilterCoefficients(config.b_coeffs, "b_coeffs")
  const aCoeffs = normalizeFilterCoefficients(config.a_coeffs, "a_coeffs")
  const applyMode = String(config.apply_mode || "filtfilt").trim().toLowerCase() || "filtfilt"
  const padLength = Number.isInteger(config.padlen)
    ? config.padlen
    : 3 * Math.max(aCoeffs.length, bCoeffs.length)

  return {
    filterType: String(config.filter_type || "butterworth_bandpass").trim() || "butterworth_bandpass",
    applyMode,
    bCoeffs,
    aCoeffs,
    padLength,
  }
}

// Đọc và cache bảng ánh xạ label của model.
const getLabelMap = () => {
  if (labelMap) return labelMap

  const { labelMapPath } = getModelPaths()
  labelMap = fs.existsSync(labelMapPath) ? readJsonFile(labelMapPath) : {}
  return labelMap
}

// Ưu tiên label text từ config, sau đó fallback sang resolver bên ngoài.
const getLabelText = (labelCode, fallbackResolver) => {
  if (!labelCode) return null

  const configuredLabel = String(getLabelMap()?.[labelCode] || "").trim()
  if (configuredLabel) return configuredLabel

  return typeof fallbackResolver === "function" ? fallbackResolver(labelCode) : null
}

// Reset cache config để phục vụ test hoặc reload có kiểm soát.
const resetConfigCacheForTest = () => {
  preprocessConfig = null
  labelMap = null
}

module.exports = {
  isAIEnabled,
  getModelPaths,
  getMaxSignalSamples,
  getValidatedPreprocessConfig,
  getRuntimeNumericConfig,
  getBandpassFilterConfig,
  getLabelMap,
  getLabelText,
  resetConfigCacheForTest,
}

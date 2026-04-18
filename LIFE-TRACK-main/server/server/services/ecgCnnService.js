/*
Tác dụng:
- Thực hiện suy luận ECG CNN trực tiếp trong backend Node.js.

Vấn đề file này giải quyết:
- dùng `ecgCnnPreprocessService` để lấy dữ liệu đã qua pipeline filter -> peak -> segment, sau đó load model TFJS, chạy CNN và hậu xử lý kết quả reading-level.

Function chính:
- initModel: load preprocess config, label map, model TFJS và warmup model.
- predictFromReading: suy luận một reading ECG hoàn chỉnh và trả về kết quả reading-level.
- predictBeatSegmentsForTest: infer trực tiếp trên các segment đã cắt sẵn để test beat-level.
- getModelState: trả về trạng thái AI đang bật/tắt và model đã load hay chưa.
*/

const fs = require("fs")
const path = require("path")
const tf = require("@tensorflow/tfjs")
const {
  isAIEnabled,
  getModelPaths,
  getValidatedPreprocessConfig,
  getLabelMap,
  getLabelText,
} = require("./ecgCnnConfigService")
const {
  preprocessSignalForInference,
  flattenSegmentsToModelInput,
} = require("./ecgCnnPreprocessService")
const {
  ECG_AI_CLASS_CODES,
  ECG_AI_SUMMARY_ORDER,
  isNormalAiCode,
  getAiLabelFromCode,
} = require("../strings/ecgAiStrings")

// Tập reason code chuẩn cho toàn bộ luồng fallback của AI infer.
const AI_FALLBACK_REASON_CODES = new Set([
  "AI_DISABLED", // AI bị tắt qua biến môi trường.
  "MODEL_NOT_READY", // Model chưa sẵn sàng để suy luận.
  "MODEL_INIT_FAILED", // Khởi tạo model thất bại.
  "INVALID_INPUT", // Dữ liệu đầu vào sai định dạng hoặc rỗng.
  "SHORT_SIGNAL", // Tín hiệu quá ngắn, không đủ 1 segment chuẩn.
  "NO_PEAK", // Không phát hiện được R-peak hợp lệ.
  "INFER_ERROR", // Lỗi trong quá trình suy luận model.
  "INVALID_SEGMENTS", // Dữ liệu segment test không hợp lệ.
  "INPUT_TRUNCATED", // Đầu vào bị cắt bớt do vượt ngưỡng cho phép.
])
let model = null // Model TensorFlowJS đã load vào bộ nhớ.
let isLoaded = false // Cờ cho biết model đã sẵn sàng hay chưa.
let initPromise = null // Promise khởi tạo dùng để chống load model trùng lặp.

// Đọc nội dung text từ file và loại bỏ BOM nếu có.
const readTextFile = (filePath) => {
  const raw = fs.readFileSync(filePath)
  let text = raw.toString("utf8")
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }
  return text
}

// Đọc và parse JSON cho model TFJS local.
const readJsonFile = (filePath) => JSON.parse(readTextFile(filePath))

// Hàm ghi log JSON line thống nhất cho toàn bộ luồng AI để dễ truy vết production.
const logAiEvent = (event, payload = {}) => {
  const normalizedEvent = String(event || "AI_EVENT").trim() || "AI_EVENT"
  console.log(
    JSON.stringify({
      event: normalizedEvent,
      timestamp: new Date().toISOString(),
      ...payload,
    })
  )
}

// Chuẩn hóa model topology để tương thích dữ liệu export Keras 3/InputLayer.
const normalizeModelTopology = (modelTopology) => {
  const clonedTopology = JSON.parse(JSON.stringify(modelTopology || {}))
  const layers = clonedTopology?.model_config?.config?.layers

  if (!Array.isArray(layers)) {
    return clonedTopology
  }

  for (const layer of layers) {
    if (layer?.class_name !== "InputLayer" || !layer.config || typeof layer.config !== "object") {
      continue
    }

    const batchShape = layer.config.batch_shape || layer.config.batchShape
    if (Array.isArray(batchShape)) {
      layer.config.batchInputShape = batchShape
    }
    delete layer.config.batch_shape
    delete layer.config.batchShape
    delete layer.config.inputShape
  }

  return clonedTopology
}

// Tạo custom IO handler để load model TFJS local từ model.json và shard .bin.
const buildCustomIoHandler = (modelPath) => {
  const modelDir = path.dirname(modelPath)
  const modelJson = readJsonFile(modelPath)

  if (!modelJson?.modelTopology || !Array.isArray(modelJson?.weightsManifest)) {
    throw new Error("Invalid TFJS model.json format")
  }

  const weightSpecs = []
  const weightBuffers = []

  for (const manifest of modelJson.weightsManifest) {
    if (Array.isArray(manifest.weights)) {
      weightSpecs.push(...manifest.weights)
    }

    for (const shardName of manifest.paths || []) {
      const shardPath = path.resolve(modelDir, shardName)
      weightBuffers.push(fs.readFileSync(shardPath))
    }
  }

  const merged = Buffer.concat(weightBuffers)
  const weightData = merged.buffer.slice(
    merged.byteOffset,
    merged.byteOffset + merged.byteLength
  )

  return {
    load: async () => ({
      modelTopology: normalizeModelTopology(modelJson.modelTopology),
      weightSpecs,
      weightData,
    }),
  }
}

// Map mã nhãn AI sang text hiển thị qua config service.
const labelTextFromCode = (labelCode) => getLabelText(labelCode, getAiLabelFromCode)

// Trích xuất danh sách nhãn dự đoán theo từng segment từ xác suất model trả về.
const buildSegmentPredictions = (segments, probabilities, classes) => {
  const predictions = []
  for (let i = 0; i < segments.length; i += 1) {
    const row = Array.isArray(probabilities[i]) ? probabilities[i] : []
    let bestIndex = 0
    for (let j = 1; j < row.length; j += 1) {
      if (row[j] > row[bestIndex]) {
        bestIndex = j
      }
    }

    const labelCode = classes[bestIndex] || "Q"
    const confidence = Number((row[bestIndex] || 0).toFixed(6))
    predictions.push({
      segment_index: segments[i].segment_index,
      peak_sample: segments[i].peak_sample,
      start_sample: segments[i].start_sample,
      end_sample: segments[i].end_sample,
      label_code: labelCode,
      label_text: labelTextFromCode(labelCode),
      confidence,
      abnormal: !isNormalAiCode(labelCode),
    })
  }
  return predictions
}

// Gộp các segment bất thường liên tiếp cùng lớp thành một nhóm cảnh báo duy nhất.
const groupContiguousAbnormalSegments = (segmentPredictions) => {
  const groups = []
  for (const prediction of segmentPredictions) {
    if (!prediction.abnormal) continue

    const lastGroup = groups[groups.length - 1]
    const isContiguousSameClass =
      lastGroup &&
      lastGroup.label_code === prediction.label_code &&
      prediction.segment_index === lastGroup.last_segment_index + 1

    if (isContiguousSameClass) {
      lastGroup.end_sample = prediction.end_sample
      lastGroup.segment_count += 1
      lastGroup.last_segment_index = prediction.segment_index
      continue
    }

    groups.push({
      label_code: prediction.label_code,
      label_text: prediction.label_text,
      start_sample: prediction.start_sample,
      end_sample: prediction.end_sample,
      segment_count: 1,
      first_segment_index: prediction.segment_index,
      last_segment_index: prediction.segment_index,
    })
  }

  return groups.map((group) => ({
    label_code: group.label_code,
    label_text: group.label_text,
    start_sample: group.start_sample,
    end_sample: group.end_sample,
    segment_count: group.segment_count,
  }))
}

// Tạo chuỗi tóm tắt số lượng segment bất thường theo từng lớp.
const buildAiResultSummary = (segmentPredictions) => {
  const counts = new Map()
  for (const prediction of segmentPredictions) {
    if (!prediction.abnormal) continue
    counts.set(prediction.label_code, (counts.get(prediction.label_code) || 0) + 1)
  }

  if (counts.size === 0) return "Bình thường"

  const unorderedCodes = Array.from(counts.keys()).filter((code) => !isNormalAiCode(code))
  const orderedCodes = [
    ...ECG_AI_SUMMARY_ORDER.filter((code) => unorderedCodes.includes(code)),
    ...unorderedCodes
      .filter((code) => !ECG_AI_SUMMARY_ORDER.includes(code))
      .sort((a, b) => a.localeCompare(b)),
  ]

  return orderedCodes.map((code) => `${getAiLabelFromCode(code)}:${counts.get(code)}`).join(", ")
}

// Chọn nhãn đại diện cho reading để giữ tương thích field cũ.
const pickPrimaryPrediction = (segmentPredictions) => {
  if (!Array.isArray(segmentPredictions) || segmentPredictions.length === 0) {
    return null
  }

  const firstAbnormal = segmentPredictions.find((item) => item.abnormal)
  return firstAbnormal || segmentPredictions[0]
}

// Hàm chuẩn hóa reason code fallback để chỉ dùng tập mã đã khóa.
const normalizeFallbackReason = (reason) => {
  const normalized = String(reason || "INFER_ERROR").trim().toUpperCase()
  return AI_FALLBACK_REASON_CODES.has(normalized) ? normalized : "INFER_ERROR"
}

// Tạo kết quả skip chuẩn hóa khi không thể infer AI (giữ contract output ổn định).
const makeSkipResult = (reason, inferMs, options = {}) => {
  const normalizedReason = normalizeFallbackReason(reason)
  const labelCode = options.labelCode ?? null
  return {
    label_code: labelCode,
    label_text: labelTextFromCode(labelCode),
    confidence: null,
    abnormal_detected: labelCode ? !isNormalAiCode(labelCode) : false,
    beat_count: Number.isInteger(options.beatCount) ? options.beatCount : 0,
    segment_predictions: Array.isArray(options.segmentPredictions) ? options.segmentPredictions : [],
    abnormal_groups: Array.isArray(options.abnormalGroups) ? options.abnormalGroups : [],
    ai_result_summary: typeof options.aiResultSummary === "string" ? options.aiResultSummary : "Bình thường",
    skipped: true,
    reason: normalizedReason,
    infer_ms: inferMs,
    input_len: Number.isInteger(options.inputLength) ? options.inputLength : 0,
    input_truncated: Boolean(options.inputTruncated),
  }
}

// Trả về trạng thái load model AI hiện tại cho runtime.
const getModelState = () => ({
  enabled: isAIEnabled(),
  loaded: isLoaded,
})

// Khởi tạo model/config/label map một lần và warmup model trước khi suy luận.
const initModel = async () => {
  if (!isAIEnabled()) {
    logAiEvent("AI_MODEL_INIT_ERROR", {
      reason: "AI_DISABLED",
      fallback_applied: true,
    })
    return { enabled: false, loaded: false, reason: "AI_DISABLED" }
  }

  if (isLoaded && model) {
    return { enabled: true, loaded: true }
  }

  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    try {
      const paths = getModelPaths()
      const preprocessConfig = getValidatedPreprocessConfig()
      getLabelMap()

      const ioHandler = buildCustomIoHandler(paths.modelPath)
      model = await tf.loadLayersModel(ioHandler)

      const segmentLength = Number(preprocessConfig.segment_len)
      const warmInput = tf.zeros([1, segmentLength, 1], "float32")
      let warmOutput = model.predict(warmInput)
      if (Array.isArray(warmOutput)) {
        warmOutput.forEach((tensor) => tensor.dispose())
      } else {
        warmOutput.dispose()
      }
      warmInput.dispose()

      isLoaded = true
      logAiEvent("AI_MODEL_INIT_OK", {
        reason: null,
        loaded: true,
        fallback_applied: false,
      })
      return { enabled: true, loaded: true }
    } catch (error) {
      logAiEvent("AI_MODEL_INIT_ERROR", {
        reason: "MODEL_INIT_FAILED",
        message: error?.message || "UNKNOWN",
        fallback_applied: true,
      })
      model = null
      isLoaded = false
      return { enabled: true, loaded: false, reason: "MODEL_INIT_FAILED" }
    } finally {
      initPromise = null
    }
  })()

  return initPromise
}

// Suy luận reading-level từ ecg_signal: preprocess -> infer beat-level -> gom nhóm bất thường -> map output.
const predictFromReading = async (ecgSignal, options = {}) => {
  const startedAt = Date.now()
  const context = String(options?.context || "unknown")
  let inputLength = 0
  let inputTruncated = false

  if (!isAIEnabled()) {
    const skip = makeSkipResult("AI_DISABLED", Date.now() - startedAt)
    logAiEvent("AI_INFER_SKIP", {
      context,
      reason: skip.reason,
      infer_ms: skip.infer_ms,
      input_len: skip.input_len,
      beat_count: skip.beat_count,
      abnormal_group_count: 0,
      ai_result_summary: skip.ai_result_summary,
      fallback_applied: true,
    })
    return skip
  }

  if (!isLoaded || !model) {
    const initResult = await initModel()
    if (!initResult.loaded || !model) {
      const initReason = initResult?.reason || "MODEL_NOT_READY"
      const skip = makeSkipResult(initReason, Date.now() - startedAt)
      logAiEvent("AI_INFER_SKIP", {
        context,
        reason: skip.reason,
        infer_ms: skip.infer_ms,
        input_len: skip.input_len,
        beat_count: skip.beat_count,
        abnormal_group_count: 0,
        ai_result_summary: skip.ai_result_summary,
        fallback_applied: true,
      })
      return skip
    }
  }

  try {
    const preprocessed = preprocessSignalForInference(ecgSignal)
    inputLength = preprocessed.input_len
    inputTruncated = preprocessed.input_truncated

    if (preprocessed.input_truncated) {
      logAiEvent("AI_INFER_SKIP", {
        context,
        reason: "INPUT_TRUNCATED",
        infer_ms: Date.now() - startedAt,
        input_len: preprocessed.input_len,
        raw_input_len: preprocessed.raw_input_len || preprocessed.input_len,
        beat_count: 0,
        abnormal_group_count: 0,
        ai_result_summary: null,
        fallback_applied: false,
      })
    }

    if (preprocessed.skipped) {
      const shouldUseNormalFallbackLabel =
        preprocessed.reason === "SHORT_SIGNAL" ||
        preprocessed.reason === "NO_PEAK" ||
        preprocessed.reason === "INFER_ERROR"
      const skip = makeSkipResult(preprocessed.reason, Date.now() - startedAt, {
        labelCode: shouldUseNormalFallbackLabel ? "Q" : null,
        inputLength: preprocessed.input_len,
        inputTruncated: preprocessed.input_truncated,
      })
      logAiEvent("AI_INFER_SKIP", {
        context,
        reason: skip.reason,
        infer_ms: skip.infer_ms,
        input_len: skip.input_len,
        beat_count: skip.beat_count,
        abnormal_group_count: 0,
        ai_result_summary: skip.ai_result_summary,
        fallback_applied: true,
      })
      return skip
    }

    const preprocessConfig = preprocessed.preprocess_config
    const runtimeConfig = preprocessed.runtime_config
    const segments = preprocessed.segments
    const { segmentLength, scalerMean, scalerScale } = runtimeConfig.values

    // Chuẩn hóa từng segment rồi nạp vào tensor batch [số segment, 125, 1].
    const beatCount = segments.length
    const flat = flattenSegmentsToModelInput(segments, segmentLength, scalerMean, scalerScale)
    const inputTensor = tf.tensor3d(flat, [beatCount, segmentLength, 1], "float32")
    let outputTensor = model.predict(inputTensor)
    if (Array.isArray(outputTensor)) {
      outputTensor = outputTensor[0]
    }

    // Chuyển tensor xác suất sang mảng JS rồi giải phóng bộ nhớ.
    const probabilities = outputTensor.arraySync()
    inputTensor.dispose()
    outputTensor.dispose()

    const classes = Array.isArray(preprocessConfig.classes)
      ? preprocessConfig.classes
      : ECG_AI_CLASS_CODES

    // Tạo dự đoán theo từng segment, sau đó gộp nhóm bất thường liên tiếp cùng lớp.
    const segmentPredictions = buildSegmentPredictions(segments, probabilities, classes)
    const abnormalGroups = groupContiguousAbnormalSegments(segmentPredictions)
    const aiResultSummary = buildAiResultSummary(segmentPredictions)
    const primaryPrediction = pickPrimaryPrediction(segmentPredictions)
    const labelCode = primaryPrediction?.label_code || "Q"
    const labelText = primaryPrediction?.label_text || labelTextFromCode(labelCode)
    const primaryConfidence =
      typeof primaryPrediction?.confidence === "number" ? primaryPrediction.confidence : null

    const result = {
      label_code: labelCode,
      label_text: labelText,
      confidence: primaryConfidence,
      abnormal_detected: abnormalGroups.length > 0,
      beat_count: beatCount,
      segment_predictions: segmentPredictions,
      abnormal_groups: abnormalGroups,
      ai_result_summary: aiResultSummary,
      skipped: false,
      reason: null,
      infer_ms: Date.now() - startedAt,
      input_len: inputLength,
      input_truncated: inputTruncated,
    }

    logAiEvent("AI_INFER_OK", {
      context,
      reason: null,
      infer_ms: result.infer_ms,
      input_len: result.input_len,
      beat_count: result.beat_count,
      abnormal_group_count: abnormalGroups.length,
      ai_result_summary: aiResultSummary,
      fallback_applied: false,
    })

    return result
  } catch (error) {
    const skip = makeSkipResult("INFER_ERROR", Date.now() - startedAt, {
      labelCode: "Q",
      inputLength,
      inputTruncated,
    })
    logAiEvent("AI_INFER_ERROR", {
      context,
      reason: skip.reason,
      infer_ms: skip.infer_ms,
      input_len: skip.input_len,
      beat_count: skip.beat_count,
      abnormal_group_count: 0,
      ai_result_summary: skip.ai_result_summary,
      fallback_applied: true,
      message: error?.message || "UNKNOWN",
    })
    return skip
  }
}

// Suy luận theo từng segment ECG 125 mẫu để phục vụ kiểm thử khớp baseline beat-level.
const predictBeatSegmentsForTest = async (segmentsInput) => {
  const startedAt = Date.now()

  if (!isAIEnabled()) {
    return {
      skipped: true,
      reason: "AI_DISABLED",
      infer_ms: Date.now() - startedAt,
      beat_count: 0,
      predictions: [],
    }
  }

  if (!isLoaded || !model) {
    const initResult = await initModel()
    if (!initResult.loaded || !model) {
      return {
        skipped: true,
        reason: "MODEL_NOT_READY",
        infer_ms: Date.now() - startedAt,
        beat_count: 0,
        predictions: [],
      }
    }
  }

  const preprocessConfig = getValidatedPreprocessConfig()
  const segmentLength = Number(preprocessConfig.segment_len)
  const classes = Array.isArray(preprocessConfig.classes)
    ? preprocessConfig.classes
    : ECG_AI_CLASS_CODES
  const scalerMean = Number(preprocessConfig.scaler_mean)
  const scalerScale = Number(preprocessConfig.scaler_scale)

  // Làm sạch dữ liệu segment đầu vào và chỉ giữ segment đúng độ dài.
  const validSegments = Array.isArray(segmentsInput)
    ? segmentsInput
      .map((segment) =>
        Array.isArray(segment) ? segment.map((value) => Number(value)).filter(Number.isFinite) : null
      )
      .filter((segment) => Array.isArray(segment) && segment.length === segmentLength)
    : []

  if (validSegments.length === 0) {
    return {
      skipped: true,
      reason: "INVALID_SEGMENTS",
      infer_ms: Date.now() - startedAt,
      beat_count: 0,
      predictions: [],
    }
  }

  try {
    const beatCount = validSegments.length
    const flat = new Float32Array(beatCount * segmentLength)
    for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
      const segment = validSegments[beatIndex]
      for (let i = 0; i < segmentLength; i += 1) {
        flat[beatIndex * segmentLength + i] = (Number(segment[i]) - scalerMean) / scalerScale
      }
    }

    // Chạy model theo batch segment để lấy kết quả beat-level.
    const inputTensor = tf.tensor3d(flat, [beatCount, segmentLength, 1], "float32")
    let outputTensor = model.predict(inputTensor)
    if (Array.isArray(outputTensor)) {
      outputTensor = outputTensor[0]
    }
    const probabilities = outputTensor.arraySync()
    inputTensor.dispose()
    outputTensor.dispose()

    // Map xác suất mỗi beat về label và confidence tương ứng.
    const predictions = probabilities.map((row) => {
      let bestIndex = 0
      for (let i = 1; i < row.length; i += 1) {
        if (row[i] > row[bestIndex]) {
          bestIndex = i
        }
      }
      const labelCode = classes[bestIndex] || "Q"
      return {
        label_code: labelCode,
        label_text: labelTextFromCode(labelCode),
        confidence: Number((row[bestIndex] || 0).toFixed(6)),
      }
    })

    return {
      skipped: false,
      reason: null,
      infer_ms: Date.now() - startedAt,
      beat_count: beatCount,
      predictions,
    }
  } catch (error) {
    console.error("AI beat-level inference error:", error)
    return {
      skipped: true,
      reason: "INFER_ERROR",
      infer_ms: Date.now() - startedAt,
      beat_count: 0,
      predictions: [],
    }
  }
}

module.exports = {
  initModel,
  predictFromReading,
  predictBeatSegmentsForTest,
  getModelState,
}

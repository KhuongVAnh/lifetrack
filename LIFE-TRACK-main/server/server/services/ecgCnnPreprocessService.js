/*
Tác dụng:
- Chứa toàn bộ logic tiền xử lý ECG dùng chung cho runtime AI và các bài test parity.

Vấn đề file này giải quyết:
- `ecgCnnService` đang ôm cả preprocessing lẫn AI inference, làm trách nhiệm bị trộn và khó bảo trì.
- Cách làm: tách riêng phần sanitize input, bandpass, detect peak, cắt segment và chuẩn bị input model thành service độc lập dùng chung.

Function chính:
- preprocessSignalForInference: chạy trọn pipeline preprocessing cho một reading ECG.
- filterReadingSignal: lọc tín hiệu ECG để lưu DB hoặc dùng downstream.
- preprocessReadingForTest: expose pipeline preprocessing cho bài test parity.
- flattenSegmentsToModelInput: chuẩn hóa segment thành mảng phẳng để tạo tensor cho model.
*/

const {
  getMaxSignalSamples,
  getValidatedPreprocessConfig,
  getRuntimeNumericConfig,
  getBandpassFilterConfig,
} = require("./ecgCnnConfigService")

// Chuyển input ECG về mảng số hợp lệ để dùng cho preprocessing.
const parseSignalInput = (input) => {
  let data = input

  if (typeof data === "string") {
    try {
      data = JSON.parse(data)
    } catch (error) {
      return null
    }
  }

  if (!Array.isArray(data) && data && typeof data === "object") {
    if (Array.isArray(data.ecg_signal)) data = data.ecg_signal
    else if (Array.isArray(data.reading)) data = data.reading
  }

  return Array.isArray(data) ? data : null
}

// Làm sạch input ECG và giới hạn số mẫu để tránh làm nặng runtime infer.
const sanitizeSignalInput = (input, options = {}) => {
  const raw = parseSignalInput(input)
  if (!raw) {
    return { signal: null, inputLength: 0, truncated: false, reason: "INVALID_INPUT" }
  }

  const normalized = raw.map((value) => Number(value)).filter(Number.isFinite)
  if (normalized.length === 0) {
    return { signal: null, inputLength: 0, truncated: false, reason: "INVALID_INPUT" }
  }

  const shouldDisableTruncate = options?.disableTruncate === true
  const maxSignalSamples = getMaxSignalSamples()
  if (!shouldDisableTruncate && normalized.length > maxSignalSamples) {
    const truncatedSignal = normalized.slice(-maxSignalSamples)
    return {
      signal: truncatedSignal,
      inputLength: truncatedSignal.length,
      truncated: true,
      reason: "INPUT_TRUNCATED",
      rawInputLength: normalized.length,
    }
  }

  return {
    signal: normalized,
    inputLength: normalized.length,
    truncated: false,
    reason: null,
  }
}

// Lấy bộ hệ số bandpass đã export từ pipeline Python.
const buildBandpassCoefficients = () => getBandpassFilterConfig()

// Dựng odd extension để mô phỏng xử lý biên kiểu filtfilt.
const buildOddExtendedSignal = (signal, padLength) => {
  if (!Array.isArray(signal) || signal.length === 0) {
    throw new Error("Invalid signal for filtfilt")
  }

  const edge = Math.max(0, Number(padLength) || 0)
  if (edge === 0) {
    return signal.slice()
  }
  if (signal.length <= edge) {
    throw new Error("Signal too short for filtfilt padding")
  }

  const left = []
  for (let index = edge; index >= 1; index -= 1) {
    left.push(2 * signal[0] - signal[index])
  }

  const right = []
  for (let index = signal.length - 2; index >= signal.length - edge - 1; index -= 1) {
    right.push(2 * signal[signal.length - 1] - signal[index])
  }

  return left.concat(signal, right)
}

// Chạy IIR 1 chiều theo phương trình sai phân chuẩn để bám lfilter của SciPy.
const runIirFilter = (signal, bCoeffs, aCoeffs) => {
  const order = Math.max(aCoeffs.length, bCoeffs.length)
  const paddedA = aCoeffs.concat(Array(Math.max(0, order - aCoeffs.length)).fill(0))
  const paddedB = bCoeffs.concat(Array(Math.max(0, order - bCoeffs.length)).fill(0))
  const a0 = paddedA[0]
  const output = new Array(signal.length).fill(0)

  for (let sampleIndex = 0; sampleIndex < signal.length; sampleIndex += 1) {
    let numerator = 0
    let denominator = 0

    for (let coeffIndex = 0; coeffIndex < paddedB.length; coeffIndex += 1) {
      const inputIndex = sampleIndex - coeffIndex
      if (inputIndex >= 0) {
        numerator += paddedB[coeffIndex] * Number(signal[inputIndex])
      }
    }

    for (let coeffIndex = 1; coeffIndex < paddedA.length; coeffIndex += 1) {
      const outputIndex = sampleIndex - coeffIndex
      if (outputIndex >= 0) {
        denominator += paddedA[coeffIndex] * output[outputIndex]
      }
    }

    output[sampleIndex] = (numerator - denominator) / a0
  }

  return output
}

// Áp dụng bandpass theo odd-padding và forward/backward filtering.
const applyBandpass = (signal, filterConfig) => {
  if (String(filterConfig.applyMode || "filtfilt").toLowerCase() !== "filtfilt") {
    throw new Error("Unsupported bandpass apply_mode")
  }

  const normalizedA = filterConfig.aCoeffs.map((value) => Number(value) / Number(filterConfig.aCoeffs[0]))
  const normalizedB = filterConfig.bCoeffs.map((value) => Number(value) / Number(filterConfig.aCoeffs[0]))
  const edge = Number.isInteger(filterConfig.padLength)
    ? filterConfig.padLength
    : 3 * Math.max(normalizedA.length, normalizedB.length)
  const extendedSignal = buildOddExtendedSignal(signal, edge)
  const forward = runIirFilter(extendedSignal, normalizedB, normalizedA)
  const reversedForward = forward.slice().reverse()
  const backward = runIirFilter(reversedForward, normalizedB, normalizedA)
  return backward.reverse().slice(edge, edge + signal.length)
}

// Tìm R-peak theo local maxima, ngưỡng biên độ và khoảng cách tối thiểu kiểu SciPy.
const detectPeaks = (signal, minHeight, minDistance) => {
  const candidates = []

  for (let i = 1; i < signal.length - 1; i += 1) {
    const current = signal[i]
    if (current < minHeight) continue
    if (!(current > signal[i - 1] && current >= signal[i + 1])) continue
    candidates.push(i)
  }

  if (minDistance <= 1 || candidates.length <= 1) {
    return candidates
  }

  const accepted = []
  const sortedByPriority = candidates.slice().sort((leftIndex, rightIndex) => {
    const amplitudeDiff = signal[rightIndex] - signal[leftIndex]
    if (amplitudeDiff !== 0) return amplitudeDiff
    return leftIndex - rightIndex
  })

  for (const candidateIndex of sortedByPriority) {
    const hasConflict = accepted.some((keptIndex) => Math.abs(keptIndex - candidateIndex) < minDistance)
    if (!hasConflict) {
      accepted.push(candidateIndex)
    }
  }

  return accepted.sort((leftIndex, rightIndex) => leftIndex - rightIndex)
}

// Cắt tín hiệu đã lọc thành nhiều segment quanh từng peak.
const extractSegmentsFromPeaks = (filteredSignal, peaks, halfWindow, segmentLength) => {
  const segments = []
  for (let segmentIndex = 0; segmentIndex < peaks.length; segmentIndex += 1) {
    const peakIndex = peaks[segmentIndex]
    const start = peakIndex - halfWindow
    const end = peakIndex + halfWindow + 1
    if (start < 0 || end > filteredSignal.length) continue

    const values = filteredSignal.slice(start, end)
    if (values.length !== segmentLength) continue

    segments.push({
      segment_index: segmentIndex,
      peak_sample: peakIndex,
      start_sample: start,
      end_sample: end,
      values,
    })
  }
  return segments
}

// Chuẩn hóa các segment thành mảng phẳng để tạo tensor batch cho model.
const flattenSegmentsToModelInput = (segments, segmentLength, scalerMean, scalerScale) => {
  const flat = new Float32Array(segments.length * segmentLength)
  for (let beatIndex = 0; beatIndex < segments.length; beatIndex += 1) {
    const values = segments[beatIndex].values
    for (let i = 0; i < segmentLength; i += 1) {
      flat[beatIndex * segmentLength + i] = (Number(values[i]) - scalerMean) / scalerScale
    }
  }
  return flat
}

// Chạy trọn pipeline preprocessing và trả về filtered signal, peaks, segments cùng metadata runtime.
const preprocessSignalForInference = (ecgSignal, options = {}) => {
  const preprocessConfig = getValidatedPreprocessConfig()
  const runtimeConfig = getRuntimeNumericConfig()
  if (!runtimeConfig.isValid) {
    return {
      skipped: true,
      reason: "MODEL_NOT_READY",
      input_len: 0,
      input_truncated: false,
      filtered_signal: [],
      peaks: [],
      segments: [],
      runtime_config: runtimeConfig,
      preprocess_config: preprocessConfig,
    }
  }

  const sanitized = sanitizeSignalInput(ecgSignal, options)
  if (!sanitized.signal) {
    return {
      skipped: true,
      reason: "INVALID_INPUT",
      input_len: sanitized.inputLength,
      input_truncated: sanitized.truncated,
      filtered_signal: [],
      peaks: [],
      segments: [],
      runtime_config: runtimeConfig,
      preprocess_config: preprocessConfig,
    }
  }

  const signal = sanitized.signal
  const { segmentLength, halfWindow, rpeakMinDistanceSec, fsHz, rpeakMinHeight } = runtimeConfig.values
  if (signal.length < segmentLength) {
    return {
      skipped: true,
      reason: "SHORT_SIGNAL",
      input_len: signal.length,
      input_truncated: sanitized.truncated,
      filtered_signal: [],
      peaks: [],
      segments: [],
      runtime_config: runtimeConfig,
      preprocess_config: preprocessConfig,
    }
  }

  const filterConfig = buildBandpassCoefficients()
  const filteredSignal = applyBandpass(signal, filterConfig)
    .map((value) => Number(value))
    .filter(Number.isFinite)

  if (filteredSignal.length === 0) {
    return {
      skipped: true,
      reason: "INFER_ERROR",
      input_len: signal.length,
      input_truncated: sanitized.truncated,
      filtered_signal: [],
      peaks: [],
      segments: [],
      runtime_config: runtimeConfig,
      preprocess_config: preprocessConfig,
    }
  }

  const minDistance = Math.max(1, Math.round(rpeakMinDistanceSec * fsHz))
  const peaks = detectPeaks(filteredSignal, rpeakMinHeight, minDistance)
  const segments = extractSegmentsFromPeaks(filteredSignal, peaks, halfWindow, segmentLength)
  const reason = segments.length === 0 ? "NO_PEAK" : null

  return {
    skipped: reason !== null,
    reason,
    input_len: signal.length,
    input_truncated: sanitized.truncated,
    raw_input_len: sanitized.rawInputLength || signal.length,
    filtered_signal: filteredSignal,
    peaks,
    segments,
    runtime_config: runtimeConfig,
    preprocess_config: preprocessConfig,
  }
}

// Lọc tín hiệu ECG để lưu DB nhưng không làm fail nghiệp vụ nếu preprocessing lỗi.
const filterReadingSignal = (ecgSignal, options = {}) => {
  const parsed = parseSignalInput(ecgSignal)
  if (!parsed) {
    return {
      filtered_signal: [],
      skipped: true,
      reason: "INVALID_INPUT",
      input_len: 0,
    }
  }

  const signal = parsed.map((value) => Number(value)).filter(Number.isFinite)
  if (signal.length === 0) {
    return {
      filtered_signal: [],
      skipped: true,
      reason: "INVALID_INPUT",
      input_len: 0,
    }
  }

  try {
    const runtimeConfig = getRuntimeNumericConfig()
    if (!runtimeConfig.isValid) {
      return {
        filtered_signal: signal,
        skipped: true,
        reason: "MODEL_NOT_READY",
        input_len: signal.length,
      }
    }

    const coeffs = buildBandpassCoefficients()
    const filteredSignal = applyBandpass(signal, coeffs)
      .map((value) => Number(value))
      .filter(Number.isFinite)

    if (filteredSignal.length === 0) {
      return {
        filtered_signal: signal,
        skipped: true,
        reason: "INFER_ERROR",
        input_len: signal.length,
      }
    }

    return {
      filtered_signal: filteredSignal,
      skipped: false,
      reason: null,
      input_len: signal.length,
    }
  } catch (error) {
    return {
      filtered_signal: signal,
      skipped: true,
      reason: "INFER_ERROR",
      input_len: signal.length,
    }
  }
}

// Expose preprocessing runtime cho bài test parity mà không chạy model.
const preprocessReadingForTest = (ecgSignal, options = {}) =>
  preprocessSignalForInference(ecgSignal, {
    disableTruncate: options?.disableTruncate !== false,
  })

module.exports = {
  filterReadingSignal,
  preprocessReadingForTest,
  preprocessSignalForInference,
  flattenSegmentsToModelInput,
}

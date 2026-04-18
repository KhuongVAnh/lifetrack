/*
Tác dụng:
- Chứa các helper chuẩn hóa tín hiệu ECG, heart rate và metadata realtime cho luồng ingest telemetry.

Vấn đề file này giải quyết:
- Telemetry từ thiết bị có thể gửi ECG, heart rate hoặc metadata sample rate/duration sai định dạng, nên cần một lớp chuẩn hóa nhỏ gọn dùng lại ở nhiều nơi.
- Cách làm: parse input về mảng số hợp lệ, chuẩn hóa BPM, suy ra BPM từ số beat khi có sẵn, và chuẩn hóa metadata sample rate/chunk duration cho socket realtime.

Function chính:
- normalizeEcgSignal: chuyển input ECG về mảng số hợp lệ.
- toHeartRate: chuẩn hóa `heart_rate` về số nguyên dương hợp lệ.
- deriveHeartRateFromBeatCount: tính BPM từ số beat và độ dài tín hiệu.
- resolveTelemetrySampleRate: suy ra tần số lấy mẫu ECG từ payload telemetry.
- resolveTelemetryChunkDurationSec: suy ra thời lượng chunk ECG từ metadata explicit hoặc số mẫu.
- buildRealtimeEcgMeta: tạo metadata realtime chuẩn hóa để emit cho frontend.
*/

const DEFAULT_TELEMETRY_SAMPLE_RATE = 250

// Hàm chuẩn hóa giá trị bất kỳ về số dương hợp lệ cho các metadata telemetry.
const toPositiveNumber = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

// Hàm chuẩn hóa tín hiệu ECG về mảng số hợp lệ để lưu và suy luận.
const normalizeEcgSignal = (input) => {
  let value = input
  if (typeof value === "string") {
    try {
      value = JSON.parse(value)
    } catch (error) {
      return []
    }
  }

  if (!Array.isArray(value)) return []
  return value.map((item) => Number(item)).filter(Number.isFinite)
}

// Hàm chuẩn hóa heart_rate từ đầu vào telemetry về số nguyên dương hợp lệ.
const toHeartRate = (value) => {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

// Hàm tính BPM từ số beat và độ dài tín hiệu khi đã có sẵn số beat hợp lệ.
const deriveHeartRateFromBeatCount = (
  beatCount,
  sampleCount,
  sampleRate = DEFAULT_TELEMETRY_SAMPLE_RATE
) => {
  const beats = Number.parseInt(beatCount, 10)
  const samples = Number.parseInt(sampleCount, 10)
  const fs = Number(sampleRate)

  if (!Number.isInteger(beats) || beats <= 0) return null
  if (!Number.isInteger(samples) || samples <= 0) return null
  if (!Number.isFinite(fs) || fs <= 0) return null

  const durationSec = samples / fs
  if (!Number.isFinite(durationSec) || durationSec <= 0) return null

  return Math.max(1, Math.round((beats * 60) / durationSec))
}

// Hàm suy ra tần số lấy mẫu ECG từ payload telemetry, ưu tiên metadata explicit từ thiết bị.
const resolveTelemetrySampleRate = (payload, fallback = DEFAULT_TELEMETRY_SAMPLE_RATE) => {
  return (
    toPositiveNumber(payload?.sampling_rate?.ecg_hz) ??
    toPositiveNumber(payload?.sample_rate_hz) ??
    toPositiveNumber(fallback) ??
    DEFAULT_TELEMETRY_SAMPLE_RATE
  )
}

// Hàm suy ra thời lượng chunk ECG từ metadata explicit hoặc tự tính từ số mẫu và sample rate.
const resolveTelemetryChunkDurationSec = ({
  payload,
  chunkSampleCount,
  sampleRate = DEFAULT_TELEMETRY_SAMPLE_RATE,
} = {}) => {
  const explicitDuration =
    toPositiveNumber(payload?.sampling_rate?.duration) ??
    toPositiveNumber(payload?.chunk_duration_sec) ??
    toPositiveNumber(payload?.duration)

  if (explicitDuration !== null) return explicitDuration

  const samples = Number.parseInt(chunkSampleCount, 10)
  const fs = toPositiveNumber(sampleRate)
  if (!Number.isInteger(samples) || samples <= 0 || fs === null) return null

  return Number((samples / fs).toFixed(3))
}

// Hàm tạo metadata realtime chuẩn hóa đi kèm chunk ECG khi emit socket cho frontend.
const buildRealtimeEcgMeta = ({
  payload,
  ecgSignal,
  fallbackSampleRate = DEFAULT_TELEMETRY_SAMPLE_RATE,
} = {}) => {
  const chunkSampleCount = Array.isArray(ecgSignal) ? ecgSignal.length : 0
  const sampleRateHz = resolveTelemetrySampleRate(payload, fallbackSampleRate)
  const chunkDurationSec =
    resolveTelemetryChunkDurationSec({
      payload,
      chunkSampleCount,
      sampleRate: sampleRateHz,
    }) ?? 0

  return {
    sample_rate_hz: sampleRateHz,
    chunk_sample_count: chunkSampleCount,
    chunk_duration_sec: chunkDurationSec,
  }
}

module.exports = {
  DEFAULT_TELEMETRY_SAMPLE_RATE,
  normalizeEcgSignal,
  toHeartRate,
  deriveHeartRateFromBeatCount,
  resolveTelemetrySampleRate,
  resolveTelemetryChunkDurationSec,
  buildRealtimeEcgMeta,
}

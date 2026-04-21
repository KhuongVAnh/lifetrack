import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_SAMPLE_RATE_HZ,
  getReadingDetail,
  getReadingsHistory,
  normalizeEcgSignal,
} from "@/features/realtime-monitor/api/ecgApi";

const LIVE_WINDOW_SECONDS = 5;
const BUFFER_WINDOW_SECONDS = 10;
const STREAM_STALE_AFTER_MS = 12000;

function normalizeSampleRate(sampleRate) {
  const numericRate = Number(sampleRate);
  return numericRate > 0 ? numericRate : DEFAULT_SAMPLE_RATE_HZ;
}

function normalizeHeartRate(heartRate) {
  const numericHeartRate = Number.parseInt(heartRate, 10);
  return Number.isInteger(numericHeartRate) && numericHeartRate > 0 ? numericHeartRate : null;
}

function getChunkDurationMs(payload, sampleRateHz, sampleCount) {
  const chunkDurationSeconds = Number(payload?.chunk_duration_seconds);
  if (chunkDurationSeconds > 0) {
    return Math.round(chunkDurationSeconds * 1000);
  }

  if (sampleCount > 0 && sampleRateHz > 0) {
    return Math.round((sampleCount / sampleRateHz) * 1000);
  }

  return LIVE_WINDOW_SECONDS * 1000;
}

function getInitialReadingState() {
  return {
    reading_id: null,
    timestamp: null,
    heart_rate: null,
    ai_status: "PENDING",
    ai_result: null,
    ai_error: null,
    device: null,
    patient: null,
    alerts: [],
  };
}

function shouldPreserveAiState(currentState, nextStatus) {
  if (nextStatus !== "PENDING") {
    return false;
  }

  return Boolean(
    currentState?.result
    || currentState?.error
    || currentState?.status === "DONE"
    || currentState?.status === "FAILED",
  );
}

function isRelevantRealtimePayload(payload, userId, latestReadingId) {
  const payloadUserId = Number(payload?.user_id);
  const payloadReadingId = Number(payload?.reading_id);
  const currentUserId = Number(userId);
  const currentReadingId = Number(latestReadingId);

  if (payloadUserId && currentUserId && payloadUserId === currentUserId) {
    return true;
  }

  if (payloadReadingId && currentReadingId && payloadReadingId === currentReadingId) {
    return true;
  }

  return false;
}

function signalsEqual(leftSignal, rightSignal) {
  if (leftSignal === rightSignal) {
    return true;
  }

  if (!leftSignal?.length && !rightSignal?.length) {
    return true;
  }

  if (!Array.isArray(leftSignal) || !Array.isArray(rightSignal) || leftSignal.length !== rightSignal.length) {
    return false;
  }

  for (let index = 0; index < leftSignal.length; index += 1) {
    if (leftSignal[index] !== rightSignal[index]) {
      return false;
    }
  }

  return true;
}

export function useRealtimeEcgStream(
  userId,
  socket,
  { enabled = true, pollIntervalMs = 0 } = {},
) {
  const [liveSignal, setLiveSignal] = useState([]);
  const [sampleRateHz, setSampleRateHz] = useState(DEFAULT_SAMPLE_RATE_HZ);
  const [heartRate, setHeartRate] = useState(null);
  const [aiState, setAiState] = useState({ status: "PENDING", result: null, error: null, readingId: null, timestamp: null });
  const [latestReadingId, setLatestReadingId] = useState(null);
  const [lastChunkAt, setLastChunkAt] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [signalVersion, setSignalVersion] = useState(0);
  const [transitionDurationMs, setTransitionDurationMs] = useState(LIVE_WINDOW_SECONDS * 1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [latestReading, setLatestReading] = useState(getInitialReadingState);

  const bufferRef = useRef([]);
  const visibleSignalRef = useRef([]);
  const lastChunkAtRef = useRef(null);

  const resetStream = useCallback(() => {
    bufferRef.current = [];
    visibleSignalRef.current = [];
    lastChunkAtRef.current = null;
    setLiveSignal([]);
    setSampleRateHz(DEFAULT_SAMPLE_RATE_HZ);
    setHeartRate(null);
    setAiState({ status: "PENDING", result: null, error: null, readingId: null, timestamp: null });
    setLatestReadingId(null);
    setLastChunkAt(null);
    setIsStreaming(false);
    setSignalVersion(0);
    setTransitionDurationMs(LIVE_WINDOW_SECONDS * 1000);
    setLatestReading(getInitialReadingState());
    setError("");
  }, []);

  const updateVisibleWindow = useCallback((signal, nextSampleRateHz, durationMs, { append = false } = {}) => {
    const normalizedSignal = normalizeEcgSignal(signal);
    if (!normalizedSignal.length) {
      return [];
    }

    const bufferLimit = Math.max(Math.round(nextSampleRateHz * BUFFER_WINDOW_SECONDS), normalizedSignal.length);
    const nextBuffer = append
      ? [...bufferRef.current, ...normalizedSignal].slice(-bufferLimit)
      : normalizedSignal.slice(-bufferLimit);
    const visibleLimit = Math.max(1, Math.round(nextSampleRateHz * LIVE_WINDOW_SECONDS));
    const nextVisibleSignal = nextBuffer.slice(-visibleLimit);

    bufferRef.current = nextBuffer;
    setSampleRateHz(nextSampleRateHz);
    setTransitionDurationMs(durationMs);
    if (!signalsEqual(visibleSignalRef.current, nextVisibleSignal)) {
      visibleSignalRef.current = nextVisibleSignal;
      setLiveSignal(nextVisibleSignal);
      setSignalVersion((currentVersion) => currentVersion + 1);
    }

    return nextVisibleSignal;
  }, []);

  const hasFreshStream = useCallback(() => {
    if (!lastChunkAtRef.current) {
      return false;
    }

    return Date.now() - lastChunkAtRef.current < STREAM_STALE_AFTER_MS;
  }, []);

  const hydrateLatestReading = useCallback((reading) => {
    if (!reading) {
      return;
    }

    setLatestReading((currentReading) => ({
      ...currentReading,
      ...reading,
      device: reading.device ?? currentReading.device,
      patient: reading.patient ?? currentReading.patient,
      alerts: Array.isArray(reading.alerts) ? reading.alerts : currentReading.alerts,
    }));
  }, []);

  const loadLatestReading = useCallback(async ({ replaceSignal = false } = {}) => {
    if (!enabled || !userId) {
      resetStream();
      return null;
    }

    setLoading(true);

    try {
      const historyResponse = await getReadingsHistory(userId, 20, 0);
      const latestHistoryReading = historyResponse.readings?.[0] ?? null;
      const latestFinalizedReading = (historyResponse.readings ?? []).find(
        (reading) => reading.ai_status === "DONE" || reading.ai_status === "FAILED",
      ) ?? null;

      if (!latestHistoryReading?.reading_id) {
        setError("");
        return null;
      }

      const detailResponse = await getReadingDetail(latestHistoryReading.reading_id);
      const detailReading = detailResponse.reading ?? null;

      if (!detailReading) {
        return null;
      }

      hydrateLatestReading(detailReading);
      setLatestReadingId(detailReading.reading_id);
      setHeartRate(normalizeHeartRate(detailReading.heart_rate));
      const nextAiStatus = detailReading.ai_status || "PENDING";
      if (latestFinalizedReading && nextAiStatus === "PENDING") {
        setAiState({
          status: latestFinalizedReading.ai_status || "PENDING",
          result: latestFinalizedReading.ai_result || null,
          error: latestFinalizedReading.ai_error || null,
          readingId: latestFinalizedReading.reading_id || null,
          timestamp: latestFinalizedReading.ai_completed_at || latestFinalizedReading.timestamp || null,
        });
      } else {
        setAiState((currentState) => {
          if (shouldPreserveAiState(currentState, nextAiStatus)) {
            return currentState;
          }

          return {
            status: nextAiStatus,
            result: detailReading.ai_result || null,
            error: detailReading.ai_error || null,
            readingId: detailReading.reading_id || null,
            timestamp: detailReading.ai_completed_at || detailReading.timestamp || null,
          };
        });
      }
      setError("");

      if (replaceSignal) {
        updateVisibleWindow(
          detailReading.ecg_signal,
          DEFAULT_SAMPLE_RATE_HZ,
          LIVE_WINDOW_SECONDS * 1000,
          { append: false },
        );
        setIsStreaming(false);
      }

      return detailReading;
    } catch (nextError) {
      setError(nextError.response?.data?.message || "Không thể tải dữ liệu ECG realtime");
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, hydrateLatestReading, resetStream, updateVisibleWindow, userId]);

  const loadReadingById = useCallback(async (readingId) => {
    if (!enabled || !readingId) {
      return null;
    }

    try {
      const detailResponse = await getReadingDetail(readingId);
      const detailReading = detailResponse.reading ?? null;

      if (!detailReading) {
        return null;
      }

      hydrateLatestReading(detailReading);
      setLatestReadingId(detailReading.reading_id);
      setHeartRate(normalizeHeartRate(detailReading.heart_rate));
      const nextAiStatus = detailReading.ai_status || "PENDING";
      setAiState((currentState) => {
        if (shouldPreserveAiState(currentState, nextAiStatus)) {
          return currentState;
        }

        return {
          status: nextAiStatus,
          result: detailReading.ai_result || null,
          error: detailReading.ai_error || null,
          readingId: detailReading.reading_id || null,
          timestamp: detailReading.ai_completed_at || detailReading.timestamp || null,
        };
      });
      setError("");

      return detailReading;
    } catch (nextError) {
      setError(nextError.response?.data?.message || "Không thể đồng bộ kết quả AI mới nhất");
      return null;
    }
  }, [enabled, hydrateLatestReading]);

  useEffect(() => {
    if (!enabled || !userId) {
      resetStream();
      return undefined;
    }

    void loadLatestReading({ replaceSignal: true });
    return undefined;
  }, [enabled, loadLatestReading, resetStream, userId]);

  useEffect(() => {
    if (!enabled || !pollIntervalMs || !userId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void loadLatestReading({ replaceSignal: !hasFreshStream() });
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, hasFreshStream, loadLatestReading, pollIntervalMs, userId]);

  useEffect(() => {
    if (!socket || !enabled || !userId) {
      return undefined;
    }

    const handleReadingUpdate = (payload) => {
      if (!isRelevantRealtimePayload(payload, userId, latestReadingId)) {
        return;
      }

      const nextSignal = normalizeEcgSignal(payload.ecg_signal);
      if (!nextSignal.length) {
        return;
      }

      const nextSampleRateHz = normalizeSampleRate(payload.sample_rate_hz);
      const durationMs = getChunkDurationMs(payload, nextSampleRateHz, nextSignal.length);

      updateVisibleWindow(nextSignal, nextSampleRateHz, durationMs, { append: true });
      setLatestReadingId(Number(payload.reading_id) || null);
      const now = Date.now();
      lastChunkAtRef.current = now;
      setLastChunkAt(now);
      setIsStreaming(true);

      const nextHeartRate = normalizeHeartRate(payload.heart_rate);
      if (nextHeartRate) {
        setHeartRate(nextHeartRate);
      }

      hydrateLatestReading({
        reading_id: Number(payload.reading_id) || null,
        timestamp: payload.timestamp ?? null,
        heart_rate: nextHeartRate,
        abnormal_detected: Boolean(payload.abnormal_detected),
        device: payload.serial_number ? { serial_number: payload.serial_number } : null,
        alerts: [],
      });
      setError("");
    };

    const handleAiUpdated = (payload) => {
      if (!isRelevantRealtimePayload(payload, userId, latestReadingId)) {
        return;
      }

      const payloadReadingId = Number(payload.reading_id) || null;
      if (payloadReadingId) {
        setLatestReadingId(payloadReadingId);
      }

      const nextHeartRate = normalizeHeartRate(payload.heart_rate);
      if (nextHeartRate) {
        setHeartRate(nextHeartRate);
      }

      setAiState({
        status: payload.ai_status || "DONE",
        result: payload.ai_result || null,
        error: payload.ai_error || null,
        readingId: payloadReadingId,
        timestamp: payload.timestamp ?? null,
      });

      hydrateLatestReading({
        reading_id: payloadReadingId,
        timestamp: payload.timestamp ?? null,
        heart_rate: nextHeartRate,
        ai_status: payload.ai_status || "DONE",
        ai_result: payload.ai_result || null,
        ai_error: payload.ai_error || null,
        abnormal_detected: Boolean(payload.abnormal_detected),
        device: payload.serial_number ? { serial_number: payload.serial_number } : null,
      });

      if (payloadReadingId) {
        void loadReadingById(payloadReadingId);
        return;
      }

      if (!hasFreshStream() || payloadReadingId === latestReadingId) {
        void loadLatestReading({ replaceSignal: false });
      }
    };

    socket.on("reading-update", handleReadingUpdate);
    socket.on("reading-ai-updated", handleAiUpdated);

    return () => {
      socket.off("reading-update", handleReadingUpdate);
      socket.off("reading-ai-updated", handleAiUpdated);
    };
  }, [enabled, hasFreshStream, hydrateLatestReading, latestReadingId, loadLatestReading, loadReadingById, socket, updateVisibleWindow, userId]);

  return {
    liveSignal,
    sampleRateHz,
    heartRate,
    aiState,
    latestReadingId,
    latestReading,
    isStreaming,
    lastChunkAt,
    signalVersion,
    transitionDurationMs,
    loading,
    error,
    refreshLatestReading: loadLatestReading,
  };
}

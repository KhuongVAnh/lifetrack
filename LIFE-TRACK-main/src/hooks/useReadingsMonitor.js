import { useCallback, useEffect, useState } from "react";
import { getReadingDetail, getReadingsHistory } from "../services/ecgService";

export function useReadingsMonitor(
  userId,
  socket,
  { enabled = true, autoFollowLatest = false, pollIntervalMs = 0 } = {},
) {
  const [history, setHistory] = useState([]);
  const [activeReadingId, setActiveReadingId] = useState(null);
  const [readingDetail, setReadingDetail] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    if (!userId || !enabled) {
      setHistory([]);
      setActiveReadingId(null);
      return [];
    }

    setLoadingHistory(true);
    try {
      const data = await getReadingsHistory(userId);
      const nextHistory = data.readings ?? [];
      setHistory(nextHistory);
      setActiveReadingId((currentId) => {
        if (autoFollowLatest) {
          return nextHistory[0]?.reading_id ?? null;
        }

        if (currentId && nextHistory.some((reading) => reading.reading_id === currentId)) {
          return currentId;
        }

        return nextHistory[0]?.reading_id ?? null;
      });
      setError("");
      return nextHistory;
    } catch (nextError) {
      setError(nextError.response?.data?.message || "Không thể tải dữ liệu ECG");
      return [];
    } finally {
      setLoadingHistory(false);
    }
  }, [autoFollowLatest, enabled, userId]);

  const loadReadingDetail = useCallback(async (readingId) => {
    if (!readingId || !enabled) {
      setReadingDetail(null);
      return null;
    }

    setLoadingDetail(true);
    try {
      const data = await getReadingDetail(readingId);
      setReadingDetail(data.reading ?? null);
      setError("");
      return data.reading ?? null;
    } catch (nextError) {
      setError(nextError.response?.data?.message || "Không thể tải chi tiết bản ghi ECG");
      return null;
    } finally {
      setLoadingDetail(false);
    }
  }, [enabled]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!enabled || !pollIntervalMs) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void loadHistory();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, loadHistory, pollIntervalMs]);

  useEffect(() => {
    if (!activeReadingId) {
      setReadingDetail(null);
      return;
    }

    void loadReadingDetail(activeReadingId);
  }, [activeReadingId, loadReadingDetail]);

  useEffect(() => {
    if (!socket || !enabled || !userId) {
      return undefined;
    }

    const handleReadingUpdated = (payload) => {
      const payloadUserId = Number(payload?.user_id);
      const payloadReadingId = Number(payload?.reading_id);
      const currentUserId = Number(userId);

      if (payloadUserId !== currentUserId && payloadReadingId !== Number(activeReadingId)) {
        return;
      }

      if (payloadReadingId) {
        setActiveReadingId(payloadReadingId);
      }

      void loadHistory();
      void loadReadingDetail(payloadReadingId || activeReadingId);
    };

    socket.on("reading-ai-updated", handleReadingUpdated);

    return () => {
      socket.off("reading-ai-updated", handleReadingUpdated);
    };
  }, [activeReadingId, enabled, loadHistory, loadReadingDetail, socket, userId]);

  return {
    history,
    activeReadingId,
    setActiveReadingId,
    readingDetail,
    loadingHistory,
    loadingDetail,
    error,
    refreshHistory: loadHistory,
    refreshReadingDetail: loadReadingDetail,
  };
}

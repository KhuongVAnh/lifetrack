import { useCallback, useEffect, useState } from "react";
import { buildWarningReadings, getPatientAlerts, getSystemAlerts } from "../services/alertService";

export function useWarningReadings(
  userId,
  socket,
  { scope = "patient", enabled = true, pollIntervalMs = 10000, limit = 5 } = {},
) {
  const [warningReadings, setWarningReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadWarningReadings = useCallback(async () => {
    if (!enabled || !userId) {
      setWarningReadings([]);
      setError("");
      return [];
    }

    setLoading(true);
    try {
      const data = scope === "system"
        ? await getSystemAlerts()
        : await getPatientAlerts(userId);
      const nextWarningReadings = buildWarningReadings(data.alerts, { limit, userId });

      setWarningReadings(nextWarningReadings);
      setError("");
      return nextWarningReadings;
    } catch (nextError) {
      setWarningReadings([]);
      setError(nextError.response?.data?.message || "Không thể tải danh sách cảnh báo ECG");
      return [];
    } finally {
      setLoading(false);
    }
  }, [enabled, limit, scope, userId]);

  useEffect(() => {
    void loadWarningReadings();
  }, [loadWarningReadings]);

  useEffect(() => {
    if (!enabled || !pollIntervalMs || !userId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void loadWarningReadings();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, loadWarningReadings, pollIntervalMs, userId]);

  useEffect(() => {
    if (!socket || !enabled || !userId) {
      return undefined;
    }

    const refreshIfRelevant = (payload) => {
      if (Number(payload?.user_id) !== Number(userId)) {
        return;
      }

      void loadWarningReadings();
    };

    socket.on("reading-ai-updated", refreshIfRelevant);
    socket.on("alert", refreshIfRelevant);

    return () => {
      socket.off("reading-ai-updated", refreshIfRelevant);
      socket.off("alert", refreshIfRelevant);
    };
  }, [enabled, loadWarningReadings, socket, userId]);

  return {
    warningReadings,
    loading,
    error,
    refreshWarningReadings: loadWarningReadings,
  };
}

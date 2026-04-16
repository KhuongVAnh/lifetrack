import axiosInstance from "../config/axios";

function toFiniteNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeAlertUser(user) {
  if (!user) {
    return null;
  }

  const userId = toFiniteNumber(user.user_id ?? user.id);

  return {
    ...user,
    user_id: userId,
  };
}

export function normalizeAlert(alert) {
  if (!alert) {
    return null;
  }

  const readingId = toFiniteNumber(alert.reading_id ?? alert.readingId);
  const userId = toFiniteNumber(alert.user_id ?? alert.userId ?? alert.user?.user_id);

  if (!readingId) {
    return null;
  }

  return {
    ...alert,
    alert_id: toFiniteNumber(alert.alert_id ?? alert.id) ?? `${readingId}-${alert.timestamp ?? "unknown"}`,
    reading_id: readingId,
    user_id: userId,
    resolved: Boolean(alert.resolved),
    timestamp: alert.timestamp ?? alert.created_at ?? null,
    alert_type: alert.alert_type ?? alert.type ?? "ALERT",
    label_text: alert.label_text ?? alert.message ?? null,
    user: normalizeAlertUser(alert.user),
  };
}

function normalizeAlertsResponse(alerts) {
  return (alerts ?? []).map(normalizeAlert).filter(Boolean);
}

function getAlertSortValue(alert) {
  const timestamp = new Date(alert.timestamp ?? 0).getTime();
  const alertId = toFiniteNumber(alert.alert_id) ?? 0;
  return { timestamp, alertId };
}

export async function getPatientAlerts(userId, params = {}) {
  const { data } = await axiosInstance.get(`/alerts/${userId}`, { params });
  return {
    ...data,
    alerts: normalizeAlertsResponse(data.alerts),
  };
}

export async function getSystemAlerts(params = {}) {
  const { data } = await axiosInstance.get("/alerts", { params });
  return {
    ...data,
    alerts: normalizeAlertsResponse(data.alerts),
  };
}

export function buildWarningReadings(alerts, { limit = 5, userId = null } = {}) {
  const targetUserId = toFiniteNumber(userId);
  const filteredAlerts = normalizeAlertsResponse(alerts)
    .filter((alert) => {
      if (!targetUserId) {
        return true;
      }

      return alert.user_id === targetUserId;
    })
    .sort((left, right) => {
      const leftSortValue = getAlertSortValue(left);
      const rightSortValue = getAlertSortValue(right);

      if (leftSortValue.timestamp !== rightSortValue.timestamp) {
        return rightSortValue.timestamp - leftSortValue.timestamp;
      }

      return rightSortValue.alertId - leftSortValue.alertId;
    });

  const warningMap = new Map();

  filteredAlerts.forEach((alert) => {
    if (!warningMap.has(alert.reading_id)) {
      warningMap.set(alert.reading_id, {
        readingId: alert.reading_id,
        userId: alert.user_id,
        timestamp: alert.timestamp,
        primaryAlert: alert,
        resolved: alert.resolved,
        alertCount: 1,
        alerts: [alert],
      });
      return;
    }

    const existingWarning = warningMap.get(alert.reading_id);
    existingWarning.alertCount += 1;
    existingWarning.alerts.push(alert);
    existingWarning.resolved = existingWarning.resolved && alert.resolved;
  });

  return Array.from(warningMap.values()).slice(0, limit);
}

export function formatDateTime(value) {
  if (!value) {
    return "Chưa có dữ liệu";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Chưa có dữ liệu";
  }

  return parsed.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusTone(aiStatus) {
  switch (aiStatus) {
    case "DONE":
      return "text-secondary bg-secondary/10";
    case "FAILED":
      return "text-error bg-error/10";
    case "PENDING":
    default:
      return "text-primary bg-sky-50";
  }
}

export function getAlertOverlays(alerts, signalLength) {
  if (!Array.isArray(alerts) || signalLength <= 1) {
    return [];
  }

  return alerts
    .filter((alert) =>
      Number.isFinite(alert?.segment_start_sample) &&
      Number.isFinite(alert?.segment_end_sample) &&
      alert.segment_end_sample > alert.segment_start_sample,
    )
    .map((alert) => {
      const left = (alert.segment_start_sample / (signalLength - 1)) * 100;
      const width = ((alert.segment_end_sample - alert.segment_start_sample) / (signalLength - 1)) * 100;

      return {
        ...alert,
        left,
        width,
      };
    });
}

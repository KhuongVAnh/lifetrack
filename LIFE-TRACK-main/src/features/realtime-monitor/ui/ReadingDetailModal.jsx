import { useEffect, useState } from "react";
import { getReadingDetail } from "@/features/realtime-monitor/api/ecgApi";
import { formatDateTime, getAlertOverlays, getStatusTone } from "@/features/realtime-monitor/lib/ecgMonitor";
import { RealtimeEcgChart } from "@/features/realtime-monitor/ui/RealtimeEcgChart";

export function ReadingDetailModal({ readingId, open, onClose }) {
  const [readingDetail, setReadingDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !readingId) {
      setReadingDetail(null);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;

    const loadReadingDetail = async () => {
      setLoading(true);
      try {
        const data = await getReadingDetail(readingId);
        if (cancelled) {
          return;
        }

        setReadingDetail(data.reading ?? null);
        setError("");
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setReadingDetail(null);
        setError(nextError.response?.data?.message || "Không thể tải chi tiết bản ghi ECG");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReadingDetail();

    return () => {
      cancelled = true;
    };
  }, [open, readingId]);

  const signal = readingDetail?.ecg_signal ?? [];
  const alertOverlays = readingDetail?.ai_status === "DONE"
    ? getAlertOverlays(readingDetail.alerts, signal.length)
    : [];

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-modal="true"
        className="max-h-full w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 md:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Chi tiết cảnh báo</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Reading #{readingId}</h2>
            <p className="mt-1 text-sm text-slate-500">Biểu đồ ECG đầy đủ và vùng bất thường được AI đánh dấu.</p>
          </div>
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid max-h-[calc(100vh-140px)] gap-6 overflow-y-auto px-6 py-6 md:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] md:px-8">
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Thời điểm đo</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{formatDateTime(readingDetail?.timestamp)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nhịp tim</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{readingDetail?.heart_rate || "--"} BPM</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Trạng thái AI</p>
                <p className="mt-1">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getStatusTone(readingDetail?.ai_status)}`}>
                    {readingDetail?.ai_status || "PENDING"}
                  </span>
                </p>
              </div>
            </div>

            <div className="relative h-[340px] overflow-hidden rounded-[1.75rem] border border-slate-100 bg-slate-50/60 ecg-grid">
              <div className="absolute left-5 top-5 z-10 flex items-center gap-2 font-mono text-sm font-bold text-secondary">
                <span className="material-symbols-outlined">monitor_heart</span>
                ECG Detail
              </div>

              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-500">
                  Đang tải dữ liệu ECG...
                </div>
              ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium text-error">
                  {error}
                </div>
              ) : signal.length ? (
                <>
                  {alertOverlays.map((alert) => (
                    <div
                      key={alert.alert_id ?? `${alert.left}-${alert.width}`}
                      className="absolute top-0 bottom-0 border-x border-error/20 bg-error/10"
                      style={{ left: `${alert.left}%`, width: `${Math.max(alert.width, 1)}%` }}
                    />
                  ))}
                  <RealtimeEcgChart
                    animateOnReceive={false}
                    height={220}
                    signal={signal}
                    signalVersion={readingDetail?.reading_id ?? 0}
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-500">
                  Bản ghi này chưa có tín hiệu ECG.
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Tổng quan AI</p>
              <p className="mt-3 text-lg font-bold text-slate-800">{readingDetail?.ai_result || "Đang phân tích"}</p>
              <p className="mt-2 text-sm text-slate-500">{readingDetail?.ai_error || "AI đã đánh dấu các segment bất thường ngay trên biểu đồ nếu bản ghi đã xử lý xong."}</p>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>Thiết bị: <span className="font-bold text-slate-800">{readingDetail?.device?.serial_number || "Chưa rõ"}</span></p>
                <p>Bệnh nhân: <span className="font-bold text-slate-800">{readingDetail?.patient?.name || "Chưa rõ"}</span></p>
                <p>AI hoàn tất: <span className="font-bold text-slate-800">{formatDateTime(readingDetail?.ai_completed_at)}</span></p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Segments cảnh báo</p>
                  <p className="mt-1 text-sm text-slate-500">Các vùng bất thường lấy từ `reading.alerts`.</p>
                </div>
                <span className="rounded-full bg-error/10 px-3 py-1 text-xs font-bold text-error">
                  {alertOverlays.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {alertOverlays.length ? alertOverlays.map((alert) => (
                  <div key={alert.alert_id ?? `${alert.left}-${alert.width}`} className="rounded-2xl border border-error/10 bg-error/5 px-4 py-3">
                    <p className="text-sm font-bold text-error">{alert.label_text || alert.alert_type || "Cảnh báo bất thường"}</p>
                    <p className="mt-1 text-xs text-slate-500">Mẫu {alert.segment_start_sample} - {alert.segment_end_sample}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(alert.timestamp)}</p>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">Không có vùng bất thường nào khả dụng cho bản ghi này.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

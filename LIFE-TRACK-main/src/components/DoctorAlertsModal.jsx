import { useEffect, useMemo, useState } from "react";
import { getSystemAlerts } from "../services/alertService";
import { formatDateTime } from "../utils/ecgMonitor";

const PAGE_SIZE = 10;

function getAlertSeverityTone(resolved) {
  return resolved
    ? "bg-slate-100 text-slate-500"
    : "bg-error/10 text-error";
}

export function DoctorAlertsModal({ activePatientId, open, onClose, onSelectReading }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

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
    if (!open) {
      setAlerts([]);
      setPage(1);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;

    const loadAlerts = async () => {
      setLoading(true);
      try {
        const data = await getSystemAlerts();

        if (cancelled) {
          return;
        }

        setAlerts(data.alerts ?? []);
        setError("");
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setAlerts([]);
        setError(nextError.response?.data?.message || "Không thể tải toàn bộ danh sách cảnh báo");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAlerts();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const sortedAlerts = useMemo(
    () => [...alerts].sort((left, right) => new Date(right.timestamp ?? 0).getTime() - new Date(left.timestamp ?? 0).getTime()),
    [alerts],
  );

  const highlightedAlerts = useMemo(() => {
    if (!activePatientId) {
      return sortedAlerts;
    }

    const activePatientAlerts = sortedAlerts.filter((alert) => Number(alert.user_id) === Number(activePatientId));
    const otherAlerts = sortedAlerts.filter((alert) => Number(alert.user_id) !== Number(activePatientId));

    return [...activePatientAlerts, ...otherAlerts];
  }, [activePatientId, sortedAlerts]);

  const totalPages = Math.max(1, Math.ceil(highlightedAlerts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedAlerts = highlightedAlerts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPage(1);
  }, [activePatientId, open]);

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
        className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 md:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Toàn bộ cảnh báo</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Danh sách cảnh báo hệ thống</h2>
            <p className="mt-1 text-sm text-slate-500">Đang ưu tiên hiện các cảnh báo của bệnh nhân bạn đang theo dõi ở đầu danh sách. Click một dòng để mở popup ECG chi tiết.</p>
          </div>
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center text-sm font-medium text-slate-500">
              Đang tải toàn bộ cảnh báo...
            </div>
          ) : error ? (
            <div className="flex min-h-[320px] items-center justify-center text-sm font-medium text-error">
              {error}
            </div>
          ) : !highlightedAlerts.length ? (
            <div className="flex min-h-[320px] items-center justify-center text-sm font-medium text-slate-500">
              Chưa có cảnh báo nào trong hệ thống.
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedAlerts.map((alert) => (
                <button
                  key={alert.alert_id}
                  className={[
                    "w-full rounded-2xl border px-5 py-4 text-left transition-all hover:border-primary/30 hover:shadow-sm",
                    Number(alert.user_id) === Number(activePatientId) ? "border-primary/20 bg-sky-50/50" : "border-slate-100 bg-white",
                  ].join(" ")}
                  onClick={() => {
                    onClose?.();
                    onSelectReading?.(alert.reading_id);
                  }}
                  type="button"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {alert.label_text || alert.alert_type || "Cảnh báo bất thường"}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-widest text-slate-400">
                        {alert.user?.name || `User #${alert.user_id || "--"}`} • Reading #{alert.reading_id}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getAlertSeverityTone(alert.resolved)}`}>
                      {alert.resolved ? "Resolved" : "Alert"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <span>Thời điểm: <span className="font-bold text-slate-800">{formatDateTime(alert.timestamp)}</span></span>
                    <span>Segment: <span className="font-bold text-slate-800">{alert.segment_start_sample ?? "--"} - {alert.segment_end_sample ?? "--"}</span></span>
                    <span>Loại: <span className="font-bold text-slate-800">{alert.alert_type || "--"}</span></span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {!loading && !error && Boolean(highlightedAlerts.length) && (
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 md:px-8">
            <p className="text-sm text-slate-500">
              Trang <span className="font-bold text-slate-800">{currentPage}</span> / <span className="font-bold text-slate-800">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage <= 1}
                onClick={() => setPage((currentValue) => Math.max(1, currentValue - 1))}
                type="button"
              >
                Trang trước
              </button>
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((currentValue) => Math.min(totalPages, currentValue + 1))}
                type="button"
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

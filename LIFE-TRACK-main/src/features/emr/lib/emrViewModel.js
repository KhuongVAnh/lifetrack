import { EMPTY_PHR_OVERVIEW, buildPhrOverviewFormState } from "@/features/phr/lib/phrOverviewModel";

export const EMPTY_OVERVIEW_TEMPLATE = EMPTY_PHR_OVERVIEW;

export function mapOverviewToViewModel(overview, patient = null) {
  return buildPhrOverviewFormState(overview, patient);
}

export function formatDisplayDate(value, withTime = false) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return withTime
    ? date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function normalizeMedicationEntries(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return { name: item };
        if (!item || typeof item !== "object") return null;
        return {
          name: item.name || item.ten || "",
          dosage: item.dosage || item.lieu_dung || "",
          usage: item.usage || item.huong_dan || "",
          quantity: item.quantity || item.so_luong || "",
        };
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeMedicationEntries(parsed);
      }
    } catch {
      return trimmed
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => ({ name: item }));
    }
  }

  return [];
}

export function normalizeOrders(value, notesText = "") {
  if (Array.isArray(value) && value.length) {
    return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }

  const cpoeMatch = String(notesText || "").match(/\[CPOE\]\s*([\s\S]*)$/i);
  if (!cpoeMatch?.[1]) return [];

  return cpoeMatch[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function extractSoapText(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  const soapMatch = text.match(/\[SOAP\]\s*([\s\S]*?)(?:\n\[CPOE\]|$)/i);
  if (soapMatch?.[1]) {
    return soapMatch[1].trim();
  }

  return text.replace(/\[SOAP\]/gi, "").replace(/\[CPOE\][\s\S]*$/i, "").trim();
}

export function buildMedicationStats(logs, plans) {
  const counts = logs.reduce(
    (acc, log) => {
      acc.total += 1;
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    },
    { total: 0, TAKEN: 0, PENDING: 0, MISSED: 0, SKIPPED: 0 },
  );

  const completionRate = counts.total
    ? Math.round(((counts.TAKEN + counts.SKIPPED) / counts.total) * 100)
    : 0;

  const planTitleById = new Map(
    plans.map((plan) => [Number(plan.plan_id), plan.title || `Đơn #${plan.plan_id}`]),
  );

  const byPlan = logs.reduce((acc, log) => {
    const planId = Number(log.medication?.plan_id || log.medication?.plan?.plan_id || 0);
    const key = planId || `med-${log.medication?.medication_id || log.log_id}`;
    const current = acc.get(key) || {
      key,
      title:
        planTitleById.get(planId) ||
        log.medication?.plan?.title ||
        log.medication?.name ||
        "Đơn thuốc",
      total: 0,
      taken: 0,
      pending: 0,
      missed: 0,
      skipped: 0,
    };

    current.total += 1;
    if (log.status === "TAKEN") current.taken += 1;
    if (log.status === "PENDING") current.pending += 1;
    if (log.status === "MISSED") current.missed += 1;
    if (log.status === "SKIPPED") current.skipped += 1;
    acc.set(key, current);
    return acc;
  }, new Map());

  return {
    ...counts,
    completionRate,
    byPlan: Array.from(byPlan.values()),
  };
}

export function getMedicationStatusMeta(status) {
  const map = {
    TAKEN: { label: "Đã uống", className: "bg-emerald-100 text-emerald-700" },
    MISSED: { label: "Bỏ lỡ", className: "bg-rose-100 text-rose-700" },
    SKIPPED: { label: "Bỏ qua", className: "bg-slate-100 text-slate-500" },
    PENDING: { label: "Chờ uống", className: "bg-amber-100 text-amber-700" },
  };

  return map[status] ?? map.PENDING;
}

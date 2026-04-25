import { useState } from "react";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";
import { getUserAvatar } from "@/entities/user";
import { PhrOverviewContent } from "@/features/phr/ui/PhrOverviewContent";
import { PhrVisitDetailModal } from "@/features/phr/ui/PhrVisitDetailModal";
import {
  buildMedicationStats,
  formatDisplayDate,
  getMedicationStatusMeta,
  mapOverviewToViewModel,
  normalizeMedicationEntries,
  normalizeOrders,
} from "../lib/emrViewModel";

function SectionHeader({ icon, title, description, action = null }) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-black leading-tight text-[#0f172a]">
          <span className="material-symbols-outlined text-[#004976]">{icon}</span>
          {title}
        </h2>
        {description && <p className="mt-1 text-sm font-semibold leading-6 text-[#475569]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmrPatientHeaderCard({ patient, rightContent = null, helperText = "" }) {
  if (!patient) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <ImageWithFallback
            alt={patient.name || "Bệnh nhân"}
            className="h-16 w-16 rounded-xl border border-slate-200 object-cover"
            src={getUserAvatar(patient)}
          />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#004976]">Bệnh nhân</p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-[#0f172a]">{patient.name || "Chưa chọn bệnh nhân"}</h1>
            <p className="mt-1 text-sm font-semibold text-[#475569]">{patient.email || helperText || "Hồ sơ bệnh án điện tử"}</p>
          </div>
        </div>
        {rightContent}
      </div>
    </section>
  );
}

export function EmrSubnav({ tabs, activeTab, onChange }) {
  const gridClass =
    tabs.length >= 4
      ? "md:grid-cols-4"
      : tabs.length === 3
        ? "md:grid-cols-3"
        : "md:grid-cols-2";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className={`grid gap-2 ${gridClass}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={[
                "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-all",
                isActive
                  ? "bg-[#004976] text-white shadow-sm"
                  : "text-[#334155] hover:bg-slate-100 hover:text-[#0f172a]",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function EmrOverviewPanel({ overview, patient }) {
  const viewModel = mapOverviewToViewModel(overview, patient);
  return <PhrOverviewContent data={viewModel} />;
}

function VisitAccordionItem({ visit, onOpenDetail }) {
  const medications = normalizeMedicationEntries(visit.prescription);
  const dateStr = formatDisplayDate(visit.visit_date);

  return (
    <article className="group overflow-hidden rounded-2xl border border-[#cbd5e1] bg-white shadow-sm transition-all hover:border-[#0ea5e9] hover:shadow-md">
      <button
        type="button"
        onClick={onOpenDetail}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        <span className="shrink-0 rounded-xl border border-[#bae6fd] bg-[#e0f2fe] px-3 py-2 text-center">
          <span className="block text-xs font-black leading-tight text-[#075985]">{dateStr}</span>
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-black leading-6 text-[#0f172a] group-hover:text-[#004976]">
            {visit.diagnosis || "Bản ghi khám"}
          </h3>
          <p className="mt-1 text-sm font-semibold text-[#475569]">
            {visit.doctor_name || visit.doctor?.name || "Không rõ bác sĩ"}
            {visit.facility ? ` · ${visit.facility}` : ""}
          </p>
          {(visit.diagnosis_details || visit.reason) && (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#334155]">
              {visit.diagnosis_details || visit.reason}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {medications.length > 0 && (
            <span className="hidden rounded-full bg-[#dcfce7] px-3 py-1 text-[10px] font-black uppercase text-[#166534] sm:inline-block">
              {medications.length} thuốc
            </span>
          )}
          <span className="material-symbols-outlined text-[22px] text-[#0ea5e9]">chevron_right</span>
        </div>
      </button>
    </article>
  );
}

export function EmrVisitsPanel({ visits = [], documents = [], emptyLabel = "Chưa có lịch sử khám." }) {
  const [selectedVisit, setSelectedVisit] = useState(null);
  const getVisitKey = (visit) => visit.visit_id || `${visit.visit_date}-${visit.diagnosis}`;

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            icon="history"
            title="Lịch sử khám"
            description="Timeline các lần khám và bệnh sử đã lưu trong hệ thống. Bấm vào từng lần khám để xem chi tiết đầy đủ."
          />
          <div className="relative ml-4 mt-6 space-y-6 border-l-2 border-[#cbd5e1] pb-2 md:ml-6">
            {visits.length ? (
              visits.map((visit) => {
                const visitKey = getVisitKey(visit);
                return (
                  <div key={visitKey} className="relative pl-6 md:pl-8">
                    <div className="absolute left-[-9px] top-5 h-4 w-4 rounded-full bg-[#0ea5e9] ring-4 ring-white" />
                    <VisitAccordionItem
                      visit={visit}
                      onOpenDetail={() => setSelectedVisit(visit)}
                    />
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 text-center text-sm font-bold text-[#64748b]">
                {emptyLabel}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            icon="description"
            title="Báo cáo / tài liệu"
            description="Nguồn dữ liệu từ reports và các bản ghi liên quan."
          />
          <div className="space-y-4">
            {documents.length ? (
              documents.map((document) => (
                <article key={document.report_id || document.document_id} className="rounded-2xl border border-[#cbd5e1] bg-[#f8fafc] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[#0f172a]">
                        {document.title || `Báo cáo từ ${document.doctor?.name || "bác sĩ"}`}
                      </p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[#64748b]">
                        {formatDisplayDate(document.created_at, true)}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-[10px] font-black uppercase text-[#166534]">
                      Report
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-7 text-[#334155]">
                    {typeof document.summary === "string"
                      ? document.summary
                      : document.summary?.tom_tat || "Đã có báo cáo y khoa."}
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 text-center text-sm font-bold text-[#64748b]">
                Chưa có báo cáo.
              </div>
            )}
          </div>
        </section>
      </div>

      <PhrVisitDetailModal visit={selectedVisit} onClose={() => setSelectedVisit(null)} />
    </>
  );
}

function MedicationStatsPanel({ stats }) {
  const summary = [
    { label: "Tổng lượt", value: stats.total, className: "bg-white text-[#0f172a] border-slate-200" },
    { label: "Đã uống", value: stats.TAKEN, className: "bg-[#dcfce7] text-[#166534] border-[#86efac]" },
    { label: "Chờ uống", value: stats.PENDING, className: "bg-[#fef3c7] text-[#92400e] border-[#fbbf24]" },
    { label: "Bỏ lỡ", value: stats.MISSED, className: "bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]" },
    { label: "Bỏ qua", value: stats.SKIPPED, className: "bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#004976]">Thống kê hôm nay</p>
          <h2 className="mt-1 text-lg font-black text-[#0f172a]">Tỷ lệ hoàn thành {stats.completionRate}%</h2>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200 sm:w-48">
          <div className="h-full rounded-full bg-[#1b6d24]" style={{ width: `${stats.completionRate}%` }} />
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {summary.map((item) => (
          <div key={item.label} className={`rounded-xl border px-3 py-3 text-center ${item.className}`}>
            <p className="text-xl font-black">{item.value}</p>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmrMedicationsPanel({
  plans = [],
  logs = [],
  allowPlanActions = false,
  onEditPlan = null,
  onArchivePlan = null,
  editor = null,
}) {
  const stats = buildMedicationStats(logs, plans);
  const needsAttention = stats.MISSED + stats.PENDING;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
      <div className="space-y-6">
        {needsAttention > 0 && (
          <section className="rounded-2xl border-2 border-[#dc2626] bg-[#fff1f2] p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#dc2626] text-white">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
                  warning
                </span>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-[#991b1b]">Cảnh báo tuân thủ thuốc</p>
                <h2 className="mt-1 text-xl font-black text-[#7f1d1d]">
                  {stats.MISSED} lượt bỏ lỡ, {stats.PENDING} lượt đang chờ
                </h2>
                <p className="mt-1 text-sm font-semibold text-[#991b1b]">
                  Ưu tiên kiểm tra các lượt thuốc chưa hoàn tất trong ngày hôm nay.
                </p>
              </div>
            </div>
          </section>
        )}

        <MedicationStatsPanel stats={stats} />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            icon="medication"
            title="Lịch thuốc hôm nay"
            description="Hiển thị toàn bộ lịch thuốc của ngày đang xem."
          />
          <div className="space-y-3">
            {logs.length ? (
              logs.map((log) => {
                const statusMeta = getMedicationStatusMeta(log.status);
                const isCritical = log.status === "MISSED";
                const isPending = log.status === "PENDING";
                return (
                  <div
                    key={log.log_id}
                    className={[
                      "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
                      isCritical
                        ? "border-[#dc2626] bg-[#fff1f2]"
                        : isPending
                          ? "border-[#f59e0b] bg-[#fffbeb]"
                          : "border-slate-200 bg-[#f8fafc]",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={[
                          "material-symbols-outlined mt-0.5 text-[22px]",
                          isCritical ? "text-[#dc2626]" : isPending ? "text-[#d97706]" : "text-[#004976]",
                        ].join(" ")}
                        style={isCritical ? { fontVariationSettings: '"FILL" 1' } : undefined}
                      >
                        {isCritical ? "warning" : "schedule"}
                      </span>
                      <div>
                        <p className="font-black text-[#0f172a]">{log.medication?.name || "Thuốc"}</p>
                        <p className="mt-1 text-xs font-semibold text-[#475569]">
                          {log.medication?.dosage ? `${log.medication.dosage} · ` : ""}
                          {formatDisplayDate(log.scheduled_time, true)}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 text-center text-sm font-bold text-[#64748b]">
                Hôm nay chưa có lịch thuốc.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            icon="medication_liquid"
            title="Tủ thuốc"
            description="Danh sách kế hoạch thuốc và các thuốc đang được theo dõi."
          />
          <div className="space-y-4">
            {plans.length ? (
              plans.map((plan) => (
                <article key={plan.plan_id} className="rounded-2xl border border-[#cbd5e1] bg-[#f8fafc] p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-black text-[#0f172a]">{plan.title || `Đơn thuốc #${plan.plan_id}`}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[#64748b]">
                        {formatDisplayDate(plan.start_date)}
                        {plan.end_date ? ` - ${formatDisplayDate(plan.end_date)}` : " - Không thời hạn"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                          plan.is_active === false
                            ? "bg-slate-200 text-slate-600"
                            : "bg-[#dcfce7] text-[#166534]"
                        }`}
                      >
                        {plan.is_active === false ? "Đã ngưng" : "Đang dùng"}
                      </span>
                      {allowPlanActions && onEditPlan && (
                        <button
                          type="button"
                          onClick={() => onEditPlan(plan)}
                          className="rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-black text-[#334155] hover:bg-slate-50"
                        >
                          Sửa
                        </button>
                      )}
                      {allowPlanActions && onArchivePlan && plan.is_active !== false && (
                        <button
                          type="button"
                          onClick={() => onArchivePlan(plan.plan_id)}
                          className="rounded-xl border border-[#fecaca] bg-white px-3 py-2 text-xs font-black text-[#b91c1c] hover:bg-[#fff1f2]"
                        >
                          Ngưng
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(plan.medications || []).map((medication) => (
                      <div key={medication.medication_id || `${plan.plan_id}-${medication.name}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <div>
                            <span className="font-black text-[#0f172a]">{medication.name}</span>
                            <span className="font-semibold text-[#475569]"> · {medication.dosage}</span>
                          </div>
                          {!!medication.times?.length && (
                            <span className="text-xs font-black text-[#004976]">{medication.times.join(", ")}</span>
                          )}
                        </div>
                        {medication.description && (
                          <p className="mt-2 text-xs font-semibold text-[#64748b]">{medication.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 text-center text-sm font-bold text-[#64748b]">
                Chưa có kế hoạch thuốc.
              </div>
            )}
          </div>
        </section>
      </div>

      {editor ? <div>{editor}</div> : null}
    </div>
  );
}

export function EmrHistoryPreviewPanel({ visits = [], documents = [] }) {
  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm">
      <SectionHeader
        icon="folder_shared"
        title="Đối chiếu hồ sơ gần đây"
        description="Dùng khi bác sĩ cần xem nhanh bệnh sử và báo cáo trước khi lưu ghi chú khám."
      />
      <div className="space-y-4">
        {visits.slice(0, 3).map((visit) => {
          const orders = normalizeOrders(visit.tests, visit.reason);
          return (
            <article key={visit.visit_id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{visit.diagnosis || "Bản ghi khám"}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">{formatDisplayDate(visit.visit_date)}</p>
                </div>
                {visit.doctor_name && (
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-slate-500">
                    {visit.doctor_name}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {visit.diagnosis_details || visit.reason || "Chưa có mô tả thêm."}
              </p>
              {!!orders.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {orders.map((order) => (
                    <span key={order} className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase text-primary">
                      {order}
                    </span>
                  ))}
                </div>
              )}
            </article>
          );
        })}

        {documents.slice(0, 2).map((document) => (
          <article key={document.report_id || document.document_id} className="rounded-[1.5rem] border border-slate-100 bg-white p-4">
            <p className="text-sm font-black text-slate-900">
              {document.title || `Báo cáo từ ${document.doctor?.name || "bác sĩ"}`}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
              {formatDisplayDate(document.created_at, true)}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {typeof document.summary === "string"
                ? document.summary
                : document.summary?.tom_tat || "Đã có báo cáo y khoa."}
            </p>
          </article>
        ))}

        {!visits.length && !documents.length && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
            Chưa có dữ liệu để đối chiếu.
          </div>
        )}
      </div>
    </section>
  );
}

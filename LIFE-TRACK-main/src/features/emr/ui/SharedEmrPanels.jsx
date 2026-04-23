import { useState } from "react";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";
import { getUserAvatar } from "@/entities/user";
import { PhrOverviewContent } from "@/features/phr/ui/PhrOverviewContent";
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
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
          <span className="material-symbols-outlined text-primary">{icon}</span>
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmrPatientHeaderCard({ patient, rightContent = null, helperText = "" }) {
  if (!patient) return null;

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <ImageWithFallback
            alt={patient.name || "Bệnh nhân"}
            className="h-16 w-16 rounded-2xl object-cover"
            src={getUserAvatar(patient)}
          />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Bệnh nhân</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">{patient.name || "Chưa chọn bệnh nhân"}</h1>
            <p className="text-sm text-slate-500">{patient.email || helperText || "Hồ sơ bệnh án điện tử"}</p>
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
    <section className="rounded-[2rem] bg-slate-100 p-2">
      <div className={`grid gap-2 ${gridClass}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={[
                "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all",
                isActive
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-500 hover:bg-white/60 hover:text-slate-800",
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

function VisitAccordionItem({ visit, isOpen, onToggle }) {
  const medications = normalizeMedicationEntries(visit.prescription);

  return (
    <article className="rounded-[1.75rem] border border-slate-100 bg-slate-50 overflow-hidden transition-shadow hover:shadow-md">
      {/* Collapsed header – always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-5 text-left transition-colors hover:bg-slate-100/60"
      >
        {/* Date badge */}
        <span className="shrink-0 rounded-xl bg-primary/10 px-3 py-2 text-center">
          <span className="block text-xs font-black leading-tight text-primary">
            {formatDisplayDate(visit.visit_date)}
          </span>
        </span>

        {/* Diagnosis + doctor */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-black text-slate-900">
            {visit.diagnosis || "Bản ghi khám"}
          </h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {visit.doctor_name || visit.doctor?.name || "Không rõ bác sĩ"}
            {visit.facility ? ` · ${visit.facility}` : ""}
          </p>
        </div>

        {/* Medication count pill */}
        {medications.length > 0 && (
          <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 sm:inline-block">
            {medications.length} thuốc
          </span>
        )}

        {/* Chevron */}
        <span
          className={[
            "material-symbols-outlined shrink-0 text-[20px] text-slate-400 transition-transform duration-300",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        >
          expand_more
        </span>
      </button>

      {/* Expandable details */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-200/60 px-5 pb-5 pt-4">
            {/* Diagnosis description */}
            {(visit.diagnosis_details || visit.reason) && (
              <p className="mb-4 text-sm leading-7 text-slate-600">
                {visit.diagnosis_details || visit.reason}
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {/* Facility & reason */}
              <div className="rounded-2xl bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cơ sở khám</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{visit.facility || "Chưa cập nhật"}</p>
                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Lý do khám</p>
                <p className="mt-2 text-sm text-slate-600">{visit.reason || "Chưa cập nhật"}</p>
              </div>

              {/* Prescription */}
              <div className="rounded-2xl bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Thuốc kê đơn</p>
                <div className="mt-2 space-y-2">
                  {medications.length ? (
                    medications.map((medication, index) => (
                      <div key={`${medication.name}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        <span className="font-bold text-slate-900">{medication.name || "Thuốc"}</span>
                        {medication.dosage && <span className="text-slate-500"> · {medication.dosage}</span>}
                        {medication.usage && <span className="block text-xs text-slate-500">{medication.usage}</span>}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">Chưa có kê đơn.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function EmrVisitsPanel({ visits = [], documents = [], emptyLabel = "Chưa có lịch sử khám." }) {
  const [openVisitIds, setOpenVisitIds] = useState(new Set());

  const toggleVisit = (visitId) => {
    setOpenVisitIds((prev) => {
      const next = new Set(prev);
      if (next.has(visitId)) {
        next.delete(visitId);
      } else {
        next.add(visitId);
      }
      return next;
    });
  };

  const expandAll = () => setOpenVisitIds(new Set(visits.map((v) => v.visit_id)));
  const collapseAll = () => setOpenVisitIds(new Set());
  const allExpanded = visits.length > 0 && visits.every((v) => openVisitIds.has(v.visit_id));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <SectionHeader
          icon="history"
          title="Lịch sử khám"
          description="Các lần khám và bệnh sử đã lưu trong hệ thống."
          action={
            visits.length > 1 ? (
              <button
                type="button"
                onClick={allExpanded ? collapseAll : expandAll}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition-colors hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {allExpanded ? "unfold_less" : "unfold_more"}
                </span>
                {allExpanded ? "Thu gọn tất cả" : "Mở rộng tất cả"}
              </button>
            ) : null
          }
        />
        <div className="space-y-3">
          {visits.length ? (
            visits.map((visit) => (
              <VisitAccordionItem
                key={visit.visit_id}
                visit={visit}
                isOpen={openVisitIds.has(visit.visit_id)}
                onToggle={() => toggleVisit(visit.visit_id)}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
              {emptyLabel}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <SectionHeader
          icon="description"
          title="Báo cáo / tài liệu"
          description="Nguồn dữ liệu từ reports và các bản ghi liên quan."
        />
        <div className="space-y-4">
          {documents.length ? (
            documents.map((document) => (
              <article key={document.report_id || document.document_id} className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {document.title || `Báo cáo từ ${document.doctor?.name || "bác sĩ"}`}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                      {formatDisplayDate(document.created_at, true)}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
                    Report
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {typeof document.summary === "string"
                    ? document.summary
                    : document.summary?.tom_tat || "Đã có báo cáo y khoa."}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
              Chưa có báo cáo.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MedicationStatsPanel({ stats }) {
  const summary = [
    { label: "Tổng lượt", value: stats.total, className: "bg-slate-50 text-slate-700" },
    { label: "Đã uống", value: stats.TAKEN, className: "bg-emerald-50 text-emerald-700" },
    { label: "Chờ uống", value: stats.PENDING, className: "bg-amber-50 text-amber-700" },
    { label: "Bỏ lỡ", value: stats.MISSED, className: "bg-rose-50 text-rose-700" },
    { label: "Bỏ qua", value: stats.SKIPPED, className: "bg-slate-100 text-slate-500" },
  ];

  return (
    <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Thống kê hôm nay</p>
          <h2 className="mt-1 text-lg font-black text-slate-800">Tỷ lệ hoàn thành {stats.completionRate}%</h2>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100 sm:w-48">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${stats.completionRate}%` }} />
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {summary.map((item) => (
          <div key={item.label} className={`rounded-xl px-3 py-3 text-center ${item.className}`}>
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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
      <div className="space-y-6">
        <MedicationStatsPanel stats={stats} />

        <section className="rounded-[2rem] bg-white p-6 shadow-sm">
          <SectionHeader
            icon="medication"
            title="Lịch thuốc hôm nay"
            description="Hiển thị toàn bộ lịch thuốc của ngày đang xem."
          />
          <div className="space-y-3">
            {logs.length ? (
              logs.map((log) => {
                const statusMeta = getMedicationStatusMeta(log.status);
                return (
                  <div key={log.log_id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black text-slate-800">{log.medication?.name || "Thuốc"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {log.medication?.dosage ? `${log.medication.dosage} · ` : ""}
                        {formatDisplayDate(log.scheduled_time, true)}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
                Hôm nay chưa có lịch thuốc.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-6 shadow-sm">
          <SectionHeader
            icon="medication_liquid"
            title="Tủ thuốc"
            description="Danh sách kế hoạch thuốc và các thuốc đang được theo dõi."
          />
          <div className="space-y-4">
            {plans.length ? (
              plans.map((plan) => (
                <article key={plan.plan_id} className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-black text-slate-900">{plan.title || `Đơn thuốc #${plan.plan_id}`}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                        {formatDisplayDate(plan.start_date)}
                        {plan.end_date ? ` - ${formatDisplayDate(plan.end_date)}` : " - Không thời hạn"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                          plan.is_active === false
                            ? "bg-slate-200 text-slate-500"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {plan.is_active === false ? "Đã ngưng" : "Đang dùng"}
                      </span>
                      {allowPlanActions && onEditPlan && (
                        <button
                          type="button"
                          onClick={() => onEditPlan(plan)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-white"
                        >
                          Sửa
                        </button>
                      )}
                      {allowPlanActions && onArchivePlan && plan.is_active !== false && (
                        <button
                          type="button"
                          onClick={() => onArchivePlan(plan.plan_id)}
                          className="rounded-xl border border-rose-100 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50"
                        >
                          Ngưng
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(plan.medications || []).map((medication) => (
                      <div key={medication.medication_id || `${plan.plan_id}-${medication.name}`} className="rounded-xl bg-white px-3 py-3">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <div>
                            <span className="font-bold text-slate-900">{medication.name}</span>
                            <span className="text-slate-500"> · {medication.dosage}</span>
                          </div>
                          {!!medication.times?.length && (
                            <span className="text-xs font-black text-primary">{medication.times.join(", ")}</span>
                          )}
                        </div>
                        {medication.description && (
                          <p className="mt-2 text-xs text-slate-500">{medication.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
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

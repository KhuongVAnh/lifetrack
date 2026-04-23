import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  createEmptyEducation,
  createEmptyExperience,
  createEmptyResearch,
  formatDoctorCurrency,
  getMyDoctorProfile,
  updateMyDoctorProfile,
} from "@/features/doctors";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";

const DEFAULT_DOCTOR_AVATAR = "/assets/avatars/default/avatar-default.png";
const INPUT_CLASS = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary";

export function DoctorMyProfilePage() {
  const [form, setForm] = useState(null);
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const previewRef = useRef(null);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const data = await getMyDoctorProfile();
      setForm(data);
      setInitialSnapshot(JSON.stringify(data));
    } catch (error) {
      setForm(null);
      setInitialSnapshot("");
      setLoadError(error?.response?.data?.message || "Không thể tải hồ sơ bác sĩ.");
      toast.error(error?.response?.data?.message || "Không thể tải hồ sơ bác sĩ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const isDirty = useMemo(() => JSON.stringify(form) !== initialSnapshot, [form, initialSnapshot]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateListItem = (field, index, key, value) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  };

  const addListItem = (field, factory) => {
    setForm((current) => ({
      ...current,
      [field]: [...current[field], factory()],
    }));
  };

  const removeListItem = (field, index) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const moveListItem = (field, index, direction) => {
    setForm((current) => {
      const next = [...current[field]];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return current;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return { ...current, [field]: next };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const saved = await updateMyDoctorProfile(form);
      setForm(saved);
      setInitialSnapshot(JSON.stringify(saved));
      toast.success("Đã cập nhật hồ sơ bác sĩ.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể lưu hồ sơ bác sĩ.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return loading ? <DoctorMyProfileSkeleton /> : <DoctorMyProfileError message={loadError} onRetry={() => void loadProfile()} />;
  }

  const previewAvatar = form.avatar_url || DEFAULT_DOCTOR_AVATAR;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_8px_40px_rgb(0,0,0,0.03)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-5">
            <ImageWithFallback alt={form.doctorName} className="h-24 w-24 rounded-2xl object-cover" src={previewAvatar} />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Hồ sơ bác sĩ</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">{form.doctorName}</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">{form.title || form.specialty || "Cập nhật hồ sơ chuyên môn để xuất hiện tốt hơn trên catalog."}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${form.is_listed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {form.is_listed ? "Đang hiển thị trên catalog" : "Đang ẩn khỏi catalog"}
                </span>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-primary">
                  Phí tư vấn hiện tại {formatDoctorCurrency(form.consultationFee)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700"
              onClick={() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              type="button"
            >
              Xem preview công khai
            </button>
            <button
              className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:bg-slate-300"
              disabled={!isDirty || saving}
              onClick={handleSave}
              type="button"
            >
              {saving ? "Đang lưu..." : "Lưu hồ sơ"}
            </button>
          </div>
        </div>
      </section>

      <section ref={previewRef} className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_8px_40px_rgb(0,0,0,0.03)]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-primary">Preview công khai</h2>
            <p className="text-sm text-slate-500">Bản xem trước cách hồ sơ xuất hiện với bệnh nhân trong app.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-500">
            {form.is_listed ? "Public" : "Hidden"}
          </span>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
          <div className="flex flex-col gap-6 md:flex-row">
            <ImageWithFallback alt={form.doctorName} className="h-36 w-36 rounded-3xl object-cover" src={previewAvatar} />
            <div className="flex-1">
              <h3 className="text-2xl font-black text-sky-900">{form.doctorName}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">{form.title || form.specialty || "Bác sĩ LifeTrack"}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <PreviewStat label="Chuyên khoa" value={form.specialty || "Đang cập nhật"} />
                <PreviewStat label="Năm kinh nghiệm" value={form.experience_years || "—"} />
                <PreviewStat label="Cơ sở khám" value={form.hospital || "Đang cập nhật"} />
                <PreviewStat label="Phí theo dõi" value={formatDoctorCurrency(form.hire_price)} />
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{form.about || "Phần giới thiệu sẽ xuất hiện tại đây sau khi bạn cập nhật."}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-8">
          <FormCard title="Thông tin cốt lõi" description="Những dữ liệu này xuất hiện ở card catalog và phần đầu hồ sơ công khai.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Chức danh">
                <input className={INPUT_CLASS} onChange={(event) => updateField("title", event.target.value)} value={form.title} />
              </Field>
              <Field label="Chuyên khoa">
                <input className={INPUT_CLASS} onChange={(event) => updateField("specialty", event.target.value)} value={form.specialty} />
              </Field>
              <Field label="Số năm kinh nghiệm">
                <input className={INPUT_CLASS} min="0" onChange={(event) => updateField("experience_years", event.target.value)} type="number" value={form.experience_years} />
              </Field>
              <Field label="Giá theo dõi/hire">
                <input className={INPUT_CLASS} min="0" onChange={(event) => updateField("hire_price", event.target.value)} type="number" value={form.hire_price} />
              </Field>
              <Field label="Bệnh viện / Phòng khám">
                <input className={INPUT_CLASS} onChange={(event) => updateField("hospital", event.target.value)} value={form.hospital} />
              </Field>
              <Field label="Khu vực">
                <input className={INPUT_CLASS} onChange={(event) => updateField("location", event.target.value)} value={form.location} />
              </Field>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Avatar URL">
                <input className={INPUT_CLASS} onChange={(event) => updateField("avatar_url", event.target.value)} value={form.avatar_url} />
              </Field>
              <Field label="Email liên hệ public">
                <input className={INPUT_CLASS} onChange={(event) => updateField("public_contact_email", event.target.value)} value={form.public_contact_email} />
              </Field>
            </div>
            <Field label="Giới thiệu">
              <textarea className={`${INPUT_CLASS} min-h-[140px]`} onChange={(event) => updateField("about", event.target.value)} value={form.about} />
            </Field>
          </FormCard>

          <RepeaterCard
            title="Học vấn & Bằng cấp"
            description="Sắp xếp từ chứng chỉ quan trọng nhất đến ít quan trọng hơn."
            items={form.educations}
            onAdd={() => addListItem("educations", createEmptyEducation)}
            renderItem={(item, index) => (
              <RepeaterItem
                canMoveDown={index < form.educations.length - 1}
                canMoveUp={index > 0}
                onMoveDown={() => moveListItem("educations", index, "down")}
                onMoveUp={() => moveListItem("educations", index, "up")}
                onRemove={() => removeListItem("educations", index)}
                title={`Mục ${index + 1}`}
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Tiêu đề">
                    <input className={INPUT_CLASS} onChange={(event) => updateListItem("educations", index, "title", event.target.value)} value={item.title || ""} />
                  </Field>
                  <Field label="Tổ chức">
                    <input className={INPUT_CLASS} onChange={(event) => updateListItem("educations", index, "organization", event.target.value)} value={item.organization || ""} />
                  </Field>
                  <Field label="Nhãn năm">
                    <input className={INPUT_CLASS} onChange={(event) => updateListItem("educations", index, "year_label", event.target.value)} value={item.year_label || ""} />
                  </Field>
                </div>
              </RepeaterItem>
            )}
          />

          <RepeaterCard
            title="Nghiên cứu nổi bật"
            description="Các nghiên cứu, hội thảo hoặc chủ đề bạn muốn hiển thị công khai."
            items={form.researches}
            onAdd={() => addListItem("researches", createEmptyResearch)}
            renderItem={(item, index) => (
              <RepeaterItem
                canMoveDown={index < form.researches.length - 1}
                canMoveUp={index > 0}
                onMoveDown={() => moveListItem("researches", index, "down")}
                onMoveUp={() => moveListItem("researches", index, "up")}
                onRemove={() => removeListItem("researches", index)}
                title={`Mục ${index + 1}`}
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Tiêu đề">
                    <input className={INPUT_CLASS} onChange={(event) => updateListItem("researches", index, "title", event.target.value)} value={item.title || ""} />
                  </Field>
                  <Field label="Nguồn">
                    <input className={INPUT_CLASS} onChange={(event) => updateListItem("researches", index, "source", event.target.value)} value={item.source || ""} />
                  </Field>
                  <Field label="Năm công bố">
                    <input className={INPUT_CLASS} onChange={(event) => updateListItem("researches", index, "published_year", event.target.value)} type="number" value={item.published_year ?? ""} />
                  </Field>
                </div>
              </RepeaterItem>
            )}
          />

          <RepeaterCard
            title="Lộ trình sự nghiệp"
            description="Timeline công khai của bác sĩ trên hồ sơ."
            items={form.experiences}
            onAdd={() => addListItem("experiences", createEmptyExperience)}
            renderItem={(item, index) => (
              <RepeaterItem
                canMoveDown={index < form.experiences.length - 1}
                canMoveUp={index > 0}
                onMoveDown={() => moveListItem("experiences", index, "down")}
                onMoveUp={() => moveListItem("experiences", index, "up")}
                onRemove={() => removeListItem("experiences", index)}
                title={`Mục ${index + 1}`}
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Chức vụ / vai trò">
                    <input className={INPUT_CLASS} onChange={(event) => updateListItem("experiences", index, "title", event.target.value)} value={item.title || ""} />
                  </Field>
                  <Field label="Tổ chức">
                    <input className={INPUT_CLASS} onChange={(event) => updateListItem("experiences", index, "organization", event.target.value)} value={item.organization || ""} />
                  </Field>
                  <Field label="Mốc thời gian">
                    <input className={INPUT_CLASS} onChange={(event) => updateListItem("experiences", index, "time_label", event.target.value)} value={item.time_label || ""} />
                  </Field>
                </div>
              </RepeaterItem>
            )}
          />
        </div>

        <div className="space-y-8">
          <FormCard title="Hiển thị hồ sơ" description="Bật hoặc tắt việc xuất hiện trong catalog bệnh nhân.">
            <label className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input checked={form.is_listed} className="mt-1 h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary" onChange={(event) => updateField("is_listed", event.target.checked)} type="checkbox" />
              <div>
                <p className="text-sm font-black text-slate-900">Hiển thị trên catalog bệnh nhân</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  Khi bật, hồ sơ của bạn sẽ xuất hiện trong danh sách thuê bác sĩ và hồ sơ công khai cho bệnh nhân mới.
                </p>
              </div>
            </label>
          </FormCard>

          <FormCard title="Tóm tắt hiện tại" description="Snapshot nhanh để tự kiểm tra trước khi lưu.">
            <PreviewStat label="Tên hiển thị" value={form.doctorName} />
            <PreviewStat label="Email tài khoản" value={form.doctorEmail || "—"} />
            <PreviewStat label="Email public" value={form.public_contact_email || "Chưa có"} />
            <PreviewStat label="Mức phí hiển thị" value={formatDoctorCurrency(form.hire_price)} />
            <PreviewStat label="Số mục học vấn" value={form.educations.length} />
            <PreviewStat label="Số mục nghiên cứu" value={form.researches.length} />
            <PreviewStat label="Số mốc sự nghiệp" value={form.experiences.length} />
          </FormCard>
        </div>
      </section>
    </div>
  );
}

function DoctorMyProfileSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-52 animate-pulse rounded-3xl bg-slate-100" />
      <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
      <div className="h-[520px] animate-pulse rounded-3xl bg-slate-100" />
    </div>
  );
}

function DoctorMyProfileError({ message, onRetry }) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-[0_8px_40px_rgb(0,0,0,0.03)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <span className="material-symbols-outlined text-3xl">person_alert</span>
      </div>
      <h1 className="mt-5 text-2xl font-black text-primary">Không thể tải hồ sơ bác sĩ</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">{message || "Đã có lỗi khi tải dữ liệu hồ sơ."}</p>
      <button
        className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
        onClick={onRetry}
        type="button"
      >
        Thử lại
      </button>
    </section>
  );
}

function FormCard({ title, description, children }) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_8px_40px_rgb(0,0,0,0.03)]">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-primary">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function PreviewStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function RepeaterCard({ title, description, items, onAdd, renderItem }) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_8px_40px_rgb(0,0,0,0.03)]">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-primary">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={onAdd} type="button">
          Thêm mục
        </button>
      </div>

      <div className="space-y-4">
        {items.length > 0 ? items.map(renderItem) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">Chưa có mục nào. Hãy thêm mục đầu tiên.</div>}
      </div>
    </section>
  );
}

function RepeaterItem({ title, children, onMoveUp, onMoveDown, onRemove, canMoveUp, canMoveDown }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{title}</h3>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40" disabled={!canMoveUp} onClick={onMoveUp} type="button">
            Lên
          </button>
          <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40" disabled={!canMoveDown} onClick={onMoveDown} type="button">
            Xuống
          </button>
          <button className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-600" onClick={onRemove} type="button">
            Xóa
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

const DEFAULT_DOCTOR_AVATAR = "/assets/avatars/default/avatar-default.png";

export function mapDoctorReview(review) {
  if (!review) return null;

  return {
    reviewId: review.review_id,
    doctorId: review.doctor_id,
    author: review.patient_display_name || "Bệnh nhân LifeTrack",
    rating: Number(review.rating || 0),
    content: review.comment || "",
    createdAt: review.created_at || null,
    updatedAt: review.updated_at || null,
  };
}

export function mapDoctorCatalogItem(doctor) {
  return {
    ...doctor,
    id: doctor.user_id,
    avatar: doctor.avatar_url || DEFAULT_DOCTOR_AVATAR,
    rating: Number(doctor.average_rating || 0),
    reviewCount: Number(doctor.review_count || 0),
    experienceYears: doctor.experience_years ?? null,
    about: doctor.bio || "",
    viewerState: doctor.viewer_state || {},
  };
}

export function mapDoctorProfileResponse(profile) {
  return {
    ...profile,
    id: profile.doctor_id,
    avatar: profile.avatar_url || DEFAULT_DOCTOR_AVATAR,
    about: profile.about || "",
    consultationFee: Number(profile.consultation_fee || 0),
    hirePrice: Number(profile.hire_price || 0),
    isListed: Boolean(profile.is_listed),
    stats: {
      activePatientCount: Number(profile.stats?.active_patient_count || 0),
      averageRating: Number(profile.stats?.average_rating || 0),
      reviewCount: Number(profile.stats?.review_count || 0),
    },
    education: profile.education ?? [],
    research: profile.research ?? [],
    career: profile.career ?? [],
    weeklySchedule: profile.weekly_schedule ?? [],
    reviewsPreview: (profile.reviews_preview ?? []).map(mapDoctorReview),
    viewerState: profile.viewer_state || {},
  };
}

export function buildDoctorProfileFormState(payload) {
  const profile = payload?.profile || {};

  return {
    doctorId: payload?.doctor_id || null,
    doctorName: payload?.name || "Bác sĩ LifeTrack",
    doctorEmail: payload?.email || "",
    consultationFee: Number(payload?.consultation_fee || 0),
    title: profile.title || "",
    specialty: profile.specialty || "",
    experience_years: profile.experience_years ?? "",
    hospital: profile.hospital || "",
    location: profile.location || "",
    about: profile.about || "",
    avatar_url: profile.avatar_url || "",
    public_contact_email: profile.public_contact_email || "",
    hire_price: profile.hire_price ?? payload?.consultation_fee ?? 0,
    is_listed: Boolean(profile.is_listed),
    educations: Array.isArray(profile.educations) ? profile.educations : [],
    researches: Array.isArray(profile.researches) ? profile.researches : [],
    experiences: Array.isArray(profile.experiences) ? profile.experiences : [],
  };
}

export function normalizeDoctorProfilePayload(form) {
  const normalizeText = (value) => {
    if (value === undefined || value === null) return "";
    return String(value).trim();
  };

  return {
    title: normalizeText(form.title),
    specialty: normalizeText(form.specialty),
    experience_years: form.experience_years === "" ? null : Number(form.experience_years),
    hospital: normalizeText(form.hospital),
    location: normalizeText(form.location),
    about: normalizeText(form.about),
    avatar_url: normalizeText(form.avatar_url),
    public_contact_email: normalizeText(form.public_contact_email),
    hire_price: Number(form.hire_price || 0),
    is_listed: Boolean(form.is_listed),
    educations: (form.educations || []).map((item) => ({
      title: normalizeText(item.title),
      organization: normalizeText(item.organization),
      year_label: normalizeText(item.year_label),
    })),
    researches: (form.researches || []).map((item) => ({
      title: normalizeText(item.title),
      source: normalizeText(item.source),
      published_year: item.published_year === "" ? null : Number(item.published_year),
    })),
    experiences: (form.experiences || []).map((item) => ({
      title: normalizeText(item.title),
      organization: normalizeText(item.organization),
      time_label: normalizeText(item.time_label),
    })),
  };
}

export function createEmptyEducation() {
  return {
    title: "",
    organization: "",
    year_label: "",
  };
}

export function createEmptyResearch() {
  return {
    title: "",
    source: "",
    published_year: "",
  };
}

export function createEmptyExperience() {
  return {
    title: "",
    organization: "",
    time_label: "",
  };
}

export function formatDoctorReviewDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Bệnh nhân LifeTrack";
  return date.toLocaleDateString("vi-VN");
}

export function formatDoctorCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "0đ";
  return `${amount.toLocaleString("vi-VN")}đ`;
}

export function formatScheduleDay(dayOfWeek) {
  switch (Number(dayOfWeek)) {
    case 0:
      return "Chủ nhật";
    case 1:
      return "Thứ 2";
    case 2:
      return "Thứ 3";
    case 3:
      return "Thứ 4";
    case 4:
      return "Thứ 5";
    case 5:
      return "Thứ 6";
    case 6:
      return "Thứ 7";
    default:
      return "Lịch làm việc";
  }
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/features/auth";
import {
  createMyDoctorReview,
  deleteMyDoctorReview,
  formatDoctorCurrency,
  formatDoctorReviewDate,
  formatScheduleDay,
  getDoctorProfile,
  getDoctorReviews,
  getMyDoctorReview,
  requestDoctorHire,
  updateMyDoctorReview,
} from "@/features/doctors";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";
import { RatingStars } from "@/shared/ui/RatingStars";

const DEFAULT_DOCTOR_AVATAR = "/assets/avatars/default/avatar-default.png";

function buildErrorState(error) {
  const status = error?.response?.status || null;
  return {
    status,
    message: error?.response?.data?.message || "Không thể tải hồ sơ bác sĩ.",
  };
}

function createEmptyReviewState() {
  return {
    rating: 5,
    comment: "",
    exists: false,
    canReview: false,
    loading: false,
  };
}

export function DoctorProfilePage() {
  const { doctorId } = useParams();
  const { user } = useAuth();
  const isPatient = user?.normalizedRole === "patient";

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState({ status: null, message: "" });
  const [hiring, setHiring] = useState(false);
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const [reviewsFeed, setReviewsFeed] = useState({
    items: [],
    nextCursor: null,
    hasMore: false,
    loading: false,
  });
  const [reviewState, setReviewState] = useState(createEmptyReviewState());
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDeleting, setReviewDeleting] = useState(false);

  const loadProfile = async ({ withLoading = true } = {}) => {
    try {
      if (withLoading) setLoading(true);
      setErrorState({ status: null, message: "" });

      const nextProfile = await getDoctorProfile(doctorId);
      setProfile(nextProfile);
    } catch (error) {
      setProfile(null);
      setErrorState(buildErrorState(error));
    } finally {
      if (withLoading) setLoading(false);
    }
  };

  const loadMyReview = async () => {
    if (!isPatient) {
      setReviewState(createEmptyReviewState());
      return;
    }

    try {
      setReviewState((current) => ({ ...current, loading: true }));
      const data = await getMyDoctorReview(doctorId);
      setReviewState({
        rating: data.review?.rating ?? 5,
        comment: data.review?.content ?? "",
        exists: Boolean(data.review),
        canReview: Boolean(data.canReview),
        loading: false,
      });
    } catch (_error) {
      setReviewState(createEmptyReviewState());
    }
  };

  const loadReviews = async ({ cursor = "", append = false } = {}) => {
    try {
      setReviewsFeed((current) => ({ ...current, loading: true }));
      const data = await getDoctorReviews(doctorId, { cursor, limit: 8 });
      setReviewsFeed((current) => ({
        items: append ? [...current.items, ...data.items] : data.items,
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
        loading: false,
      }));
      setReviewsExpanded(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể tải thêm đánh giá.");
      setReviewsFeed((current) => ({ ...current, loading: false }));
    }
  };

  useEffect(() => {
    void loadProfile();
    void loadMyReview();
  }, [doctorId, isPatient]);

  const handleHireDoctor = async () => {
    try {
      setHiring(true);
      await requestDoctorHire(Number(doctorId));
      toast.success("Đã gửi yêu cầu thuê bác sĩ.");
      await loadProfile({ withLoading: false });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể gửi yêu cầu thuê bác sĩ.");
    } finally {
      setHiring(false);
    }
  };

  const handleReviewSubmit = async () => {
    try {
      setReviewSubmitting(true);

      const payload = {
        rating: Number(reviewState.rating),
        comment: reviewState.comment.trim(),
      };

      if (reviewState.exists) {
        await updateMyDoctorReview(doctorId, payload);
      } else {
        await createMyDoctorReview(doctorId, payload);
      }

      toast.success("Đã lưu đánh giá của bạn.");
      await Promise.all([
        loadProfile({ withLoading: false }),
        loadMyReview(),
        reviewsExpanded ? loadReviews({ cursor: "", append: false }) : Promise.resolve(),
      ]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể lưu đánh giá.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    try {
      setReviewDeleting(true);
      await deleteMyDoctorReview(doctorId);
      toast.success("Đã ẩn đánh giá của bạn.");
      await Promise.all([
        loadProfile({ withLoading: false }),
        loadMyReview(),
        reviewsExpanded ? loadReviews({ cursor: "", append: false }) : Promise.resolve(),
      ]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể xóa đánh giá.");
    } finally {
      setReviewDeleting(false);
    }
  };

  if (loading) {
    return <DoctorProfileSkeleton />;
  }

  if (!profile) {
    return <DoctorProfileError status={errorState.status} message={errorState.message} doctorId={doctorId} onRetry={() => void loadProfile()} />;
  }

  const viewerState = profile.viewerState || {};
  const displayReviews = reviewsExpanded ? reviewsFeed.items : profile.reviewsPreview;
  const canChat = viewerState.is_hired;
  const isPendingHire = viewerState.hire_status === "PENDING_DOCTOR_APPROVAL";

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-12">
      <aside className="space-y-6 lg:col-span-4">
        <section className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
          <div className="relative">
            <ImageWithFallback
              alt={profile.name}
              className="mb-6 aspect-square w-full rounded-lg object-cover object-top"
              src={profile.avatar || DEFAULT_DOCTOR_AVATAR}
            />
            <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
              <span className="text-sm font-semibold text-secondary">
                {profile.isListed ? "Đang nhận bệnh nhân" : "Hồ sơ giới hạn"}
              </span>
            </div>
          </div>

          <h1 className="mb-1 text-2xl font-bold leading-tight text-primary md:text-3xl">{profile.name}</h1>
          <p className="mb-4 font-semibold text-on-surface-variant">{profile.title || profile.specialty || "Bác sĩ LifeTrack"}</p>
          <div className="mb-6 flex items-center gap-2">
            <RatingStars rating={profile.stats.averageRating} />
            <span className="text-sm text-on-surface-variant">
              {profile.stats.reviewCount > 0
                ? `${profile.stats.averageRating.toFixed(1)} (${profile.stats.reviewCount} đánh giá)`
                : "Chưa có đánh giá"}
            </span>
          </div>

          <div className="space-y-3">
            {canChat ? (
              <Link
                className="flex h-14 w-full items-center justify-center rounded-lg bg-primary text-base font-bold text-white shadow-sm transition-all hover:bg-primary-container active:scale-95"
                to={`/patient/doctors/${profile.id}/consult`}
              >
                Nhắn tin với bác sĩ
              </Link>
            ) : (
              <button
                className="h-14 w-full rounded-lg bg-primary text-base font-bold text-white shadow-sm transition-all hover:bg-primary-container active:scale-95 disabled:bg-slate-300"
                disabled={hiring || isPendingHire}
                onClick={handleHireDoctor}
                type="button"
              >
                {isPendingHire ? "Chờ bác sĩ duyệt" : hiring ? "Đang gửi yêu cầu..." : "Đăng ký thuê ngay"}
              </button>
            )}
            <Link
              className="flex h-14 w-full items-center justify-center rounded-lg border-2 border-primary text-base font-bold text-primary transition-colors hover:bg-primary/5"
              to="/patient/appointments"
            >
              Đặt lịch tư vấn ({formatDoctorCurrency(profile.consultationFee)}/phiên)
            </Link>
          </div>

          <div className="mt-8 border-t border-surface-container pt-8">
            <div className="grid grid-cols-2 gap-4">
              <StatBlock label="Năm kinh nghiệm" value={profile.experience_years ? `${profile.experience_years}+` : "—"} />
              <StatBlock label="Bệnh nhân đang theo dõi" value={profile.stats.activePatientCount || "0"} />
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-surface-container-low p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-on-surface-variant">Thông tin liên hệ</h2>
          <ul className="space-y-4">
            <ContactItem icon="location_on">
              <span>{profile.hospital || "Cơ sở y tế đối tác LifeTrack"}</span>
              <span className="block text-xs text-on-surface-variant">{profile.location || "Khám trực tuyến"}</span>
            </ContactItem>
            <ContactItem icon="mail">{profile.public_contact_email || "Thông tin liên hệ đang được cập nhật"}</ContactItem>
            <ContactItem icon="schedule">
              <span className="font-bold">Giờ làm việc</span>
              {profile.weeklySchedule.length > 0 ? (
                profile.weeklySchedule.map((slot) => (
                  <span key={`${slot.day_of_week}-${slot.start_time}-${slot.end_time}`} className="block text-xs text-on-surface-variant">
                    {formatScheduleDay(slot.day_of_week)}: {slot.start_time} - {slot.end_time}
                  </span>
                ))
              ) : (
                <span className="block text-xs text-on-surface-variant">Lịch làm việc đang được cập nhật</span>
              )}
            </ContactItem>
          </ul>
        </section>
      </aside>

      <main className="space-y-8 lg:col-span-8">
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-surface-container-lowest p-8 md:col-span-2">
            <h2 className="mb-4 text-xl font-bold text-primary md:text-2xl">Giới thiệu bản thân</h2>
            <p className="text-base leading-8 text-on-surface-variant">
              {profile.about || "Bác sĩ đang cập nhật phần giới thiệu chuyên môn."}
            </p>
          </div>

          <InfoListCard
            icon="school"
            title="Học vấn & Bằng cấp"
            items={profile.education}
            renderItem={(item) => (
              <>
                <p className="font-semibold text-on-surface">{item.title}</p>
                <p className="text-sm text-on-surface-variant">{item.organization}</p>
                {item.year_label ? <p className="text-xs font-bold text-outline">{item.year_label}</p> : null}
              </>
            )}
            emptyText="Bác sĩ đang cập nhật học vấn và chứng chỉ."
          />

          <InfoListCard
            icon="history_edu"
            title="Nghiên cứu nổi bật"
            items={profile.research}
            cardStyle="grid"
            renderItem={(item) => (
              <>
                <p className="mb-1 text-sm font-semibold text-primary">{item.title}</p>
                <p className="text-xs text-on-surface-variant">
                  {item.source}
                  {item.published_year ? ` • ${item.published_year}` : ""}
                </p>
              </>
            )}
            emptyText="Chưa có dữ liệu nghiên cứu công khai."
          />
        </section>

        <section className="rounded-xl bg-surface-container-lowest p-8">
          <h2 className="mb-8 text-xl font-bold text-primary md:text-2xl">Lộ trình sự nghiệp</h2>
          {profile.career.length > 0 ? (
            <div className="relative space-y-8 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-0.5 before:bg-surface-container-highest">
              {profile.career.map((item, index) => (
                <div key={`${item.experience_id || index}-${item.title}`} className="relative flex items-center gap-6">
                  <div className={index === 0 ? "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white ring-8 ring-white" : "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-primary ring-8 ring-white"}>
                    <span className="text-[10px] font-bold">{item.time_label?.slice(0, 4) || "..."}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-on-surface md:text-lg">{item.title}</h3>
                    <p className="text-on-surface-variant">{item.organization}</p>
                    {item.time_label ? <p className="mt-1 text-xs font-bold uppercase tracking-wide text-outline">{item.time_label}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <SectionEmpty text="Bác sĩ đang cập nhật lộ trình sự nghiệp." />
          )}
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold text-primary md:text-2xl">Phản hồi từ bệnh nhân</h2>
            <span className="text-sm font-bold text-primary">Tổng cộng {profile.stats.reviewCount} đánh giá</span>
          </div>

          {isPatient ? (
            <ReviewComposer
              reviewState={reviewState}
              disabled={reviewSubmitting || reviewState.loading}
              deleting={reviewDeleting}
              onChange={setReviewState}
              onDelete={handleDeleteReview}
              onSubmit={handleReviewSubmit}
            />
          ) : null}

          {displayReviews.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {displayReviews.map((review) => (
                <article key={review.reviewId} className="relative overflow-hidden rounded-xl border border-surface-container-high bg-white p-6">
                  <span className="material-symbols-outlined absolute -right-2 -top-2 text-8xl text-primary/5">format_quote</span>
                  <div className="mb-4 flex items-center gap-3">
                    <ImageWithFallback alt={review.author} className="h-10 w-10 rounded-full object-cover" src={DEFAULT_DOCTOR_AVATAR} />
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{review.author}</p>
                      <p className="text-xs text-on-surface-variant">{formatDoctorReviewDate(review.createdAt)}</p>
                    </div>
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <RatingStars rating={review.rating} />
                    <span className="text-xs font-bold text-slate-500">{review.rating}/5</span>
                  </div>
                  <p className="text-sm italic leading-7 text-on-surface-variant">"{review.content}"</p>
                </article>
              ))}
            </div>
          ) : (
            <SectionEmpty text="Chưa có phản hồi công khai cho bác sĩ này." />
          )}

          {profile.stats.reviewCount > 4 && (!reviewsExpanded || reviewsFeed.hasMore) ? (
            <div className="flex justify-center">
              <button
                className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
                disabled={reviewsFeed.loading}
                onClick={() =>
                  void loadReviews({
                    cursor: reviewsExpanded ? reviewsFeed.nextCursor : "",
                    append: reviewsExpanded,
                  })
                }
                type="button"
              >
                {reviewsFeed.loading ? "Đang tải..." : reviewsExpanded ? "Xem thêm đánh giá" : "Xem tất cả đánh giá"}
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl bg-primary p-8 text-white shadow-xl shadow-primary/10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="mb-2 text-2xl font-bold md:text-3xl">Bắt đầu hành trình chăm sóc sức khỏe</h2>
              <p className="text-primary-fixed-dim">Nhận tư vấn ưu tiên và kế hoạch theo dõi cá nhân hóa cùng {profile.name}.</p>
            </div>
            <Link
              className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-4 text-sm font-bold text-primary shadow-sm transition-all hover:bg-primary-fixed"
              to={canChat ? `/patient/doctors/${profile.id}/consult` : "/patient/doctors/hire"}
            >
              {canChat ? "Nhắn tin ngay" : "Xem các gói đăng ký"}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function DoctorProfileSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-4">
        <div className="h-[520px] animate-pulse rounded-xl bg-slate-100" />
        <div className="h-[220px] animate-pulse rounded-xl bg-slate-100" />
      </div>
      <div className="space-y-8 lg:col-span-8">
        <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

function DoctorProfileError({ status, message, doctorId, onRetry }) {
  const title =
    status === 403
      ? "Hồ sơ bác sĩ hiện không khả dụng"
      : status === 404
        ? "Không tìm thấy bác sĩ"
        : "Không thể tải hồ sơ bác sĩ";

  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <span className="material-symbols-outlined text-3xl">{status === 404 ? "person_search" : "shield_locked"}</span>
      </div>
      <h1 className="text-2xl font-bold text-sky-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {message || `Không thể mở hồ sơ bác sĩ ID ${doctorId}.`}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white" onClick={onRetry} type="button">
          Tải lại
        </button>
        <Link className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700" to="/patient/doctors/hire">
          Về danh sách bác sĩ
        </Link>
      </div>
    </div>
  );
}

function InfoListCard({ icon, title, items, renderItem, emptyText, cardStyle = "list" }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-6 md:p-8">
      <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-primary">
        <span className="material-symbols-outlined">{icon}</span>
        {title}
      </h3>
      {items.length > 0 ? (
        cardStyle === "grid" ? (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-lg bg-white p-4">
                {renderItem(item)}
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-5">
            {items.map((item, index) => (
              <li key={`${item.title}-${index}`} className="relative pl-6 before:absolute before:left-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-primary">
                {renderItem(item)}
              </li>
            ))}
          </ul>
        )
      ) : (
        <SectionEmpty text={emptyText} />
      )}
    </div>
  );
}

function ReviewComposer({ reviewState, disabled, deleting, onChange, onDelete, onSubmit }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-sky-900">Đánh giá của bạn</h3>
          <p className="text-sm text-slate-500">
            {reviewState.canReview
              ? reviewState.exists
                ? "Bạn có thể cập nhật lại đánh giá đã gửi."
                : "Bạn có thể gửi nhận xét sau khi đã thuê hoặc hoàn tất buổi khám."
              : "Bạn cần có quan hệ khám hoặc thuê bác sĩ để gửi đánh giá."}
          </p>
        </div>
        {reviewState.exists ? (
          <button
            className="rounded-lg border border-red-100 px-4 py-2 text-xs font-bold text-red-600 disabled:opacity-50"
            disabled={disabled || deleting}
            onClick={onDelete}
            type="button"
          >
            {deleting ? "Đang ẩn..." : "Ẩn đánh giá"}
          </button>
        ) : null}
      </div>

      <div className="mb-4 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${Number(reviewState.rating) === value ? "border-primary bg-primary text-white" : "border-slate-200 text-slate-600 hover:border-primary"}`}
            disabled={!reviewState.canReview || disabled}
            onClick={() => onChange((current) => ({ ...current, rating: value }))}
            type="button"
          >
            {value}★
          </button>
        ))}
      </div>

      <textarea
        className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary"
        disabled={!reviewState.canReview || disabled}
        onChange={(event) => onChange((current) => ({ ...current, comment: event.target.value }))}
        placeholder="Chia sẻ trải nghiệm của bạn về bác sĩ này..."
        value={reviewState.comment}
      />

      <div className="mt-4 flex justify-end">
        <button
          className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:bg-slate-300"
          disabled={!reviewState.canReview || disabled || !String(reviewState.comment || "").trim()}
          onClick={onSubmit}
          type="button"
        >
          {disabled ? "Đang lưu..." : reviewState.exists ? "Cập nhật đánh giá" : "Gửi đánh giá"}
        </button>
      </div>
    </div>
  );
}

function SectionEmpty({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-medium text-slate-500">
      {text}
    </div>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
    </div>
  );
}

function ContactItem({ icon, children }) {
  return (
    <li className="flex items-start gap-3">
      <span className="material-symbols-outlined text-primary">{icon}</span>
      <div className="text-sm text-on-surface">{children}</div>
    </li>
  );
}

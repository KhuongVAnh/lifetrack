import { useEffect, useMemo, useRef, useState } from "react";
import {
  createCommunityComment,
  createCommunityQuestion,
  getCommunityArticles,
  getCommunityQuestions,
  mapCommunityArticleForCard,
  mapCommunityQuestionForCard,
  shareCommunityQuestion,
  updateCommunityReaction,
  uploadCommunityFiles,
} from "@/features/community";
import { getUserAvatar, getUserDisplayName } from "@/entities/user";
import { useAuth } from "@/features/auth";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";

const DEFAULT_TAGS = ["#SucKhoe"];

const normalizeDraftTags = (value) => {
  const tags = String(value || "")
    .split(/[,\s]+/)
    .map((item) => item.trim().replace(/^#+/, ""))
    .filter(Boolean)
    .map((item) => `#${item}`);

  return [...new Set(tags)].slice(0, 5);
};

const isImageFile = (file) => file?.type?.startsWith("image/");

const getAttachmentUrl = (attachment) => attachment?.url || attachment?.secure_url || "";

const isImageAttachment = (attachment) => {
  const url = getAttachmentUrl(attachment);
  return (
    attachment?.resource_type === "image" ||
    ["jpg", "jpeg", "png", "webp", "gif"].includes(String(attachment?.format || "").toLowerCase()) ||
    /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)
  );
};

export function CommunityQuestionsPage() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [questions, setQuestions] = useState([]);
  const [articles, setArticles] = useState([]);
  const [activeDoctors, setActiveDoctors] = useState([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});

  const mappedQuestions = useMemo(() => questions.map(mapCommunityQuestionForCard), [questions]);
  const mappedArticles = useMemo(() => articles.map(mapCommunityArticleForCard), [articles]);
  const displayName = getUserDisplayName(user, "LifeTrack");
  const avatar = getUserAvatar(user);
  const selectedPreviews = useMemo(
    () =>
      selectedFiles.map((file) => ({
        file,
        previewUrl: isImageFile(file) ? URL.createObjectURL(file) : null,
      })),
    [selectedFiles],
  );

  useEffect(() => {
    return () => {
      selectedPreviews.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [selectedPreviews]);

  const extractActiveDoctors = (items) => {
    const doctors = new Map();
    items.forEach((question) => {
      const answer = question.preferred_answer || question.answers?.[0];
      const author = answer?.author;
      if (author?.user_id && !doctors.has(author.user_id)) {
        doctors.set(author.user_id, {
          id: author.user_id,
          name: author.display_name || author.name,
          specialty: author.role || "Bác sĩ LifeTrack",
          avatar: author.avatar_url || "/assets/avatars/default/avatar-default.png",
        });
      }
    });
    return [...doctors.values()].slice(0, 3);
  };

  const loadCommunity = async () => {
    try {
      setLoading(true);
      setError("");
      const [questionResult, articleResult] = await Promise.all([
        getCommunityQuestions({ limit: 20 }),
        getCommunityArticles({ limit: 3 }),
      ]);

      setQuestions(questionResult.questions);
      setArticles(articleResult.articles);
      setActiveDoctors(extractActiveDoctors(questionResult.questions));
    } catch {
      setError("Chưa tải được dữ liệu cộng đồng. Vui lòng thử lại sau.");
      setQuestions([]);
      setArticles([]);
      setActiveDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunity();
  }, []);

  const handleSubmitQuestion = async () => {
    const title = draftTitle.trim();
    const body = draftBody.trim();
    if (!title || !body || submitting) return;

    try {
      setSubmitting(true);
      setError("");
      const attachments = selectedFiles.length ? await uploadCommunityFiles(selectedFiles) : [];
      const tags = normalizeDraftTags(draftTags);

      const created = await createCommunityQuestion({
        title,
        body,
        tags: tags.length ? tags : DEFAULT_TAGS,
        is_anonymous: anonymous,
        attachments,
      });

      setQuestions((current) => [created, ...current]);
      setDraftTitle("");
      setDraftBody("");
      setDraftTags("");
      setSelectedFiles([]);
      setAnonymous(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Không thể đăng câu hỏi. Vui lòng kiểm tra kết nối hoặc quyền tài khoản.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (questionId, type) => {
    let previousQuestions = [];
    let nextType = null;

    try {
      setError("");
      setQuestions((items) => {
        previousQuestions = items;

        return items.map((question) => {
          if (question.question_id !== questionId) return question;

          const currentType = question.my_reaction || null;
          nextType = currentType === type ? null : type;
          const stats = { ...(question.stats || {}) };
          stats.likes = Number(stats.likes || 0);
          stats.dislikes = Number(stats.dislikes || 0);

          if (currentType === "LIKE") stats.likes = Math.max(stats.likes - 1, 0);
          if (currentType === "DISLIKE") stats.dislikes = Math.max(stats.dislikes - 1, 0);
          if (nextType === "LIKE") stats.likes += 1;
          if (nextType === "DISLIKE") stats.dislikes += 1;

          return {
            ...question,
            my_reaction: nextType,
            stats,
          };
        });
      });

      const result = await updateCommunityReaction(questionId, nextType);
      setQuestions((items) =>
        items.map((question) =>
          question.question_id === questionId
            ? {
                ...question,
                my_reaction: result.my_reaction,
                stats: {
                  ...(question.stats || {}),
                  ...(result.stats || {}),
                },
              }
            : question,
        ),
      );
    } catch {
      setQuestions(previousQuestions);
      setError("Không thể cập nhật phản hồi. Vui lòng thử lại.");
    }
  };

  const handleCommentSubmit = async (questionId) => {
    const body = String(commentDrafts[questionId] || "").trim();
    if (!body) return;

    const tempId = `temp-${questionId}-${Date.now()}`;
    const optimisticComment = {
      comment_id: tempId,
      body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      __status: "sending",
      author: {
        user_id: user?.user_id || null,
        display_name: displayName,
        name: displayName,
        avatar_url: avatar,
        role: user?.role || null,
      },
    };

    setError("");
    setCommentDrafts((current) => ({ ...current, [questionId]: "" }));
    setQuestions((items) =>
      items.map((question) => {
        if (question.question_id !== questionId) return question;
        const stats = { ...(question.stats || {}) };
        stats.comments = Number(stats.comments || 0) + 1;
        return {
          ...question,
          stats,
          comments: [...(Array.isArray(question.comments) ? question.comments : []), optimisticComment],
        };
      }),
    );

    try {
      const savedComment = await createCommunityComment(questionId, { body });
      setQuestions((items) =>
        items.map((question) => {
          if (question.question_id !== questionId) return question;
          return {
            ...question,
            comments: (Array.isArray(question.comments) ? question.comments : []).map((comment) =>
              comment.comment_id === tempId ? { ...savedComment, __status: "sent" } : comment,
            ),
          };
        }),
      );
    } catch {
      setQuestions((items) =>
        items.map((question) => {
          if (question.question_id !== questionId) return question;
          return {
            ...question,
            comments: (Array.isArray(question.comments) ? question.comments : []).map((comment) =>
              comment.comment_id === tempId ? { ...comment, __status: "failed" } : comment,
            ),
          };
        }),
      );
      setError("Không thể gửi bình luận. Bình luận của bạn đang được đánh dấu lỗi gửi.");
    }
  };

  const handleShare = async (questionId) => {
    try {
      const result = await shareCommunityQuestion(questionId);
      setQuestions((items) =>
        items.map((question) =>
          question.question_id === questionId
            ? {
                ...question,
                share_count: result.stats?.shares ?? question.share_count,
                stats: {
                  ...(question.stats || {}),
                  ...(result.stats || {}),
                },
              }
            : question,
        ),
      );
    } catch {
      setError("Không thể ghi nhận chia sẻ. Vui lòng thử lại.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-xl shadow-blue-900/5">
        <div className="flex items-start gap-4">
          <ImageWithFallback alt={displayName} className="h-12 w-12 rounded-full object-cover" src={avatar} />
          <div className="flex-1 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-widest text-outline">Header</label>
              <input
                className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-lg font-bold text-on-surface outline-none placeholder:text-outline/50 focus:border-primary focus:ring-2 focus:ring-primary/10"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Tóm tắt câu hỏi của bạn"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-widest text-outline">Body</label>
              <textarea
                className="h-28 w-full resize-none rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none placeholder:text-outline/50 focus:border-primary focus:ring-2 focus:ring-primary/10"
                value={draftBody}
                onChange={(event) => setDraftBody(event.target.value)}
                placeholder="Mô tả triệu chứng, thời gian xuất hiện, thuốc đang dùng hoặc thông tin liên quan..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-widest text-outline">Hashtag</label>
              <input
                className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-bold text-primary outline-none placeholder:text-outline/50 focus:border-primary focus:ring-2 focus:ring-primary/10"
                value={draftTags}
                onChange={(event) => setDraftTags(event.target.value)}
                placeholder="#TimMach #DinhDuong #NhiKhoa"
              />
            </div>
            {selectedFiles.length > 0 && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {selectedPreviews.map(({ file, previewUrl }) => (
                  <div key={`${file.name}-${file.size}`} className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-low">
                    {previewUrl ? (
                      <img alt={file.name} className="h-32 w-full object-cover" src={previewUrl} />
                    ) : (
                      <div className="flex h-32 flex-col items-center justify-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-3xl">description</span>
                        <span className="px-3 text-center text-xs font-bold">{file.type || "Tệp đính kèm"}</span>
                      </div>
                    )}
                    <div className="truncate px-3 py-2 text-xs font-bold text-on-surface-variant">{file.name}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/20 pt-4">
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  className="hidden"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-2 text-sm font-bold text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-xl">image</span>
                  Đính kèm hình ảnh/xét nghiệm
                </button>
                <button
                  type="button"
                  onClick={() => setAnonymous((value) => !value)}
                  className={[
                    "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold",
                    anonymous ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant",
                  ].join(" ")}
                >
                  <span className="material-symbols-outlined text-xl">visibility_off</span>
                  Đăng ẩn danh
                </button>
              </div>
              <button
                type="button"
                onClick={handleSubmitQuestion}
                disabled={!draftTitle.trim() || !draftBody.trim() || submitting}
                className="rounded-xl bg-primary px-8 py-2 font-bold text-white shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Đang đăng..." : "Đăng câu hỏi"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {loading && (
            <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-on-surface-variant shadow-xl shadow-blue-900/5">
              Đang tải câu hỏi cộng đồng...
            </div>
          )}

          {!loading && mappedQuestions.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-on-surface-variant shadow-xl shadow-blue-900/5">
              Chưa có câu hỏi cộng đồng nào.
            </div>
          )}

          {mappedQuestions.map((question) => {
            const imageAttachments = (question.attachments || []).filter(isImageAttachment);
            const fileAttachments = (question.attachments || []).filter((attachment) => !isImageAttachment(attachment));
            const commentItems = question.commentItems || [];

            return (
            <article key={question.id} className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-blue-900/5">
              <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container font-bold text-secondary">
                    {question.author.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{question.author}</p>
                    <p className="text-xs text-outline">
                      Đã đăng {question.postedAt} • {question.tag}
                    </p>
                  </div>
                </div>
                <h3 className="mb-3 text-xl font-bold text-primary">{question.title}</h3>
                <p className="mb-4 whitespace-pre-wrap leading-relaxed text-on-surface-variant">{question.body}</p>
                {imageAttachments.length > 0 && (
                  <div className={["mb-5 grid gap-3", imageAttachments.length === 1 ? "grid-cols-1" : "sm:grid-cols-2"].join(" ")}>
                    {imageAttachments.map((attachment) => {
                      const attachmentUrl = getAttachmentUrl(attachment);
                      return (
                        <a
                          key={attachment.attachment_id || attachmentUrl}
                          href={attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group block overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low"
                        >
                          <ImageWithFallback
                            alt={attachment.original_name || question.title}
                            className="max-h-[420px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            src={attachmentUrl}
                          />
                        </a>
                      );
                    })}
                  </div>
                )}
                <div className="mb-6 flex flex-wrap gap-2">
                  {question.tags.map((tag) => (
                    <span key={tag} className="rounded-lg bg-surface-container-low px-3 py-1 text-xs font-bold text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
                {fileAttachments.length > 0 && (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {fileAttachments.map((attachment) => (
                      <a
                        key={attachment.attachment_id || getAttachmentUrl(attachment)}
                        href={getAttachmentUrl(attachment)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 px-3 py-2 text-xs font-bold text-primary"
                      >
                        <span className="material-symbols-outlined text-[16px]">attach_file</span>
                        {attachment.original_name || "Tệp đính kèm"}
                      </a>
                    ))}
                  </div>
                )}
                <div className="rounded-2xl border-l-4 border-primary bg-primary-fixed/30 p-5">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <ImageWithFallback
                        alt={question.answerDoctor}
                        className="h-8 w-8 rounded-full object-cover"
                        src={question.answerDoctorAvatar}
                      />
                      <p className="text-sm font-bold text-primary">{question.answerDoctor}</p>
                      <span className="material-symbols-outlined text-sm text-blue-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                    <span className="text-xs italic text-primary/60">Câu trả lời ưu tiên</span>
                  </div>
                  <p className="text-sm leading-relaxed text-on-surface-variant">{question.answer}</p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-outline-variant/10 pt-4">
                  <div className="flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-1">
                    <button
                      type="button"
                      onClick={() => handleReaction(question.id, "LIKE")}
                      className={["p-2 hover:text-primary", question.myReaction === "LIKE" ? "text-primary" : ""].join(" ")}
                    >
                      <span className="material-symbols-outlined">thumb_up</span>
                    </button>
                    <span className="px-1 text-sm font-bold text-on-surface-variant">{question.likes}</span>
                    <button
                      type="button"
                      onClick={() => handleReaction(question.id, "DISLIKE")}
                      className={["p-2 hover:text-error", question.myReaction === "DISLIKE" ? "text-error" : ""].join(" ")}
                    >
                      <span className="material-symbols-outlined">thumb_down</span>
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <button type="button" className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary">
                      <span className="material-symbols-outlined">comment</span>
                      {question.comments} Bình luận
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShare(question.id)}
                      className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary"
                    >
                      <span className="material-symbols-outlined">share</span>
                      {question.shares ? `${question.shares} Chia sẻ` : "Chia sẻ"}
                    </button>
                  </div>
                </div>
                <div className="mt-5 space-y-3 rounded-2xl bg-surface-container-low/60 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-on-surface">Bình luận</p>
                    <span className="text-xs font-bold text-on-surface-variant">{question.comments} bình luận</span>
                  </div>
                  {commentItems.length > 0 && (
                    <div className="space-y-3">
                      {commentItems.map((comment) => {
                        const authorName = comment.author?.display_name || comment.author?.name || "Người dùng LifeTrack";
                        const commentStatus =
                          comment.__status === "sending"
                            ? "Đang gửi..."
                            : comment.__status === "failed"
                              ? "Lỗi gửi"
                              : "Đã gửi";

                        return (
                          <div key={comment.comment_id} className="flex gap-3">
                            <ImageWithFallback
                              alt={authorName}
                              className="h-8 w-8 rounded-full object-cover"
                              src={comment.author?.avatar_url || "/assets/avatars/default/avatar-default.png"}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="rounded-2xl bg-white px-4 py-2 shadow-sm">
                                <p className="text-xs font-black text-on-surface">{authorName}</p>
                                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-on-surface-variant">{comment.body}</p>
                              </div>
                              <p
                                className={[
                                  "mt-1 px-2 text-[10px] font-bold",
                                  comment.__status === "failed" ? "text-error" : "text-outline",
                                ].join(" ")}
                              >
                                {commentStatus}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <ImageWithFallback alt={displayName} className="h-9 w-9 rounded-full object-cover" src={avatar} />
                    <input
                      className="min-w-0 flex-1 rounded-full border border-outline-variant/30 bg-white px-4 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                      value={commentDrafts[question.id] || ""}
                      onChange={(event) => setCommentDrafts((current) => ({ ...current, [question.id]: event.target.value }))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleCommentSubmit(question.id);
                        }
                      }}
                      placeholder="Viết bình luận..."
                    />
                    <button
                      type="button"
                      onClick={() => handleCommentSubmit(question.id)}
                      disabled={!String(commentDrafts[question.id] || "").trim()}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Gửi bình luận"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
            );
          })}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary">Kiến thức & Tin tức</h2>
            <div className="mt-4 space-y-4">
              {mappedArticles.map((article) => (
                <div key={article.id} className="flex gap-3">
                  <ImageWithFallback alt={article.title} className="h-16 w-20 rounded-xl object-cover" src={article.image} />
                  <div>
                    <p className="line-clamp-2 text-sm font-bold text-on-surface">{article.title}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{article.readTime}</p>
                  </div>
                </div>
              ))}
              {!mappedArticles.length && <p className="text-sm text-on-surface-variant">Chưa có bài viết mới.</p>}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary">Bác sĩ tích cực nhất</h2>
            <div className="mt-4 space-y-4">
              {activeDoctors.map((doctor) => (
                <div key={doctor.id} className="flex items-center gap-3">
                  <ImageWithFallback alt={doctor.name} className="h-12 w-12 rounded-xl object-cover" src={doctor.avatar} />
                  <div>
                    <p className="font-bold text-on-surface">{doctor.name}</p>
                    <p className="text-xs text-on-surface-variant">{doctor.specialty}</p>
                  </div>
                </div>
              ))}
              {!activeDoctors.length && <p className="text-sm text-on-surface-variant">Chưa có bác sĩ trả lời câu hỏi.</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

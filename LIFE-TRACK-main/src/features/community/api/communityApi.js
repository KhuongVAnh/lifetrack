import { httpClient } from "@/shared/api";

const DEFAULT_ARTICLE_IMAGE = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80";
const DEFAULT_DOCTOR_AVATAR = "/assets/avatars/default/avatar-default.png";

export const formatCommunityTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "vừa xong";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0);
  if (diffMinutes < 1) return "vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString("vi-VN");
};

export const mapCommunityArticleForCard = (article) => ({
  ...article,
  id: article.article_id ?? article.id ?? article.slug,
  image: article.cover_image_url || article.image || DEFAULT_ARTICLE_IMAGE,
  readTime: article.read_time || article.readTime || "5 phút đọc",
  authorName: article.author?.display_name || article.author?.name || article.author || "Đội ngũ LifeTrack",
  specialty: article.author?.role || article.specialty || "LifeTrack",
});

export const mapCommunityQuestionForCard = (question) => {
  const tags = Array.isArray(question.tags) ? question.tags : [question.tag, question.tag2].filter(Boolean);
  const answer = question.preferred_answer || question.answers?.[0] || null;
  const commentItems = Array.isArray(question.comments) ? question.comments : question.commentItems || [];

  return {
    ...question,
    id: question.question_id ?? question.id,
    tag: tags[0] || "#SucKhoe",
    tag2: tags[1] || "",
    tags,
    author: question.author_display_name || question.author?.display_name || question.author?.name || question.author || "Bệnh nhân LifeTrack",
    postedAt: question.postedAt || formatCommunityTime(question.created_at),
    answerDoctor: answer?.author?.display_name || answer?.author?.name || question.answerDoctor || "Bác sĩ LifeTrack",
    answerDoctorAvatar: answer?.author?.avatar_url || DEFAULT_DOCTOR_AVATAR,
    answer: answer?.body || question.answer || "Câu hỏi đang chờ bác sĩ phản hồi.",
    likes: question.stats?.likes ?? question.likes ?? 0,
    dislikes: question.stats?.dislikes ?? question.dislikes ?? 0,
    comments: question.stats?.comments ?? (Array.isArray(question.comments) ? question.comments.length : question.comments ?? 0),
    commentItems,
    shares: question.stats?.shares ?? question.share_count ?? 0,
    myReaction: question.my_reaction || null,
  };
};

export const getCommunityArticles = async ({ category = "", q = "", limit = 10, cursor = "" } = {}) => {
  const { data } = await httpClient.get("/community/articles", {
    params: {
      limit,
      ...(category ? { category } : {}),
      ...(q ? { q } : {}),
      ...(cursor ? { cursor } : {}),
    },
  });

  return {
    articles: data.articles ?? [],
    nextCursor: data.next_cursor ?? null,
    hasMore: Boolean(data.has_more),
  };
};

export const getCommunityArticle = async (slug) => {
  const { data } = await httpClient.get(`/community/articles/${slug}`);
  return data.article;
};

export const createCommunityArticle = async (payload) => {
  const { data } = await httpClient.post("/community/articles", payload);
  return data.article;
};

export const updateCommunityArticle = async (articleId, payload) => {
  const { data } = await httpClient.patch(`/community/articles/${articleId}`, payload);
  return data.article;
};

export const deleteCommunityArticle = async (articleId) => {
  const { data } = await httpClient.delete(`/community/articles/${articleId}`);
  return data;
};

export const getCommunityQuestions = async ({ tag = "", q = "", limit = 10, cursor = "" } = {}) => {
  const { data } = await httpClient.get("/community/questions", {
    params: {
      limit,
      ...(tag ? { tag } : {}),
      ...(q ? { q } : {}),
      ...(cursor ? { cursor } : {}),
    },
  });

  return {
    questions: data.questions ?? [],
    nextCursor: data.next_cursor ?? null,
    hasMore: Boolean(data.has_more),
  };
};

export const getCommunityQuestion = async (questionId) => {
  const { data } = await httpClient.get(`/community/questions/${questionId}`);
  return data.question;
};

export const createCommunityQuestion = async (payload) => {
  const { data } = await httpClient.post("/community/questions", payload);
  return data.question;
};

export const createCommunityAnswer = async (questionId, payload) => {
  const { data } = await httpClient.post(`/community/questions/${questionId}/answers`, payload);
  return data.answer;
};

export const createCommunityComment = async (questionId, payload) => {
  const { data } = await httpClient.post(`/community/questions/${questionId}/comments`, payload);
  return data.comment;
};

export const updateCommunityReaction = async (questionId, type) => {
  const { data } = await httpClient.put(`/community/questions/${questionId}/reaction`, { type });
  return data;
};

export const shareCommunityQuestion = async (questionId) => {
  const { data } = await httpClient.post(`/community/questions/${questionId}/share`);
  return data;
};

export const uploadCommunityFiles = async (files) => {
  const formData = new FormData();
  Array.from(files || []).forEach((file) => {
    formData.append("files", file);
  });

  const { data } = await httpClient.post("/community/uploads", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data.attachments ?? [];
};

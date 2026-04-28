import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCommunityArticles,
  getCommunityQuestions,
  mapCommunityArticleForCard,
  mapCommunityQuestionForCard,
} from "@/features/community";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";

export function CommunityKnowledgePage() {
  const [articles, setArticles] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);

  const mappedArticles = useMemo(() => articles.map(mapCommunityArticleForCard), [articles]);
  const mappedQuestions = useMemo(() => questions.map(mapCommunityQuestionForCard), [questions]);
  const [highlight, ...restArticles] = mappedArticles;

  useEffect(() => {
    let mounted = true;

    const loadCommunity = async () => {
      try {
        setLoading(true);
        setError("");
        const [articleResult, questionResult] = await Promise.all([
          getCommunityArticles({ limit: 8 }),
          getCommunityQuestions({ limit: 3 }),
        ]);

        if (!mounted) return;
        setArticles(articleResult.articles);
        setQuestions(questionResult.questions);
      } catch {
        if (!mounted) return;
        setError("Chưa tải được dữ liệu cộng đồng. Vui lòng thử lại sau.");
        setArticles([]);
        setQuestions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadCommunity();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-extrabold text-primary">Cộng đồng Sống Khỏe</h1>
          <p className="text-lg text-on-surface-variant">
            Chia sẻ kiến thức y tế chính thống và giải đáp thắc mắc cùng chuyên gia
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-surface-container-high px-4 py-2.5 font-medium text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            Lọc chuyên khoa
          </button>
          <Link
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-bold text-white shadow-lg shadow-primary/20"
            to="/patient/community/questions"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Đặt câu hỏi mới
          </Link>
        </div>
      </header>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      {loading && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-on-surface-variant shadow-sm">
          Đang tải kiến thức cộng đồng...
        </div>
      )}

      {!loading && !highlight && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-on-surface-variant shadow-sm">
          Chưa có bài viết cộng đồng nào.
        </div>
      )}

      {!loading && highlight && (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <article className="overflow-hidden rounded-2xl border border-transparent bg-surface-container-lowest shadow-sm transition-all hover:border-primary-container">
              <div className="aspect-[21/9] overflow-hidden">
                <ImageWithFallback alt={highlight.title} className="h-full w-full object-cover" src={highlight.image} />
              </div>
              <div className="p-6">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                    {highlight.category}
                  </span>
                  <span className="text-xs italic text-on-surface-variant">{highlight.readTime}</span>
                </div>
                <h2 className="mb-3 text-2xl font-bold text-primary">{highlight.title}</h2>
                <p className="mb-4 leading-relaxed text-on-surface-variant">{highlight.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-surface-container" />
                    <div>
                      <p className="text-sm font-bold text-on-surface">{highlight.authorName}</p>
                      <p className="text-xs text-on-surface-variant">{highlight.specialty}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedArticle(highlight)}
                    className="flex items-center gap-1 text-sm font-bold text-primary"
                  >
                    Đọc thêm
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            </article>

            <div className="grid gap-6 md:grid-cols-2">
              {restArticles.map((article) => (
                <article key={article.id} className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
                  <ImageWithFallback alt={article.title} className="mb-4 h-40 w-full rounded-xl object-cover" src={article.image} />
                  <span className="rounded bg-primary-container px-2 py-0.5 text-[10px] font-black uppercase text-on-primary-container">
                    {article.category}
                  </span>
                  <h3 className="mt-2 line-clamp-2 text-lg font-bold text-primary">{article.title}</h3>
                  <p className="mb-4 mt-2 line-clamp-2 text-sm text-on-surface-variant">{article.excerpt}</p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-200" />
                      <span className="truncate text-xs font-medium text-on-surface-variant">{article.authorName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedArticle(article)}
                      className="shrink-0 text-xs font-black text-primary hover:underline"
                    >
                      Đọc thêm
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-surface-container bg-white p-6 shadow-sm">
              <h3 className="mb-6 flex items-center justify-between text-xl font-bold text-primary">
                Hỏi đáp mới nhất
                <span className="material-symbols-outlined text-primary-container">forum</span>
              </h3>
              <div className="space-y-6">
                {mappedQuestions.map((question) => (
                  <div key={question.id} className="border-b border-surface-container pb-4 last:border-0 last:pb-0">
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <span className="rounded bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-on-secondary-container">
                        {question.status === "ANSWERED" ? "ĐÃ TRẢ LỜI" : "ĐANG MỞ"}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">{question.postedAt}</span>
                    </div>
                    <h4 className="font-bold text-on-surface">{question.title}</h4>
                    <p className="mt-2 text-sm text-on-surface-variant">{question.answer}</p>
                  </div>
                ))}
                {!mappedQuestions.length && <p className="text-sm text-on-surface-variant">Chưa có câu hỏi mới.</p>}
              </div>
            </div>

            <div className="rounded-2xl bg-primary-container p-6 text-white">
              <h3 className="text-lg font-bold">Bạn có thắc mắc riêng tư?</h3>
              <p className="mt-2 text-sm opacity-90">
                Đặt câu hỏi ẩn danh để nhận phản hồi từ bác sĩ mà vẫn giữ riêng tư cho gia đình bạn.
              </p>
              <Link className="mt-4 inline-flex rounded-xl bg-white px-5 py-3 font-bold text-primary" to="/patient/community/questions">
                Sang Q&A
              </Link>
            </div>
          </div>
        </div>
      )}

      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <article className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="relative h-56 overflow-hidden bg-surface-container md:h-72">
              <ImageWithFallback alt={selectedArticle.title} className="h-full w-full object-cover" src={selectedArticle.image} />
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-on-surface shadow-lg hover:bg-white"
                aria-label="Đóng bài viết"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="max-h-[calc(90vh-14rem)] overflow-y-auto p-6 md:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                  {selectedArticle.category}
                </span>
                <span className="text-xs italic text-on-surface-variant">{selectedArticle.readTime}</span>
              </div>
              <h2 className="text-2xl font-black leading-tight text-primary md:text-3xl">{selectedArticle.title}</h2>
              <div className="mt-4 flex items-center gap-3 border-b border-surface-container pb-5">
                <div className="h-9 w-9 rounded-full bg-surface-container" />
                <div>
                  <p className="text-sm font-bold text-on-surface">{selectedArticle.authorName}</p>
                  <p className="text-xs text-on-surface-variant">{selectedArticle.specialty}</p>
                </div>
              </div>
              <p className="mt-5 text-base font-semibold leading-relaxed text-on-surface">{selectedArticle.excerpt}</p>
              <div className="mt-5 space-y-4 whitespace-pre-wrap text-sm leading-7 text-on-surface-variant">
                {selectedArticle.content || "Nội dung chi tiết của bài viết đang được cập nhật."}
              </div>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}

import { communityArticles, communityQuestions, doctorProfiles } from "../data/mockData";
import { ImageWithFallback } from "../components/ImageWithFallback";

export function CommunityQuestionsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-xl shadow-blue-900/5">
        <div className="flex items-start gap-4">
          <ImageWithFallback
            alt="Avatar"
            className="h-12 w-12 rounded-full object-cover"
            src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=120&q=80"
          />
          <div className="flex-1">
            <textarea
              className="h-24 w-full resize-none border-none bg-transparent text-lg font-medium placeholder:text-outline/50 focus:ring-0"
              defaultValue=""
              placeholder="Bạn đang có thắc mắc gì về sức khỏe?"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/20 pt-4">
              <div className="flex flex-wrap gap-2">
                <button className="flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-2 text-sm font-bold text-on-surface-variant">
                  <span className="material-symbols-outlined text-xl">image</span>
                  Đính kèm hình ảnh/xét nghiệm
                </button>
                <button className="flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-2 text-sm font-bold text-on-surface-variant">
                  <span className="material-symbols-outlined text-xl">visibility_off</span>
                  Đăng ẩn danh
                </button>
              </div>
              <button className="rounded-xl bg-primary px-8 py-2 font-bold text-white shadow-lg shadow-primary/20">
                Đăng câu hỏi
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {communityQuestions.map((question) => (
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
                <p className="mb-4 leading-relaxed text-on-surface-variant">{question.body}</p>
                <div className="mb-6 flex gap-2">
                  <span className="rounded-lg bg-surface-container-low px-3 py-1 text-xs font-bold text-primary">
                    {question.tag}
                  </span>
                  <span className="rounded-lg bg-surface-container-low px-3 py-1 text-xs font-bold text-primary">
                    {question.tag2}
                  </span>
                </div>
                <div className="rounded-2xl border-l-4 border-primary bg-primary-fixed/30 p-5">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <ImageWithFallback
                        alt={question.answerDoctor}
                        className="h-8 w-8 rounded-full object-cover"
                        src={doctorProfiles[0].avatar}
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
                    <button className="p-2 hover:text-primary">
                      <span className="material-symbols-outlined">thumb_up</span>
                    </button>
                    <span className="px-1 text-sm font-bold text-on-surface-variant">{question.likes}</span>
                    <button className="p-2 hover:text-error">
                      <span className="material-symbols-outlined">thumb_down</span>
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <button className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary">
                      <span className="material-symbols-outlined">comment</span>
                      {question.comments} Bình luận
                    </button>
                    <button className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary">
                      <span className="material-symbols-outlined">share</span>
                      Chia sẻ
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary">Kiến thức & Tin tức</h2>
            <div className="mt-4 space-y-4">
              {communityArticles.slice(0, 3).map((article) => (
                <div key={article.id} className="flex gap-3">
                  <ImageWithFallback alt={article.title} className="h-16 w-20 rounded-xl object-cover" src={article.image} />
                  <div>
                    <p className="line-clamp-2 text-sm font-bold text-on-surface">{article.title}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{article.readTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary">Bác sĩ tích cực nhất</h2>
            <div className="mt-4 space-y-4">
              {doctorProfiles.slice(0, 3).map((doctor) => (
                <div key={doctor.id} className="flex items-center gap-3">
                  <ImageWithFallback alt={doctor.name} className="h-12 w-12 rounded-xl object-cover" src={doctor.avatar} />
                  <div>
                    <p className="font-bold text-on-surface">{doctor.name}</p>
                    <p className="text-xs text-on-surface-variant">{doctor.specialty}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

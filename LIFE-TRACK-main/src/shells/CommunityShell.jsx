import { NavLink, Outlet } from "react-router-dom";
import { appUser } from "../data/mockData";
import { communityTabs } from "../config/navigation";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PrimarySidebar } from "../components/PrimarySidebar";

export function CommunityShell() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <PrimarySidebar />

      <div className="min-h-screen md:ml-72">
        <header className="glass-header sticky top-0 z-50 flex items-center justify-between border-b border-outline-variant/20 bg-white/80 px-6 py-3">
          <div className="flex items-center gap-8">
            <div className="hidden items-center rounded-xl bg-surface-container-high px-4 py-2 md:flex md:w-96">
              <span className="material-symbols-outlined text-outline">search</span>
              <input
                className="w-full border-none bg-transparent text-sm font-medium focus:ring-0"
                placeholder="Tìm kiếm bài viết, câu hỏi..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-full p-2 hover:bg-slate-100">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
            </button>
            <ImageWithFallback
              alt={appUser.name}
              className="h-10 w-10 rounded-full border-2 border-primary-fixed object-cover"
              src={appUser.avatar}
            />
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-6 border-b border-surface-container-highest">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {communityTabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  className={({ isActive }) =>
                    [
                      "border-b-2 px-6 py-4 text-sm font-bold transition-all",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-on-surface-variant hover:text-primary",
                    ].join(" ")
                  }
                  to={tab.to}
                >
                  {tab.label}
                </NavLink>
              ))}
            </div>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { getUserAvatar, getUserDisplayName } from "@/entities/user";
import { useAuth } from "@/features/auth";
import { ImageWithFallback } from "@/shared/ui";
import { BottomNav, communityTabs, PrimarySidebar, primaryNav } from "@/widgets/navigation";

export function CommunityShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const displayName = getUserDisplayName(user, "LifeTrack");
  const avatar = getUserAvatar(user);

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <PrimarySidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="min-h-screen md:ml-72">
        <header className="glass-header sticky top-0 z-30 flex items-center justify-between border-b border-outline-variant/20 bg-white/80 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <span className="text-lg font-black text-primary md:hidden">LIFETRACK</span>

            <div className="hidden items-center rounded-xl bg-surface-container-high px-4 py-2 md:flex md:w-96">
              <span className="material-symbols-outlined text-outline">search</span>
              <input
                className="w-full border-none bg-transparent text-sm font-medium focus:ring-0"
                placeholder="Tìm kiếm bài viết, câu hỏi..."
                type="text"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <button className="relative rounded-full p-2 hover:bg-slate-100">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
            </button>
            <ImageWithFallback
              alt={displayName}
              className="h-9 w-9 md:h-10 md:w-10 rounded-full border-2 border-primary-fixed object-cover"
              src={avatar}
            />
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 pb-24 py-6 md:px-6 md:py-8 md:pb-12">
          <div className="mb-4 border-b border-surface-container-highest md:mb-6">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {communityTabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  className={({ isActive }) =>
                    [
                      "border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap md:px-6 md:py-4",
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

      <BottomNav items={primaryNav} onHamburgerClick={() => setSidebarOpen(true)} />
    </div>
  );
}

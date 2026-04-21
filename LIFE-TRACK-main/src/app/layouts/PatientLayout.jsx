import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { getUserAvatar, getUserDisplayName } from "@/entities/user";
import { useAuth } from "@/features/auth";
import { ImageWithFallback } from "@/shared/ui";
import { BottomNav, PrimarySidebar, primaryNav } from "@/widgets/navigation";

export function PatientShell() {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isConsultPage = /^\/patient\/doctors\/[^/]+\/consult$/.test(pathname);
  const { user } = useAuth();
  const displayName = getUserDisplayName(user, "LifeTrack");
  const avatar = getUserAvatar(user);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <PrimarySidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="min-h-screen md:ml-72">
        <header className="glass-header sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant/20 bg-white/80 px-4 md:px-8">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <div className="md:hidden">
              <span className="text-lg font-black text-primary">LIFETRACK</span>
            </div>

            <div className={`relative ${isConsultPage ? "hidden" : "hidden md:block"}`}>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                className="w-64 lg:w-80 rounded-full border-none bg-surface-container-low py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20"
                placeholder="Tìm bác sĩ, chuyên khoa hoặc triệu chứng..."
                type="text"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative rounded-full p-2 hover:bg-slate-100">
              <span className="material-symbols-outlined text-slate-600">notifications</span>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
            </button>
            <ImageWithFallback
              alt={displayName}
              className="h-9 w-9 md:h-10 md:w-10 rounded-full border-2 border-primary-fixed object-cover"
              src={avatar}
            />
          </div>
        </header>

        {/* Main content — pb-20 on mobile leaves space for bottom nav */}
        <main className="min-h-[calc(100vh-4rem)] px-4 pb-24 pt-6 md:px-8 md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Bottom navigation — mobile only */}
      <BottomNav items={primaryNav} onHamburgerClick={() => setSidebarOpen(true)} />
    </div>
  );
}

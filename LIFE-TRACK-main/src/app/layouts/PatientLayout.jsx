import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getUserAvatar, getUserDisplayName } from "@/entities/user";
import { FloatingAiChatWidget } from "@/features/ai-chat";
import { useAuth } from "@/features/auth";
import { ImageWithFallback } from "@/shared/ui";
import { BottomNav, PrimarySidebar, primaryNav } from "@/widgets/navigation";

export function PatientShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const isConsultPage = /^\/patient\/doctors\/[^/]+\/consult$/.test(pathname);
  const { user, logout } = useAuth();
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
            {/* Notifications */}
            <div className="relative">
              <button className="relative rounded-full p-2 hover:bg-slate-100">
                <span className="material-symbols-outlined text-slate-600">notifications</span>
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
              </button>
            </div>

            {/* Profile Menu */}
            <div
              className="relative flex items-center gap-2 md:gap-3 cursor-pointer group"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <ImageWithFallback
                alt={displayName}
                className="h-9 w-9 md:h-10 md:w-10 rounded-full border-2 border-primary-fixed object-cover group-hover:ring-2 group-hover:ring-primary/50 transition-all hover:scale-105"
                src={avatar}
              />

              {isProfileOpen && (
                <div className="absolute right-0 top-14 w-52 md:w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in flex flex-col">
                  <div className="px-4 py-3 border-b border-slate-100 flex flex-col">
                    <span className="font-bold text-sm text-slate-800">{displayName}</span>
                    <span className="text-[10px] font-medium text-slate-400">{user?.email || "patient@lifetrack.vn"}</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate("/patient/settings");
                    }}
                    className="px-4 py-2 mt-2 text-left text-sm text-slate-600 hover:bg-slate-50 font-medium flex gap-3 items-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">person</span> Hồ sơ của tôi
                  </button>
                  <div className="h-px bg-slate-100 my-2"></div>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      void logout(true, true);
                    }}
                    className="px-4 py-2 mb-1 text-left text-sm text-error hover:bg-error/10 font-bold flex gap-3 items-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content — pb-20 on mobile leaves space for bottom nav */}
        <main className="min-h-[calc(100vh-4rem)] px-4 pb-24 pt-6 md:px-8 md:pb-12">
          <Outlet />
        </main>
      </div>

      {!isConsultPage && <FloatingAiChatWidget />}

      {/* Bottom navigation — mobile only */}
      <BottomNav items={primaryNav} onHamburgerClick={() => setSidebarOpen(true)} />
    </div>
  );
}

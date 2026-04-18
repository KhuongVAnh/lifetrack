import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { doctorTabs, primaryNav } from "../config/navigation";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PrimarySidebar } from "../components/PrimarySidebar";
import { BottomNav } from "../components/BottomNav";
import { useAuth } from "../contexts/AuthContext";
import { getUserAvatar, getUserDisplayName } from "../utils/auth";

export function DoctorShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const isConsultPage = pathname.includes("/consult") || pathname === "/patient/doctors" || pathname.includes("/chat");
  const { user } = useAuth();
  const displayName = getUserDisplayName(user, "LifeTrack");
  const avatar = getUserAvatar(user);

  return (
    <div className={isConsultPage ? "h-[100dvh] flex flex-col bg-background text-on-background overflow-hidden" : "min-h-screen flex flex-col bg-background text-on-background"}>
      <PrimarySidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={isConsultPage ? "h-[100dvh] md:ml-72 flex flex-col min-h-0" : "min-h-screen md:ml-72 flex flex-col"}>
        <header className="glass-header fixed left-0 right-0 top-0 z-30 flex items-center justify-between bg-white/80 px-4 py-3 md:left-72 md:px-6">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <span className="text-xl font-bold tracking-tight text-sky-900 md:hidden">LIFETRACK</span>

            <div className="hidden items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 md:flex md:w-96">
              <span className="material-symbols-outlined text-slate-500">search</span>
              <input
                className="w-full border-none bg-transparent text-sm placeholder:text-slate-400 focus:ring-0"
                placeholder="Tìm kiếm bác sĩ hoặc chuyên khoa..."
                type="text"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <button className="p-2 text-slate-500 hover:text-sky-600">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <ImageWithFallback
              alt={displayName}
              className="h-8 w-8 rounded-full border border-outline-variant object-cover"
              src={avatar}
            />
          </div>
        </header>

        <main className={isConsultPage ? "flex-1 px-4 pb-24 pt-20 md:px-6 md:pb-6 md:pt-24 flex flex-col min-h-0" : "mx-auto max-w-7xl px-4 pb-24 pt-20 md:px-8 md:pb-12 md:pt-24"}>
          {!isConsultPage && (
            <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-sky-900 md:text-3xl">Bác sĩ gia đình</h1>
                <p className="mt-2 max-w-3xl text-slate-600 text-sm md:text-base">
                  Kết nối trực tiếp với đội ngũ bác sĩ đồng hành cùng hồ sơ sức khỏe của gia đình bạn.
                </p>
              </div>
              <div className="flex gap-2 rounded-full bg-surface-container-low p-1 self-start md:self-auto">
                {doctorTabs.map((tab) => (
                  <NavLink
                    key={tab.to}
                    className={({ isActive }) =>
                      [
                        "rounded-full px-4 py-2 text-sm font-bold transition-all md:px-5 md:py-2.5",
                        isActive ? "bg-primary text-white shadow-md" : "text-slate-600 hover:bg-white",
                      ].join(" ")
                    }
                    end={tab.to.endsWith("/my")}
                    to={tab.to}
                  >
                    {tab.label}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          <Outlet />
        </main>
      </div>

      <BottomNav items={primaryNav} onHamburgerClick={() => setSidebarOpen(true)} />
    </div>
  );
}

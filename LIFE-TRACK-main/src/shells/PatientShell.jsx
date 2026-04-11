import { Outlet, useLocation } from "react-router-dom";
import { appUser } from "../data/mockData";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PrimarySidebar } from "../components/PrimarySidebar";

export function PatientShell() {
  const { pathname } = useLocation();
  const isConsultPage = /^\/patient\/doctors\/[^/]+\/consult$/.test(pathname);

  return (
    <div className="min-h-screen bg-background text-on-background md:flex">
      <PrimarySidebar />

      <div className="min-h-screen flex-1 md:ml-72">
        <header className="glass-header sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant/20 bg-white/80 px-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <span className="text-lg font-black text-primary">LIFETRACK</span>
            </div>
            <div className={`relative ${isConsultPage ? "hidden" : "hidden md:block"}`}>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                className="w-80 rounded-full border-none bg-surface-container-low py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20"
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
              alt={appUser.name}
              className="h-10 w-10 rounded-full border-2 border-primary-fixed object-cover"
              src={appUser.avatar}
            />
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] px-4 pb-16 pt-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

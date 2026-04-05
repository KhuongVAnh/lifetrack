import { NavLink, Outlet } from "react-router-dom";
import { appUser } from "../data/mockData";
import { doctorTabs } from "../config/navigation";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PrimarySidebar } from "../components/PrimarySidebar";

export function DoctorShell() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <PrimarySidebar />

      <div className="min-h-screen md:ml-72">
        <header className="glass-header fixed left-0 right-0 top-0 z-50 flex items-center justify-between bg-white/80 px-6 py-3 md:left-72">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold tracking-tight text-sky-900">LIFETRACK</span>
            <div className="hidden items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 md:flex md:w-96">
              <span className="material-symbols-outlined text-slate-500">search</span>
              <input
                className="w-full border-none bg-transparent text-sm placeholder:text-slate-400 focus:ring-0"
                placeholder="Tìm kiếm bác sĩ hoặc chuyên khoa..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:text-sky-600">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <ImageWithFallback
              alt={appUser.name}
              className="h-8 w-8 rounded-full border border-outline-variant object-cover"
              src={appUser.avatar}
            />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-12 pt-24 md:px-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-sky-900">Bác sĩ gia đình</h1>
              <p className="mt-2 max-w-3xl text-slate-600">
                Kết nối trực tiếp với đội ngũ bác sĩ đồng hành cùng hồ sơ sức khỏe của gia đình bạn.
              </p>
            </div>
            <div className="flex gap-2 rounded-full bg-surface-container-low p-1">
              {doctorTabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  className={({ isActive }) =>
                    [
                      "rounded-full px-5 py-2.5 text-sm font-bold transition-all",
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

          <Outlet />
        </main>
      </div>
    </div>
  );
}

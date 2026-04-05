import { Link, useLocation } from "react-router-dom";
import { primaryNav } from "../config/navigation";
import { appUser } from "../data/mockData";
import { ImageWithFallback } from "./ImageWithFallback";

function getNavClass(isActive) {
  return [
    "mx-2 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
    isActive ? "bg-primary/10 font-bold text-primary" : "text-slate-600 hover:bg-slate-200/70",
  ].join(" ");
}

export function PrimarySidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden h-screen w-72 flex-col overflow-y-auto bg-surface-container-low px-4 py-6 md:fixed md:left-0 md:top-0 md:flex">
      <div className="mb-8 px-4">
        <h1 className="text-xl font-black text-primary">LIFETRACK</h1>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Sự An Tâm Tĩnh Lặng</p>
      </div>

      <div className="mb-6 rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <ImageWithFallback alt={appUser.name} className="h-12 w-12 rounded-full object-cover" src={appUser.avatar} />
          <div>
            <p className="text-xs font-medium text-slate-500">{appUser.subtitle}</p>
            <p className="font-bold text-sky-900">{appUser.name}</p>
          </div>
        </div>
      </div>

      <nav className="space-y-1">
        {primaryNav.map((item) => {
          const isActive = item.activePrefixes.some((prefix) => pathname.startsWith(prefix));

          return (
            <Link key={item.to} className={getNavClass(isActive)} to={item.to}>
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-outline-variant/30 px-2 pt-6">
        <button className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-error px-4 py-4 font-bold text-white shadow-lg shadow-error/10 transition-all hover:brightness-105">
          <span className="material-symbols-outlined">emergency</span>
          Gọi cấp cứu
        </button>
        <a className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-200/70" href="#help">
          <span className="material-symbols-outlined">help</span>
          Trợ giúp
        </a>
        <a className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-200/70" href="#logout">
          <span className="material-symbols-outlined">logout</span>
          Đăng xuất
        </a>
      </div>
    </aside>
  );
}

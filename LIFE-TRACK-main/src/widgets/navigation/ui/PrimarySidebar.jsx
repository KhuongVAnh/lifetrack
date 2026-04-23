import { Link, useLocation } from "react-router-dom";
import { getUserAvatar, getUserDisplayName } from "@/entities/user";
import { useAuth } from "@/features/auth";
import { ImageWithFallback } from "@/shared/ui";
import { primaryNav } from "@/widgets/navigation/model/navigation";

function getNavClass(isActive) {
  return [
    "flex items-center gap-3 px-4 py-3 transition-all duration-300 ease-in-out rounded-lg text-sm",
    isActive
      ? "text-primary font-bold bg-sky-50 border-r-4 border-primary"
      : "text-slate-600 hover:text-primary hover:bg-slate-200/50 font-medium",
  ].join(" ");
}

export function PrimarySidebar({ isOpen = false, onClose }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const displayName = getUserDisplayName(user, "LifeTrack");
  const avatar = getUserAvatar(user);
  const subtitle = user?.subtitle || "Tài khoản LifeTrack";

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="mobile-overlay md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed left-0 top-0 z-50 h-screen w-72 flex-col overflow-y-auto bg-surface-container-low px-4 py-6",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          // Mobile: slide in/out
          "flex",
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          // Desktop: always visible
          "md:translate-x-0 md:shadow-none",
        ].join(" ")}
      >
        {/* Close button — mobile only */}
        <button
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 md:hidden"
          onClick={onClose}
          aria-label="Đóng menu"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        <div className="px-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
                health_metrics
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-primary tracking-tight leading-none">LIFETRACK</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Lắng nghe nhịp sống</p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <ImageWithFallback alt={displayName} className="h-12 w-12 rounded-full object-cover" src={avatar} />
            <div>
              <p className="text-xs font-medium text-slate-500">{subtitle}</p>
              <p className="font-bold text-sky-900">{displayName}</p>
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {primaryNav.map((item) => {
            const isActive = item.activePrefixes.some((prefix) => pathname.startsWith(prefix));

            return (
              <Link key={item.to} className={getNavClass(isActive)} to={item.to} onClick={onClose}>
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
          <button
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-500 hover:bg-slate-200/70"
            onClick={() => {
              onClose?.();
              void logout(true, true);
            }}
            type="button"
          >
            <span className="material-symbols-outlined">logout</span>
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}

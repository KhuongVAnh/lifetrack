import { NavLink, useLocation } from "react-router-dom";

/**
 * Bottom navigation bar — mobile only (md:hidden).
 * @param {Array} items - Array of { to, icon, label, activePrefixes }
 * @param {Function} onHamburgerClick - Opens the full sidebar drawer
 */
export function BottomNav({ items, onHamburgerClick }) {
  const { pathname } = useLocation();

  // Show only first 4 items + hamburger as 5th slot
  const visibleItems = items.slice(0, 4);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t border-slate-200 bg-white/95 pb-safe md:hidden">
      {visibleItems.map((item) => {
        const isActive = item.activePrefixes.some((p) => pathname.startsWith(p));
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors"
            style={{ color: isActive ? "var(--color-primary, #004976)" : "#64748b" }}
          >
            <span
              className="material-symbols-outlined text-[22px] leading-none"
              style={{ fontVariationSettings: isActive ? '"FILL" 1' : '"FILL" 0' }}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-bold leading-none">{item.label}</span>
          </NavLink>
        );
      })}

      {/* Hamburger — opens full sidebar */}
      <button
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-slate-500 transition-colors active:text-primary"
        onClick={onHamburgerClick}
        aria-label="Mở menu"
      >
        <span className="material-symbols-outlined text-[22px] leading-none">menu</span>
        <span className="text-[10px] font-bold leading-none">Thêm</span>
      </button>
    </nav>
  );
}

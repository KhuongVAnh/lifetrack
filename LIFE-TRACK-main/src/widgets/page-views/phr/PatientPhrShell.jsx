import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";

export function PatientPhrShell() {
  const { pathname } = useLocation();

  const TABS = [
    {
      id: "overview",
      path: "/patient/phr",
      label: "Tổng quan sức khỏe",
      icon: "dashboard",
    },
    {
      id: "history",
      path: "/patient/phr/history",
      label: "Lịch sử khám bệnh",
      icon: "history",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">

      {/* Tabs / Navigation */}
      <section className="rounded-[2rem] border border-surface-variant bg-surface-container-lowest p-3">
        <div className="grid gap-2 md:grid-cols-2">
          {TABS.map((tab) => {
            const isActive = pathname === tab.path;
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={[
                  "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors",
                  isActive ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:text-primary",
                ].join(" ")}
                end={tab.path === "/patient/phr"}
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      </section>

      {/* Content Area */}
      <Outlet />
    </div>
  );
}

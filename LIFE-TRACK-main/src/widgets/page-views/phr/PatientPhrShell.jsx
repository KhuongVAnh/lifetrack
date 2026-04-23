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
      {/* Header Section */}
      <section className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-soft md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-black text-on-surface md:text-4xl">Hồ sơ sức khỏe cá nhân</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-on-surface-variant md:text-base">
              Quản lý chi tiết các chỉ số sinh tồn, tiền sử bệnh lý và cập nhật lịch sử thăm khám tại các cơ sở y tế.
            </p>
          </div>
        </div>
      </section>

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

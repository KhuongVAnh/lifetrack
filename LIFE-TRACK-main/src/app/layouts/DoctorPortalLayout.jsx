import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNav, DoctorHeader, DoctorSidebar, doctorNav } from "@/widgets/navigation";

export function DoctorPortalShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { pathname } = useLocation();
  const isMessagesPage = pathname.includes("/messages");

  return (
    <div className={isMessagesPage ? "h-[100dvh] bg-background text-on-surface overflow-hidden flex flex-col" : "min-h-screen bg-background text-on-surface"}>
      <DoctorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className={isMessagesPage ? "flex-1 md:ml-64 flex flex-col items-stretch min-h-0" : "min-h-screen md:ml-64 flex flex-col items-stretch"}>
        <DoctorHeader onMenuClick={() => setSidebarOpen(true)} />
        <div className={isMessagesPage ? "pt-16 px-4 pb-24 w-full flex-1 md:pt-24 md:px-8 md:pb-12 min-h-0 flex flex-col" : "pt-16 px-4 pb-24 w-full flex-1 md:pt-24 md:px-8 md:pb-12"}>
          <Outlet />
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <BottomNav items={doctorNav} onHamburgerClick={() => setSidebarOpen(true)} />
    </div>
  );
}

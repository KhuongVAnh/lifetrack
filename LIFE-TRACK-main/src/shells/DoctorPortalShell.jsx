import { useState } from "react";
import { Outlet } from "react-router-dom";
import { DoctorSidebar, doctorNav } from "../components/DoctorSidebar";
import { DoctorHeader } from "../components/DoctorHeader";
import { BottomNav } from "../components/BottomNav";

export function DoctorPortalShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <DoctorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="min-h-screen md:ml-64 flex flex-col items-stretch">
        <DoctorHeader onMenuClick={() => setSidebarOpen(true)} />
        <div className="pt-16 px-4 pb-24 w-full flex-1 md:pt-24 md:px-8 md:pb-12">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <BottomNav items={doctorNav} onHamburgerClick={() => setSidebarOpen(true)} />
    </div>
  );
}

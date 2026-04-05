import { Outlet } from "react-router-dom";
import { DoctorSidebar } from "../components/DoctorSidebar";
import { DoctorHeader } from "../components/DoctorHeader";

export function DoctorPortalShell() {
    return (
        <div className="min-h-screen bg-background text-on-surface flex">
            <DoctorSidebar />
            <main className="ml-64 w-full min-h-screen flex flex-col items-stretch">
                <DoctorHeader />
                <div className="pt-24 px-8 pb-12 w-full flex-1">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

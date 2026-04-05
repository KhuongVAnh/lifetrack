import { Link, useLocation, useNavigate } from "react-router-dom";

const doctorNav = [
    { to: "/doctor/dashboard", icon: "dashboard", label: "Bảng điều khiển", activePrefixes: ["/doctor/dashboard"] },
    { to: "/doctor/live", icon: "monitor_heart", label: "Theo dõi trực tiếp", activePrefixes: ["/doctor/live"] },
    { to: "/doctor/patients", icon: "receipt_long", label: "Hồ sơ bệnh nhân", activePrefixes: ["/doctor/patients"] },
    { to: "/doctor/appointments", icon: "calendar_today", label: "Lịch hẹn", activePrefixes: ["/doctor/appointments"] },
    { to: "/doctor/messages", icon: "chat", label: "Tin nhắn", activePrefixes: ["/doctor/messages"] },
];

function getNavClass(isActive) {
    return [
        "flex items-center gap-3 px-4 py-3 transition-all duration-300 ease-in-out",
        isActive
            ? "text-primary font-bold border-r-4 border-primary bg-sky-50"
            : "text-slate-600 hover:text-primary hover:bg-slate-200/50 font-medium text-sm",
    ].join(" ");
}

export function DoctorSidebar() {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 border-r-0 bg-slate-50 flex flex-col py-6 z-50">
            <div className="px-6 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
                            health_metrics
                        </span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-primary tracking-tight leading-none">LIFETRACK</h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Cổng Bác Sĩ</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {doctorNav.map((item) => {
                    const isActive = item.activePrefixes.some((prefix) => pathname.startsWith(prefix));

                    return (
                        <Link key={item.to} className={getNavClass(isActive)} to={item.to}>
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span className="font-medium text-sm">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="px-6 mt-auto">
                {pathname !== "/doctor/appointments" && (
                    <button
                        onClick={() => navigate('/doctor/appointments')}
                        className="w-full py-4 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#003d63] transition-colors shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Khám mới
                    </button>
                )}
                <div className="mt-6 pt-6 border-t border-slate-200 space-y-1">
                    <a className="flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-primary transition-colors text-sm font-medium" href="#help">
                        <span className="material-symbols-outlined">help_outline</span>
                        Trợ giúp
                    </a>
                    <Link className="flex items-center gap-3 px-4 py-2 text-error hover:opacity-80 transition-colors text-sm font-medium" to="/login">
                        <span className="material-symbols-outlined">logout</span>
                        Đăng xuất
                    </Link>
                </div>
            </div>
        </aside>
    );
}

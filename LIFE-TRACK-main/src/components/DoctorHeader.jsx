import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageWithFallback } from "./ImageWithFallback";

export function DoctorHeader() {
    const navigate = useNavigate();
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    return (
        <header className="fixed top-0 right-0 left-64 h-16 glass-header bg-white/80 z-40 flex items-center justify-between px-8 text-on-surface">
            <div className="flex items-center gap-4 flex-1">
                <div className="relative w-96">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                    <input
                        className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 outline-none transition-shadow"
                        placeholder="Tìm kiếm bệnh nhân, hồ sơ..."
                        type="text"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6 relative">
                {/* Notifications */}
                <div className="relative">
                    <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative text-slate-600 hover:text-primary transition-colors p-1">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>
                    </button>
                    {isNotifOpen && (
                        <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-50 animate-fade-in text-sm">
                            <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                                <h3 className="font-bold text-primary">Thông báo mới</h3>
                                <button className="text-[10px] font-bold text-slate-400 hover:text-primary">Đánh dấu đã đọc</button>
                            </div>
                            <div className="space-y-3">
                                <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-xs font-medium text-error flex gap-3 items-start cursor-pointer hover:bg-error/20 transition-colors">
                                    <span className="material-symbols-outlined text-base">warning</span>
                                    <span>Bà Nguyễn Thị Lan có dấu hiệu nhịp tim tăng vọt bất thường. <br /><b className="text-[10px] mt-1 block opacity-80">14 phút trước</b></span>
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 flex gap-3 items-start cursor-pointer hover:bg-slate-100 transition-colors">
                                    <span className="material-symbols-outlined text-base text-primary">event_available</span>
                                    <span>Bệnh nhân Lê Thu Hà vừa đặt một lịch khám mớí vào ngày mai. <br /><b className="text-[10px] mt-1 block opacity-80 text-slate-400">1 giờ trước</b></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Settings */}
                <button onClick={() => window.alert('Đang mở trang cài đặt hệ thống (Tính năng nháp)')} className="text-slate-600 hover:text-primary transition-colors p-1">
                    <span className="material-symbols-outlined">settings</span>
                </button>

                {/* Profile */}
                <div className="relative flex items-center gap-3 pl-6 border-l border-slate-200 cursor-pointer group" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                    <div className="text-right">
                        <p className="text-sm font-bold text-primary leading-none group-hover:text-[#0070a8] transition-colors">Bác sĩ Minh</p>
                        <p className="text-[11px] text-slate-500 font-medium tracking-wide mt-1">Chuyên khoa Tim mạch</p>
                    </div>
                    <ImageWithFallback
                        alt="Bác sĩ Minh"
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all hover:scale-105"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJabnfXPliyIQ_OlF_ly4Eibm1lazgw0-zzoGZaA0stomvU_HRGUyfVBu7tdM0AC8lBL7Ki8HhlOMdehkjPBIrLROmU4xnD9C6vWvvnE-8JkteAa4F-8A3IrTi8ULg82Tdz3G5ThRhh8VBJ3_o3DVXBntIzFc_IjOqVZdfMkPz_9CuP7ohkbibPlfRJcYxse4-SGSrkkgC81qNvsGo2aZDJP_kOv3rxPhZSms1vMfCAoFK9rVh2JjMEACnlX0SNkQD6ncdo-8W8jY"
                    />

                    {isProfileOpen && (
                        <div className="absolute right-0 top-14 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in flex flex-col">
                            <div className="px-4 py-3 border-b border-slate-100 flex flex-col">
                                <span className="font-bold text-sm text-slate-800">Trần Lương Minh</span>
                                <span className="text-[10px] font-medium text-slate-400">minhtl@lifetrack.vn</span>
                            </div>
                            <button onClick={() => window.alert('Mở trang Hồ sơ cá nhân...')} className="px-4 py-2 mt-2 text-left text-sm text-slate-600 hover:bg-slate-50 font-medium flex gap-3 items-center transition-colors">
                                <span className="material-symbols-outlined text-[20px]">person</span> Hồ sơ của tôi
                            </button>
                            <button onClick={() => window.alert('Mở Cài đặt tài khoản...')} className="px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 font-medium flex gap-3 items-center transition-colors">
                                <span className="material-symbols-outlined text-[20px]">manage_accounts</span> Quản lý tài khoản
                            </button>
                            <div className="h-px bg-slate-100 my-2"></div>
                            <button onClick={() => navigate('/login')} className="px-4 py-2 mb-1 text-left text-sm text-error hover:bg-error/10 font-bold flex gap-3 items-center transition-colors">
                                <span className="material-symbols-outlined text-[20px]">logout</span> Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

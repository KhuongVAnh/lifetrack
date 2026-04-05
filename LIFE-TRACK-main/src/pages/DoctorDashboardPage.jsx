import { useNavigate } from "react-router-dom";

export function DoctorDashboardPage() {
    const navigate = useNavigate();

    return (
        <>
            <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-extrabold text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: '"FILL" 1' }}>emergency</span>
                        Cảnh báo khẩn cấp
                    </h2>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thời gian thực</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-error-container/30 border-l-4 border-error p-5 rounded-xl flex gap-4 items-start relative overflow-hidden group hover:bg-error-container/40 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error">
                            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>heart_broken</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-on-error-container leading-tight">Nguyễn Văn A</h3>
                            <p className="text-sm text-error font-medium">Phát hiện nhịp tim nhanh (142 bpm)</p>
                            <p className="text-[11px] text-slate-500 mt-2">Phòng 402 • Vừa xong</p>
                        </div>
                        <button onClick={() => navigate('/doctor/live')} className="bg-white/80 hover:bg-white text-error px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all">Chi tiết</button>
                    </div>
                    <div className="bg-error-container/30 border-l-4 border-error p-5 rounded-xl flex gap-4 items-start relative overflow-hidden group hover:bg-error-container/40 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error">
                            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>blood_pressure</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-on-error-container leading-tight">Trần Thị B</h3>
                            <p className="text-sm text-error font-medium">Huyết áp tâm thu cao đột biến</p>
                            <p className="text-[11px] text-slate-500 mt-2">Điều trị tại nhà • 2 phút trước</p>
                        </div>
                        <button onClick={() => navigate('/doctor/messages')} className="bg-white/80 hover:bg-white text-error px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all">Liên hệ</button>
                    </div>
                    <div className="bg-surface-container-high/50 p-5 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300">
                        <p className="text-sm text-slate-500 font-medium">Không có cảnh báo mới</p>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-sky-50 rounded-lg text-primary">
                            <span className="material-symbols-outlined">group</span>
                        </div>
                        <span className="text-[10px] font-bold text-secondary bg-secondary-container/30 px-2 py-1 rounded-full">+12%</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tổng bệnh nhân</p>
                    <h4 className="text-3xl font-black text-primary mt-1">128</h4>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-green-50 rounded-lg text-secondary">
                            <span className="material-symbols-outlined">sensors</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Live</span>
                        </div>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Thiết bị trực tuyến</p>
                    <h4 className="text-3xl font-black text-primary mt-1">114</h4>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                            <span className="material-symbols-outlined">event_available</span>
                        </div>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Lịch hẹn hôm nay</p>
                    <h4 className="text-3xl font-black text-primary mt-1">18</h4>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <span className="material-symbols-outlined">description</span>
                        </div>
                        <span className="w-5 h-5 flex items-center justify-center bg-error text-white text-[10px] font-bold rounded-full">4</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Báo cáo chờ</p>
                    <h4 className="text-3xl font-black text-primary mt-1">04</h4>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <section className="lg:col-span-8 bg-white rounded-3xl p-8 shadow-[0_8px_40px_rgb(0,0,0,0.03)]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-extrabold text-primary">Cuộc hẹn sắp tới</h2>
                            <p className="text-sm text-slate-500 font-medium">Hôm nay, 24 Tháng 5 2024</p>
                        </div>
                        <button onClick={() => navigate('/doctor/appointments')} className="text-primary text-sm font-bold hover:underline">Xem tất cả</button>
                    </div>
                    <div className="space-y-4">
                        <div className="group flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <img alt="Patient" className="w-12 h-12 rounded-xl object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDD-YvjQ_htWsk2UR5KdC6zpx9zN-RopCjTpunDoWxL0K2ogHdkDrdvnh93sPssXBmQ9IYB2nZB6u7SKMOafqUlKugPsem82D5d5aEA3GQg2wN-RfmcwzuDn9Kogv6cGo_0EJ_c-KJt2SUHBmiToeSx_d13yk-e87aC5eRCoEem6afDXOQ4hav8D_t0NeuZZUmkvYrGPzAmSWRWsdarWPlWiHgBrPSvujtc9BXidy_fXfDWfPWTvOUahNN3KJTBcFnzYTxNrEeN-dA" />
                                <div>
                                    <h5 className="font-bold text-primary">Lê Thị Thu Thảo</h5>
                                    <p className="text-xs text-slate-500">Tái khám định kỳ • Huyết áp</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <p className="text-sm font-black text-primary">09:00 - 09:30</p>
                                    <p className="text-[11px] font-bold text-secondary uppercase tracking-tight">Trực tuyến</p>
                                </div>
                                <button onClick={() => navigate('/doctor/messages')} className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:scale-105 transition-transform">Vào phòng khám</button>
                            </div>
                        </div>
                        <div className="group flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <img alt="Patient" className="w-12 h-12 rounded-xl object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA37gTvu_g301mWykm3T3Y8vQeZJLsR6OIE_LCcw6qmqdoovdm5SF1LLf4rvjo3zZkar8daobmd9GFOeZELHn2jFPut8Fe657MG04gpNk9mp3sFn6xDsjDQd2-rwEwf2P8FScDxLSYHezLZdjpqB0xly2xaZCZ69-gN1wgIvPXOsPBfF5gHh8--gJY9M8b7fJELFh-kDuqU0GeSSgbmFxniYE7AiN1Si4Q8hnuGVhFxzg7qsjP_ULFuW9LrojdUn6qq93e65j5OpG8" />
                                <div>
                                    <h5 className="font-bold text-primary">Phạm Minh Hoàng</h5>
                                    <p className="text-xs text-slate-500">Tư vấn kết quả xét nghiệm</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <p className="text-sm font-black text-primary">10:15 - 10:45</p>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Tại chỗ</p>
                                </div>
                                <button onClick={() => navigate('/doctor/messages')} className="bg-primary-container/20 text-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-container/30 transition-colors">Vào phòng khám</button>
                            </div>
                        </div>
                        <div className="group flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <img alt="Patient" className="w-12 h-12 rounded-xl object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuArg5Y6veSDQkYDIivytW-ZI3B-hk0x5DCHCYUew7Tt78Qpdna7-pdpVUqTBqTNri2PPebiYB4PRmWHdDOZWK5xTrqhy4zCoqdJNlhe3aYiPHlhsvXGG5o95fknswUc8-DpQjFyHLSrrAZpX-c2p6JuJT9CMEibmXB0GtwwrOpkz7-1txH49QymZtrCoE65D2zMrcTkRtNiQRTO6Rb8GPgpyHf_SWNg5qBfgvjZBdgP4EZvH-UTqDPlSh_wFyoA9tPxt8ItTdm5uVE" />
                                <div>
                                    <h5 className="font-bold text-primary">Vũ Phương Anh</h5>
                                    <p className="text-xs text-slate-500">Kiểm tra chỉ số SPO2</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <p className="text-sm font-black text-primary">11:00 - 11:30</p>
                                    <p className="text-[11px] font-bold text-secondary uppercase tracking-tight">Trực tuyến</p>
                                </div>
                                <button onClick={() => navigate('/doctor/messages')} className="bg-primary-container/20 text-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-container/30 transition-colors">Vào phòng khám</button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="lg:col-span-4 bg-white rounded-3xl p-8 shadow-[0_8px_40px_rgb(0,0,0,0.03)] h-full">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-extrabold text-primary">Hoạt động mới nhất</h2>
                        <span className="material-symbols-outlined text-slate-400">history</span>
                    </div>
                    <div className="space-y-6 relative before:content-[''] before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                        <div className="relative flex gap-4 items-start group">
                            <div className="z-10 w-10 h-10 rounded-full bg-secondary-container/50 flex items-center justify-center text-secondary ring-4 ring-white shrink-0">
                                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>pill</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-primary leading-tight">Ông Nguyễn Văn A</p>
                                <p className="text-xs text-slate-600 mt-1">Đã uống thuốc lúc 08:00</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-1">15 phút trước</p>
                            </div>
                        </div>
                        <div className="relative flex gap-4 items-start group">
                            <div className="z-10 w-10 h-10 rounded-full bg-error-container/50 flex items-center justify-center text-error ring-4 ring-white shrink-0">
                                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>notifications_active</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-primary leading-tight">Bà Nguyễn Thị B</p>
                                <p className="text-xs text-slate-600 mt-1">Bỏ lỡ liều thuốc sáng</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-1">45 phút trước</p>
                            </div>
                        </div>
                        <div className="relative flex gap-4 items-start group">
                            <div className="z-10 w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-primary ring-4 ring-white shrink-0">
                                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>monitor_heart</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-primary leading-tight">Chị Lê Thị A</p>
                                <p className="text-xs text-slate-600 mt-1">Nhịp tim ổn định ở mức 80 bpm</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-1">1 giờ trước</p>
                            </div>
                        </div>
                        <div className="relative flex gap-4 items-start group">
                            <div className="z-10 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 ring-4 ring-white shrink-0">
                                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>monitoring</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-primary leading-tight">Anh Trần Văn C</p>
                                <p className="text-xs text-slate-600 mt-1">Vừa cập nhật chỉ số đường huyết</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-1">2 giờ trước</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-10 pt-6 border-t border-slate-100">
                        <button onClick={() => navigate('/doctor/patients')} className="w-full py-3 bg-surface-container-low text-primary text-sm font-bold rounded-xl hover:bg-surface-container transition-colors">
                            Xem tất cả hoạt động
                        </button>
                    </div>
                </section>
            </div>
        </>
    );
}

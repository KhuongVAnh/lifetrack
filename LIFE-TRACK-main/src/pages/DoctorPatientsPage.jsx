import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function DoctorPatientsPage() {
    const navigate = useNavigate();
    const [medications, setMedications] = useState({
        amlodipine: true,
        atorvastatin: true,
        aspirin: false
    });

    const toggleMedication = (key) => {
        setMedications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
            {/* Left Column: Hồ sơ */}
            <div className="lg:col-span-3 space-y-6">
                <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <img alt="Nguyễn Văn A" className="w-32 h-32 rounded-full object-cover border-4 border-primary/10"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNamGMoWb5vGd-rc-3GBd1ayjafXdgofCo2DOS-CU7SHP1Yps2zM1W4inQ-eWpRlpajJKJljfrFnimGhakSg8U0yAbpt3NXH_8aDNYzJ6A0iijWW5nAGVV1heMm-onVs6DJWUqhmBNlic92D4RNL6VdNbBIH1xN60g-kaWQgITUKIUfojwYMTvkF_FyQfctbmSByP-9YyutXkl1ya0ANPNm0WSUNYtwq168xVe66g58TRDIBq2NvDmWV5zZfBhIPaI-OOiCxXbveM"
                        />
                        <span className="absolute bottom-1 right-1 bg-secondary text-white p-1 rounded-full text-xs font-bold px-2">O+</span>
                    </div>
                    <h2 className="text-2xl font-black text-primary leading-tight">Nguyễn Văn A</h2>
                    <p className="text-on-surface-variant font-medium mt-1">ID: LT-48293</p>
                    <div className="mt-3 inline-flex items-center gap-2 bg-secondary/10 text-secondary px-3 py-1 rounded-full text-xs font-bold">
                        <span className="material-symbols-outlined text-sm">family_history</span>
                        Thành viên gia đình
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full mt-8">
                        <div className="p-3 bg-surface-container-low rounded-lg text-left">
                            <p className="text-[10px] uppercase tracking-wider text-outline font-bold">Tuổi</p>
                            <p className="text-lg font-bold">45</p>
                        </div>
                        <div className="p-3 bg-surface-container-low rounded-lg text-left">
                            <p className="text-[10px] uppercase tracking-wider text-outline font-bold">Cân nặng</p>
                            <p className="text-lg font-bold">72 kg</p>
                        </div>
                    </div>
                </div>
                {/* Cây gia đình Widget */}
                <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg">Cây gia đình</h3>
                        <span className="material-symbols-outlined text-primary cursor-pointer">account_tree</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-2 bg-primary-container/10 border border-primary/20 rounded-lg">
                            <img alt="Avatar" className="w-10 h-10 rounded-full"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2cTpU_PKF6XePWcvjLEoi__vTuHXpfA0s4DCiJ8sDzanXlAN5szCG6Ew_Xj8XCmdPS6HwwkO1YQ27UAhGh7m7wQFrB0TLbyvdrdWDMSjuYm1QRl0fXNemSnjK84Xic8Oux8_teDp8xkSyQNeDtonTDTcAi9X8tMW0y3yEHVLk3bkap1Vs-D1iWuQF7vZ4d8Yc0IPBM8Y_7O1M0HAae8Z8NnKydfQIyEvHhy-jWPOtmNWstiqW1xXP0OX89BoJ6ef3rhtT_pRh1bE"
                            />
                            <div>
                                <p className="text-sm font-bold">Văn A (Tôi)</p>
                                <p className="text-[10px] text-on-surface-variant">Chủ hộ</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-2 hover:bg-surface-container-low transition-colors rounded-lg cursor-pointer">
                            <img alt="Avatar" className="w-10 h-10 rounded-full"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDv2YVLb1-NSfw5FJenR4omOt8pxZZF9yB-jDEllSuDbPPKcJdtccHQGjQ3WfN9hSJkuD46SiyYe-i550mxbQMsyX1D-hMaZ-MLvAgDHhxC8G91yxaw1z-pSFtwD1GsHkGeqAsrUyPMUwvkNt64IKeJ4XTXQFwTaCgUmtcNqfY7HF7cWCBuhZfk2TtzoiWVAlNsGZfcdws9GBpgxSXHLpj7kQRfiGfD6JZ8O1q_TkVydqIefVldog0_UEryMLh1JLWSxoNi3MpRbug"
                            />
                            <div>
                                <p className="text-sm font-medium">Thị B</p>
                                <p className="text-[10px] text-on-surface-variant">Vợ</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-2 hover:bg-surface-container-low transition-colors rounded-lg cursor-pointer">
                            <img alt="Avatar" className="w-10 h-10 rounded-full"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_ztDORsoIugq7BXmvi7ZYHfkvT3C22KKgTTEtxeqfXww5c2erJRZ1jV0K4bLG3Kf55_er0YBqd6ji9GuR4xXJvxJXOExl8aVZSxd2SRXgdgmXBmDPw395EUzzZ89DdvRAQu813RfgIOUjOfLeuEQWQNE4dkR7u3ql_Av27K4tJsUsXIn4wKSAW263caR4XflUAqbAz8H8AxqdY_m9i1rNjJIO7oxZSb7nhJ-27v6tnLDy7BMN9AOD1shG8i0wHVkKdGrUemJNwbU"
                            />
                            <div>
                                <p className="text-sm font-medium">Văn C</p>
                                <p className="text-[10px] text-on-surface-variant">Con trai</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Center Column: Hành trình sức khỏe */}
            <div className="lg:col-span-5 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black tracking-tight">Bệnh sử</h3>
                    <div className="flex gap-2">
                        <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-outline-variant hover:bg-slate-50 transition-colors">Bộ lọc</button>
                        <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-outline-variant hover:bg-slate-50 transition-colors">Xuất PDF</button>
                    </div>
                </div>
                <div className="flex-grow space-y-0 relative pl-4">
                    {/* Timeline Line */}
                    <div className="absolute left-[31px] top-0 bottom-0 w-0.5 bg-slate-200"></div>
                    {/* Timeline Item 1 */}
                    <div className="relative pl-12 pb-10">
                        <div className="absolute left-0 top-0 w-10 h-10 bg-primary-container rounded-full flex items-center justify-center text-white z-10 shadow-lg shadow-primary-container/20">
                            <span className="material-symbols-outlined text-xl">medical_services</span>
                        </div>
                        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-transparent hover:border-primary/20 transition-all cursor-pointer">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-primary">Thăm khám bác sĩ</h4>
                                <span className="text-xs font-medium text-on-surface-variant">12/05/2024</span>
                            </div>
                            <p className="text-sm text-on-surface-variant mb-3">Kiểm tra định kỳ sau 1 tháng sử
                                dụng thuốc huyết áp mới. Chỉ số ổn định.</p>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 bg-surface-container-low rounded text-[10px] font-bold">BS. Nguyễn Minh</span>
                                <span className="px-2 py-1 bg-surface-container-low rounded text-[10px] font-bold">Khoa Tim Mạch</span>
                            </div>
                        </div>
                    </div>
                    {/* Timeline Item 2 */}
                    <div className="relative pl-12 pb-10">
                        <div className="absolute left-0 top-0 w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-white z-10 shadow-lg shadow-secondary/20">
                            <span className="material-symbols-outlined text-xl">biotech</span>
                        </div>
                        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-transparent hover:border-secondary/20 transition-all cursor-pointer">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-secondary">Kết quả xét nghiệm</h4>
                                <span className="text-xs font-medium text-on-surface-variant">10/05/2024</span>
                            </div>
                            <p className="text-sm text-on-surface-variant">Xét nghiệm máu tổng quát &amp; lipid
                                profile. Cholesterol giảm 15% so với kỳ trước.</p>
                            <div className="mt-3 flex items-center gap-2 text-secondary font-bold text-xs hover:underline cursor-pointer">
                                <span className="material-symbols-outlined text-sm">attachment</span>
                                <span>Xet_nghiem_mau_A.pdf</span>
                            </div>
                        </div>
                    </div>
                    {/* Timeline Item 3 - WITH NAVIGATION */}
                    <div className="relative pl-12 pb-10">
                        <div className="absolute left-0 top-0 w-10 h-10 bg-error rounded-full flex items-center justify-center text-white z-10 shadow-lg shadow-error/20">
                            <span className="material-symbols-outlined text-xl">ecg_heart</span>
                        </div>
                        <div className="bg-error-container/20 p-5 rounded-xl border border-error/20 transition-all cursor-pointer">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-error">ECG bất thường từ AI</h4>
                                <span className="text-xs font-medium text-on-surface-variant">08/05/2024</span>
                            </div>
                            <p className="text-sm text-on-surface-variant mb-3">Phát hiện ngoại tâm thu thất lúc
                                2:15 AM trong khi ngủ. Cần theo dõi thêm.</p>
                            <button onClick={() => navigate('/doctor/live')} className="text-xs font-black text-error flex items-center gap-1 uppercase tracking-tighter hover:opacity-80 transition-opacity">
                                Xem dữ liệu Live Monitor
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                    {/* Timeline Item 4 */}
                    <div className="relative pl-12">
                        <div className="absolute left-0 top-0 w-10 h-10 bg-outline rounded-full flex items-center justify-center text-white z-10">
                            <span className="material-symbols-outlined text-xl">description</span>
                        </div>
                        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm opacity-80 cursor-pointer hover:opacity-100 transition-opacity">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-on-surface">Tóm tắt xuất viện</h4>
                                <span className="text-xs font-medium text-on-surface-variant">01/05/2024</span>
                            </div>
                            <p className="text-sm text-on-surface-variant">Bệnh nhân phục hồi tốt sau đợt điều trị
                                ngoại trú 3 ngày. Chẩn đoán: Cao huyết áp độ 1.</p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Right Column: Phác đồ & Thao tác */}
            <div className="lg:col-span-4 space-y-6">
                {/* Thuốc đang sử dụng (CONTROLLED UI) */}
                <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">pill</span>
                        Thuốc đang sử dụng
                    </h3>
                    <div className="space-y-3">
                        <label className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                            <input
                                checked={medications.amlodipine}
                                onChange={() => toggleMedication('amlodipine')}
                                className="w-5 h-5 rounded-md border-outline-variant text-primary focus:ring-primary"
                                type="checkbox" />
                            <div>
                                <p className="font-bold text-primary">Amlodipine 5mg</p>
                                <p className="text-xs text-on-surface-variant">Sáng: 01 viên - Trước ăn</p>
                            </div>
                        </label>
                        <label className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                            <input
                                checked={medications.atorvastatin}
                                onChange={() => toggleMedication('atorvastatin')}
                                className="w-5 h-5 rounded-md border-outline-variant text-primary focus:ring-primary"
                                type="checkbox" />
                            <div>
                                <p className="font-bold text-primary">Atorvastatin 10mg</p>
                                <p className="text-xs text-on-surface-variant">Tối: 01 viên - Sau ăn</p>
                            </div>
                        </label>
                        <label className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                            <input
                                checked={medications.aspirin}
                                onChange={() => toggleMedication('aspirin')}
                                className="w-5 h-5 rounded-md border-outline-variant text-primary focus:ring-primary"
                                type="checkbox" />
                            <div>
                                <p className="font-bold text-primary">Aspirin 81mg</p>
                                <p className="text-xs text-on-surface-variant">Sáng: 01 viên - Sau ăn</p>
                            </div>
                        </label>
                    </div>
                </div>
                {/* Hẹn khám Countdown */}
                <div className="bg-gradient-to-br from-primary to-primary-container text-white rounded-xl p-6 shadow-xl shadow-primary/20 cursor-pointer hover:scale-[1.02] transition-transform"
                    onClick={() => navigate('/doctor/appointments')}>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-widest">Lịch hẹn sắp tới</span>
                        <span className="material-symbols-outlined">event_upcoming</span>
                    </div>
                    <div className="text-center">
                        <h4 className="text-4xl font-black mb-1">05 Ngày</h4>
                        <p className="text-white/80 text-sm">Còn lại trước khi tái khám</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/10">
                        <p className="text-xs font-medium">Bác sĩ: <span className="font-bold">Trần Thu Hà</span></p>
                        <p className="text-xs font-medium">Thời gian: <span className="font-bold">09:30, 17/05/2024</span></p>
                    </div>
                </div>
                {/* Action Buttons */}
                <div className="space-y-3">
                    <button className="w-full h-14 bg-white border border-primary/20 text-primary rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shadow-sm">
                        <span className="material-symbols-outlined">edit_note</span>
                        Cập nhật chẩn đoán
                    </button>
                    <button className="w-full h-14 bg-white border border-primary/20 text-primary rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shadow-sm">
                        <span className="material-symbols-outlined">prescriptions</span>
                        Kê đơn thuốc mới
                    </button>
                    <button onClick={() => navigate('/doctor/messages')} className="w-full h-14 bg-secondary text-white rounded-xl font-black flex items-center justify-center gap-3 shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>videocam</span>
                        Gọi Video ngay
                    </button>
                </div>
            </div>
        </div>
    );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function DoctorLivePage() {
    const navigate = useNavigate();
    const [activePatient, setActivePatient] = useState(0);
    const [activeLabel, setActiveLabel] = useState("Loạn nhịp");
    const [isConfirmed, setIsConfirmed] = useState(false);

    const patients = [
        {
            id: 0,
            name: "Nguyễn Văn A",
            room: "Phòng 402",
            hr: 72,
            spo2: "98%",
            status: "normal",
            avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBsFydJlmsdbL-Yp0OufXBTIqVAWqEOUhY04_pvBZSO2xR2FHF_o7DXB0GxNNNIFfDZrJtfTK900CTnwPNsSqdac7f0LIgtoVRlcD-0nhY0QbNEuKzwWfafmiCEZhqHc7mEuOny12zOzUOngxKONqTAKoN4J8x1F1M94iMBwzoDTtg_x4oFdxflBetLDla-kJ20sT4h8CGmWUfDnnvO4TsyfCR11Ms_IH4BPmk6T7Ozxoa9-79CDYFNu77ssUCs42ceR9talr_iLTE"
        },
        {
            id: 1,
            name: "Trần Thị B",
            room: "Phòng 301",
            hr: 68,
            spo2: "96%",
            status: "normal",
            avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHWfwbqO4hKbkPbT9K8ZXe_Z4aCcW09Qw3jxqWFi11nNZT6vgkDx7IiWxLlYkaII80XeBtULUyoiTrJFd9ANsKWb_jg6QiahVGbM_T0g4_VOi_C-laGG-3da-77pqyiefuVDQHOWESxK1MNaeUjvgXWzFq4C4z4AP-dEcKZkjzJlkS-6U_fP99r7HkUf-xQgROQaQ18NoWIzSvqeOKC3pHunw2kE622aS8HpUxLeYRva6QTi785XX4Jx5MyZgqtLwHMT-G9ROVdJ4"
        },
        {
            id: 2,
            name: "Lê Hoàng C",
            room: "Phòng 505",
            hr: 105,
            spo2: "94%",
            status: "warning",
            avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD1FCA6O22cEzVW4Vtjfo8jLz37aVtZUJhmu_emcPUa5fd6GXVzKVquZSPiyMg072SOfJmQnseICXWOFvn1YRJVx1_9JplSG5Bu05fKBoqykJ_yNOEwZA2ksaCN9Iaooe9ZKmM9uVYrYgdU4lsd85uJ714hqotg35_c3HJZsVazYA_lvVRdVWj-2f65Qx0QewyIeewAtscveHHnMjkTRFhNpgOASHl_6mRc5vkpwD9vONrHvEaXnfKQ_v4MsJDor2eVFlz9gzAW7-4"
        }
    ];

    const confirmLabel = () => {
        setIsConfirmed(true);
        setTimeout(() => setIsConfirmed(false), 2000);
    };

    return (
        <div className="flex gap-6 h-[calc(100vh-140px)]">
            {/* Cột trái: Danh sách bệnh nhân trực tuyến */}
            <section className="w-72 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-extrabold text-slate-800">Trực tuyến <span
                        className="ml-2 text-sm font-normal text-slate-400">({patients.length})</span></h2>
                    <span className="material-symbols-outlined text-secondary animate-pulse"
                        style={{ fontVariationSettings: '"FILL" 1' }}>fiber_manual_record</span>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {patients.map((patient) => {
                        const isActive = activePatient === patient.id;

                        if (isActive) {
                            return (
                                <div key={patient.id}
                                    className="p-4 bg-primary text-white rounded-2xl shadow-lg ring-4 ring-primary/20 cursor-pointer transform scale-[1.02] transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <img className="w-10 h-10 rounded-full border-2 border-white/30"
                                            alt="bệnh nhân" src={patient.avatar} />
                                        <div>
                                            <p className="font-bold text-sm">{patient.name}</p>
                                            <p className="text-[11px] opacity-80 uppercase tracking-widest">{patient.room}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white/10 p-2 rounded-lg text-center">
                                            <p className="text-[10px] uppercase opacity-70">Nhịp tim</p>
                                            <p className="font-bold text-base">{patient.hr}</p>
                                        </div>
                                        <div className="bg-white/10 p-2 rounded-lg text-center">
                                            <p className="text-[10px] uppercase opacity-70">SpO2</p>
                                            <p className="font-bold text-base">{patient.spo2}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={patient.id} onClick={() => setActivePatient(patient.id)}
                                className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-primary/30 cursor-pointer transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <img className="w-10 h-10 rounded-full border border-slate-200"
                                        alt="bệnh nhân" src={patient.avatar} />
                                    <div>
                                        <p className="font-bold text-sm text-slate-800">{patient.name}</p>
                                        <p className="text-[11px] text-slate-400 uppercase tracking-widest">{patient.room}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="flex gap-4">
                                        <div>
                                            <p className="text-[10px] text-slate-400">HR</p>
                                            <p className={`font-bold ${patient.status === 'warning' ? 'text-error' : 'text-slate-700'}`}>{patient.hr}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400">SpO2</p>
                                            <p className="font-bold text-slate-700">{patient.spo2}</p>
                                        </div>
                                    </div>
                                    {patient.status === 'warning' ? (
                                        <span className="material-symbols-outlined text-error animate-pulse">warning</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-slate-200">chevron_right</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Cột giữa: Khu vực dạng sóng chính */}
            <section className="flex-1 flex flex-col gap-6">
                <div className="flex-1 bg-white rounded-[2rem] p-8 shadow-sm relative overflow-hidden flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Giám sát
                                dạng sóng</h3>
                            <p className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
                                ECG Lead II &amp; SpO2 Pleth
                                <span className="text-sm font-bold text-primary bg-sky-50 px-3 py-1 rounded-full">{patients[activePatient].name}</span>
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <span
                                className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-tighter">X25.0 mm/s</span>
                            <span
                                className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-tighter">10 mm/mV</span>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-4">
                        {/* ECG Area */}
                        <div
                            className="relative flex-[2] ecg-grid rounded-xl border border-slate-100 overflow-hidden bg-slate-50/30">
                            <div className="absolute top-4 left-4 font-mono text-xs font-bold text-secondary z-10">
                                ECG</div>
                            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none"
                                viewBox="0 0 1000 200">
                                <path className="ecg-line"
                                    d="M0,100 L20,100 L25,90 L30,110 L35,100 L50,100 L60,30 L70,170 L80,100 L110,100 L125,85 L140,100 L180,100 L185,90 L190,110 L195,100 L210,100 L220,30 L230,170 L240,100 L270,100 L285,85 L300,100 L340,100 L345,90 L350,110 L355,100 L370,100 L380,30 L390,170 L400,100 L430,100 L445,85 L460,100 L500,100 L505,90 L510,110 L515,100 L530,100 L540,30 L550,170 L560,100 L590,100 L605,85 L620,100 L660,100 L665,90 L670,110 L675,100 L690,100 L700,30 L710,170 L720,100 L750,100 L765,85 L780,100 L820,100 L825,90 L830,110 L835,100 L850,100 L860,30 L870,170 L880,100 L910,100 L925,85 L940,100 L980,100 L985,90 L990,110 L1000,100"
                                    fill="none" stroke="#1b6d24" strokeWidth="2.5"></path>
                            </svg>
                            {/* Analysis Area (only show if viewing Lê Hoàng C - id 2) */}
                            {activePatient === 2 && (
                                <div
                                    className="absolute top-1/2 left-[60%] -translate-y-1/2 w-48 h-32 border-2 border-dashed border-error rounded-xl bg-error/5 flex flex-col items-center justify-end pb-2 z-10 pointer-events-none">
                                    <div className="bg-error text-white text-[10px] font-bold px-2 py-0.5 rounded absolute -top-3">VÙNG PHÂN TÍCH</div>
                                    <span className="text-[10px] text-error font-bold uppercase">Phát hiện loạn
                                        nhịp</span>
                                </div>
                            )}
                        </div>
                        {/* SpO2 Area */}
                        <div
                            className="relative flex-1 ecg-grid rounded-xl border border-slate-100 overflow-hidden bg-slate-50/30">
                            <div className="absolute top-4 left-4 font-mono text-xs font-bold text-primary z-10">
                                SpO2</div>
                            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none"
                                viewBox="0 0 1000 100">
                                <path className="ecg-line"
                                    d="M0,70 Q25,10 50,70 T100,70 T150,70 T200,70 T250,70 T300,70 T350,70 T400,70 T450,70 T500,70 T550,70 T600,70 T650,70 T700,70 T750,70 T800,70 T850,70 T900,70 T950,70 T1000,70"
                                    fill="none" stroke="#004976" strokeWidth="2.5"></path>
                            </svg>
                        </div>
                    </div>
                </div>
                {/* AI Toolbar */}
                <div
                    className="bg-white/80 backdrop-blur-md border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-indigo-600"
                                style={{ fontVariationSettings: '"FILL" 1' }}>psychology</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-800">Trợ lý AI</p>
                            <p className="text-[10px] text-slate-500 uppercase">Gợi ý nhãn dựa trên sóng</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {['Bình thường', 'Loạn nhịp', 'Nhịp đập nhanh', 'Nhiễu sóng'].map((label) => {
                            const isSelected = activeLabel === label;
                            // Add specific colors based on label type
                            let baseColors = "bg-slate-100 text-slate-600 hover:bg-slate-200";
                            let activeColors = "bg-[#004976] text-white shadow-md shadow-primary/20";

                            if (label === 'Loạn nhịp' || label === 'Nhịp đập nhanh') {
                                baseColors = "bg-error/5 text-error border border-error/10 hover:bg-error/10";
                                activeColors = "bg-error text-white shadow-md shadow-error/20 border-error";
                            }

                            return (
                                <button key={label} onClick={() => setActiveLabel(label)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border border-transparent ${isSelected ? activeColors : baseColors}`}>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    <button onClick={confirmLabel}
                        className={`${isConfirmed ? 'bg-secondary' : 'bg-[#0047AB]'} text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all`}>
                        <span className="material-symbols-outlined text-sm">{isConfirmed ? 'check_circle' : 'verified'}</span>
                        {isConfirmed ? 'Đã xác nhận' : 'Xác nhận nhãn'}
                    </button>
                </div>
            </section>

            {/* Cột phải: Chỉ số thời gian thực */}
            <section className="w-80 flex flex-col gap-4">
                <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">analytics</span>
                    Chỉ số thời gian thực
                </h2>
                <div className="flex-1 space-y-4">
                    {/* Heart Rate */}
                    <div
                        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 flex flex-col gap-1 hover:shadow-md transition-all">
                        <div className="flex justify-between items-center text-error">
                            <span className="text-xs font-bold uppercase tracking-widest">Nhịp tim</span>
                            <span className="material-symbols-outlined animate-pulse"
                                style={{ fontVariationSettings: '"FILL" 1' }}>favorite</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-black text-slate-800 tracking-tighter">{patients[activePatient].hr}</span>
                            <span className="text-sm font-bold text-slate-400">BPM</span>
                        </div>
                    </div>
                    {/* SpO2 */}
                    <div
                        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 flex flex-col gap-1 hover:shadow-md transition-all">
                        <div className="flex justify-between items-center text-primary">
                            <span className="text-xs font-bold uppercase tracking-widest">Nồng độ Oxy (SpO2)</span>
                            <span className="material-symbols-outlined"
                                style={{ fontVariationSettings: '"FILL" 1' }}>water_drop</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-black text-slate-800 tracking-tighter">{patients[activePatient].spo2.replace('%', '')}</span>
                            <span className="text-sm font-bold text-slate-400">%</span>
                        </div>
                    </div>
                    {/* Respiration Rate */}
                    <div
                        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 flex flex-col gap-1 hover:shadow-md transition-all">
                        <div className="flex justify-between items-center text-secondary">
                            <span className="text-xs font-bold uppercase tracking-widest">Nhịp thở</span>
                            <span className="material-symbols-outlined"
                                style={{ fontVariationSettings: '"FILL" 1' }}>air</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-black text-slate-800 tracking-tighter">{activePatient === 2 ? '22' : '16'}</span>
                            <span className="text-sm font-bold text-slate-400">br/m</span>
                        </div>
                    </div>
                    {/* Blood Pressure */}
                    <div
                        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 flex flex-col gap-1 hover:shadow-md transition-all">
                        <div className="flex justify-between items-center text-indigo-600">
                            <span className="text-xs font-bold uppercase tracking-widest">Huyết áp</span>
                            <span className="material-symbols-outlined"
                                style={{ fontVariationSettings: '"FILL" 1' }}>blood_pressure</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-slate-800 tracking-tighter">{activePatient === 2 ? '135/90' : '120/80'}</span>
                            <span className="text-sm font-bold text-slate-400">mmHg</span>
                        </div>
                    </div>

                    {/* New Addition: Hành động tương tác */}
                    <div className="mt-auto pt-4 space-y-3">
                        <button onClick={() => navigate('/doctor/patients')} className="w-full flex items-center justify-between p-4 bg-sky-50 text-primary rounded-xl font-bold hover:bg-sky-100 transition-colors border border-sky-100 shadow-sm">
                            Xem hồ sơ chi tiết
                            <span className="material-symbols-outlined">folder_shared</span>
                        </button>
                        <button onClick={() => navigate('/doctor/messages')} className="w-full flex items-center justify-between p-4 bg-error text-white rounded-xl font-bold hover:bg-[#a51515] transition-colors shadow-sm">
                            Nhắn tin / Gọi khẩn
                            <span className="material-symbols-outlined">video_call</span>
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { familyMembers, patientProfiles } from "../data/mockData";
import { ImageWithFallback } from "../components/ImageWithFallback";

const LIVE_TABS = [
  { id: "patients", label: "Thành viên", icon: "group" },
  { id: "monitor", label: "Monitor", icon: "ecg" },
  { id: "vitals", label: "Chỉ số", icon: "analytics" },
];

export function HealthRecordDetailPage() {
    const { memberId } = useParams();
    const navigate = useNavigate();
    const [mobileTab, setMobileTab] = useState("monitor");

    // Lấy thông tin thành viên hiện tại
    const activeMember = familyMembers.find(m => m.id === memberId) || familyMembers[0];
    const profile = patientProfiles[activeMember.id];

    if (!profile) {
        return <Navigate replace to="/patient/health-records" />;
    }

    // Giả lập HR cho thành viên (vì mockData ko có sẵn cụ thể từng HR theo realtime)
    const getMockHR = (id) => {
        if (id === 'nguyen-van-a') return 72;
        if (id === 'tran-thi-b') return 68;
        if (id === 'nguyen-anh-tuan') return 75;
        return 82;
    };

    return (
        <div className="flex flex-col gap-4 py-4 px-0 max-w-[1600px] w-full mt-4">
            {/* Mobile tab switcher */}
            <div className="flex rounded-xl bg-surface-container-low p-1 lg:hidden mx-4">
                {LIVE_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setMobileTab(tab.id)}
                        className={[
                            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all",
                            mobileTab === tab.id ? "bg-white text-primary shadow-sm" : "text-slate-500",
                        ].join(" ")}
                    >
                        <span className="material-symbols-outlined text-base">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="lg:flex lg:gap-6 lg:h-[calc(100vh-160px)] px-4">
            {/* Cột trái: Danh sách thành viên */}
            <section className={["w-full lg:w-72 flex flex-col gap-4", mobileTab === "patients" ? "flex" : "hidden lg:flex"].join(" ")}>
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-extrabold text-slate-800">Cá nhân hóa <span
                        className="ml-2 text-sm font-normal text-slate-400">({familyMembers.length})</span></h2>
                    <span className="material-symbols-outlined text-secondary animate-pulse"
                        style={{ fontVariationSettings: '"FILL" 1' }}>fiber_manual_record</span>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {familyMembers.map((member) => {
                        const isActive = activeMember.id === member.id;
                        const hr = getMockHR(member.id);

                        if (isActive) {
                            return (
                                <div key={member.id}
                                    className="p-4 bg-primary text-white rounded-3xl shadow-lg ring-4 ring-primary/20 cursor-pointer transform scale-[1.02] transition-all">
                                    <div className="flex items-center gap-3 mb-4">
                                        <ImageWithFallback className="w-12 h-12 rounded-full border-2 border-white/30 object-cover"
                                            alt={member.name} src={member.avatar} />
                                        <div>
                                            <p className="font-bold text-sm">{member.name}</p>
                                            <p className="text-[11px] opacity-80 uppercase tracking-widest">{member.relation}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="bg-white/10 p-3 rounded-2xl text-center flex justify-between items-center px-4">
                                            <p className="text-xs uppercase opacity-70 font-bold tracking-widest">Nhịp tim</p>
                                            <p className="font-bold text-2xl">{hr} <span className="text-xs font-medium">BPM</span></p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <Link key={member.id} to={`/patient/health-records/${member.id}`}
                                className="block p-4 bg-white rounded-3xl border border-slate-100 hover:border-primary/30 cursor-pointer transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <ImageWithFallback className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                                        alt={member.name} src={member.avatar} />
                                    <div>
                                        <p className="font-bold text-sm text-slate-800">{member.name}</p>
                                        <p className="text-[11px] text-slate-400 uppercase tracking-widest">{member.relation}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="flex gap-4">
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nhịp tim</p>
                                            <p className="font-bold text-slate-700 text-lg">{hr}</p>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-200">chevron_right</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </section>

            {/* Cột giữa: Khu vực dạng sóng chính */}
            <section className={["flex-1 flex flex-col gap-6", mobileTab === "monitor" ? "flex" : "hidden lg:flex"].join(" ")}>
                <div className="flex-1 bg-white rounded-[2rem] p-8 shadow-sm relative overflow-hidden flex flex-col border border-slate-100">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Giám sát
                                dạng sóng</h3>
                            <p className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
                                ECG Lead II
                                <span className="text-sm font-bold text-primary bg-sky-50 px-3 py-1 rounded-full">{activeMember.name}</span>
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
                        {/* ECG Area - Takes up full space */}
                        <div
                            className="relative flex-1 ecg-grid rounded-3xl border border-slate-100 overflow-hidden bg-slate-50/30">
                            <div className="absolute top-6 left-6 font-mono text-sm font-bold text-secondary z-10 flex items-center gap-2">
                                <span className="material-symbols-outlined">monitor_heart</span>
                                ECG
                            </div>
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 200">
                                <path className="ecg-line"
                                    d="M0,100 L20,100 L25,90 L30,110 L35,100 L50,100 L60,30 L70,170 L80,100 L110,100 L125,85 L140,100 L180,100 L185,90 L190,110 L195,100 L210,100 L220,30 L230,170 L240,100 L270,100 L285,85 L300,100 L340,100 L345,90 L350,110 L355,100 L370,100 L380,30 L390,170 L400,100 L430,100 L445,85 L460,100 L500,100 L505,90 L510,110 L515,100 L530,100 L540,30 L550,170 L560,100 L590,100 L605,85 L620,100 L660,100 L665,90 L670,110 L675,100 L690,100 L700,30 L710,170 L720,100 L750,100 L765,85 L780,100 L820,100 L825,90 L830,110 L835,100 L850,100 L860,30 L870,170 L880,100 L910,100 L925,85 L940,100 L980,100 L985,90 L990,110 L1000,100"
                                    fill="none" stroke="#1b6d24" strokeWidth="2.5" vectorEffect="non-scaling-stroke"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </section>

            {/* Cột phải: Chỉ số thời gian thực (chỉ có Nhịp tim) */}
            <section className={["w-full lg:w-80 flex flex-col gap-4", mobileTab === "vitals" ? "flex" : "hidden lg:flex"].join(" ")}>
                <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">analytics</span>
                    Chỉ số thời gian thực
                </h2>
                <div className="flex-1 space-y-4 flex flex-col">
                    {/* Heart Rate */}
                    <div
                        className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-50 flex flex-col gap-4 hover:shadow-md transition-all">
                        <div className="flex justify-between items-center text-error border-b border-slate-100 pb-4">
                            <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Nhịp tim</span>
                            <span className="material-symbols-outlined animate-pulse"
                                style={{ fontVariationSettings: '"FILL" 1' }}>favorite</span>
                        </div>
                        <div className="flex items-baseline gap-2 pt-2">
                            <span className="text-7xl font-black text-slate-800 tracking-tighter">{getMockHR(activeMember.id)}</span>
                            <span className="text-xl font-bold text-slate-400">BPM</span>
                        </div>
                    </div>

                    {/* Hành động tương tác */}
                    <div className="mt-auto pt-4 space-y-3">
                        <button onClick={() => navigate('/patient/doctors/my')} className="w-full flex items-center justify-between p-4 bg-error text-white rounded-xl font-bold hover:bg-[#a51515] transition-colors shadow-sm">
                            Gọi khẩn cấp
                            <span className="material-symbols-outlined">emergency_call</span>
                        </button>
                    </div>
                </div>
            </section>
            </div>{/* end desktop flex */}
        </div>
    );
}

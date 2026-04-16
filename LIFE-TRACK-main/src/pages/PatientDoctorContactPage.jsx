import { useMemo, useRef, useState, useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { doctorProfiles, getDoctorById, hiredDoctorIds } from "../data/mockData";

const MSG_TABS = [
  { id: "list", label: "Danh sách", icon: "forum" },
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "info", label: "Thông tin", icon: "person" },
];

export function PatientDoctorContactPage() {
  const { doctorId } = useParams();

  const consultDoctors = useMemo(() => {
    return hiredDoctorIds.map((id) => getDoctorById(id)).filter(Boolean);
  }, []);

  const currentDoctor = doctorId ? getDoctorById(doctorId) : consultDoctors[0];

  const [activeDoctorId, setActiveDoctorId] = useState(currentDoctor?.id);
  const [draftMessage, setDraftMessage] = useState("");
  const [mobileTab, setMobileTab] = useState("chat");
  const endOfMessagesRef = useRef(null);

  const [messagesByDoctor, setMessagesByDoctor] = useState(() => {
    const seeded = {};
    for (const doc of consultDoctors) {
      seeded[doc.id] = [
        { id: 1, sender: "doctor", text: `Chào anh/chị, tôi là ${doc.name}. Hãy để lại lời nhắn nếu cần.`, time: "09:00 AM" },
      ];
    }
    return seeded;
  });

  const activeDoctor = getDoctorById(activeDoctorId) || consultDoctors[0];
  const activeMessages = messagesByDoctor[activeDoctor?.id] ?? [];

  useEffect(() => {
    if (endOfMessagesRef.current) {
        endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeDoctorId, activeMessages]);

  const handleSendMessage = () => {
    if (!draftMessage.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender: "patient",
      text: draftMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessagesByDoctor((prev) => ({
      ...prev,
      [activeDoctor.id]: [...(prev[activeDoctor.id] ?? []), newMessage],
    }));
    setDraftMessage("");
  };

  const getLastMessage = (msgs) => {
    if (msgs && msgs.length > 0) return msgs[msgs.length - 1].text;
    return "Chưa có tin nhắn nào.";
  };



  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Mobile tab switcher */}
      <div className="flex rounded-xl bg-surface-container-low p-1 lg:hidden">
        {MSG_TABS.map((tab) => (
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

      <div className="lg:flex lg:flex-1 lg:overflow-hidden lg:h-[calc(100vh-140px)] bg-white rounded-3xl shadow-sm border border-slate-200">
        {/* Column 1: Danh sách bác sĩ */}
        <section className={["lg:w-80 flex flex-col bg-surface-container-low border-r border-slate-200/50 overflow-y-auto no-scrollbar", mobileTab === "list" ? "flex" : "hidden lg:flex"].join(" ")}>
          <div className="p-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Gần đây</h2>
            <div className="space-y-2">
              {consultDoctors.map((doc) => {
                const isActive = doc.id === activeDoctor?.id;
                return (
                  <div key={doc.id} onClick={() => setActiveDoctorId(doc.id)} className={`p-4 rounded-xl flex gap-3 transition-all duration-200 cursor-pointer ${isActive ? 'bg-sky-50 border border-primary/20 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}>
                    <div className="relative">
                      <ImageWithFallback alt={doc.name} className="w-12 h-12 rounded-full object-cover" src={doc.avatar} />
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-secondary rounded-full border-2 border-white animate-pulse"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-slate-800 truncate">{doc.name}</span>
                        <span className="text-[10px] text-slate-400">Đang trực tuyến</span>
                      </div>
                      <p className={`text-xs truncate ${isActive ? 'text-primary font-medium' : 'text-slate-500'}`}>{getLastMessage(messagesByDoctor[doc.id])}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Column 2: Chat Window */}
        <section className={["flex-1 flex flex-col bg-surface-container-lowest", mobileTab === "chat" ? "flex" : "hidden lg:flex"].join(" ")}>
          {/* Chat Header */}
          <div className="h-20 flex items-center justify-between px-8 bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-4">
              <ImageWithFallback alt={activeDoctor?.name} className="w-12 h-12 rounded-full object-cover" src={activeDoctor?.avatar} />
              <div>
                <h3 className="font-bold text-on-surface">{activeDoctor?.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="text-xs text-slate-500">{activeDoctor?.specialty} • Đang trực tuyến</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => window.alert('Đang kết nối cuộc gọi video y tế bảo mật...')} className="flex items-center gap-2 bg-[#004976] hover:bg-[#003d63] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <span className="material-symbols-outlined text-sm">video_call</span>
                Bắt đầu video
              </button>
              <button onClick={() => window.alert('Đang kết nối cuộc gọi thoại...')} className="p-2 border border-[#004976] text-[#004976] rounded-lg hover:bg-sky-50 transition-colors">
                <span className="material-symbols-outlined">call</span>
              </button>
            </div>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 p-8 overflow-y-auto space-y-6 flex flex-col no-scrollbar">
            <div className="flex justify-center">
              <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-widest">Gần đây</span>
            </div>
            {activeMessages.map((msg) => {
              const isPatient = msg.sender === "patient";
              if (!isPatient) {
                return (
                  <div key={msg.id} className="flex gap-4 max-w-2xl">
                    <ImageWithFallback alt="Avatar" className="w-8 h-8 rounded-full self-end border border-slate-200" src={activeDoctor?.avatar} />
                    <div className="bg-surface-container-low p-4 rounded-2xl rounded-bl-none shadow-sm">
                      <p className="text-sm text-on-surface leading-relaxed">{msg.text}</p>
                      <div className="text-[10px] text-slate-400 mt-2">{msg.time}</div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id} className="flex flex-row-reverse gap-4 max-w-2xl ml-auto mt-auto">
                  <div className="bg-primary text-white p-4 rounded-2xl rounded-br-none shadow-md">
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <div className="text-[10px] text-white/70 mt-2 text-right">{msg.time}</div>
                  </div>
                </div>
              );
            })}
            <div ref={endOfMessagesRef} />
          </div>

          {/* Chat Input Area */}
          <div className="p-6 bg-white border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-3 bg-slate-50/80 rounded-2xl p-2 pl-4 border border-slate-100 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <button className="text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">add_circle</span>
              </button>
              <input 
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none placeholder:text-slate-400"
                placeholder="Viết tin nhắn cho bác sĩ..." 
                type="text"
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <div className="flex items-center gap-2 pr-2">
                <button onClick={handleSendMessage} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${draftMessage.trim() ? 'bg-primary text-white hover:bg-[#003d63] shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Column 3: Thông tin nhanh cùa bệnh nhân (Mình) */}
        <section className={["lg:w-72 flex flex-col bg-slate-50 border-l border-slate-200/50 overflow-y-auto no-scrollbar", mobileTab === "info" ? "flex" : "hidden lg:flex"].join(" ")}>
          <div className="p-6 space-y-8">
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Sinh hiệu hiện tại</h2>
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm relative overflow-hidden border border-slate-100">
                  <div className="absolute -right-2 -top-2 w-16 h-16 bg-primary/5 rounded-full"></div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>favorite</span>
                    <span className="text-xs font-bold text-slate-500">NHỊP TIM</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-800">85</span>
                    <span className="text-sm font-medium text-slate-400">BPM</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-secondary font-bold">
                    <span className="material-symbols-outlined text-[12px]">trending_flat</span>
                    Ổn định
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm relative overflow-hidden border border-slate-100">
                  <div className="absolute -right-2 -top-2 w-16 h-16 bg-secondary/5 rounded-full"></div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>water_drop</span>
                    <span className="text-xs font-bold text-slate-500">SPO2</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-800">98</span>
                    <span className="text-sm font-medium text-slate-400">%</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-primary font-bold">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    Bình thường
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Hành động nhanh</h2>
              <div className="space-y-3">
                <button onClick={() => window.alert('Đồng bộ dữ liệu từ đồng hồ thành công.')} className="w-full flex items-center justify-between p-4 bg-primary text-white rounded-xl shadow-md hover:scale-[0.98] transition-transform">
                  <span className="font-bold text-sm">Đồng bộ thiết bị</span>
                  <span className="material-symbols-outlined text-lg">sync</span>
                </button>
                <Link to="/patient/health-records" className="w-full flex items-center justify-between p-4 bg-white text-on-surface border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  <span className="font-bold text-sm">Xem hồ sơ của tôi</span>
                  <span className="material-symbols-outlined text-lg">open_in_new</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

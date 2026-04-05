import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function DoctorMessagesPage() {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([
        {
            id: 'p1',
            name: 'Bà Nguyễn Thị Lan',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwbdztoSMZ9nKeakL5QnbveSBIqaKALT4YpcCfla0VsUXeHx5hWA096FHWNQROfLV0gyGNyDswdvqkt2DzR9R5PxTWttW5uBWgeWM9CzEOW6AD6iTScggwnlHMx4-FxxTO-iiYX2ylsTqjo_M0dWksWgAiQFee6p--H5jqVyMsCMsuwbd2vTBt5YpPabCr0s96hwjMZuLjaNbefm6SVDQEHBnt5lI3Vag3B64g-DH__bZqo56_ip5kWQ03YRPuCGIe0NAWnVKlyxY',
            type: 'emergency',
            statusText: 'Ngay bây giờ',
            heartRate: 120,
            spo2: 94,
            notes: "Bệnh nhân cao tuổi, có tiền sử bệnh tim mạch phức tạp. Cần theo dõi sát sao nhịp tim hằng ngày.",
            isOnline: true,
            messages: [
                { id: 1, sender: 'system', text: 'Cảnh báo tự động: Nhịp tim vượt mức an toàn (>120 BPM).', time: '10:00 AM' }
            ]
        },
        {
            id: 'p2',
            name: 'Ông Trần Văn Hùng',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCyQIPZ0YXpcLBQ4HHRQXbqPbgBebedOsOe3kEoFtswdzEQ2rFfAhsJbJmoRGd1o1QZ1YSvaSIEhP1ynsnTjWDL2AyYxE8q8DxN-h12sl8gH7Ygq80nyr-HZY6HqYdCJP0UTcyPlfSdVN9eeBk0JB2bovYfKQwuPOFJibbVgI9VnEZVF9WQ53c9sVfn_BPlO8JNemXHSlCpmacFwUBCmYAWTUY_-ktp7IpAlkLYkoSZFh8lYJbb35zidTs547uAu-7yR3jZl8MLz8A',
            type: 'recent',
            statusText: '12:45 PM',
            heartRate: 105,
            spo2: 97,
            notes: "Bệnh nhân có tiền sử cao huyết áp, cần lưu ý khi nhịp tim vượt ngưỡng 100 BPM trong trạng thái nghỉ.",
            isOnline: true,
            messages: [
                { id: 1, sender: 'patient', text: 'Chào bác sĩ, khoảng 10 phút trước tôi cảm thấy hơi khó thở nhẹ. Tôi đã ngồi nghỉ nhưng vẫn thấy nhịp tim đập nhanh hơn bình thường. Đây là chỉ số ECG của tôi lúc đó:', isEcg: true, time: '12:42 PM' },
                { id: 2, sender: 'doctor', text: 'Chào ông Hùng, tôi đã nhận được dữ liệu. Nhịp tim của ông đang ở mức 105 BPM, hơi cao so với bình thường. Ông hãy hít thở sâu và đều. Tôi đang theo dõi các chỉ số khác của ông qua hệ thống.', time: '12:45 PM' }
            ]
        },
        {
            id: 'p3',
            name: 'Chị Lê Thu Hà',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBERxiI5IS-XFTWSHwFbcr2stuc50XmUYRaPVAjqMEIsF1MGdUBmBnIjU2-_TnO9sKLF5WMlpha9BUJ6hRz75l0zpJHhc_IA17CezjKyj0eymwwzv_uzzPEP6IcHdv9Dgou3RMmLf8MyGR6N74xkE45C4PHID9Kdnu_28AJ7QFMYXusU9bxG6g0d0UEM77QTW5t7mAVAt9slR_C81XwKFWnrDC6wcEcY5qo5l23-1r7CaLHTd5rYzR__KJkLc7Kf5npPB_0IYBzNSE',
            type: 'recent',
            statusText: 'Hôm qua',
            heartRate: 75,
            spo2: 99,
            notes: "Sức khoẻ ổn định. Lịch khám định kỳ vào tháng sau.",
            isOnline: false,
            messages: [
                { id: 1, sender: 'doctor', text: 'Chào chị Hà, kết quả xét nghiệm hôm qua của chị rất tốt. Nhớ uống nhiều nước nhé!', time: 'Hôm qua, 09:00 AM' },
                { id: 2, sender: 'patient', text: 'Dạ, cảm ơn bác sĩ. Tôi đã thấy khá hơn nhiều rồi.', time: 'Hôm qua, 10:15 AM' }
            ]
        }
    ]);

    const [activePatientId, setActivePatientId] = useState('p2');
    const [draftMessage, setDraftMessage] = useState("");
    const endOfMessagesRef = useRef(null);

    const activePatient = patients.find(p => p.id === activePatientId) || patients[0];

    useEffect(() => {
        if (endOfMessagesRef.current) {
            endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activePatientId, patients]);

    const handleSendMessage = () => {
        if (!draftMessage.trim()) return;

        const updatedPatients = patients.map(p => {
            if (p.id === activePatientId) {
                const newMessage = {
                    id: Date.now(),
                    sender: 'doctor',
                    text: draftMessage,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                return { ...p, messages: [...p.messages, newMessage] };
            }
            return p;
        });

        setPatients(updatedPatients);
        setDraftMessage("");
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSendMessage();
    };

    const getLastMessage = (patient) => {
        if (patient.messages.length > 0) {
            return patient.messages[patient.messages.length - 1].text;
        }
        return "Chưa có tin nhắn nào.";
    };

    const emergencyPatients = patients.filter(p => p.type === 'emergency');
    const recentPatients = patients.filter(p => p.type === 'recent');

    return (
        <div className="flex flex-1 overflow-hidden h-[calc(100vh-140px)] bg-white rounded-3xl shadow-sm border border-slate-200">
            {/* Column 1: Danh sách trò chuyện (Chat List) */}
            <section className="w-80 flex flex-col bg-surface-container-low border-r border-slate-200/50 overflow-y-auto no-scrollbar">
                <div className="p-6">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Ưu tiên (Khẩn cấp)</h2>
                    <div className="space-y-3">
                        {emergencyPatients.map(p => (
                            <div key={p.id} onClick={() => setActivePatientId(p.id)} className={`p-4 rounded-xl flex gap-3 cursor-pointer transition-all duration-200 ${activePatientId === p.id ? 'bg-error-container ring-2 ring-error/50' : 'bg-error-container/50 hover:bg-error-container ring-1 ring-error/20'}`}>
                                <div className="relative">
                                    <img alt="Bệnh nhân" className="w-12 h-12 rounded-full object-cover" src={p.avatar} />
                                    {p.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-error rounded-full border-2 border-error-container animate-pulse"></span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className="font-bold text-on-error-container truncate">{p.name}</span>
                                        <span className="text-[10px] text-error font-bold">{p.statusText}</span>
                                    </div>
                                    <p className="text-xs text-error font-medium truncate">{getLastMessage(p)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-8 mb-4">Gần đây</h2>
                    <div className="space-y-2">
                        {recentPatients.map(p => (
                            <div key={p.id} onClick={() => setActivePatientId(p.id)} className={`p-4 rounded-xl flex gap-3 transition-all duration-200 cursor-pointer ${activePatientId === p.id ? 'bg-sky-50 border border-primary/20 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}>
                                <div className="relative">
                                    <img alt="Bệnh nhân" className="w-12 h-12 rounded-full object-cover" src={p.avatar} />
                                    {p.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-secondary rounded-full border-2 border-white"></span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className="font-bold text-slate-800 truncate">{p.name}</span>
                                        <span className="text-[10px] text-slate-400">{p.statusText}</span>
                                    </div>
                                    <p className={`text-xs truncate ${activePatientId === p.id ? 'text-primary font-medium' : 'text-slate-500'}`}>{getLastMessage(p)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            {/* Column 2: Cửa sổ Chat (Chat Window) */}
            <section className="flex-1 flex flex-col bg-surface-container-lowest">
                {/* Chat Header */}
                <div className="h-20 flex items-center justify-between px-8 bg-white border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-4">
                        <img alt={activePatient.name} className="w-12 h-12 rounded-full object-cover" src={activePatient.avatar} />
                        <div>
                            <h3 className="font-bold text-on-surface">{activePatient.name}</h3>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${activePatient.isOnline ? (activePatient.type === 'emergency' ? 'bg-error' : 'bg-secondary') : 'bg-slate-300'}`}></span>
                                <span className="text-xs text-slate-500">{activePatient.isOnline ? 'Đang trực tuyến' : 'Ngoại tuyến'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => window.alert(`Bắt đầu cuộc gọi video y tế bảo mật với ${activePatient.name}...`)} className="flex items-center gap-2 bg-[#004976] hover:bg-[#003d63] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
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
                    {activePatient.messages.map(msg => {
                        if (msg.sender === 'system') {
                            return (
                                <div key={msg.id} className="flex justify-center my-4">
                                    <div className="bg-error/10 text-error border border-error/20 px-4 py-2 rounded-lg text-xs font-bold text-center w-3/4 flex flex-col gap-1 items-center">
                                        <span className="flex items-center justify-center gap-1"><span className="material-symbols-outlined text-sm">warning</span>{msg.text}</span>
                                        <span className="text-[10px] opacity-70">{msg.time}</span>
                                    </div>
                                </div>
                            );
                        }
                        if (msg.sender === 'patient') {
                            return (
                                <div key={msg.id} className="flex gap-4 max-w-2xl">
                                    <img alt="Avatar" className="w-8 h-8 rounded-full self-end border border-slate-200" src={activePatient.avatar} />
                                    <div className="bg-surface-container-low p-4 rounded-2xl rounded-bl-none shadow-sm">
                                        <p className="text-sm text-on-surface leading-relaxed">{msg.text}</p>
                                        {msg.isEcg && (
                                            <div className="mt-4 bg-white/60 p-3 rounded-xl border border-blue-100/50 cursor-pointer hover:border-blue-300 transition-colors" onClick={() => navigate('/doctor/live')}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-bold text-[#004976] flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">ecg</span>
                                                        ECG - 5 GIÂY (LIVE)
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">{msg.time}</span>
                                                </div>
                                                <div className="h-16 w-full flex items-center relative">
                                                    <svg className="w-full h-full stroke-primary fill-none stroke-[1.5]" viewBox="0 0 400 60" preserveAspectRatio="none">
                                                        <path className="ecg-line" d="M0,30 L40,30 L45,20 L50,45 L55,10 L60,30 L100,30 L140,30 L145,15 L150,50 L155,5 L160,30 L200,30 L240,30 L245,22 L250,40 L255,15 L260,30 L300,30 L340,30 L345,18 L350,45 L355,8 L360,30 L400,30"></path>
                                                    </svg>
                                                    <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity flex justify-center items-center rounded-lg">
                                                        <span className="bg-primary text-white text-[10px] px-2 py-1 rounded-md font-bold shadow-sm">Xem chi tiết</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {!msg.isEcg && <div className="text-[10px] text-slate-400 mt-2">{msg.time}</div>}
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
                        <input className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none placeholder:text-slate-400"
                            placeholder="Viết tin nhắn cho bệnh nhân..." type="text"
                            value={draftMessage}
                            onChange={(e) => setDraftMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <div className="flex items-center gap-2 pr-2">
                            <button onClick={handleSendMessage} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${draftMessage.trim() ? 'bg-primary text-white hover:bg-[#003d63] shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                                <span className="material-symbols-outlined">send</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>
            {/* Column 3: Thông tin nhanh (Patient Profile/Stats) */}
            <section className="w-72 flex flex-col bg-slate-50 border-l border-slate-200/50 overflow-y-auto no-scrollbar">
                <div className="p-6 space-y-8">
                    {/* Real-time Stats Cards */}
                    <div>
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Sinh hiệu hiện tại</h2>
                        <div className="space-y-4">
                            {/* Heart Rate Card */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm relative overflow-hidden group border border-slate-100">
                                <div className={`absolute -right-2 -top-2 w-16 h-16 ${activePatient.heartRate > 100 ? 'bg-error/5' : 'bg-primary/5'} rounded-full group-hover:scale-110 transition-transform`}></div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`material-symbols-outlined ${activePatient.heartRate > 100 ? 'text-error' : 'text-primary'}`} style={{ fontVariationSettings: '"FILL" 1' }}>favorite</span>
                                    <span className="text-xs font-bold text-slate-500">NHỊP TIM</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-slate-800">{activePatient.heartRate}</span>
                                    <span className="text-sm font-medium text-slate-400">BPM</span>
                                </div>
                                <div className={`mt-2 flex items-center gap-1 text-[10px] ${activePatient.heartRate > 100 ? 'text-error' : 'text-secondary'} font-bold`}>
                                    <span className="material-symbols-outlined text-[12px]">{activePatient.heartRate > 100 ? 'trending_up' : 'trending_flat'}</span>
                                    {activePatient.heartRate > 100 ? 'Cao hơn bình thường' : 'Ổn định'}
                                </div>
                            </div>
                            {/* SpO2 Card */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm relative overflow-hidden group border border-slate-100">
                                <div className={`absolute -right-2 -top-2 w-16 h-16 ${activePatient.spo2 < 95 ? 'bg-error/5' : 'bg-secondary/5'} rounded-full group-hover:scale-110 transition-transform`}></div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`material-symbols-outlined ${activePatient.spo2 < 95 ? 'text-error' : 'text-secondary'}`} style={{ fontVariationSettings: '"FILL" 1' }}>water_drop</span>
                                    <span className="text-xs font-bold text-slate-500">SPO2</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-slate-800">{activePatient.spo2}</span>
                                    <span className="text-sm font-medium text-slate-400">%</span>
                                </div>
                                <div className={`mt-2 flex items-center gap-1 text-[10px] ${activePatient.spo2 < 95 ? 'text-error' : 'text-primary'} font-bold`}>
                                    <span className="material-symbols-outlined text-[12px]">{activePatient.spo2 < 95 ? 'warning' : 'check_circle'}</span>
                                    {activePatient.spo2 < 95 ? 'Dưới mức định mức' : 'Bình thường'}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Quick Actions */}
                    <div>
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Hành động nhanh</h2>
                        <div className="space-y-3">
                            <button onClick={() => window.alert('Đang mở chức năng Kê đơn thuốc cho bệnh nhân này...')} className="w-full flex items-center justify-between p-4 bg-primary text-white rounded-xl shadow-md hover:scale-[0.98] transition-transform">
                                <span className="font-bold text-sm">Tạo đơn thuốc</span>
                                <span className="material-symbols-outlined text-lg">prescriptions</span>
                            </button>
                            <button onClick={() => navigate('/doctor/appointments')} className="w-full flex items-center justify-between p-4 bg-white text-on-surface border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                <span className="font-bold text-sm">Lên lịch khám</span>
                                <span className="material-symbols-outlined text-lg">event_repeat</span>
                            </button>
                            <button onClick={() => navigate('/doctor/patients')} className="w-full flex items-center justify-between p-4 bg-white text-on-surface border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                <span className="font-bold text-sm">Xem hồ sơ</span>
                                <span className="material-symbols-outlined text-lg">open_in_new</span>
                            </button>
                        </div>
                    </div>
                    {/* Notes */}
                    <div>
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Ghi chú lâm sàng</h2>
                        <div className="p-4 bg-white/50 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 italic leading-relaxed">
                            "{activePatient.notes}"
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

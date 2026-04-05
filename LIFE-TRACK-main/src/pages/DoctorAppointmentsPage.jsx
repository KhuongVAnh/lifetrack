import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function DoctorAppointmentsPage() {
    const navigate = useNavigate();
    const [weekOffset, setWeekOffset] = useState(0);
    const [availability, setAvailability] = useState({
        morning: true,
        afternoon: false
    });
    const [extraFrames, setExtraFrames] = useState([]);
    const [isAvailMenuOpen, setIsAvailMenuOpen] = useState(false);
    const [isAddingFrame, setIsAddingFrame] = useState(false);
    const [newFrameStart, setNewFrameStart] = useState("");
    const [newFrameEnd, setNewFrameEnd] = useState("");
    const [newFrameDay, setNewFrameDay] = useState("Thứ 2");
    const [requests, setRequests] = useState([
        {
            id: 1,
            name: "Trần Văn C",
            type: "Tư vấn Video",
            icon: "videocam",
            time: "Hôm nay, 15:30",
            duration: "30 phút",
            textColor: "text-primary",
            bgColor: "bg-white",
            borderColor: ""
        },
        {
            id: 2,
            name: "Nguyễn Thị H.",
            type: "Khám tại nhà",
            icon: "home",
            time: "Mai, 09:00",
            duration: "60 phút",
            textColor: "text-secondary",
            bgColor: "bg-white",
            borderColor: "border-l-4 border-secondary"
        }
    ]);

    // Lấy thời gian với tuần tương ứng (weekOffset)
    const baseDate = new Date();
    const currentDate = new Date(baseDate.getTime());
    currentDate.setDate(currentDate.getDate() + (weekOffset * 7));

    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const currentDayOfWeek = currentDate.getDay(); // 0 is Sun, 1 is Mon...

    // Tính toán ngày trong tuần (Monday -> Sunday)
    const weekDates = [];
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    for (let i = 0; i < 7; i++) {
        const d = new Date(currentDate.getTime());
        d.setDate(currentDate.getDate() + diffToMonday + i);
        weekDates.push(d); // Lưu object Date
    }

    // String mốc để kiểm tra "hôm nay" của thực tại
    const todayStr = new Date().toDateString();

    const handleRequestAction = (id) => {
        setRequests(requests.filter(req => req.id !== id));
    };

    const toggleAvailability = (key) => {
        setAvailability(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSaveFrame = () => {
        if (newFrameStart && newFrameEnd) {
            setExtraFrames([...extraFrames, { id: Date.now(), time: `${newFrameStart} - ${newFrameEnd}`, day: newFrameDay }]);
            setIsAddingFrame(false);
            setNewFrameStart("");
            setNewFrameEnd("");
            setNewFrameDay("Thứ 2");
        }
    };

    const removeFrame = (id) => {
        setExtraFrames(extraFrames.filter(x => x.id !== id));
    };

    return (
        <div className="flex flex-1 overflow-hidden p-4 gap-4 h-[calc(100vh-140px)]">
            {/* Calendar Section */}
            <div className="flex-grow flex flex-col bg-surface-container-lowest rounded-2xl p-4 shadow-sm overflow-hidden">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-extrabold text-[#004976]">Tháng {currentMonth}, {currentYear}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                            <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-xl">chevron_left</span>
                            </button>
                            <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-xl">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
                {/* Calendar Grid */}
                <div className="flex-grow flex flex-col overflow-hidden">
                    {/* Day Labels */}
                    <div className="grid grid-cols-8 border-b border-surface-container-high pb-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase text-center self-end">
                            Giờ
                        </div>
                        {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'].map((label, idx) => {
                            const dateObj = weekDates[idx];
                            const isToday = dateObj.toDateString() === todayStr;
                            return (
                                <div key={label} className={`text-center ${isToday ? 'bg-sky-50/50 rounded-lg pt-1 pb-1' : ''}`}>
                                    <span className={`block text-[10px] font-bold uppercase ${isToday ? 'text-primary' : 'text-slate-400'}`}>
                                        {label}
                                    </span>
                                    <span className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>
                                        {dateObj.getDate()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    {/* Scrollable Grid Body */}
                    <div className="flex-grow overflow-y-auto no-scrollbar pt-2 relative">
                        <div className="grid grid-cols-8 divide-x divide-surface-container-high">
                            {/* Time Column */}
                            <div className="flex flex-col">
                                {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map(hour => (
                                    <div key={hour} className="h-12 text-[10px] font-bold text-slate-400 pr-2 text-right">
                                        {hour.toString().padStart(2, '0')}:00
                                    </div>
                                ))}
                            </div>

                            {/* Dummy Grid Columns */}
                            {[...Array(7)].map((_, idx) => {
                                const dateObj = weekDates[idx];
                                const isToday = dateObj.toDateString() === todayStr;
                                return (
                                    <div key={idx} className={`relative ${isToday ? 'bg-sky-50/20' : ''} ${idx === 6 ? 'bg-slate-50/50' : ''}`}>
                                        <div className="absolute inset-0 grid grid-rows-[repeat(14,48px)] border-t border-surface-container-high/50">
                                        </div>

                                        {/* Monday Appts */}
                                        {idx === 0 && (
                                            <div className="absolute top-[48px] left-1 right-1 h-16 bg-primary/90 text-white p-2 rounded-lg shadow-lg z-10 opacity-70 cursor-move border-2 border-white transition-transform hover:scale-105"
                                                onClick={() => navigate('/doctor/patients')}>
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <span className="material-symbols-outlined text-[12px]">videocam</span>
                                                    <span className="text-[8px] font-bold uppercase tracking-wider">Đang di chuyển</span>
                                                </div>
                                                <div className="font-bold text-[10px]">Bùi Anh T.</div>
                                                <div className="text-[8px] opacity-80">08:00 - 09:30</div>
                                            </div>
                                        )}

                                        {/* Tuesday Appts */}
                                        {idx === 1 && (
                                            <div className="absolute top-[144px] left-1 right-1 h-10 bg-[#0047AB] text-white p-1 rounded-md shadow-sm cursor-pointer hover:bg-opacity-90 transition-all"
                                                onClick={() => navigate('/doctor/messages')}>
                                                <div className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">videocam</span>
                                                    <span className="text-[8px] font-bold uppercase">Video</span>
                                                </div>
                                                <div className="font-bold text-[10px] truncate">Lê Hoàng Nam</div>
                                            </div>
                                        )}

                                        {/* Wednesday Appts */}
                                        {idx === 2 && (
                                            <div className="absolute top-[240px] left-1 right-1 h-12 bg-secondary text-white p-1 rounded-md shadow-sm cursor-pointer hover:bg-opacity-90 transition-all"
                                                onClick={() => navigate('/doctor/patients')}>
                                                <div className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">home</span>
                                                    <span className="text-[8px] font-bold uppercase">Tại nhà</span>
                                                </div>
                                                <div className="font-bold text-[10px] truncate">Bà Nguyễn Thị B</div>
                                            </div>
                                        )}

                                        {/* Thursday Appts */}
                                        {idx === 3 && (
                                            <div className="absolute top-[96px] left-1 right-1 h-24 bg-slate-100 text-slate-500 p-2 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-center">
                                                <div className="text-[8px] font-bold uppercase tracking-widest leading-tight">
                                                    Thời gian tập trung<br />&amp; Nghỉ trưa
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            {/* Right Sidebar */}
            <aside className="w-72 flex flex-col gap-4 overflow-y-auto no-scrollbar">
                {/* Availability Section */}
                <section className="bg-surface-container-low rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3 relative">
                        <h3 className="font-bold text-primary text-sm">Thiết lập thời gian rảnh</h3>
                        <span onClick={() => setIsAvailMenuOpen(!isAvailMenuOpen)} className="material-symbols-outlined text-primary text-xl cursor-pointer hover:bg-slate-100 rounded-full p-1 transition-colors">more_horiz</span>
                        {isAvailMenuOpen && (
                            <div className="absolute right-0 top-8 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-20">
                                <button onClick={() => setIsAvailMenuOpen(false)} className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">Thiết lập nâng cao</button>
                                <button onClick={() => setIsAvailMenuOpen(false)} className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap">Tạm dừng nhận lịch</button>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between bg-white p-2.5 rounded-xl cursor-pointer" onClick={() => toggleAvailability('morning')}>
                            <div>
                                <div className="text-xs font-bold transition-colors" style={!availability.morning ? { color: '#94a3b8' } : {}}>08:00 - 10:00</div>
                                <div className="text-[9px] text-slate-500">Sáng Thứ 2 - Thứ 6</div>
                            </div>
                            <div className={`w-8 h-4 rounded-full relative p-0.5 transition-colors ${availability.morning ? 'bg-secondary-container' : 'bg-slate-300'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full absolute transition-all ${availability.morning ? 'right-0.5' : 'left-0.5'}`}></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between bg-white p-2.5 rounded-xl cursor-pointer" onClick={() => toggleAvailability('afternoon')}>
                            <div>
                                <div className="text-xs font-bold transition-colors" style={!availability.afternoon ? { color: '#94a3b8' } : {}}>14:00 - 17:00</div>
                                <div className="text-[9px] text-slate-500">Chiều Thứ 2 - Thứ 6</div>
                            </div>
                            <div className={`w-8 h-4 rounded-full relative p-0.5 transition-colors ${availability.afternoon ? 'bg-secondary-container' : 'bg-slate-300'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full absolute transition-all ${availability.afternoon ? 'right-0.5' : 'left-0.5'}`}></div>
                            </div>
                        </div>
                        {extraFrames.map(frame => (
                            <div key={frame.id} className="flex items-center justify-between bg-zinc-50 border border-primary/20 p-2.5 rounded-xl">
                                <div>
                                    <div className="text-xs font-bold text-primary">{frame.time}</div>
                                    <div className="text-[9px] text-slate-500">{frame.day}</div>
                                </div>
                                <span onClick={() => removeFrame(frame.id)} className="material-symbols-outlined text-sm text-slate-400 hover:text-error cursor-pointer">close</span>
                            </div>
                        ))}
                        {isAddingFrame ? (
                            <div className="bg-white p-3 rounded-xl border border-primary/20 shadow-sm space-y-2 animate-fade-in">
                                <div className="text-[10px] font-bold text-primary mb-1">Thêm khung giờ</div>
                                <select value={newFrameDay} onChange={e => setNewFrameDay(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-primary text-slate-700 bg-slate-50">
                                    {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'].map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2 items-center">
                                    <input type="time" value={newFrameStart} onChange={e => setNewFrameStart(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-primary text-slate-700 bg-slate-50" />
                                    <span className="text-slate-300 font-black">-</span>
                                    <input type="time" value={newFrameEnd} onChange={e => setNewFrameEnd(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-primary text-slate-700 bg-slate-50" />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button onClick={handleSaveFrame} className="flex-1 bg-primary text-white font-bold text-[10px] py-1.5 rounded-lg hover:bg-[#003d63] transition-colors shadow-sm">Lưu</button>
                                    <button onClick={() => setIsAddingFrame(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold text-[10px] py-1.5 rounded-lg hover:bg-slate-200 transition-colors">Hủy</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setIsAddingFrame(true)} className="w-full py-1.5 border border-dashed border-primary/40 text-primary text-[10px] font-bold rounded-lg hover:bg-primary/5 transition-colors">
                                + Thêm khung giờ
                            </button>
                        )}
                    </div>
                </section>
                {/* Pending Requests */}
                <section className="bg-surface-container-low rounded-2xl p-4 flex-grow">
                    <h3 className="font-bold text-primary text-sm mb-3">Yêu cầu đang chờ ({requests.length})</h3>
                    <div className="space-y-3">
                        {requests.length === 0 ? (
                            <div className="text-xs text-center text-slate-400 p-4 font-bold border-2 border-dashed border-slate-200 rounded-xl">Chưa có yêu cầu mới</div>
                        ) : (
                            requests.map(req => (
                                <div key={req.id} className={`bg-white p-3 rounded-xl shadow-sm ${req.borderColor} transition-all`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex flex-shrink-0 items-center justify-center text-slate-400 overflow-hidden">
                                            <span className="material-symbols-outlined text-sm">person</span>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold">{req.name}</div>
                                            <div className={`text-[9px] ${req.textColor} font-medium flex items-center gap-1`}>
                                                <span className="material-symbols-outlined text-[10px]">{req.icon}</span> {req.type}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 px-2 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 mb-2 flex items-center justify-between">
                                        <span>{req.time}</span>
                                        <span className={req.textColor}>{req.duration}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleRequestAction(req.id)} className="flex-1 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-[#003d63] transition-colors">
                                            Xác nhận
                                        </button>
                                        <button onClick={() => handleRequestAction(req.id)} className="px-2 py-1.5 border border-slate-200 text-slate-400 text-[10px] font-bold rounded-lg hover:bg-error hover:text-white hover:border-error transition-colors">
                                            X
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </aside>
        </div>
    );
}

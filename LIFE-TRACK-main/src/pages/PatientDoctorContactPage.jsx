import { useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { doctorProfiles, getDoctorById, hiredDoctorIds } from "../data/mockData";

const doctorMessagesSeed = {
  "le-minh-tam": [
    { id: 1, sender: "doctor", text: "Chào anh/chị, tôi đã xem chỉ số sáng nay. Hiện huyết áp khá ổn.", time: "09:10" },
    { id: 2, sender: "patient", text: "Dạ, bố có hơi mệt nhẹ sau khi đi bộ 20 phút.", time: "09:12" },
    { id: 3, sender: "doctor", text: "Anh/chị cho bố nghỉ ngơi, uống đủ nước và gửi lại chỉ số buổi tối nhé.", time: "09:14" },
  ],
  "nguyen-thuy-chi": [
    { id: 1, sender: "doctor", text: "Chào chị, đường huyết lúc đói hôm nay bao nhiêu ạ?", time: "08:45" },
    { id: 2, sender: "patient", text: "Dạ 5.9 mmol/L bác sĩ.", time: "08:47" },
    { id: 3, sender: "doctor", text: "Rất tốt, chị tiếp tục duy trì thực đơn và vận động nhẹ mỗi ngày nhé.", time: "08:48" },
  ],
};

function getLastMessage(messages) {
  if (!messages?.length) {
    return "Bắt đầu cuộc trò chuyện với bác sĩ";
  }

  return messages[messages.length - 1].text;
}

export function PatientDoctorContactPage() {
  const { doctorId } = useParams();
  const currentDoctor = getDoctorById(doctorId);

  if (!currentDoctor) {
    return <Navigate replace to="/patient/doctors/my" />;
  }

  const consultDoctors = hiredDoctorIds
    .map((id) => doctorProfiles.find((doctor) => doctor.id === id))
    .filter(Boolean);

  const [activeDoctorId, setActiveDoctorId] = useState(currentDoctor.id);
  const [draftMessage, setDraftMessage] = useState("");
  const [isVoiceCalling, setIsVoiceCalling] = useState(false);
  const [isVideoCalling, setIsVideoCalling] = useState(false);

  const [messagesByDoctor, setMessagesByDoctor] = useState(() => {
    const seeded = {};

    consultDoctors.forEach((doctor) => {
      seeded[doctor.id] = doctorMessagesSeed[doctor.id] ?? [];
    });

    return seeded;
  });

  const endOfMessagesRef = useRef(null);

  const activeDoctor = useMemo(
    () => consultDoctors.find((doctor) => doctor.id === activeDoctorId) ?? consultDoctors[0],
    [consultDoctors, activeDoctorId],
  );

  const activeMessages = messagesByDoctor[activeDoctor?.id] ?? [];

  if (!hiredDoctorIds.includes(currentDoctor.id)) {
    return <Navigate replace to="/patient/doctors/my" />;
  }

  const handleSendMessage = () => {
    if (!draftMessage.trim() || !activeDoctor) {
      return;
    }

    const newMessage = {
      id: Date.now(),
      sender: "patient",
      text: draftMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessagesByDoctor((prev) => ({
      ...prev,
      [activeDoctor.id]: [...(prev[activeDoctor.id] ?? []), newMessage],
    }));
    setDraftMessage("");

    window.setTimeout(() => {
      if (endOfMessagesRef.current) {
        endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 0);
  };

  const handleStartVoiceCall = () => {
    setIsVoiceCalling(true);
    setIsVideoCalling(false);
  };

  const handleStartVideoCall = () => {
    setIsVideoCalling(true);
    setIsVoiceCalling(false);
  };

  const handleEndCall = () => {
    setIsVideoCalling(false);
    setIsVoiceCalling(false);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <section className="w-80 flex-col overflow-y-auto border-r border-slate-200/60 bg-surface-container-low no-scrollbar">
        <div className="p-6">
          <h2 className="mb-1 text-lg font-extrabold text-on-surface">Tư vấn với bác sĩ</h2>
          <p className="text-xs text-slate-500">Kênh chăm sóc trực tiếp với bác sĩ phụ trách gia đình</p>

          <div className="mt-5 space-y-3">
            {consultDoctors.map((doctor) => {
              const isActive = doctor.id === activeDoctor?.id;
              const lastMessage = getLastMessage(messagesByDoctor[doctor.id]);

              return (
                <button
                  key={doctor.id}
                  className={[
                    "w-full rounded-2xl border p-4 text-left transition-all",
                    isActive
                      ? "border-primary/30 bg-sky-50 shadow-sm"
                      : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                  onClick={() => setActiveDoctorId(doctor.id)}
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <ImageWithFallback alt={doctor.name} className="h-12 w-12 rounded-full object-cover" src={doctor.avatar} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-on-surface">{doctor.name}</p>
                      <p className="text-xs font-medium text-slate-500">{doctor.specialty}</p>
                    </div>
                  </div>
                  <p className="mt-2 truncate text-xs text-slate-500">{lastMessage}</p>
                </button>
              );
            })}
          </div>

          <Link
            className="mt-5 block rounded-xl border border-primary/20 bg-white px-4 py-3 text-center text-sm font-bold text-primary hover:bg-sky-50"
            to="/patient/doctors/my"
          >
            Quay lại danh sách bác sĩ
          </Link>
        </div>
      </section>

      <section className="flex flex-1 flex-col bg-surface-container-lowest">
        <div className="flex h-20 items-center justify-between border-b border-slate-100 bg-white px-8">
          <div className="flex items-center gap-4">
            <ImageWithFallback alt={activeDoctor?.name} className="h-12 w-12 rounded-full object-cover" src={activeDoctor?.avatar} />
            <div>
              <h3 className="font-bold text-on-surface">{activeDoctor?.name}</h3>
              <p className="text-xs text-slate-500">{activeDoctor?.specialty} • Đang trực tuyến</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 rounded-lg border border-primary/30 px-4 py-2 text-sm font-bold text-primary hover:bg-sky-50"
              onClick={handleStartVoiceCall}
              type="button"
            >
              <span className="material-symbols-outlined text-base">call</span>
              Gọi thoại
            </button>
            <button
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-[#003d63]"
              onClick={handleStartVideoCall}
              type="button"
            >
              <span className="material-symbols-outlined text-base">video_call</span>
              Bắt đầu video
            </button>
            {(isVoiceCalling || isVideoCalling) && (
              <button
                className="rounded-lg bg-error px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                onClick={handleEndCall}
                type="button"
              >
                Kết thúc
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 no-scrollbar">
          {(isVoiceCalling || isVideoCalling) && (
            <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm font-medium text-primary">
              {isVideoCalling
                ? "Bạn đang ở chế độ Video call với bác sĩ."
                : "Bạn đang ở chế độ Gọi thoại với bác sĩ."}
            </div>
          )}

          <div className="space-y-4">
            {activeMessages.map((message) => {
              const isPatient = message.sender === "patient";
              return (
                <div key={message.id} className={isPatient ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={[
                      "max-w-[70%] rounded-2xl px-4 py-3",
                      isPatient
                        ? "rounded-br-none bg-primary text-white"
                        : "rounded-bl-none bg-surface-container-low text-on-surface",
                    ].join(" ")}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p className={isPatient ? "mt-2 text-[10px] text-white/70" : "mt-2 text-[10px] text-slate-400"}>
                      {message.time}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={endOfMessagesRef} />
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white p-6">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-2 pl-4 focus-within:border-primary/40">
            <button className="text-slate-400 hover:text-primary" type="button">
              <span className="material-symbols-outlined">add_circle</span>
            </button>
            <input
              className="flex-1 border-none bg-transparent text-sm outline-none focus:ring-0"
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSendMessage()}
              placeholder="Viết tin nhắn cho bác sĩ..."
              type="text"
              value={draftMessage}
            />
            <button
              className={[
                "h-10 w-10 rounded-xl text-white transition-all",
                draftMessage.trim() ? "bg-primary hover:bg-[#003d63]" : "cursor-not-allowed bg-slate-300",
              ].join(" ")}
              onClick={handleSendMessage}
              type="button"
            >
              <span className="material-symbols-outlined text-base">send</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

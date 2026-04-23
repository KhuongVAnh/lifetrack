import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";
import { useAuth } from "@/app/providers/AuthProvider";
import { useDirectChat } from "@/features/direct-chat/model/useDirectChat";
import { formatMessageTime } from "@/features/direct-chat/lib/chat";
import { getUserAvatar, getUserDisplayName } from "@/entities/user";

const MSG_TABS = [
  { id: "list", label: "Danh sách", icon: "forum" },
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "info", label: "Thông tin", icon: "person" },
];

export function PatientDoctorContactPage() {
  const { doctorId } = useParams();
  const { user } = useAuth();
  const initialDoctorId = /^\d+$/.test(String(doctorId ?? "")) ? Number(doctorId) : null;
  const {
    contacts,
    activeContact,
    activeContactId,
    setActiveContactId,
    messages,
    loadingContacts,
    loadingConversation,
    sending,
    error,
    sendMessage,
    formatContactTime,
  } = useDirectChat({ roleFilter: "doctor", initialContactId: initialDoctorId });

  const [draftMessage, setDraftMessage] = useState("");
  const [mobileTab, setMobileTab] = useState("chat");
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    const wasSent = await sendMessage(draftMessage);
    if (wasSent) {
      setDraftMessage("");
    }
  };

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
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

      <div className="min-h-0 rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-1 overflow-hidden">
        <section className={["min-h-0 lg:w-80 flex flex-col bg-surface-container-low border-r border-slate-200/50 overflow-y-auto no-scrollbar", mobileTab === "list" ? "flex" : "hidden lg:flex"].join(" ")}>
          <div className="p-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Bác sĩ của tôi</h2>
            <div className="space-y-2">
              {loadingContacts && !contacts.length && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Đang tải danh sách bác sĩ...
                </div>
              )}
              {!loadingContacts && !contacts.length && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Chưa có hội thoại nào khả dụng. Direct chat chỉ hoạt động khi quyền truy cập đã được chấp nhận.
                </div>
              )}
              {contacts.map((contact) => {
                const isActive = contact.user_id === activeContactId;
                return (
                  <button
                    key={contact.user_id}
                    onClick={() => setActiveContactId(contact.user_id)}
                    className={`w-full p-4 rounded-xl flex gap-3 transition-all duration-200 text-left ${isActive ? "bg-sky-50 border border-primary/20 shadow-sm" : "hover:bg-slate-50 border border-transparent"}`}
                    type="button"
                  >
                    <div className="relative">
                      <ImageWithFallback alt={contact.name} className="w-12 h-12 rounded-full object-cover" src={getUserAvatar(contact)} />
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-secondary rounded-full border-2 border-white"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5 gap-2">
                        <span className="font-bold text-slate-800 truncate">{contact.name}</span>
                        <span className="text-[10px] text-slate-400">{formatContactTime(contact.last_message_at)}</span>
                      </div>
                      <p className={`text-xs truncate ${isActive ? "text-primary font-medium" : "text-slate-500"}`}>
                        {contact.last_message || "Chưa có tin nhắn nào."}
                      </p>
                    </div>
                    {!!contact.unread_count && (
                      <span className="min-w-6 h-6 px-2 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center self-center">
                        {contact.unread_count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className={["min-h-0 flex-1 flex flex-col bg-surface-container-lowest", mobileTab === "chat" ? "flex" : "hidden lg:flex"].join(" ")}>
          <div className="h-20 flex items-center justify-between px-8 bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative">
                <ImageWithFallback alt={activeContact?.name || "Bác sĩ"} className="w-12 h-12 rounded-full object-cover border-2 border-slate-50" src={getUserAvatar(activeContact)} />
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-slate-800 truncate tracking-tight">{activeContact?.name || "Chọn bác sĩ để bắt đầu"}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Phòng khám trực tuyến</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">phone</span>
               </button>
               <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">videocam</span>
               </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8 space-y-6 no-scrollbar">
            <div className="flex justify-center">
              <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-widest">Gần đây</span>
            </div>
            {loadingConversation && !messages.length && (
              <div className="text-center text-sm text-slate-500">Đang tải cuộc hội thoại...</div>
            )}
            {!loadingConversation && !activeContact && (
              <div className="text-center text-sm text-slate-500">Chọn một bác sĩ trong danh sách để bắt đầu nhắn tin.</div>
            )}
            {!loadingConversation && activeContact && !messages.length && (
              <div className="text-center text-sm text-slate-500">Chưa có tin nhắn nào trong cuộc hội thoại này.</div>
            )}
            {messages.map((message) => {
              const isPatient = Number(message.sender_id) === Number(user?.user_id);
              if (!isPatient) {
                return (
                  <div key={message.message_id} className="flex gap-4 max-w-2xl">
                    <ImageWithFallback alt={activeContact?.name || "Bác sĩ"} className="w-8 h-8 rounded-full self-end border border-slate-200" src={getUserAvatar(activeContact)} />
                    <div className="bg-surface-container-low p-4 rounded-2xl rounded-bl-none shadow-sm">
                      <p className="text-sm text-on-surface leading-relaxed">{message.message}</p>
                      <div className="text-[10px] text-slate-400 mt-2">{formatMessageTime(message.created_at)}</div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={message.message_id} className="flex flex-row-reverse gap-4 max-w-2xl ml-auto mt-auto">
                  <div className="bg-primary text-white p-4 rounded-2xl rounded-br-none shadow-md">
                    <p className="text-sm leading-relaxed">{message.message}</p>
                    <div className="text-[10px] text-white/70 mt-2 text-right">{formatMessageTime(message.created_at)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={endOfMessagesRef} />
          </div>

          <div className="p-6 bg-white border-t border-slate-100 shrink-0">
            {error && (
              <div className="mb-3 rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}
            <div className="flex items-center gap-3 bg-slate-50/80 rounded-2xl p-2 pl-4 border border-slate-100 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <input
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none placeholder:text-slate-400"
                placeholder={activeContact ? "Viết tin nhắn cho bác sĩ..." : "Chọn bác sĩ để bắt đầu trò chuyện"}
                type="text"
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && !sending && activeContact && void handleSendMessage()}
                disabled={!activeContact || sending}
              />
              <div className="flex items-center gap-2 pr-2">
                <button
                  onClick={() => void handleSendMessage()}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${draftMessage.trim() && activeContact && !sending ? "bg-primary text-white hover:bg-[#003d63] shadow-md" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                  disabled={!draftMessage.trim() || !activeContact || sending}
                  type="button"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={["min-h-0 lg:w-72 flex flex-col bg-slate-50 border-l border-slate-200/50 overflow-y-auto no-scrollbar", mobileTab === "info" ? "flex" : "hidden lg:flex"].join(" ")}>
          <div className="p-6 space-y-8">
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Thông tin bác sĩ</h2>
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm relative overflow-hidden border border-slate-100">
                  <div className="flex items-center gap-3">
                    <ImageWithFallback alt={activeContact?.name || "Bác sĩ"} className="w-12 h-12 rounded-full border border-slate-200" src={getUserAvatar(activeContact)} />
                    <div>
                      <p className="font-bold text-slate-800">{activeContact?.name || "Chưa chọn bác sĩ"}</p>
                      <p className="text-xs text-slate-500">{activeContact?.email || "Direct chat văn bản"}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Vai trò</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">{activeContact?.roleLabel || "Bác sĩ"}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Tin nhắn chưa đọc</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">{activeContact?.unread_count ?? 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Hành động nhanh</h2>
              <div className="space-y-3">
                <Link to={`/patient/doctors/${activeContactId || "mock"}`} className="group w-full flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200 hover:scale-[1.02] transition-all">
                  <div className="flex flex-col items-start">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Tiểu sử chuyên gia</span>
                    <span className="font-bold text-sm text-white">Xem hồ sơ bác sĩ</span>
                  </div>
                  <span className="material-symbols-outlined text-lg bg-white/10 p-2 rounded-xl group-hover:bg-primary transition-colors">medical_information</span>
                </Link>
                
                <p className="px-2 text-[10px] leading-relaxed text-slate-400 font-medium italic">
                  * Hồ sơ bao gồm chứng chỉ hành nghề, đánh giá từ bệnh nhân và lịch trình làm việc.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

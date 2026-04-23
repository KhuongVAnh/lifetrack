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

/* ── Helpers ── */
function DateDivider({ label }) {
  return (
    <div className="flex items-center justify-center py-2">
      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
    </div>
  );
}

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
      {/* ── Mobile tabs ── */}
      <div className="flex rounded-2xl bg-slate-100 p-1 lg:hidden">
        {MSG_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMobileTab(tab.id)}
            className={[
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all",
              mobileTab === tab.id
                ? "bg-white text-primary shadow-sm"
                : "text-slate-400 hover:text-slate-600",
            ].join(" ")}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Main container ── */}
      <div className="min-h-0 rounded-3xl border border-slate-200/60 bg-white shadow-sm flex flex-1 overflow-hidden">

        {/* ── Contact list ── */}
        <section
          className={[
            "min-h-0 lg:w-80 flex flex-col border-r border-slate-100 overflow-y-auto custom-scrollbar",
            mobileTab === "list" ? "flex" : "hidden lg:flex",
          ].join(" ")}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bác sĩ của tôi</h2>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-[10px] font-bold text-primary">
                {contacts.length}
              </span>
            </div>

            <div className="space-y-1">
              {loadingContacts && !contacts.length && (
                <div className="flex items-center justify-center py-8">
                  <span className="material-symbols-outlined animate-spin text-[24px] text-slate-300">progress_activity</span>
                </div>
              )}
              {!loadingContacts && !contacts.length && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center">
                  <span className="material-symbols-outlined mb-2 text-[28px] text-slate-300">forum</span>
                  <p className="text-sm text-slate-400">Chưa có hội thoại nào.</p>
                </div>
              )}
              {contacts.map((contact) => {
                const isActive = contact.user_id === activeContactId;
                return (
                  <button
                    key={contact.user_id}
                    onClick={() => setActiveContactId(contact.user_id)}
                    className={[
                      "group w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-all duration-200",
                      isActive
                        ? "bg-primary/5 shadow-sm"
                        : "hover:bg-slate-50",
                    ].join(" ")}
                    type="button"
                  >
                    <div className="relative shrink-0">
                      <ImageWithFallback
                        alt={contact.name}
                        className="w-11 h-11 rounded-full object-cover"
                        src={getUserAvatar(contact)}
                      />
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={["text-sm truncate", isActive ? "font-bold text-primary" : "font-semibold text-slate-700"].join(" ")}>
                          {contact.name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                          {formatContactTime(contact.last_message_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs truncate text-slate-400">
                        {contact.last_message || "Chưa có tin nhắn nào."}
                      </p>
                    </div>
                    {!!contact.unread_count && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                        {contact.unread_count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Chat area ── */}
        <section
          className={[
            "min-h-0 flex-1 flex flex-col",
            mobileTab === "chat" ? "flex" : "hidden lg:flex",
          ].join(" ")}
        >
          {/* Chat header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <ImageWithFallback
                  alt={activeContact?.name || "Bác sĩ"}
                  className="w-10 h-10 rounded-full object-cover"
                  src={getUserAvatar(activeContact)}
                />
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-800 truncate">
                  {activeContact?.name || "Chọn bác sĩ để bắt đầu"}
                </h3>
                {activeContact && (
                  <p className="text-[11px] text-emerald-600 font-medium">Đang hoạt động</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-primary">
                <span className="material-symbols-outlined text-[20px]">phone</span>
              </button>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-primary">
                <span className="material-symbols-outlined text-[20px]">videocam</span>
              </button>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-primary">
                <span className="material-symbols-outlined text-[20px]">more_vert</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5 space-y-3 custom-scrollbar bg-slate-50/40">
            <DateDivider label="Gần đây" />

            {loadingConversation && !messages.length && (
              <div className="flex items-center justify-center py-12">
                <span className="material-symbols-outlined animate-spin text-[24px] text-slate-300">progress_activity</span>
              </div>
            )}
            {!loadingConversation && !activeContact && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <span className="material-symbols-outlined text-[32px] text-slate-300">chat_bubble</span>
                </div>
                <p className="text-sm font-semibold text-slate-500">Chọn bác sĩ để bắt đầu nhắn tin</p>
                <p className="mt-1 text-xs text-slate-400">Tin nhắn sẽ hiển thị ở đây</p>
              </div>
            )}
            {!loadingConversation && activeContact && !messages.length && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
                  <span className="material-symbols-outlined text-[32px] text-primary/40">waving_hand</span>
                </div>
                <p className="text-sm font-semibold text-slate-500">Bắt đầu cuộc trò chuyện</p>
                <p className="mt-1 text-xs text-slate-400">Gửi lời chào đến {activeContact.name}</p>
              </div>
            )}

            {messages.map((message) => {
              const isPatient = Number(message.sender_id) === Number(user?.user_id);

              if (!isPatient) {
                return (
                  <div key={message.message_id} className="flex gap-2.5 max-w-[75%]">
                    <ImageWithFallback
                      alt={activeContact?.name || "Bác sĩ"}
                      className="w-8 h-8 rounded-full self-end shrink-0"
                      src={getUserAvatar(activeContact)}
                    />
                    <div>
                      <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm border border-slate-100">
                        <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{message.message}</p>
                      </div>
                      <p className="mt-1 px-1 text-[10px] tabular-nums text-slate-400">{formatMessageTime(message.created_at)}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={message.message_id} className="flex flex-row-reverse max-w-[75%] ml-auto">
                  <div>
                    <div className="rounded-2xl rounded-br-sm bg-primary px-4 py-3 shadow-md shadow-primary/10">
                      <p className="text-[13px] text-white leading-relaxed whitespace-pre-wrap break-words">{message.message}</p>
                    </div>
                    <p className="mt-1 px-1 text-right text-[10px] tabular-nums text-slate-400">{formatMessageTime(message.created_at)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endOfMessagesRef} />
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-3">
            {error && (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
                <span className="material-symbols-outlined text-[14px]">error</span>
                <span className="truncate">{error}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-primary">
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
              </button>
              <div className="flex flex-1 items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 transition-all focus-within:bg-slate-100/80 focus-within:ring-2 focus-within:ring-primary/10">
                <input
                  className="flex-1 bg-transparent border-none text-[13px] outline-none placeholder:text-slate-400 focus:ring-0"
                  placeholder={activeContact ? "Nhập tin nhắn..." : "Chọn bác sĩ để bắt đầu"}
                  type="text"
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && !sending && activeContact && void handleSendMessage()}
                  disabled={!activeContact || sending}
                />
              </div>
              <button
                onClick={() => void handleSendMessage()}
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                  draftMessage.trim() && activeContact && !sending
                    ? "bg-primary text-white shadow-md shadow-primary/20 hover:shadow-lg active:scale-95"
                    : "text-slate-300",
                ].join(" ")}
                disabled={!draftMessage.trim() || !activeContact || sending}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {sending ? "more_horiz" : "send"}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ── Info panel ── */}
        <section
          className={[
            "min-h-0 lg:w-72 flex flex-col border-l border-slate-100 overflow-y-auto custom-scrollbar",
            mobileTab === "info" ? "flex" : "hidden lg:flex",
          ].join(" ")}
        >
          <div className="p-5 space-y-6">
            {/* Doctor profile card */}
            <div className="flex flex-col items-center text-center pt-4">
              <ImageWithFallback
                alt={activeContact?.name || "Bác sĩ"}
                className="w-16 h-16 rounded-full object-cover shadow-md"
                src={getUserAvatar(activeContact)}
              />
              <p className="mt-3 text-sm font-bold text-slate-800">{activeContact?.name || "Chưa chọn bác sĩ"}</p>
              <p className="mt-0.5 text-xs text-slate-400">{activeContact?.email || "Chọn bác sĩ bên danh sách"}</p>
              <div className="mt-3 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-semibold text-emerald-600">Đang hoạt động</span>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Info sections */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thông tin</h3>
              <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px] text-slate-400">badge</span>
                  <div>
                    <p className="text-[10px] text-slate-400">Vai trò</p>
                    <p className="text-xs font-semibold text-slate-700">{activeContact?.roleLabel || "Bác sĩ"}</p>
                  </div>
                </div>
                <div className="h-px bg-slate-200/50" />
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px] text-slate-400">mark_email_unread</span>
                  <div>
                    <p className="text-[10px] text-slate-400">Tin nhắn chưa đọc</p>
                    <p className="text-xs font-semibold text-slate-700">{activeContact?.unread_count ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Quick actions */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hành động</h3>
              <Link
                to={`/patient/doctors/${activeContactId || "mock"}`}
                className="group flex items-center gap-3 rounded-2xl bg-slate-800 p-4 text-white transition-all hover:bg-slate-900 hover:shadow-lg"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition-colors group-hover:bg-primary">
                  <span className="material-symbols-outlined text-[20px]">medical_information</span>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400">Tiểu sử chuyên gia</p>
                  <p className="text-sm font-semibold text-white">Xem hồ sơ bác sĩ</p>
                </div>
                <span className="material-symbols-outlined text-[16px] text-slate-500 transition-transform group-hover:translate-x-0.5">chevron_right</span>
              </Link>
              <p className="px-1 text-[10px] leading-relaxed text-slate-400 italic">
                * Bao gồm chứng chỉ, đánh giá và lịch trình làm việc.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

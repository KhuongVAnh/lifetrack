import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";
import { useAuth } from "@/app/providers/AuthProvider";
import { useDirectChat } from "@/features/direct-chat/model/useDirectChat";
import { formatMessageTime } from "@/features/direct-chat/lib/chat";
import { getDoctorPortalPatients } from "@/features/doctor-portal";
import { getUserAvatar } from "@/entities/user";

const MSG_TABS = [
  { id: "list", label: "Danh sách", icon: "forum" },
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "info", label: "Thông tin", icon: "person" },
];

const ACCESS_BADGES = [
  { key: "canViewEhr", label: "EHR", icon: "clinical_notes" },
  { key: "canViewMedications", label: "Thuốc", icon: "medication" },
  { key: "canViewEcg", label: "ECG", icon: "monitor_heart" },
];

function formatDateTime(value) {
  if (!value) return "Chưa có";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";

  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function DoctorMessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const initialPatientId = Number(searchParams.get("patientId")) || null;
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
  } = useDirectChat({ roleFilter: "patient", initialContactId: initialPatientId });

  const [patientSummaries, setPatientSummaries] = useState([]);
  const [loadingPatientSummaries, setLoadingPatientSummaries] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [mobileTab, setMobileTab] = useState("chat");
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const loadPatientSummaries = async () => {
      setLoadingPatientSummaries(true);
      try {
        const data = await getDoctorPortalPatients({ domain: "all" });
        setPatientSummaries(Array.isArray(data) ? data : []);
      } catch (_error) {
        setPatientSummaries([]);
      } finally {
        setLoadingPatientSummaries(false);
      }
    };

    void loadPatientSummaries();
  }, []);

  const patientSummaryById = useMemo(
    () => new Map(patientSummaries.map((item) => [Number(item.patientId), item])),
    [patientSummaries],
  );

  const enrichedContacts = useMemo(
    () =>
      contacts.map((contact) => ({
        ...contact,
        portalSummary: patientSummaryById.get(Number(contact.user_id)) || null,
      })),
    [contacts, patientSummaryById],
  );

  const activePortalSummary = useMemo(
    () => patientSummaryById.get(Number(activeContact?.user_id)) || null,
    [activeContact?.user_id, patientSummaryById],
  );

  const handleSendMessage = async () => {
    const wasSent = await sendMessage(draftMessage);
    if (wasSent) {
      setDraftMessage("");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex rounded-xl bg-surface-container-low p-1 lg:hidden">
        {MSG_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMobileTab(tab.id)}
            className={[
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all",
              mobileTab === tab.id ? "bg-white text-primary shadow-sm" : "text-slate-500",
            ].join(" ")}
            type="button"
          >
            <span className="material-symbols-outlined text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:h-[calc(100vh-180px)]">
        <section
          className={[
            "min-h-0 flex flex-col overflow-y-auto border-r border-slate-200/50 bg-surface-container-low no-scrollbar lg:w-80",
            mobileTab === "list" ? "flex" : "hidden lg:flex",
          ].join(" ")}
        >
          <div className="p-6">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              Bệnh nhân đang nhắn tin
            </h2>
            <div className="space-y-2">
              {(loadingContacts || loadingPatientSummaries) && !enrichedContacts.length && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Đang tải danh sách bệnh nhân...
                </div>
              )}
              {!loadingContacts && !enrichedContacts.length && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Chưa có cuộc hội thoại nào khả dụng. Danh sách này chỉ gồm bệnh nhân đang có quyền chat hợp lệ.
                </div>
              )}
              {enrichedContacts.map((contact) => {
                const isActive = activeContactId === contact.user_id;
                return (
                  <button
                    key={contact.user_id}
                    onClick={() => setActiveContactId(contact.user_id)}
                    className={`w-full cursor-pointer rounded-xl border p-4 text-left transition-all duration-200 ${isActive ? "border-primary/20 bg-sky-50 shadow-sm" : "border-transparent hover:bg-slate-50"}`}
                    type="button"
                  >
                    <div className="flex gap-3">
                      <div className="relative">
                        <ImageWithFallback
                          alt={contact.name}
                          className="h-12 w-12 rounded-full object-cover"
                          src={getUserAvatar(contact)}
                        />
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-secondary"></span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <span className="truncate font-bold text-slate-800">
                            {contact.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatContactTime(contact.last_message_at)}
                          </span>
                        </div>
                        <p
                          className={`truncate text-xs ${isActive ? "font-medium text-primary" : "text-slate-500"}`}
                        >
                          {contact.last_message || "Chưa có tin nhắn nào."}
                        </p>
                        {contact.portalSummary && (
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {contact.portalSummary.canViewEhr ? "EMR" : "No EMR"} ·{" "}
                            {contact.portalSummary.canViewEcg ? "ECG" : "No ECG"}
                          </p>
                        )}
                      </div>
                      {!!contact.unread_count && (
                        <span className="flex h-6 min-w-6 items-center justify-center self-center rounded-full bg-error px-2 text-[10px] font-bold text-white">
                          {contact.unread_count}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className={[
            "min-h-0 flex-1 flex-col bg-surface-container-lowest",
            mobileTab === "chat" ? "flex" : "hidden lg:flex",
          ].join(" ")}
        >
          <div className="h-20 shrink-0 border-b border-slate-100 bg-white px-8">
            <div className="flex h-full items-center justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <ImageWithFallback
                  alt={activeContact?.name || "Bệnh nhân"}
                  className="h-12 w-12 rounded-full object-cover"
                  src={getUserAvatar(activeContact)}
                />
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-on-surface">
                    {activeContact?.name || "Chọn bệnh nhân để bắt đầu"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-secondary"></span>
                    <span className="truncate text-xs text-slate-500">
                      {activeContact?.email || "Direct chat văn bản"}
                    </span>
                  </div>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Chat văn bản
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto p-8 no-scrollbar">
            <div className="flex justify-center">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Gần đây
              </span>
            </div>
            {loadingConversation && !messages.length && (
              <div className="text-center text-sm text-slate-500">
                Đang tải cuộc hội thoại...
              </div>
            )}
            {!loadingConversation && !activeContact && (
              <div className="text-center text-sm text-slate-500">
                Chọn một bệnh nhân trong danh sách để bắt đầu nhắn tin.
              </div>
            )}
            {!loadingConversation && activeContact && !messages.length && (
              <div className="text-center text-sm text-slate-500">
                Chưa có tin nhắn nào trong cuộc hội thoại này.
              </div>
            )}
            {messages.map((message) => {
              const isDoctor = Number(message.sender_id) === Number(user?.user_id);

              if (!isDoctor) {
                return (
                  <div key={message.message_id} className="flex max-w-2xl gap-4">
                    <ImageWithFallback
                      alt={activeContact?.name || "Bệnh nhân"}
                      className="self-end rounded-full border border-slate-200 h-8 w-8"
                      src={getUserAvatar(activeContact)}
                    />
                    <div className="rounded-2xl rounded-bl-none bg-surface-container-low p-4 shadow-sm">
                      <p className="text-sm leading-relaxed text-on-surface">
                        {message.message}
                      </p>
                      <div className="mt-2 text-[10px] text-slate-400">
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.message_id}
                  className="ml-auto mt-auto flex max-w-2xl flex-row-reverse gap-4"
                >
                  <div className="rounded-2xl rounded-br-none bg-primary p-4 text-white shadow-md">
                    <p className="text-sm leading-relaxed">{message.message}</p>
                    <div className="mt-2 text-right text-[10px] text-white/70">
                      {formatMessageTime(message.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endOfMessagesRef} />
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white p-6">
            {error && (
              <div className="mb-3 rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-2 pl-4 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
              <input
                className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-slate-400 focus:ring-0"
                placeholder={
                  activeContact
                    ? "Viết tin nhắn cho bệnh nhân..."
                    : "Chọn bệnh nhân để bắt đầu trò chuyện"
                }
                type="text"
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                onKeyDown={(event) =>
                  event.key === "Enter" &&
                  !sending &&
                  activeContact &&
                  void handleSendMessage()
                }
                disabled={!activeContact || sending}
              />
              <div className="flex items-center gap-2 pr-2">
                <button
                  onClick={() => void handleSendMessage()}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${draftMessage.trim() && activeContact && !sending ? "bg-primary text-white shadow-md hover:bg-[#003d63]" : "cursor-not-allowed bg-slate-200 text-slate-400"}`}
                  disabled={!draftMessage.trim() || !activeContact || sending}
                  type="button"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          className={[
            "min-h-0 flex flex-col overflow-y-auto border-l border-slate-200/50 bg-slate-50 no-scrollbar lg:w-72",
            mobileTab === "info" ? "flex" : "hidden lg:flex",
          ].join(" ")}
        >
          <div className="space-y-8 p-6">
            <div>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                Thông tin bệnh nhân
              </h2>
              <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <ImageWithFallback
                    alt={activeContact?.name || "Bệnh nhân"}
                    className="h-12 w-12 rounded-full border border-slate-200"
                    src={getUserAvatar(activeContact)}
                  />
                  <div>
                    <p className="font-bold text-slate-800">
                      {activeContact?.name || "Chưa chọn bệnh nhân"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {activeContact?.email || "Direct chat văn bản"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Vai trò
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {activeContact?.roleLabel || "Bệnh nhân"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Tin nhắn chưa đọc
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {activeContact?.unread_count ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Tin nhắn gần nhất
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {formatContactTime(activeContact?.last_message_at) || "Chưa có"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Reading gần nhất
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {formatDateTime(activePortalSummary?.latestReadingAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                Quyền truy cập
              </h2>
              <div className="grid gap-3">
                {ACCESS_BADGES.map((item) => {
                  const enabled = Boolean(activePortalSummary?.[item.key]);
                  return (
                    <div
                      key={item.key}
                      className={`rounded-xl border px-4 py-3 ${enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-400"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">
                          {item.icon}
                        </span>
                        <p className="text-sm font-bold">{item.label}</p>
                      </div>
                      <p className="mt-1 text-[11px] font-bold">
                        {enabled ? "Được truy cập" : "Chưa được mở"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                Hành động nhanh
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() =>
                    activeContact &&
                    navigate(`/doctor/live?patientId=${activeContact.user_id}`)
                  }
                  className="flex w-full items-center justify-between rounded-xl bg-primary p-4 text-white shadow-md transition-transform hover:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  disabled={!activeContact || !activePortalSummary?.canViewEcg}
                  type="button"
                >
                  <span className="text-sm font-bold">Theo dõi trực tiếp</span>
                  <span className="material-symbols-outlined text-lg">
                    monitor_heart
                  </span>
                </button>
                <button
                  onClick={() =>
                    activeContact &&
                    navigate(`/doctor/emr?patientId=${activeContact.user_id}`)
                  }
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-on-surface transition-colors hover:bg-slate-50 disabled:opacity-50"
                  disabled={!activeContact || !activePortalSummary?.canViewEhr}
                  type="button"
                >
                  <span className="text-sm font-bold">Mở EMR</span>
                  <span className="material-symbols-outlined text-lg">
                    clinical_notes
                  </span>
                </button>
                <button
                  onClick={() => navigate("/doctor/patients")}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-on-surface transition-colors hover:bg-slate-50"
                  type="button"
                >
                  <span className="text-sm font-bold">Danh sách bệnh nhân</span>
                  <span className="material-symbols-outlined text-lg">
                    open_in_new
                  </span>
                </button>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                Lưu ý
              </h2>
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 p-4 text-xs italic leading-relaxed text-slate-500">
                Chat direct chỉ hỗ trợ văn bản. Quyền mở EMR, ECG và thuốc đang được lấy theo hợp đồng active hiện tại của từng bệnh nhân.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

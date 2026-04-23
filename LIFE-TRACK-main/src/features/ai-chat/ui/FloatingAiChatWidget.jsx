import { useEffect, useMemo, useRef, useState } from "react";
import { getAiChatHistory, sendAiMessage } from "@/features/ai-chat/api/aiChatApi";
import {
  getStoredAiChatCollapsed,
  getStoredAiChatPosition,
  setStoredAiChatCollapsed,
  setStoredAiChatPosition,
} from "@/features/ai-chat/lib/storage";

const BUBBLE_SIZE = 56;
const VIEWPORT_PADDING = 12;
const PANEL_GAP = 14;
const MOBILE_BREAKPOINT = 768;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getBottomOffset() {
  if (typeof window === "undefined") return 32;
  return window.innerWidth < MOBILE_BREAKPOINT ? 96 : 28;
}

function getDefaultPosition() {
  if (typeof window === "undefined") {
    return { x: 0, y: 0 };
  }

  return {
    x: window.innerWidth - BUBBLE_SIZE - 20,
    y: window.innerHeight - BUBBLE_SIZE - getBottomOffset(),
  };
}

function clampPosition(position) {
  if (typeof window === "undefined") return position;

  return {
    x: clamp(position.x, VIEWPORT_PADDING, window.innerWidth - BUBBLE_SIZE - VIEWPORT_PADDING),
    y: clamp(position.y, VIEWPORT_PADDING, window.innerHeight - BUBBLE_SIZE - VIEWPORT_PADDING),
  };
}

function getInitialPosition() {
  const storedPosition = getStoredAiChatPosition();
  if (!storedPosition || typeof storedPosition.x !== "number" || typeof storedPosition.y !== "number") {
    return clampPosition(getDefaultPosition());
  }
  return clampPosition(storedPosition);
}

function getPanelBounds(position, viewport) {
  const width = Math.min(380, viewport.width - VIEWPORT_PADDING * 2);
  const height = Math.min(viewport.width < MOBILE_BREAKPOINT ? 420 : 500, viewport.height - 100);

  return {
    width,
    height,
    left: clamp(position.x + BUBBLE_SIZE - width, VIEWPORT_PADDING, viewport.width - width - VIEWPORT_PADDING),
    top: clamp(position.y - height - PANEL_GAP, VIEWPORT_PADDING, viewport.height - height - VIEWPORT_PADDING),
  };
}

function formatMessageTime(value) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

/* ── Typing indicator dots ── */
function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm border border-slate-100">
        <span className="ai-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
        <span className="ai-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
        <span className="ai-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

/* ── Single message bubble ── */
function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      {!isUser && (
        <div className="mr-2 mt-auto mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan-500">
          <span className="material-symbols-outlined text-[14px] text-white">ecg_heart</span>
        </div>
      )}
      <div
        className={[
          "max-w-[78%] px-4 py-2.5 text-[13px] leading-relaxed",
          isUser
            ? "rounded-2xl rounded-br-sm bg-primary text-white shadow-md shadow-primary/10"
            : "rounded-2xl rounded-bl-sm bg-white text-slate-700 shadow-sm border border-slate-100",
        ].join(" ")}
      >
        <p className="whitespace-pre-wrap break-words">{message.message}</p>
        <p
          className={[
            "mt-1.5 text-[10px] tabular-nums",
            isUser ? "text-right text-white/50" : "text-slate-400",
          ].join(" ")}
        >
          {formatMessageTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

/* ── Welcome / empty state ── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-cyan-500/10">
        <span className="material-symbols-outlined text-[28px] text-primary">cardiology</span>
      </div>
      <p className="text-sm font-semibold text-slate-700">Xin chào! Tôi là trợ lý AI tim mạch</p>
      <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-slate-400">
        Hãy hỏi bất cứ điều gì về sức khỏe tim mạch – triệu chứng, thuốc, hoặc chế độ sinh hoạt.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {["Huyết áp cao", "Nhịp tim nhanh", "Đau ngực"].map((tag) => (
          <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FloatingAiChatWidget() {
  const [collapsed, setCollapsed] = useState(() => getStoredAiChatCollapsed());
  const [position, setPosition] = useState(() => getInitialPosition());
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 720 : window.innerHeight,
  }));
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const ignoreClickRef = useRef(false);
  const messagesRef = useRef(null);

  const panelBounds = useMemo(() => getPanelBounds(position, viewport), [position, viewport]);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      setError("");
      const data = await getAiChatHistory();
      setMessages(data.history ?? []);
      setHistoryLoaded(true);
    } catch (nextError) {
      setError(nextError.response?.data?.message || "Không thể tải lịch sử trò chuyện AI.");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    setStoredAiChatCollapsed(collapsed);
    if (!collapsed && !historyLoaded && !loadingHistory) {
      void loadHistory();
    }
  }, [collapsed, historyLoaded, loadingHistory]);

  useEffect(() => {
    setStoredAiChatPosition(position);
  }, [position]);

  useEffect(() => {
    const handleResize = () => {
      const nextViewport = { width: window.innerWidth, height: window.innerHeight };
      setViewport(nextViewport);
      setPosition((current) => clampPosition(current));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [collapsed, loadingHistory, messages, sending]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!draggingRef.current) return;

      movedRef.current = true;
      setPosition(
        clampPosition({
          x: event.clientX - dragOffsetRef.current.x,
          y: event.clientY - dragOffsetRef.current.y,
        }),
      );
    };

    const handlePointerUp = () => {
      if (!draggingRef.current) return;

      draggingRef.current = false;
      if (movedRef.current) {
        ignoreClickRef.current = true;
        window.setTimeout(() => {
          ignoreClickRef.current = false;
        }, 120);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const handleBubblePointerDown = (event) => {
    if (!collapsed) return;

    draggingRef.current = true;
    movedRef.current = false;
    dragOffsetRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
  };

  const handleBubbleClick = () => {
    if (ignoreClickRef.current) return;
    setCollapsed((current) => !current);
  };

  const handleSend = async () => {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft || sending) return;

    setError("");
    setSending(true);

    const optimisticMessage = {
      chat_id: `optimistic-${Date.now()}`,
      role: "user",
      message: trimmedDraft,
      timestamp: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticMessage]);
    setDraft("");
    setHistoryLoaded(true);

    try {
      const data = await sendAiMessage(trimmedDraft);
      setMessages((current) => [
        ...current,
        {
          chat_id: `bot-${Date.now()}`,
          role: "bot",
          message: data.response || "Xin lỗi, tôi chưa có phản hồi.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (nextError) {
      setError(nextError.response?.data?.message || "Không thể gửi tin nhắn tới trợ lý AI.");
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <>
      {/* ── Scoped CSS ── */}
      <style>
        {`
          @keyframes ai-ring {
            0% { box-shadow: 0 0 0 0 rgba(0, 73, 118, 0.35); }
            70% { box-shadow: 0 0 0 12px rgba(0, 73, 118, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 73, 118, 0); }
          }
          .ai-bubble-ring { animation: ai-ring 2.4s ease-out infinite; }

          @keyframes ai-dot-bounce {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
          }
          .ai-dot { animation: ai-dot-bounce 1.4s ease-in-out infinite; }

          @keyframes ai-panel-in {
            from { opacity: 0; transform: translateY(12px) scale(0.96); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          .ai-panel-enter { animation: ai-panel-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        `}
      </style>

      {/* ── Chat panel ── */}
      {!collapsed && (
        <section
          className="ai-panel-enter fixed flex flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_24px_64px_-12px_rgba(0,40,80,0.18)]"
          style={{
            left: `${panelBounds.left}px`,
            top: `${panelBounds.top}px`,
            width: `${panelBounds.width}px`,
            height: `${panelBounds.height}px`,
            zIndex: 55,
          }}
        >
          {/* Header */}
          <header className="relative flex items-center justify-between px-5 py-4 shrink-0">
            {/* Gradient bar at top */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-cyan-500 to-teal-400" />

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-cyan-500 shadow-md shadow-primary/15">
                <span className="material-symbols-outlined text-[18px] text-white">ecg_heart</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Trợ lý AI</h2>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-slate-400">Trực tuyến</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Thu nhỏ trợ lý AI"
            >
              <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
            </button>
          </header>

          {/* Divider */}
          <div className="h-px bg-slate-100" />

          {/* Messages */}
          <div ref={messagesRef} className="custom-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4 bg-slate-50/60">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <span className="material-symbols-outlined animate-spin text-[24px] text-slate-300">progress_activity</span>
              </div>
            ) : messages.length === 0 ? (
              <EmptyState />
            ) : (
              messages.map((message) => <MessageBubble key={message.chat_id} message={message} />)
            )}
            {sending && <TypingDots />}
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
            {error && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
                <span className="truncate">{error}</span>
                {!historyLoaded && (
                  <button type="button" onClick={() => void loadHistory()} className="shrink-0 font-semibold underline">
                    Thử lại
                  </button>
                )}
              </div>
            )}

            <div className="flex items-end gap-2 rounded-2xl bg-slate-50 p-1.5 transition-all focus-within:bg-slate-100/80 focus-within:ring-2 focus-within:ring-primary/10">
              <textarea
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-3 py-2 text-[13px] leading-relaxed outline-none placeholder:text-slate-400"
                placeholder="Hỏi về sức khỏe tim mạch..."
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!draft.trim() || sending}
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                  !draft.trim() || sending
                    ? "text-slate-300"
                    : "bg-primary text-white shadow-md shadow-primary/20 hover:shadow-lg active:scale-95",
                ].join(" ")}
                aria-label="Gửi tin nhắn"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {sending ? "more_horiz" : "arrow_upward"}
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Floating bubble ── */}
      <button
        type="button"
        onClick={handleBubbleClick}
        onPointerDown={handleBubblePointerDown}
        className={[
          "group fixed flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan-600 text-white shadow-lg shadow-primary/25 transition-all duration-300",
          collapsed
            ? "ai-bubble-ring h-14 w-14 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95"
            : "h-11 w-11 hover:scale-105 active:scale-95",
        ].join(" ")}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 56,
          touchAction: collapsed ? "none" : "auto",
        }}
        aria-label={collapsed ? "Mở trợ lý AI" : "Thu nhỏ trợ lý AI"}
      >
        <span className="material-symbols-outlined text-[24px] transition-transform duration-300" style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}>
          {collapsed ? "ecg_heart" : "close"}
        </span>

        {/* Sending indicator */}
        {sending && collapsed && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm">
            <span className="material-symbols-outlined animate-spin text-[10px] text-primary">progress_activity</span>
          </span>
        )}
      </button>
    </>
  );
}

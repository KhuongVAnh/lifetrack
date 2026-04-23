const POSITION_KEY = "lifetrack.aiChat.position";
const COLLAPSED_KEY = "lifetrack.aiChat.collapsed";

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export const getStoredAiChatPosition = () => {
  if (typeof window === "undefined") return null;
  return safeJsonParse(window.localStorage.getItem(POSITION_KEY), null);
};

export const setStoredAiChatPosition = (value) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(POSITION_KEY, JSON.stringify(value));
};

export const getStoredAiChatCollapsed = () => {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(COLLAPSED_KEY);
  return raw == null ? true : raw === "true";
};

export const setStoredAiChatCollapsed = (value) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COLLAPSED_KEY, String(Boolean(value)));
};

import { getRoleLabel, normalizeRole } from "./auth";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeContact(contact) {
  if (!contact) {
    return null;
  }

  return {
    ...contact,
    user_id: toNumber(contact.user_id, contact.user_id),
    unread_count: toNumber(contact.unread_count),
    normalizedRole: normalizeRole(contact.role),
    roleLabel: getRoleLabel(contact.role),
    last_message: contact.last_message ?? null,
    last_message_at: contact.last_message_at ?? null,
  };
}

export function normalizeDirectMessage(message) {
  if (!message) {
    return null;
  }

  return {
    ...message,
    message_id: toNumber(message.message_id, message.message_id),
    sender_id: toNumber(message.sender_id, message.sender_id),
    receiver_id: toNumber(message.receiver_id, message.receiver_id),
    is_read: Boolean(message.is_read),
    message: String(message.message ?? ""),
    created_at: message.created_at ?? new Date().toISOString(),
  };
}

export function sortContactsByRecency(contacts) {
  return [...contacts].sort((left, right) => {
    const leftTime = left?.last_message_at ? new Date(left.last_message_at).getTime() : 0;
    const rightTime = right?.last_message_at ? new Date(right.last_message_at).getTime() : 0;
    return rightTime - leftTime;
  });
}

export function sortMessagesAscending(messages) {
  return [...messages].sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime();
    const rightTime = new Date(right.created_at).getTime();
    return leftTime - rightTime;
  });
}

export function upsertMessage(messages, nextMessage) {
  const normalizedMessage = normalizeDirectMessage(nextMessage);

  if (!normalizedMessage) {
    return messages;
  }

  const exists = messages.some((message) => message.message_id === normalizedMessage.message_id);
  if (exists) {
    return sortMessagesAscending(
      messages.map((message) =>
        message.message_id === normalizedMessage.message_id ? normalizedMessage : message,
      ),
    );
  }

  return sortMessagesAscending([...messages, normalizedMessage]);
}

export function formatMessageTime(dateValue) {
  if (!dateValue) {
    return "";
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatContactTime(dateValue) {
  if (!dateValue) {
    return "";
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const now = new Date();
  const isToday = parsed.toDateString() === now.toDateString();

  if (isToday) {
    return formatMessageTime(parsed.toISOString());
  }

  return parsed.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

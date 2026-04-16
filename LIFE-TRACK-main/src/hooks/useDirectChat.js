import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { getContacts, getDirectMessages, markDirectMessageRead, sendDirectMessage } from "../services/chatService";
import {
  formatContactTime,
  normalizeDirectMessage,
  sortContactsByRecency,
  upsertMessage,
} from "../utils/chat";

function updateContactSummary(contact, message, currentUserId, shouldIncrementUnread) {
  return {
    ...contact,
    last_message: message.message,
    last_message_at: message.created_at,
    unread_count: shouldIncrementUnread
      ? Number(contact.unread_count ?? 0) + 1
      : Number(contact.unread_count ?? 0),
  };
}

export function useDirectChat({ roleFilter, initialContactId = null } = {}) {
  const { user, socket } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeContactId, setActiveContactId] = useState(initialContactId);
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const userId = Number(user?.user_id);

  const filteredContacts = useMemo(
    () => contacts.filter((contact) => contact.normalizedRole === roleFilter),
    [contacts, roleFilter],
  );

  const activeContact = useMemo(
    () => filteredContacts.find((contact) => contact.user_id === Number(activeContactId)) ?? filteredContacts[0] ?? null,
    [activeContactId, filteredContacts],
  );

  const refreshContacts = useCallback(async () => {
    if (!userId) {
      setContacts([]);
      return [];
    }

    setLoadingContacts(true);
    try {
      const data = await getContacts();
      const nextContacts = data.contacts ?? [];
      setContacts(nextContacts);
      setError("");
      return nextContacts;
    } catch (nextError) {
      setError(nextError.response?.data?.message || "Không thể tải danh sách hội thoại");
      return [];
    } finally {
      setLoadingContacts(false);
    }
  }, [userId]);

  const markConversationRead = useCallback(async (otherUserId) => {
    if (!otherUserId) {
      return;
    }

    try {
      await markDirectMessageRead(otherUserId);
      setContacts((previousContacts) =>
        previousContacts.map((contact) =>
          contact.user_id === Number(otherUserId)
            ? { ...contact, unread_count: 0 }
            : contact,
        ),
      );
      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message.sender_id === Number(otherUserId) ? { ...message, is_read: true } : message,
        ),
      );
    } catch (nextError) {
      console.error(nextError);
    }
  }, []);

  const loadConversation = useCallback(async (otherUserId) => {
    if (!otherUserId) {
      setMessages([]);
      setNextCursor(null);
      return;
    }

    setLoadingConversation(true);
    try {
      const data = await getDirectMessages(otherUserId);
      setMessages(data.messages ?? []);
      setNextCursor(data.next_cursor ?? null);
      setError("");

      const hasUnreadIncoming = (data.messages ?? []).some(
        (message) => message.sender_id === Number(otherUserId) && !message.is_read,
      );

      if (hasUnreadIncoming) {
        void markConversationRead(otherUserId);
      } else {
        setContacts((previousContacts) =>
          previousContacts.map((contact) =>
            contact.user_id === Number(otherUserId)
              ? { ...contact, unread_count: 0 }
              : contact,
          ),
        );
      }
    } catch (nextError) {
      setError(nextError.response?.data?.message || "Không thể tải cuộc hội thoại");
      setMessages([]);
      setNextCursor(null);
    } finally {
      setLoadingConversation(false);
    }
  }, [markConversationRead]);

  const sendMessage = useCallback(async (content) => {
    const trimmedMessage = String(content ?? "").trim();
    if (!trimmedMessage || !activeContact?.user_id) {
      return false;
    }

    setSending(true);
    try {
      const data = await sendDirectMessage(activeContact.user_id, trimmedMessage);
      const sentMessage = data.data;
      setMessages((previousMessages) => upsertMessage(previousMessages, sentMessage));
      setContacts((previousContacts) =>
        sortContactsByRecency(
          previousContacts.map((contact) =>
            contact.user_id === activeContact.user_id
              ? {
                  ...contact,
                  last_message: sentMessage.message,
                  last_message_at: sentMessage.created_at,
                }
              : contact,
          ),
        ),
      );
      setError("");
      return true;
    } catch (nextError) {
      const nextMessage = nextError.response?.data?.message || "Không thể gửi tin nhắn";
      setError(nextMessage);
      toast.error(nextMessage);
      return false;
    } finally {
      setSending(false);
    }
  }, [activeContact]);

  useEffect(() => {
    void refreshContacts();
  }, [refreshContacts]);

  useEffect(() => {
    if (!filteredContacts.length) {
      setActiveContactId(null);
      return;
    }

    const preferredId = Number(initialContactId);
    const hasPreferredContact = filteredContacts.some((contact) => contact.user_id === preferredId);
    const hasCurrentContact = filteredContacts.some((contact) => contact.user_id === Number(activeContactId));

    if (hasPreferredContact) {
      setActiveContactId(preferredId);
      return;
    }

    if (!hasCurrentContact) {
      setActiveContactId(filteredContacts[0].user_id);
    }
  }, [activeContactId, filteredContacts, initialContactId]);

  useEffect(() => {
    if (!activeContact?.user_id) {
      setMessages([]);
      setNextCursor(null);
      return;
    }

    void loadConversation(activeContact.user_id);
  }, [activeContact?.user_id, loadConversation]);

  useEffect(() => {
    if (!socket || !userId) {
      return undefined;
    }

    const handleDirectMessage = async (incomingPayload) => {
      const incomingMessage = normalizeDirectMessage(incomingPayload);
      if (!incomingMessage) {
        return;
      }

      const otherUserId =
        incomingMessage.sender_id === userId ? incomingMessage.receiver_id : incomingMessage.sender_id;
      const isIncoming = incomingMessage.receiver_id === userId;
      const isActiveConversation = Number(activeContact?.user_id) === otherUserId;

      setContacts((previousContacts) => {
        const hasExistingContact = previousContacts.some((contact) => contact.user_id === otherUserId);

        if (!hasExistingContact) {
          void refreshContacts();
          return previousContacts;
        }

        return sortContactsByRecency(
          previousContacts.map((contact) => {
            if (contact.user_id !== otherUserId) {
              return contact;
            }

            return updateContactSummary(contact, incomingMessage, userId, isIncoming && !isActiveConversation);
          }),
        );
      });

      if (isActiveConversation) {
        setMessages((previousMessages) => upsertMessage(previousMessages, incomingMessage));
        if (isIncoming) {
          await markConversationRead(otherUserId);
        }
      }
    };

    const handleNotification = (notification) => {
      if (notification?.type !== "DIRECT_MESSAGE") {
        return;
      }

      const receiverId = Number(notification?.payload?.receiver_id);
      if (receiverId !== userId) {
        return;
      }

      const senderId = Number(notification?.payload?.sender_id);
      if (senderId && senderId !== Number(activeContact?.user_id)) {
        toast.info(notification.message || "Bạn có tin nhắn mới");
      }
    };

    socket.on("direct-message:new", handleDirectMessage);
    socket.on("notification:new", handleNotification);

    return () => {
      socket.off("direct-message:new", handleDirectMessage);
      socket.off("notification:new", handleNotification);
    };
  }, [activeContact?.user_id, markConversationRead, refreshContacts, socket, userId]);

  return {
    contacts: filteredContacts,
    activeContact,
    activeContactId: activeContact?.user_id ?? null,
    setActiveContactId,
    messages,
    nextCursor,
    loadingContacts,
    loadingConversation,
    sending,
    error,
    sendMessage,
    refreshContacts,
    formatContactTime,
  };
}

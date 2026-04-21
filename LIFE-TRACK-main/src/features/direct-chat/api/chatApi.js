import { httpClient } from "@/shared/api";
import {
  normalizeContact,
  normalizeDirectMessage,
  sortContactsByRecency,
  sortMessagesAscending,
} from "@/features/direct-chat/lib/chat";

export const getContacts = async () => {
    const { data } = await httpClient.get("/chat/contacts");
    return {
        ...data,
        contacts: sortContactsByRecency((data.contacts ?? []).map(normalizeContact).filter(Boolean)),
    };
};

export const getDirectMessages = async (otherUserId, cursor = null, limit = 50) => {
    const params = { limit };
    if (cursor) {
        params.cursor = cursor;
    }
    const { data } = await httpClient.get(`/chat/direct/${otherUserId}`, { params });
    return {
        ...data,
        contact: normalizeContact(data.contact),
        messages: sortMessagesAscending((data.messages ?? []).map(normalizeDirectMessage).filter(Boolean)),
    };
};

export const sendDirectMessage = async (receiverId, message) => {
    const { data } = await httpClient.post("/chat/direct", {
        receiver_id: receiverId,
        message
    });
    return {
        ...data,
        data: normalizeDirectMessage(data.data),
    };
};

export const markDirectMessageRead = async (otherUserId) => {
    const { data } = await httpClient.put(`/chat/direct/${otherUserId}/read`);
    return data;
};

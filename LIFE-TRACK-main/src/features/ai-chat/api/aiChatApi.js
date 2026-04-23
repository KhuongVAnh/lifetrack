import { httpClient } from "@/shared/api";

export const sendAiMessage = async (message) => {
  const { data } = await httpClient.post("/chat", { message });
  return data;
};

export const getAiChatHistory = async () => {
  const { data } = await httpClient.get("/chat/history");
  return {
    ...data,
    history: Array.isArray(data.history)
      ? [...data.history].sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp))
      : [],
  };
};

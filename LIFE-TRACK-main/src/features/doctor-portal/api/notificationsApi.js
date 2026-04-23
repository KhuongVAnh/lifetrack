import { httpClient } from "@/shared/api";
import { mapDoctorPortalNotification } from "../lib/doctorPortal";

export const getDoctorNotifications = async ({ limit = 6, isRead } = {}) => {
  const params = { limit };
  if (typeof isRead === "boolean") {
    params.is_read = String(isRead);
  }

  const { data } = await httpClient.get("/notifications", { params });
  return (data.notifications ?? []).map(mapDoctorPortalNotification).filter(Boolean);
};

export const getDoctorUnreadNotificationCount = async () => {
  const { data } = await httpClient.get("/notifications/unread-count");
  return Number(data.unread_count || 0);
};

export const markDoctorNotificationRead = async (notificationId) => {
  const { data } = await httpClient.put(`/notifications/${notificationId}/read`);
  return data;
};

export const markAllDoctorNotificationsRead = async () => {
  const { data } = await httpClient.put("/notifications/read-all");
  return data;
};

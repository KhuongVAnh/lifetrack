export function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapDoctorPortalPatientSummary(item) {
  if (!item) return null;

  return {
    ...item,
    hireId: toFiniteNumber(item.hire_id, null),
    patientId: toFiniteNumber(item.patient_id ?? item.patient?.user_id, null),
    patient: item.patient
      ? {
          ...item.patient,
          user_id: toFiniteNumber(item.patient.user_id, item.patient.user_id),
        }
      : null,
    canViewEhr: Boolean(item.can_view_ehr),
    canViewMedications: Boolean(item.can_view_medications),
    canViewEcg: Boolean(item.can_view_ecg),
    unreadCount: toFiniteNumber(item.unread_count),
    lastMessage: item.last_message || "",
    lastMessageAt: item.last_message_at || null,
    latestReadingAt: item.latest_reading_at || null,
    latestUnresolvedAlertCount: toFiniteNumber(item.latest_unresolved_alert_count),
  };
}

export function mapDoctorPortalNotification(item) {
  if (!item) return null;

  return {
    ...item,
    notificationId: toFiniteNumber(item.notification_id, item.notification_id),
    entityId: toFiniteNumber(item.entity_id, item.entity_id),
    createdAt: item.created_at || null,
    isRead: Boolean(item.is_read),
    readAt: item.read_at || null,
  };
}

export function mapDoctorPortalDashboardResponse(payload) {
  return {
    summary: {
      activePatientCount: toFiniteNumber(payload?.summary?.active_patient_count),
      ecgAccessPatientCount: toFiniteNumber(payload?.summary?.ecg_access_patient_count),
      todayAppointmentCount: toFiniteNumber(payload?.summary?.today_appointment_count),
      unreadNotificationCount: toFiniteNumber(payload?.summary?.unread_notification_count),
    },
    pendingHireRequests: payload?.pending_hire_requests ?? [],
    urgentAlerts: payload?.urgent_alerts ?? [],
    upcomingAppointments: payload?.upcoming_appointments ?? [],
    recentNotifications: (payload?.recent_notifications ?? []).map(mapDoctorPortalNotification).filter(Boolean),
    activePatientIds: Array.isArray(payload?.active_patient_ids) ? payload.active_patient_ids.map((item) => toFiniteNumber(item, item)).filter(Boolean) : [],
  };
}

export function mapDoctorPortalEmrWorkspace(payload) {
  return {
    patient: payload?.patient || null,
    overview: payload?.overview || null,
    histories: payload?.histories ?? [],
    documents: payload?.documents ?? [],
    medicationPlans: payload?.medication_plans ?? [],
  };
}

export function resolveDoctorNotificationLink(notification) {
  const payload = notification?.payload || {};

  if (notification?.entity_type === "appointment" || notification?.type === "APPOINTMENT_UPDATE") {
    return "/doctor/appointments";
  }

  if (notification?.entity_type === "alert" || notification?.type === "ALERT") {
    const patientId = toFiniteNumber(payload.user_id, null);
    return patientId ? `/doctor/live?patientId=${patientId}` : "/doctor/live";
  }

  if (notification?.type === "DIRECT_MESSAGE") {
    const patientId = toFiniteNumber(payload.sender_id, null);
    return patientId ? `/doctor/messages?patientId=${patientId}` : "/doctor/messages";
  }

  return "/doctor/dashboard";
}

export function getDoctorNotificationIcon(notification) {
  switch (notification?.type) {
    case "ALERT":
      return "warning";
    case "APPOINTMENT_UPDATE":
      return "event_available";
    case "DIRECT_MESSAGE":
      return "chat";
    case "ACCESS_RESPONSE":
      return "how_to_reg";
    default:
      return "notifications";
  }
}

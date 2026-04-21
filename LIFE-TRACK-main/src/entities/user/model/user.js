const DEFAULT_AVATAR = "/assets/avatars/default/avatar-default.png";

const ROLE_ALIAS_MAP = {
  patient: "patient",
  "benh nhan": "patient",
  "bệnh nhân": "patient",
  BENH_NHAN: "patient",
  PATIENT: "patient",
  doctor: "doctor",
  "bac si": "doctor",
  "bác sĩ": "doctor",
  BAC_SI: "doctor",
  DOCTOR: "doctor",
  family: "family",
  "gia dinh": "family",
  "gia đình": "family",
  GIA_DINH: "family",
  FAMILY: "family",
  admin: "admin",
  ADMIN: "admin",
};

function normalizeRoleKey(role) {
  return String(role ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizeRole(role) {
  if (!role) {
    return null;
  }

  const normalizedKey = normalizeRoleKey(role);
  return ROLE_ALIAS_MAP[role] ?? ROLE_ALIAS_MAP[normalizedKey] ?? normalizedKey ?? null;
}

export function getRoleLabel(role) {
  switch (normalizeRole(role)) {
    case "doctor":
      return "Bác sĩ";
    case "patient":
      return "Bệnh nhân";
    case "family":
      return "Gia đình";
    case "admin":
      return "Quản trị viên";
    default:
      return String(role ?? "Người dùng");
  }
}

export function getRoleSubtitle(role) {
  switch (normalizeRole(role)) {
    case "doctor":
      return "Tài khoản bác sĩ";
    case "patient":
      return "Tài khoản bệnh nhân";
    case "family":
      return "Tài khoản gia đình";
    case "admin":
      return "Tài khoản quản trị";
    default:
      return "Tài khoản LifeTrack";
  }
}

export function isDoctorRole(role) {
  return normalizeRole(role) === "doctor";
}

export function isPatientRole(role) {
  return normalizeRole(role) === "patient";
}

export function canAccessPatientPortal(role) {
  return ["patient", "family", "admin"].includes(normalizeRole(role));
}

export function getHomePathForRole(role) {
  return isDoctorRole(role) ? "/doctor/dashboard" : "/patient/dashboard";
}

export function getUserAvatar(user, fallback = DEFAULT_AVATAR) {
  return (
    user?.avatar ||
    user?.avatar_url ||
    user?.photo_url ||
    user?.profile_picture ||
    fallback
  );
}

export function getUserDisplayName(user, fallback = "LifeTrack") {
  return user?.name || user?.full_name || user?.email || fallback;
}

export function normalizeUser(user) {
  if (!user) {
    return null;
  }

  const normalizedRole = normalizeRole(user.role);
  const rawUserId = user.user_id ?? user.id ?? 0;
  const numericUserId = Number(rawUserId);

  return {
    ...user,
    user_id: Number.isFinite(numericUserId) && numericUserId !== 0 ? numericUserId : rawUserId,
    normalizedRole,
    roleLabel: getRoleLabel(user.role),
    subtitle: getRoleSubtitle(user.role),
    avatar: getUserAvatar(user),
  };
}

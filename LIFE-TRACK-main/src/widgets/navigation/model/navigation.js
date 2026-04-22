export const primaryNav = [
  { to: "/patient/dashboard", label: "Trang chủ", icon: "home_health", activePrefixes: ["/patient/dashboard"] },
  {
    to: "/patient/health-records",
    label: "Theo dõi trực tiếp",
    icon: "medical_services",
    activePrefixes: ["/patient/health-records"],
  },
  {
    to: "/patient/phr",
    label: "Hồ sơ sức khỏe",
    icon: "assignment",
    activePrefixes: ["/patient/phr"],
  },
  { to: "/patient/appointments", label: "Lịch hẹn", icon: "event", activePrefixes: ["/patient/appointments"] },
  { to: "/patient/medications", label: "Nhắc thuốc", icon: "medication", activePrefixes: ["/patient/medications"] },
  { to: "/patient/doctors/my", label: "Bác sĩ của tôi", icon: "badge", activePrefixes: ["/patient/doctors/my", "/patient/doctors/hire"] },
  { to: "/patient/doctors/chat", label: "Chat với bác sĩ", icon: "forum", activePrefixes: ["/patient/doctors/chat"] },
  {
    to: "/patient/community/knowledge",
    label: "Cộng đồng",
    icon: "groups",
    activePrefixes: ["/patient/community"],
  },
  { to: "/patient/settings", label: "Cài đặt", icon: "settings", activePrefixes: ["/patient/settings"] },
];

export const communityTabs = [
  { to: "/patient/community/knowledge", label: "Kiến thức y tế" },
  { to: "/patient/community/questions", label: "Hỏi đáp Q&A" },
];

export const doctorTabs = [
  { to: "/patient/doctors/my", label: "Bác sĩ của tôi" },
  { to: "/patient/doctors/hire", label: "Thuê bác sĩ" },
];

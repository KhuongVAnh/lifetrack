export const primaryNav = [
  { to: "/patient/dashboard", label: "Trang chủ", icon: "home_health", activePrefixes: ["/patient/dashboard"] },
  {
    to: "/patient/health-records",
    label: "Hồ sơ sức khỏe",
    icon: "medical_services",
    activePrefixes: ["/patient/health-records"],
  },
  { to: "/patient/appointments", label: "Lịch hẹn", icon: "event", activePrefixes: ["/patient/appointments"] },
  {
    to: "/patient/community/knowledge",
    label: "Cộng đồng",
    icon: "groups",
    activePrefixes: ["/patient/community"],
  },
  { to: "/patient/doctors/my", label: "Bác sĩ", icon: "badge", activePrefixes: ["/patient/doctors"] },
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

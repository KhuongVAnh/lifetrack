import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserAvatar, getUserDisplayName } from "@/entities/user";
import { useAuth } from "@/features/auth";
import {
  getDoctorNotificationIcon,
  getDoctorNotifications,
  getDoctorUnreadNotificationCount,
  markAllDoctorNotificationsRead,
  markDoctorNotificationRead,
  resolveDoctorNotificationLink,
} from "@/features/doctor-portal";
import { ImageWithFallback } from "@/shared/ui";

function formatNotificationTime(value) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const now = new Date();
  const isToday = parsed.toDateString() === now.toDateString();

  if (isToday) {
    return parsed.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }

  return parsed.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function DoctorHeader({ onMenuClick }) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout, socket } = useAuth();
  const navigate = useNavigate();
  const displayName = getUserDisplayName(user, "Bác sĩ LifeTrack");
  const avatar = getUserAvatar(user);
  const secondaryLabel = user?.email || user?.roleLabel || "Cổng bác sĩ";

  const loadUnreadCount = async () => {
    try {
      const count = await getDoctorUnreadNotificationCount();
      setUnreadCount(count);
    } catch (_error) {
      setUnreadCount(0);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const data = await getDoctorNotifications({ limit: 6 });
      setNotifications(data);
    } catch (_error) {
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    void loadUnreadCount();
  }, []);

  useEffect(() => {
    if (isNotifOpen) {
      void loadNotifications();
    }
  }, [isNotifOpen]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const refreshNotifications = () => {
      void loadUnreadCount();
      if (isNotifOpen) {
        void loadNotifications();
      }
    };

    socket.on("notification:new", refreshNotifications);

    return () => {
      socket.off("notification:new", refreshNotifications);
    };
  }, [isNotifOpen, socket]);

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllDoctorNotificationsRead();
      setUnreadCount(0);
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (_error) {
      // Không chặn UI nếu mark-all thất bại.
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification?.isRead) {
        await markDoctorNotificationRead(notification.notificationId);
        setUnreadCount((current) => Math.max(0, current - 1));
        setNotifications((current) =>
          current.map((item) =>
            item.notificationId === notification.notificationId ? { ...item, isRead: true } : item,
          ),
        );
      }
    } catch (_error) {
      // Vẫn cho phép điều hướng dù thao tác đánh dấu đã đọc lỗi.
    } finally {
      setIsNotifOpen(false);
      navigate(resolveDoctorNotificationLink(notification));
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 glass-header bg-white/80 z-40 flex items-center justify-between px-4 md:px-8 text-on-surface">
      <div className="flex items-center gap-3 flex-1">
        {/* Hamburger — mobile only */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={onMenuClick}
          aria-label="Mở menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Logo — mobile only */}
        <span className="text-lg font-black text-primary md:hidden">LIFETRACK</span>

        {/* Search — desktop only */}
        <div className="relative hidden md:block w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 outline-none transition-shadow"
            placeholder="Tìm kiếm bệnh nhân, hồ sơ..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 relative">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }}
            className="relative text-slate-600 hover:text-primary transition-colors p-1"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 ? (
              <span className="absolute -right-2 -top-1 min-w-5 rounded-full bg-error px-1.5 py-0.5 text-[10px] font-black text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>
          {isNotifOpen && (
            <div className="absolute right-0 top-10 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-50 animate-fade-in text-sm">
              <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                <h3 className="font-bold text-primary">Thông báo mới</h3>
                <button
                  className="text-[10px] font-bold text-slate-400 hover:text-primary"
                  onClick={handleMarkAllNotificationsRead}
                  type="button"
                >
                  Đánh dấu đã đọc
                </button>
              </div>
              <div className="space-y-3">
                {loadingNotifications ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
                    Đang tải thông báo...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
                    Bạn chưa có thông báo mới.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.notificationId}
                      className={`w-full rounded-xl border p-3 text-left text-xs transition-colors ${notification.isRead ? "border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100" : "border-sky-100 bg-sky-50/60 text-slate-700 hover:bg-sky-50"}`}
                      onClick={() => void handleNotificationClick(notification)}
                      type="button"
                    >
                      <div className="flex gap-3 items-start">
                        <span className={`material-symbols-outlined text-base ${notification.type === "ALERT" ? "text-error" : "text-primary"}`}>
                          {getDoctorNotificationIcon(notification)}
                        </span>
                        <span className="block min-w-0 flex-1">
                          <span className="block font-semibold text-slate-800">{notification.title}</span>
                          <span className="mt-1 block leading-5">{notification.message}</span>
                          <b className="mt-1 block text-[10px] opacity-80 text-slate-400">{formatNotificationTime(notification.createdAt)}</b>
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings — desktop only */}
        <button
          onClick={() => window.alert("Đang mở trang cài đặt hệ thống (Tính năng nháp)")}
          className="hidden md:flex text-slate-600 hover:text-primary transition-colors p-1"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>

        {/* Profile */}
        <div
          className="relative flex items-center gap-2 md:gap-3 md:pl-4 md:border-l md:border-slate-200 cursor-pointer group"
          onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }}
        >
          <div className="hidden text-right md:block">
            <p className="text-sm font-bold text-primary leading-none group-hover:text-[#0070a8] transition-colors">{displayName}</p>
            <p className="text-[11px] text-slate-500 font-medium tracking-wide mt-1">{secondaryLabel}</p>
          </div>
          <ImageWithFallback
            alt={displayName}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all hover:scale-105"
            src={avatar}
          />

          {isProfileOpen && (
            <div className="absolute right-0 top-14 w-52 md:w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 flex flex-col">
                <span className="font-bold text-sm text-slate-800">{displayName}</span>
                <span className="text-[10px] font-medium text-slate-400">{user?.email || "doctor@lifetrack.vn"}</span>
              </div>
              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate("/doctor/profile");
                }}
                className="px-4 py-2 mt-2 text-left text-sm text-slate-600 hover:bg-slate-50 font-medium flex gap-3 items-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">person</span> Hồ sơ của tôi
              </button>
              <button onClick={() => window.alert("Mở Cài đặt tài khoản...")} className="px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 font-medium flex gap-3 items-center transition-colors">
                <span className="material-symbols-outlined text-[20px]">manage_accounts</span> Quản lý tài khoản
              </button>
              <div className="h-px bg-slate-100 my-2"></div>
              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  void logout(true, true);
                }}
                className="px-4 py-2 mb-1 text-left text-sm text-error hover:bg-error/10 font-bold flex gap-3 items-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

import { useState } from "react";
import { notificationPreferences, settingsProfile } from "../data/mockData";

export function SettingsPage() {
  const [prefs, setPrefs] = useState(notificationPreferences);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-10">
        <h1 className="mb-2 text-3xl font-bold text-primary">Cài đặt hệ thống</h1>
        <p className="text-on-surface-variant">Quản lý tài khoản, thông báo và bảo mật của bạn.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-xl bg-surface-container-low p-2">
            {["Tài khoản", "Thông báo", "Thanh toán", "Hỗ trợ & Bảo mật"].map((item, index) => (
              <button
                key={item}
                className={[
                  "flex w-full items-center gap-4 rounded-lg p-4 text-left transition-colors",
                  index === 0 ? "bg-white font-bold text-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container",
                ].join(" ")}
                type="button"
              >
                <span className="material-symbols-outlined">
                  {index === 0 ? "person" : index === 1 ? "notifications_active" : index === 2 ? "payments" : "security"}
                </span>
                <span>{item}</span>
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-error-container/30 p-6">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-error">Khu vực nguy hiểm</h4>
            <button className="flex items-center gap-3 font-semibold text-error hover:underline" type="button">
              <span className="material-symbols-outlined">logout</span>
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>
        </div>

        <div className="space-y-8 lg:col-span-8">
          <section className="rounded-xl bg-surface-container-lowest p-8 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">Thông tin cá nhân</h2>
              <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-bold text-primary">Sửa hồ sơ</span>
            </div>
            <form className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-on-surface-variant">Họ và tên</label>
                <input className="w-full rounded-lg border-none bg-surface-container-high p-4" defaultValue={settingsProfile.fullName} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-on-surface-variant">Số điện thoại</label>
                <input className="w-full rounded-lg border-none bg-surface-container-high p-4" defaultValue={settingsProfile.phone} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-on-surface-variant">Email</label>
                <input className="w-full rounded-lg border-none bg-surface-container-high p-4" defaultValue={settingsProfile.email} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-on-surface-variant">Địa chỉ liên lạc</label>
                <input className="w-full rounded-lg border-none bg-surface-container-high p-4" defaultValue={settingsProfile.address} />
              </div>
            </form>
          </section>

          <section className="rounded-xl bg-surface-container-lowest p-8 shadow-sm">
            <h2 className="mb-6 text-xl font-bold text-on-surface">Tùy chọn thông báo</h2>
            <div className="space-y-6">
              {prefs.map((pref) => (
                <div key={pref.id} className="flex items-center justify-between gap-6">
                  <div>
                    <p className="font-bold text-on-surface">{pref.title}</p>
                    <p className="text-sm text-on-surface-variant">{pref.description}</p>
                  </div>
                  <button
                    className={[
                      "relative h-7 w-14 rounded-full transition-colors",
                      pref.enabled ? "bg-secondary" : "bg-slate-200",
                    ].join(" ")}
                    onClick={() =>
                      setPrefs((current) =>
                        current.map((item) => (item.id === pref.id ? { ...item, enabled: !item.enabled } : item)),
                      )
                    }
                    type="button"
                  >
                    <span
                      className={[
                        "absolute top-1 h-5 w-5 rounded-full bg-white transition-all",
                        pref.enabled ? "left-8" : "left-1",
                      ].join(" ")}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-surface-container-lowest p-8 shadow-sm">
            <h2 className="mb-6 text-xl font-bold text-on-surface">Thanh toán & gói sử dụng</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-primary-container p-5 text-white">
                <p className="text-sm font-medium opacity-90">Gói hiện tại</p>
                <h3 className="mt-2 text-2xl font-extrabold">Cá nhân</h3>
                <p className="mt-2 text-sm opacity-90">Gia hạn vào ngày 25/04/2026 • hỗ trợ 24/7 qua chat</p>
              </div>
              <div className="rounded-2xl bg-surface-container-low p-5">
                <p className="text-sm font-medium text-on-surface-variant">Phương thức thanh toán</p>
                <h3 className="mt-2 text-xl font-bold text-on-surface">Visa •••• 2026</h3>
                <p className="mt-2 text-sm text-on-surface-variant">Cập nhật thẻ hoặc chuyển sang gói Gia đình bất cứ lúc nào.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

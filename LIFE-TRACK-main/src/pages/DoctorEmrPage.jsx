import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { useAuth } from "../contexts/AuthContext";
import { layKhongGianKhamBenh, luuHoSoKhamEmr } from "../services/emrService";
import { getContacts } from "../services/chatService";

const yLenhMau = [
  "Điện tâm đồ 12 chuyển đạo",
  "Xét nghiệm công thức máu",
  "Sinh hóa máu cơ bản",
  "Amlodipine 5mg - 30 viên",
  "Hẹn tái khám sau 4 tuần",
];

function KhungPhan({ icon, tieuDe, moTa, children, hanhDongPhai }) {
  return (
    <section className="rounded-[1.75rem] bg-surface-container-lowest p-6 shadow-soft md:p-8">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-on-surface">
            <span className="material-symbols-outlined text-primary">{icon}</span>
            {tieuDe}
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">{moTa}</p>
        </div>
        {hanhDongPhai}
      </div>
      {children}
    </section>
  );
}

export function DoctorEmrPage() {
  const { user } = useAuth();
  const [dangTaiBenhNhan, setDangTaiBenhNhan] = useState(true);
  const [dangTaiWorkspace, setDangTaiWorkspace] = useState(false);
  const [dangLuuHoSo, setDangLuuHoSo] = useState(false);
  const [danhSachBenhNhan, setDanhSachBenhNhan] = useState([]);
  const [benhNhanDangChon, setBenhNhanDangChon] = useState(null);
  const [workspace, setWorkspace] = useState(null);

  const [ghiChuLamSang, setGhiChuLamSang] = useState("");
  const [chanDoan, setChanDoan] = useState("");
  const [thuocKeDon, setThuocKeDon] = useState("");
  const [tinhTrang, setTinhTrang] = useState("");
  const [yLenhDaChon, setYLenhDaChon] = useState([]);

  const taiDanhSachBenhNhan = async () => {
    setDangTaiBenhNhan(true);
    try {
      const data = await getContacts();
      const ds = (data.contacts || []).filter((item) => item.normalizedRole === "patient");
      setDanhSachBenhNhan(ds);
      if (ds.length) {
        setBenhNhanDangChon((cu) => cu || ds[0].user_id);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải danh sách bệnh nhân");
    } finally {
      setDangTaiBenhNhan(false);
    }
  };

  const taiWorkspace = async (patientId) => {
    if (!patientId) return;

    setDangTaiWorkspace(true);
    try {
      const data = await layKhongGianKhamBenh(patientId);
      const ws = data?.data || null;
      setWorkspace(ws);

      const banGhiGanNhat = ws?.histories?.[0];
      setGhiChuLamSang((banGhiGanNhat?.notes || "").replace("[SOAP]", "").replace("[CPOE]", "").trim());
      setChanDoan(banGhiGanNhat?.doctor_diagnosis || "");
      setThuocKeDon(banGhiGanNhat?.medication || "");
      setTinhTrang(banGhiGanNhat?.condition || "");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải Consultation Workspace");
      setWorkspace(null);
    } finally {
      setDangTaiWorkspace(false);
    }
  };

  useEffect(() => {
    void taiDanhSachBenhNhan();
  }, []);

  useEffect(() => {
    if (benhNhanDangChon) {
      void taiWorkspace(benhNhanDangChon);
    }
  }, [benhNhanDangChon]);

  const thongTinBenhNhan = useMemo(() => workspace?.patient || null, [workspace]);

  const chuyenTrangThaiYLenh = (tenYLenh) => {
    setYLenhDaChon((cu) => (cu.includes(tenYLenh) ? cu.filter((x) => x !== tenYLenh) : [...cu, tenYLenh]));
  };

  const luuHoSoKham = async () => {
    if (!benhNhanDangChon) {
      toast.warn("Vui lòng chọn bệnh nhân trước khi lưu hồ sơ");
      return;
    }

    setDangLuuHoSo(true);
    try {
      await luuHoSoKhamEmr({
        patient_id: benhNhanDangChon,
        ghi_chu_lam_sang: ghiChuLamSang,
        chan_doan: chanDoan,
        thuoc_ke_don: thuocKeDon,
        tinh_trang: tinhTrang,
        y_lenh: yLenhDaChon,
      });

      toast.success("Đã lưu hồ sơ khám EMR");
      await taiWorkspace(benhNhanDangChon);
    } catch (error) {
      toast.error(error.response?.data?.message || "Lưu hồ sơ khám thất bại");
    } finally {
      setDangLuuHoSo(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-[2rem] bg-primary-container p-6 text-white shadow-soft md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-fixed-dim">Cổng bác sĩ</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">Bệnh án điện tử (EMR)</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-white/90 md:text-base">
              Không gian khám bệnh tập trung để xem hồ sơ bệnh nhân, ghi chú lâm sàng (SOAP) và chỉ định y lệnh (CPOE).
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 text-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-primary-fixed-dim">Bác sĩ đăng nhập</p>
            <p className="mt-1 font-bold">{user?.name || "Bác sĩ"}</p>
            <p className="text-white/85">{user?.email || "Tài khoản hệ thống"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-surface-variant bg-surface-container-lowest p-4">
        <label className="text-sm font-semibold text-on-surface" htmlFor="chon-benh-nhan">Bệnh nhân đang khám</label>
        <select
          id="chon-benh-nhan"
          className="mt-2 w-full rounded-xl border border-surface-variant bg-white px-4 py-3 text-sm md:max-w-md"
          disabled={dangTaiBenhNhan}
          onChange={(event) => setBenhNhanDangChon(Number(event.target.value))}
          value={benhNhanDangChon || ""}
        >
          {!danhSachBenhNhan.length && <option value="">Không có bệnh nhân khả dụng</option>}
          {danhSachBenhNhan.map((bn) => (
            <option key={bn.user_id} value={bn.user_id}>{bn.name} - {bn.email}</option>
          ))}
        </select>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
        <div className="space-y-6">
          <KhungPhan
            icon="clinical_notes"
            tieuDe="Ghi chú lâm sàng (Clinical / SOAP Notes)"
            moTa="Ghi nhận diễn biến khám bệnh, đánh giá và kế hoạch xử trí của bác sĩ."
            hanhDongPhai={
              <button
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={dangLuuHoSo}
                onClick={() => void luuHoSoKham()}
                type="button"
              >
                {dangLuuHoSo ? "Đang lưu..." : "Lưu hồ sơ"}
              </button>
            }
          >
            <textarea
              className="min-h-56 w-full rounded-2xl border border-surface-variant bg-white p-4 text-sm leading-7"
              onChange={(event) => setGhiChuLamSang(event.target.value)}
              placeholder="Ví dụ: S/O/A/P..."
              value={ghiChuLamSang}
            />

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-on-surface">Chẩn đoán</span>
                <input
                  className="w-full rounded-xl border border-surface-variant bg-white px-4 py-3 text-sm"
                  onChange={(event) => setChanDoan(event.target.value)}
                  value={chanDoan}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-on-surface">Tình trạng</span>
                <input
                  className="w-full rounded-xl border border-surface-variant bg-white px-4 py-3 text-sm"
                  onChange={(event) => setTinhTrang(event.target.value)}
                  value={tinhTrang}
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-on-surface">Thuốc kê đơn</span>
                <textarea
                  className="min-h-20 w-full rounded-xl border border-surface-variant bg-white px-4 py-3 text-sm"
                  onChange={(event) => setThuocKeDon(event.target.value)}
                  value={thuocKeDon}
                />
              </label>
            </div>
          </KhungPhan>

          <KhungPhan
            icon="medication"
            tieuDe="Chỉ định và kê đơn (CPOE)"
            moTa="Chọn y lệnh xét nghiệm, cận lâm sàng và điều trị cho bệnh nhân."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {yLenhMau.map((yLenh) => {
                const daChon = yLenhDaChon.includes(yLenh);
                return (
                  <button
                    key={yLenh}
                    className={[
                      "rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors",
                      daChon
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-surface-variant bg-white text-on-surface-variant hover:border-primary/40",
                    ].join(" ")}
                    onClick={() => chuyenTrangThaiYLenh(yLenh)}
                    type="button"
                  >
                    {yLenh}
                  </button>
                );
              })}
            </div>
          </KhungPhan>
        </div>

        <div className="space-y-6">
          <KhungPhan
            icon="folder_shared"
            tieuDe="Hồ sơ bệnh nhân / Lịch sử khám"
            moTa="Xem lại bệnh sử, tài liệu OCR và dữ liệu cũ để đối chiếu trước khi kết luận."
          >
            {thongTinBenhNhan ? (
              <div className="rounded-2xl bg-surface-container-low p-4">
                <div className="flex items-center gap-3">
                  <ImageWithFallback
                    alt={thongTinBenhNhan.name}
                    className="h-12 w-12 rounded-xl object-cover"
                    src={thongTinBenhNhan.avatar || "/assets/avatars/default/avatar-default.png"}
                  />
                  <div>
                    <p className="font-bold text-on-surface">{thongTinBenhNhan.name}</p>
                    <p className="text-xs text-on-surface-variant">{thongTinBenhNhan.email}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                Chọn bệnh nhân để xem hồ sơ.
              </div>
            )}

            <div className="mt-4 space-y-3">
              {(workspace?.histories || []).map((muc) => (
                <article key={muc.history_id} className="rounded-xl border border-surface-variant bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-on-surface">{muc.doctor_diagnosis || "Bản ghi khám"}</p>
                    <span className="text-xs text-outline">{new Date(muc.created_at).toLocaleString("vi-VN")}</span>
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">{muc.notes || muc.condition || "Không có mô tả"}</p>
                </article>
              ))}

              {(workspace?.documents || []).map((taiLieu) => (
                <article key={taiLieu.document_id} className="rounded-xl border border-surface-variant bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-on-surface">{taiLieu.title}</p>
                    <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container">OCR</span>
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">{taiLieu.summary?.tom_tat || "Đã OCR tài liệu"}</p>
                </article>
              ))}

              {!dangTaiWorkspace && !(workspace?.histories || []).length && !(workspace?.documents || []).length && (
                <div className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                  Chưa có dữ liệu hồ sơ cho bệnh nhân này.
                </div>
              )}
            </div>
          </KhungPhan>
        </div>
      </div>

      {(dangTaiBenhNhan || dangTaiWorkspace) && (
        <div className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
          Đang tải dữ liệu EMR...
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  layDanhSachTaiLieuYTe,
  layKhaiBaoGanNhat,
  layLichSuPhr,
  luuKhaiBaoTruocKham,
  taiLenTaiLieuYTe,
} from "../services/phrService";

const duLieuKhaiBaoRong = {
  trieu_chung_chinh: "",
  thoi_gian_trieu_chung: "",
  di_ung: "",
  tien_su: "",
  thuoc_dang_dung: "",
  ghi_chu: "",
};

function TieuDePhan({ icon, tieuDe, moTa }) {
  return (
    <div className="mb-5">
      <h2 className="flex items-center gap-2 text-xl font-bold text-on-surface">
        <span className="material-symbols-outlined text-primary">{icon}</span>
        {tieuDe}
      </h2>
      <p className="mt-1 text-sm text-on-surface-variant">{moTa}</p>
    </div>
  );
}

export function PatientPhrPage() {
  const [tabDangXem, setTabDangXem] = useState("khai-bao");
  const [dangTai, setDangTai] = useState(true);
  const [dangLuuKhaiBao, setDangLuuKhaiBao] = useState(false);
  const [dangTaiTep, setDangTaiTep] = useState(false);
  const [tepDangChon, setTepDangChon] = useState(null);
  const [tieuDeTep, setTieuDeTep] = useState("");

  const [khaiBao, setKhaiBao] = useState(duLieuKhaiBaoRong);
  const [danhSachTaiLieu, setDanhSachTaiLieu] = useState([]);
  const [danhSachLichSu, setDanhSachLichSu] = useState([]);

  const taiDuLieuPhr = async () => {
    setDangTai(true);
    try {
      const [khaiBaoGanNhat, taiLieuYTe, lichSuPhr] = await Promise.all([
        layKhaiBaoGanNhat(),
        layDanhSachTaiLieuYTe(),
        layLichSuPhr(),
      ]);

      const banGhiKhaiBao = khaiBaoGanNhat?.data;
      if (banGhiKhaiBao) {
        setKhaiBao((giaTriCu) => ({
          ...giaTriCu,
          trieu_chung_chinh: banGhiKhaiBao.symptoms || "",
          tien_su: banGhiKhaiBao.condition || "",
          thuoc_dang_dung: banGhiKhaiBao.medication || "",
          ghi_chu: (banGhiKhaiBao.notes || "").replace("[INTAKE]", "").trim(),
        }));
      }

      setDanhSachTaiLieu(Array.isArray(taiLieuYTe?.data) ? taiLieuYTe.data : []);
      setDanhSachLichSu(Array.isArray(lichSuPhr?.data) ? lichSuPhr.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải dữ liệu PHR");
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    void taiDuLieuPhr();
  }, []);

  const tomTatOcrMoiNhat = useMemo(() => danhSachTaiLieu[0]?.summary || null, [danhSachTaiLieu]);

  const luuKhaiBao = async () => {
    setDangLuuKhaiBao(true);
    try {
      await luuKhaiBaoTruocKham(khaiBao);
      toast.success("Đã lưu khai báo trước khám");
      await taiDuLieuPhr();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lưu khai báo thất bại");
    } finally {
      setDangLuuKhaiBao(false);
    }
  };

  const xuLyTaiLenTep = async () => {
    if (!tepDangChon) {
      toast.warn("Vui lòng chọn tệp tài liệu trước khi tải lên");
      return;
    }

    setDangTaiTep(true);
    try {
      await taiLenTaiLieuYTe({ file: tepDangChon, tieuDe: tieuDeTep });
      toast.success("Tải tài liệu và OCR thành công");
      setTepDangChon(null);
      setTieuDeTep("");
      await taiDuLieuPhr();
    } catch (error) {
      toast.error(error.response?.data?.message || "Tải tài liệu thất bại");
    } finally {
      setDangTaiTep(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-soft md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Cổng bệnh nhân</p>
            <h1 className="mt-2 text-3xl font-black text-on-surface md:text-4xl">Hồ sơ sức khỏe cá nhân (PHR)</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-on-surface-variant md:text-base">
              Nhập thông tin tiếp nhận trước khám, tải tài liệu y tế để OCR trích xuất, và xem lại toàn bộ lịch sử đã tổng hợp.
            </p>
          </div>
          <button
            className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={dangLuuKhaiBao}
            onClick={() => void luuKhaiBao()}
            type="button"
          >
            {dangLuuKhaiBao ? "Đang lưu..." : "Lưu khai báo"}
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-surface-variant bg-surface-container-lowest p-3">
        <div className="grid gap-2 md:grid-cols-3">
          {[
            { id: "khai-bao", label: "Khai báo trước khám", icon: "assignment" },
            { id: "tai-lieu", label: "Quản lý tài liệu y tế", icon: "upload_file" },
            { id: "lich-su", label: "Lịch sử y tế", icon: "history" },
          ].map((tab) => {
            const dangKichHoat = tabDangXem === tab.id;
            return (
              <button
                key={tab.id}
                className={[
                  "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors",
                  dangKichHoat ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:text-primary",
                ].join(" ")}
                onClick={() => setTabDangXem(tab.id)}
                type="button"
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {tabDangXem === "khai-bao" && (
        <section className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-soft md:p-8">
          <TieuDePhan
            icon="assignment"
            tieuDe="Khai báo trước khám / Thông tin tiếp nhận"
            moTa="Điền triệu chứng, tiền sử, dị ứng và thuốc đang dùng để bác sĩ nắm nhanh tình trạng hiện tại."
          />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-on-surface">Triệu chứng đợt này</span>
              <textarea
                className="min-h-24 w-full rounded-xl border border-surface-variant bg-white px-4 py-3 text-sm"
                value={khaiBao.trieu_chung_chinh}
                onChange={(event) => setKhaiBao((cu) => ({ ...cu, trieu_chung_chinh: event.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-on-surface">Thời gian xuất hiện triệu chứng</span>
              <input
                className="w-full rounded-xl border border-surface-variant bg-white px-4 py-3 text-sm"
                value={khaiBao.thoi_gian_trieu_chung}
                onChange={(event) => setKhaiBao((cu) => ({ ...cu, thoi_gian_trieu_chung: event.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-on-surface">Dị ứng</span>
              <input
                className="w-full rounded-xl border border-surface-variant bg-white px-4 py-3 text-sm"
                value={khaiBao.di_ung}
                onChange={(event) => setKhaiBao((cu) => ({ ...cu, di_ung: event.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-on-surface">Tiền sử bệnh</span>
              <input
                className="w-full rounded-xl border border-surface-variant bg-white px-4 py-3 text-sm"
                value={khaiBao.tien_su}
                onChange={(event) => setKhaiBao((cu) => ({ ...cu, tien_su: event.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-on-surface">Thuốc đang dùng</span>
              <input
                className="w-full rounded-xl border border-surface-variant bg-white px-4 py-3 text-sm"
                value={khaiBao.thuoc_dang_dung}
                onChange={(event) => setKhaiBao((cu) => ({ ...cu, thuoc_dang_dung: event.target.value }))}
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-on-surface">Ghi chú bổ sung</span>
              <textarea
                className="min-h-24 w-full rounded-xl border border-surface-variant bg-white px-4 py-3 text-sm"
                value={khaiBao.ghi_chu}
                onChange={(event) => setKhaiBao((cu) => ({ ...cu, ghi_chu: event.target.value }))}
              />
            </label>
          </div>
        </section>
      )}

      {tabDangXem === "tai-lieu" && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
          <div className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-soft md:p-8">
            <TieuDePhan
              icon="upload_file"
              tieuDe="Quản lý tài liệu y tế / Tải lên kết quả cũ"
              moTa="Hỗ trợ PDF, ảnh chụp kết quả cũ, toa thuốc. Hệ thống sẽ OCR và tự động tổng hợp trường thông tin chính."
            />

            <div className="space-y-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5">
              <input
                accept=".pdf,image/*"
                className="w-full rounded-xl border border-surface-variant bg-white px-4 py-3 text-sm"
                onChange={(event) => setTepDangChon(event.target.files?.[0] || null)}
                type="file"
              />
              <input
                className="w-full rounded-xl border border-surface-variant bg-white px-4 py-3 text-sm"
                onChange={(event) => setTieuDeTep(event.target.value)}
                placeholder="Tiêu đề tài liệu (không bắt buộc)"
                value={tieuDeTep}
              />
              <button
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={dangTaiTep}
                onClick={() => void xuLyTaiLenTep()}
                type="button"
              >
                {dangTaiTep ? "Đang OCR..." : "Tải lên và OCR"}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {danhSachTaiLieu.map((taiLieu) => (
                <article key={taiLieu.document_id} className="rounded-2xl border border-surface-variant bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-on-surface">{taiLieu.title}</p>
                    <span className="rounded-full bg-surface-container-high px-3 py-1 text-[11px] font-semibold text-on-surface-variant">
                      {(taiLieu.mime_type || "").includes("pdf") ? "PDF" : "Ảnh"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-outline">{new Date(taiLieu.created_at).toLocaleString("vi-VN")}</p>
                  <p className="mt-2 text-xs text-on-surface-variant">{taiLieu.summary?.tom_tat || "Đã OCR, chưa có tóm tắt"}</p>
                </article>
              ))}

              {!dangTai && !danhSachTaiLieu.length && (
                <div className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                  Chưa có tài liệu nào được tải lên.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-primary-container p-6 text-white shadow-soft md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-fixed-dim">Tổng hợp OCR + AI</p>
            <h3 className="mt-2 text-2xl font-bold">Thông tin trích xuất mới nhất</h3>

            <div className="mt-5 space-y-3 rounded-2xl bg-white/10 p-4 text-sm">
              <p><span className="font-semibold">Tóm tắt:</span> {tomTatOcrMoiNhat?.tom_tat || "--"}</p>
              <p><span className="font-semibold">Chẩn đoán gợi ý:</span> {tomTatOcrMoiNhat?.chan_doan_goi_y || "--"}</p>
              <p><span className="font-semibold">Nhịp tim:</span> {tomTatOcrMoiNhat?.chi_so_quan_trong?.nhip_tim || "--"}</p>
              <p><span className="font-semibold">Huyết áp:</span> {tomTatOcrMoiNhat?.chi_so_quan_trong?.huyet_ap || "--"}</p>
              <p><span className="font-semibold">Khuyến nghị:</span> {tomTatOcrMoiNhat?.khuyen_nghi || "--"}</p>
            </div>
          </div>
        </section>
      )}

      {tabDangXem === "lich-su" && (
        <section className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-soft md:p-8">
          <TieuDePhan
            icon="history"
            tieuDe="Lịch sử y tế"
            moTa="Tập hợp toàn bộ khai báo, kết quả OCR và các cập nhật hồ sơ để bạn dễ theo dõi lại."
          />

          <div className="space-y-3">
            {danhSachLichSu.map((muc) => (
              <article key={muc.id} className="rounded-2xl border border-surface-variant bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-on-surface">{muc.tieu_de}</h3>
                  <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container">
                    {muc.loai}
                  </span>
                </div>
                <p className="mt-1 text-xs text-outline">{new Date(muc.thoi_gian).toLocaleString("vi-VN")} • {muc.nguon}</p>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">{muc.mo_ta}</p>
              </article>
            ))}

            {!dangTai && !danhSachLichSu.length && (
              <div className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                Chưa có dữ liệu lịch sử y tế.
              </div>
            )}
          </div>
        </section>
      )}

      {dangTai && (
        <div className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
          Đang tải dữ liệu PHR...
        </div>
      )}
    </div>
  );
}

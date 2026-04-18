import axiosInstance from "../config/axios";

export const luuKhaiBaoTruocKham = async (payload) => {
  const { data } = await axiosInstance.post("/phr/intake", payload);
  return data;
};

export const layKhaiBaoGanNhat = async (patientId = null) => {
  const params = patientId ? { patient_id: patientId } : undefined;
  const { data } = await axiosInstance.get("/phr/intake/latest", { params });
  return data;
};

export const taiLenTaiLieuYTe = async ({ file, tieuDe = "", patientId = null }) => {
  const formData = new FormData();
  formData.append("file", file);
  if (tieuDe) {
    formData.append("tieu_de", tieuDe);
  }
  if (patientId) {
    formData.append("patient_id", String(patientId));
  }

  const { data } = await axiosInstance.post("/phr/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export const layDanhSachTaiLieuYTe = async (patientId = null) => {
  const params = patientId ? { patient_id: patientId } : undefined;
  const { data } = await axiosInstance.get("/phr/documents", { params });
  return data;
};

export const layLichSuPhr = async (patientId = null) => {
  const params = patientId ? { patient_id: patientId } : undefined;
  const { data } = await axiosInstance.get("/phr/history", { params });
  return data;
};

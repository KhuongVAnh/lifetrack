import { httpClient } from "@/shared/api";

export const luuKhaiBaoTruocKham = async (payload) => {
  const { data } = await httpClient.post("/phr/intake", payload);
  return data;
};

export const layKhaiBaoGanNhat = async (patientId = null) => {
  const params = patientId ? { patient_id: patientId } : undefined;
  const { data } = await httpClient.get("/phr/intake/latest", { params });
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

  const { data } = await httpClient.post("/phr/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export const layDanhSachTaiLieuYTe = async (patientId = null) => {
  const params = patientId ? { patient_id: patientId } : undefined;
  const { data } = await httpClient.get("/phr/documents", { params });
  return data;
};

export const layLichSuPhr = async (patientId = null) => {
  const params = patientId ? { patient_id: patientId } : undefined;
  const { data } = await httpClient.get("/phr/history", { params });
  return data;
};

// ============================================
// PHR CORE APIs (Overview & Visits)
// ============================================

export const getPhrOverview = async (userId) => {
  const { data } = await httpClient.get(`/phr/overview/${userId}`);
  return data;
};

export const updatePhrOverview = async (userId, payload) => {
  const { data } = await httpClient.put(`/phr/overview/${userId}`, payload);
  return data;
};

export const getPhrVisits = async (userId) => {
  const { data } = await httpClient.get(`/phr/visits/${userId}`);
  return data;
};

export const createPhrVisit = async (payload) => {
  const { data } = await httpClient.post(`/phr/visits`, payload);
  return data;
};

export const updatePhrVisit = async (visitId, payload) => {
  const { data } = await httpClient.put(`/phr/visits/${visitId}`, payload);
  return data;
};

export const deletePhrVisit = async (visitId) => {
  const { data } = await httpClient.delete(`/phr/visits/${visitId}`);
  return data;
};

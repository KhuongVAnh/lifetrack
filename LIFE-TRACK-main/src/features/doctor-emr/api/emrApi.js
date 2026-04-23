import { httpClient } from "@/shared/api";

export const layKhongGianKhamBenh = async (patientId) => {
  const { data } = await httpClient.get(`/doctor-portal/emr/workspace/${patientId}`);
  return data;
};

export const layHoSoBenhNhan = async (patientId) => {
  const { data } = await httpClient.get(`/doctor-portal/emr/workspace/${patientId}`);
  return data;
};

export const luuHoSoKhamEmr = async (payload) => {
  const { data } = await httpClient.post("/doctor-portal/emr/consultations", payload);
  return data;
};

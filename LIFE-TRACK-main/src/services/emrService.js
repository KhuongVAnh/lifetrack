import axiosInstance from "../config/axios";

export const layKhongGianKhamBenh = async (patientId) => {
  const { data } = await axiosInstance.get(`/emr/workspace/${patientId}`);
  return data;
};

export const layHoSoBenhNhan = async (patientId) => {
  const { data } = await axiosInstance.get(`/emr/patient-chart/${patientId}`);
  return data;
};

export const luuHoSoKhamEmr = async (payload) => {
  const { data } = await axiosInstance.post("/emr/consultations", payload);
  return data;
};

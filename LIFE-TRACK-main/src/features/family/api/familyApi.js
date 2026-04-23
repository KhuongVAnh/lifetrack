import httpClient from "@/shared/api/httpClient";

export const getMyFamilyPatients = async () => {
  const { data } = await httpClient.get("/family/patients/me");
  return data.patients ?? [];
};

export const getFamilyPatientSummary = async (patientId) => {
  const { data } = await httpClient.get(`/family/patients/${patientId}/summary`);
  return data;
};

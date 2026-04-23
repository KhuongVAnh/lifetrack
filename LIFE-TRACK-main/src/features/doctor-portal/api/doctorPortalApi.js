import { httpClient } from "@/shared/api";
import {
  mapDoctorPortalDashboardResponse,
  mapDoctorPortalEmrWorkspace,
  mapDoctorPortalPatientSummary,
} from "../lib/doctorPortal";

export const getDoctorPortalDashboard = async () => {
  const { data } = await httpClient.get("/doctor-portal/dashboard");
  return mapDoctorPortalDashboardResponse(data);
};

export const getDoctorPortalPatients = async ({ domain = "all" } = {}) => {
  const { data } = await httpClient.get("/doctor-portal/patients", {
    params: domain ? { domain } : {},
  });

  return (data.patients ?? []).map(mapDoctorPortalPatientSummary).filter(Boolean);
};

export const getDoctorPortalEmrWorkspace = async (patientId) => {
  const { data } = await httpClient.get(`/doctor-portal/emr/workspace/${patientId}`);
  return mapDoctorPortalEmrWorkspace(data);
};

export const createDoctorPortalConsultation = async (payload) => {
  const { data } = await httpClient.post("/doctor-portal/emr/consultations", payload);
  return data;
};

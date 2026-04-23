import { httpClient } from "@/shared/api";
import {
  buildDoctorProfileFormState,
  mapDoctorCatalogItem,
  mapDoctorProfileResponse,
  mapDoctorReview,
  normalizeDoctorProfilePayload,
} from "../lib/doctorProfile";

export const getDoctorCatalog = async (q = "") => {
  const { data } = await httpClient.get("/doctors/catalog", {
    params: q ? { q } : {},
  });

  return (data.doctors ?? []).map(mapDoctorCatalogItem);
};

export const getDoctorProfile = async (doctorId) => {
  const { data } = await httpClient.get(`/doctors/${doctorId}/profile`);
  return mapDoctorProfileResponse(data.profile);
};

export const getDoctorReviews = async (doctorId, { cursor = "", limit = 8 } = {}) => {
  const { data } = await httpClient.get(`/doctors/${doctorId}/reviews`, {
    params: {
      limit,
      ...(cursor ? { cursor } : {}),
    },
  });

  return {
    items: (data.reviews ?? []).map(mapDoctorReview),
    nextCursor: data.next_cursor ?? null,
    hasMore: Boolean(data.has_more),
  };
};

export const getMyDoctorReview = async (doctorId) => {
  const { data } = await httpClient.get(`/doctors/${doctorId}/reviews/me`);
  return {
    canReview: Boolean(data.can_review),
    review: data.review ? mapDoctorReview(data.review) : null,
  };
};

export const createMyDoctorReview = async (doctorId, payload) => {
  const { data } = await httpClient.post(`/doctors/${doctorId}/reviews/me`, payload);
  return mapDoctorReview(data.review);
};

export const updateMyDoctorReview = async (doctorId, payload) => {
  const { data } = await httpClient.patch(`/doctors/${doctorId}/reviews/me`, payload);
  return mapDoctorReview(data.review);
};

export const deleteMyDoctorReview = async (doctorId) => {
  const { data } = await httpClient.delete(`/doctors/${doctorId}/reviews/me`);
  return data;
};

export const getMyDoctorProfile = async () => {
  const { data } = await httpClient.get("/doctors/me/profile");
  return buildDoctorProfileFormState(data);
};

export const updateMyDoctorProfile = async (payload) => {
  const normalizedPayload = normalizeDoctorProfilePayload(payload);
  const { data } = await httpClient.put("/doctors/me/profile", normalizedPayload);
  return buildDoctorProfileFormState(data);
};

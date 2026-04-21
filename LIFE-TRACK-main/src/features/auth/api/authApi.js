import { httpClient } from "@/shared/api";

export async function restoreSession() {
  const { data } = await httpClient.get("/auth/me");
  return data;
}

export async function loginRequest(email, password) {
  const { data } = await httpClient.post("/auth/login", { email, password });
  return data;
}

export async function logoutRequest() {
  const { data } = await httpClient.post("/auth/logout");
  return data;
}

import { api } from "./client";

export const authApi = {
  login: async (data: any) => {
    const res = await api.post("/auth/login", data);
    return res.data;
  },
  register: async (data: any) => {
    const res = await api.post("/auth/register", data);
    return res.data;
  },
  getProfile: async () => {
    const res = await api.get("/auth/me");
    return res.data;
  },
  logout: async () => {
    const res = await api.post("/auth/logout");
    return res.data;
  }
};

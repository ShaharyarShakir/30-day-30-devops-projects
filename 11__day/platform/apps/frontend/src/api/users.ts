import { api } from "./client";

export const usersApi = {
  getUserProfile: async (id: string) => {
    const res = await api.get(`/users/${id}`);
    return res.data;
  },
  updateProfile: async (data: any) => {
    const res = await api.put("/users/profile", data);
    return res.data;
  }
};

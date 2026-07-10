import { api } from "./client";

export const coursesApi = {
  getCourses: async () => {
    const res = await api.get("/courses");
    return res.data;
  },
  getCourseById: async (id: string) => {
    const res = await api.get(`/courses/${id}`);
    return res.data;
  }
};

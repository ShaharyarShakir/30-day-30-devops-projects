import { api } from "./client";

export interface LiveSession {
  id: string;
  course_id: string;
  instructor_id: string;
  title: string;
  description?: string;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  status: "SCHEDULED" | "WAITING" | "LIVE" | "ENDED" | "CANCELLED";
  created_at: string;
}

export interface SessionTokenResponse {
  token: string;
  livekit_token: string;
  livekit_url: string;
  session_id: string;
  user_id: string;
  role: "INSTRUCTOR" | "STUDENT";
  status: string;
}

export const liveApi = {
  createSession: async (data: { course_id: string; title: string; description?: string; scheduled_at?: string }) => {
    const res = await api.post<LiveSession>("/sessions", data);
    return res.data;
  },
  getSessions: async (courseId: string) => {
    const res = await api.get<LiveSession[]>("/sessions", { params: { course_id: courseId } });
    return res.data;
  },
  getSessionById: async (id: string) => {
    const res = await api.get<LiveSession>(`/sessions/${id}`);
    return res.data;
  },
  updateSession: async (id: string, data: { title: string; description?: string; scheduled_at?: string }) => {
    const res = await api.patch<LiveSession>(`/sessions/${id}`, data);
    return res.data;
  },
  deleteSession: async (id: string) => {
    const res = await api.delete(`/sessions/${id}`);
    return res.data;
  },
  startSession: async (id: string) => {
    const res = await api.post<LiveSession>(`/sessions/${id}/start`);
    return res.data;
  },
  endSession: async (id: string) => {
    const res = await api.post<LiveSession>(`/sessions/${id}/end`);
    return res.data;
  },
  joinSession: async (id: string) => {
    const res = await api.post<SessionTokenResponse>(`/sessions/${id}/join`);
    return res.data;
  },
  leaveSession: async (id: string) => {
    const res = await api.post(`/sessions/${id}/leave`);
    return res.data;
  },
  getPresence: async (id: string) => {
    const res = await api.get<{ presence: string[] }>(`/sessions/${id}/presence`);
    return res.data;
  }
};

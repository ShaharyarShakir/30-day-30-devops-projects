import { api } from "./client";

export interface PlaybackInfo {
  mediaId: string;
  status: string;
  duration: number;
  playlistUrl: string;
  thumbnailUrl?: string;
  captions?: Array<{ language: string; url: string }>;
}

export interface WatchProgress {
  id?: string;
  userId?: string;
  lessonId: string;
  mediaId?: string;
  position: number;
  duration: number;
  completed: boolean;
  updatedAt?: string;
}

export const mediaApi = {
  getPlaybackUrl: async (videoId: string, lessonId: string): Promise<PlaybackInfo> => {
    const res = await api.get(`/media/videos/${videoId}/play`, {
      params: { lessonId }
    });
    return res.data;
  },

  updateProgress: async (
    lessonId: string,
    position: number,
    duration: number,
    event?: string
  ): Promise<WatchProgress> => {
    const res = await api.post("/media/progress", {
      lessonId,
      position: Math.round(position),
      duration: Math.round(duration),
      event
    });
    return res.data;
  },

  getProgress: async (lessonId: string): Promise<WatchProgress> => {
    const res = await api.get(`/media/progress/${lessonId}`);
    return res.data;
  }
};

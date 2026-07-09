import axios from "axios";
import { API_URL } from "@repo/config";
import { getSecureItem, setSecureItem, deleteSecureItem } from "./secure-store";
import { useAuthStore } from "../store/auth.store";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach access token
api.interceptors.request.use(
  async (config) => {
    const accessToken = await getSecureItem("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle token refresh on 401
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If it's a 401 error and it's not a retry or a refresh request itself
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes("/auth/refresh")) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getSecureItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token found.");
        }

        // Call the refresh endpoint directly using raw axios to avoid interceptor recursion
        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        await setSecureItem("accessToken", newAccessToken);
        await setSecureItem("refreshToken", newRefreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Refresh failed (invalid/expired refresh token) -> Sign Out
        await deleteSecureItem("accessToken");
        await deleteSecureItem("refreshToken");
        useAuthStore.getState().logout(); // Reset UI state

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

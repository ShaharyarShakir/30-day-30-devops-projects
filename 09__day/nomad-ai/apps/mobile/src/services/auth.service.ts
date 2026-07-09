import { api } from "../lib/api";
import { setSecureItem, deleteSecureItem, getSecureItem } from "../lib/secure-store";
import { useAuthStore, User } from "../store/auth.store";

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  static async login(email: string, password: string): Promise<User> {
    const response = await api.post<AuthResponse>("/auth/login", { email, password });
    const { user, accessToken, refreshToken } = response.data;

    // 1. Save tokens securely
    await setSecureItem("accessToken", accessToken);
    await setSecureItem("refreshToken", refreshToken);

    // 2. Update global Zustand store
    useAuthStore.getState().setUser(user);

    return user;
  }

  static async register(name: string, email: string, password: string): Promise<User> {
    const response = await api.post<AuthResponse>("/auth/register", { name, email, password });
    const { user, accessToken, refreshToken } = response.data;

    // 1. Save tokens securely
    await setSecureItem("accessToken", accessToken);
    await setSecureItem("refreshToken", refreshToken);

    // 2. Update global Zustand store
    useAuthStore.getState().setUser(user);

    return user;
  }

  static async logout(): Promise<void> {
    try {
      const refreshToken = await getSecureItem("refreshToken");
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch (error) {
      console.warn("API logout call failed, cleaning up client credentials anyway:", error);
    } finally {
      // Clean up SecureStore
      await deleteSecureItem("accessToken");
      await deleteSecureItem("refreshToken");

      // Reset Zustand store
      useAuthStore.getState().logout();
    }
  }

  static async getMe(): Promise<User> {
    const response = await api.get<User>("/auth/me");
    const user = response.data;

    useAuthStore.getState().setUser(user);

    return user;
  }
}

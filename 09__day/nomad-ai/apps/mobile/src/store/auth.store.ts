import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  theme: "light" | "dark";
  setUser: (user: User | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setTheme: (theme: "light" | "dark") => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  theme: "dark",
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setTheme: (theme) => set({ theme }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

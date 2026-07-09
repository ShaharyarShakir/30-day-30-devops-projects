import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuthStore } from "../store/auth.store";
import { AuthService } from "../services/auth.service";
import { getSecureItem } from "../lib/secure-store";
import { ModelManager } from "../ai/models/ModelManager";

interface AuthContextType {
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType>({ initialized: false });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  const [initialized, setInitialized] = useState(false);
  const [hasModel, setHasModel] = useState<boolean | null>(null);

  // 1. Initial boot check
  useEffect(() => {
    async function bootAuth() {
      try {
        const refreshToken = await getSecureItem("refreshToken");
        if (refreshToken) {
          // Attempt to load the user profile
          await AuthService.getMe();
        }
      } catch (error) {
        console.log("No valid session or boot check failed:", error);
      } finally {
        setInitialized(true);
      }
    }

    bootAuth();
  }, []);

  // Check model installation status once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      ModelManager.getInstance()
        .checkInstalled("travel-ai")
        .then((installed) => {
          setHasModel(installed);
        })
        .catch(() => {
          setHasModel(false);
        });
    } else {
      setHasModel(null);
    }
  }, [isAuthenticated]);

  // 2. Navigation protection guard
  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inDownloadModal = (segments as string[]).includes("ai-download");

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect unauthenticated user to onboarding
      router.replace("/(auth)/onboarding");
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect authenticated user depending on if they have the AI model
      if (hasModel === false) {
        router.replace("/(modals)/ai-download");
      } else if (hasModel === true) {
        router.replace("/(tabs)/home");
      }
    } else if (isAuthenticated && !inAuthGroup && !inDownloadModal && hasModel === false) {
      // Direct them back to model download if they somehow bypass it
      router.replace("/(modals)/ai-download");
    }
  }, [initialized, isAuthenticated, segments, hasModel]);

  return (
    <AuthContext.Provider value={{ initialized }}>
      {children}
    </AuthContext.Provider>
  );
}

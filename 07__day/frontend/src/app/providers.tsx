import React, { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api, UserProfile, getToken, removeToken } from '../lib/api';

// Create TanStack Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshProfile = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await api.auth.profile();
      setUser(profile);
      setIsAuthenticated(true);
    } catch (e) {
      console.error('Failed to fetch profile:', e);
      // Clean invalid token
      removeToken();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await api.auth.login(email, password);
      await refreshProfile();
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await api.auth.register(email, password);
      // Auto login after registration
      await api.auth.login(email, password);
      await refreshProfile();
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = () => {
    removeToken();
    setUser(null);
    setIsAuthenticated(false);
    queryClient.clear();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshProfile,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

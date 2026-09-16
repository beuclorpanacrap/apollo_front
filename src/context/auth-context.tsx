import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, CurrentUserResponse, LoginRequest, RegisterPatientRequest } from '@/api/auth.api';
import { getAuthToken, removeAuthToken } from '@/api/client';

interface AuthContextType {
  user: CurrentUserResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<CurrentUserResponse>;
  registerPatient: (request: RegisterPatientRequest) => Promise<CurrentUserResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const storedToken = await getAuthToken();
      if (!storedToken) {
        setUser(null);
        setToken(null);
        return;
      }
      setToken(storedToken);
      const me = await authApi.getMe();
      setUser(me);
    } catch (error) {
      console.warn('[AuthProvider] Session expired or invalid:', error);
      await removeAuthToken();
      setUser(null);
      setToken(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        await refreshUser();
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (credentials: LoginRequest): Promise<CurrentUserResponse> => {
    const authRes = await authApi.login(credentials);
    setToken(authRes.token ?? null);
    const me = await authApi.getMe();
    setUser(me);
    return me;
  };

  const registerPatient = async (request: RegisterPatientRequest): Promise<CurrentUserResponse> => {
    const authRes = await authApi.registerPatient(request);
    setToken(authRes.token ?? null);
    const me = await authApi.getMe();
    setUser(me);
    return me;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        registerPatient,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

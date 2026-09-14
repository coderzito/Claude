import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken } from "../api/client";
import type { User } from "../api/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthResponse {
  token: string;
  user: User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken().then(async (token) => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get<{ user: User }>("/auth/me");
        setUser(res.user);
      } catch {
        await setToken(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    await setToken(res.token);
    setUser(res.user);
  }, []);

  const signup = useCallback(async (email: string, password: string, displayName?: string) => {
    const res = await api.post<AuthResponse>("/auth/signup", { email, password, displayName });
    await setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

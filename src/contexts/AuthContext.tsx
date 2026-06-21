"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { type AuthUser, clearAuth, getAuthUser, setAuthUser, setToken } from "@/lib/auth-client";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string, expiresAt: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getAuthUser();
    setUser(stored);
    setIsLoading(false);
  }, []);

  const login = useCallback((token: string, expiresAt: string, authUser: AuthUser) => {
    setToken(token, expiresAt);
    setAuthUser(authUser);
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

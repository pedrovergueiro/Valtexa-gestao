"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  title: string;
  initials?: string;
  department?: {
    id: string;
    name: string;
    code: string;
    color?: string;
  } | null;
  roles: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  switchUser: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  switchUser: async () => false,
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Se não autenticado no início, conectar como COO por padrão para demonstração imediata
        const switchRes = await fetch("/api/auth/switch-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "pedro@valtexa.com" }),
        });
        if (switchRes.ok) {
          const switchData = await switchRes.json();
          setUser(switchData.user);
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar sessão:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const switchUser = async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/switch-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        await fetchCurrentUser();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, switchUser, logout, refreshUser: fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}


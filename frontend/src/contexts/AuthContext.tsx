import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { authApi } from "@/api/endpoints";
import { setToken, clearToken, hasToken } from "@/api/client";

export interface AuthUser {
  id: number | string;
  username: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!hasToken()) {
      setIsAuthenticated(false);
      setUser(null);
      return;
    }
    authApi
      .me()
      .then((res) => {
        setIsAuthenticated(true);
        setUser(res.user ? { id: res.user.id, username: res.user.username } : null);
      })
      .catch(() => {
        clearToken();
        setIsAuthenticated(false);
        setUser(null);
      });
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    if (!username.trim() || !password.trim()) return false;
    try {
      const res = await authApi.login(username.trim(), password);
      setToken(res.token);
      setIsAuthenticated(true);
      setUser(res.user ? { id: res.user.id, username: res.user.username } : null);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

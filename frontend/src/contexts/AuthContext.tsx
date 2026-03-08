import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { authApi } from "@/api/endpoints";
import { setToken, clearToken, hasToken } from "@/api/client";

interface AuthContextValue {
  isAuthenticated: boolean;
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

  useEffect(() => {
    if (!hasToken()) {
      setIsAuthenticated(false);
      return;
    }
    authApi
      .me()
      .then(() => setIsAuthenticated(true))
      .catch(() => {
        clearToken();
        setIsAuthenticated(false);
      });
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    if (!username.trim() || !password.trim()) return false;
    try {
      const res = await authApi.login(username.trim(), password);
      setToken(res.token);
      setIsAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

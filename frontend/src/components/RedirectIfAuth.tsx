import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useServerSettings } from "@/contexts/ServerSettingsContext";

interface RedirectIfAuthProps {
  children: React.ReactNode;
  toSetup?: boolean;
}

/** Redirect to / or /setup if already authenticated (for login page). */
export const RedirectIfAuth = ({ children, toSetup }: RedirectIfAuthProps) => {
  const { isAuthenticated } = useAuth();
  const { setupComplete } = useServerSettings();

  if (!isAuthenticated) {
    return <>{children}</>;
  }
  if (toSetup || !setupComplete) {
    return <Navigate to={setupComplete ? "/" : "/setup"} replace />;
  }
  return <Navigate to="/" replace />;
};

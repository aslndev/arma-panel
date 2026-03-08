import { Navigate } from "react-router-dom";
import { useServerSettings } from "@/contexts/ServerSettingsContext";

interface RedirectIfSetupCompleteProps {
  children: React.ReactNode;
}

/** Redirect to / if setup is already complete (for setup page). */
export const RedirectIfSetupComplete = ({ children }: RedirectIfSetupCompleteProps) => {
  const { setupComplete } = useServerSettings();

  if (setupComplete) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

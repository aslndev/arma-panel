import { Navigate } from "react-router-dom";
import { useServerSettings } from "@/contexts/ServerSettingsContext";

interface RequireSetupProps {
  children: React.ReactNode;
}

export const RequireSetup = ({ children }: RequireSetupProps) => {
  const { setupComplete } = useServerSettings();

  if (!setupComplete) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};

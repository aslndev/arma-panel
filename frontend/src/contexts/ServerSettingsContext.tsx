import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { settingsApi } from "@/api/endpoints";
import { hasToken } from "@/api/client";
import { useAuth } from "@/contexts/AuthContext";

interface StoredSettings {
  panelName?: string;
  serverFolder?: string;
  configFile?: string;
  steamcmdPath?: string;
  armaServerFile?: string;
  setupComplete?: boolean;
}

interface ServerSettings {
  panelName: string;
  setPanelName: (v: string) => void;
  serverFolder: string;
  setServerFolder: (v: string) => void;
  configFile: string;
  setConfigFile: (v: string) => void;
  steamcmdPath: string;
  setSteamcmdPath: (v: string) => void;
  armaServerFile: string;
  setArmaServerFile: (v: string) => void;
  setupComplete: boolean;
  completeSetup: (data: StoredSettings) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const ServerSettingsContext = createContext<ServerSettings | null>(null);

export const useServerSettings = () => {
  const ctx = useContext(ServerSettingsContext);
  if (!ctx) throw new Error("useServerSettings must be used within ServerSettingsProvider");
  return ctx;
};

const defaults = {
  panelName: "Arma Panel",
  serverFolder: "/home/arma/server",
  configFile: "/home/arma/server/config.json",
  steamcmdPath: "/usr/games/steamcmd",
  armaServerFile: "",
  setupComplete: false,
};

export const ServerSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [panelName, setPanelName] = useState(defaults.panelName);
  const [serverFolder, setServerFolder] = useState(defaults.serverFolder);
  const [configFile, setConfigFile] = useState(defaults.configFile);
  const [steamcmdPath, setSteamcmdPath] = useState(defaults.steamcmdPath);
  const [armaServerFile, setArmaServerFile] = useState(defaults.armaServerFile);
  const [setupComplete, setSetupComplete] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refreshSettings = useCallback(async () => {
    if (!hasToken()) {
      setLoaded(true);
      return;
    }
    try {
      const s = await settingsApi.get();
      setPanelName(s.panelName ?? defaults.panelName);
      setServerFolder(s.serverFolder ?? defaults.serverFolder);
      setConfigFile(s.configFile ?? defaults.configFile);
      setSteamcmdPath(s.steamcmdPath ?? defaults.steamcmdPath);
      setArmaServerFile(s.armaServerFile ?? defaults.armaServerFile);
      setSetupComplete(s.setupComplete ?? false);
    } catch {
      setSetupComplete(false);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshSettings();
    } else {
      setLoaded(true);
      setSetupComplete(false);
    }
  }, [isAuthenticated, refreshSettings]);

  const completeSetup = useCallback(
    async (data: StoredSettings) => {
      const s = await settingsApi.completeSetup({
        panelName: data.panelName ?? panelName,
        serverFolder: data.serverFolder ?? serverFolder,
        configFile: data.configFile ?? configFile,
        steamcmdPath: data.steamcmdPath ?? steamcmdPath,
        armaServerFile: data.armaServerFile ?? armaServerFile,
      });
      setPanelName(s.panelName);
      setServerFolder(s.serverFolder);
      setConfigFile(s.configFile);
      setSteamcmdPath(s.steamcmdPath);
      setArmaServerFile(s.armaServerFile ?? "");
      setSetupComplete(s.setupComplete);
    },
    [panelName, serverFolder, configFile, steamcmdPath, armaServerFile]
  );

  const value: ServerSettings = {
    panelName,
    setPanelName,
    serverFolder,
    setServerFolder,
    configFile,
    setConfigFile,
    steamcmdPath,
    setSteamcmdPath,
    armaServerFile,
    setArmaServerFile,
    setupComplete: loaded ? setupComplete : false,
    completeSetup,
    refreshSettings,
  };

  return (
    <ServerSettingsContext.Provider value={value}>
      {children}
    </ServerSettingsContext.Provider>
  );
};

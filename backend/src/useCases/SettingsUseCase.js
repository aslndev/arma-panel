import * as SettingsRepo from "../repositories/SettingsRepository.js";

export function getSettings() {
  return SettingsRepo.getSettings();
}

export function completeSetup(data) {
  SettingsRepo.updateSettings({
    panelName: data.panelName ?? "Arma Panel",
    serverFolder: data.serverFolder ?? "/home/arma/server",
    configFile: data.configFile ?? "/home/arma/server/config.json",
    steamcmdPath: data.steamcmdPath ?? "/usr/games/steamcmd",
    armaServerFile: data.armaServerFile ?? "",
    setupComplete: true,
  });
  return SettingsRepo.getSettings();
}

export function updateSettings(data) {
  const current = SettingsRepo.getSettings();
  SettingsRepo.updateSettings({
    panelName: data.panelName ?? current?.panelName,
    serverFolder: data.serverFolder ?? current?.serverFolder,
    configFile: data.configFile ?? current?.configFile,
    steamcmdPath: data.steamcmdPath ?? current?.steamcmdPath,
    armaServerFile: data.armaServerFile ?? current?.armaServerFile ?? "",
    setupComplete: current?.setupComplete ?? false,
  });
  return SettingsRepo.getSettings();
}

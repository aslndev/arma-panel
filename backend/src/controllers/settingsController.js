import * as SettingsUseCase from "../useCases/SettingsUseCase.js";

export function getSettings(req, res) {
  const settings = SettingsUseCase.getSettings();
  res.json(settings || {});
}

export function completeSetup(req, res) {
  const body = req.body || {};
  const settings = SettingsUseCase.completeSetup({
    panelName: body.panelName,
    serverFolder: body.serverFolder,
    configFile: body.configFile,
    steamcmdPath: body.steamcmdPath,
    armaServerFile: body.armaServerFile,
  });
  res.json(settings);
}

export function updateSettings(req, res) {
  const body = req.body || {};
  const settings = SettingsUseCase.updateSettings({
    panelName: body.panelName,
    serverFolder: body.serverFolder,
    configFile: body.configFile,
    steamcmdPath: body.steamcmdPath,
    armaServerFile: body.armaServerFile,
  });
  res.json(settings);
}

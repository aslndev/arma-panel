import db from "../infrastructure/database.js";

export function getSettings() {
  const row = db.prepare(
    "SELECT panel_name AS panelName, server_folder AS serverFolder, config_file AS configFile, setup_complete AS setupComplete FROM panel_settings WHERE id = 1"
  ).get();
  return row
    ? {
        panelName: row.panelName,
        serverFolder: row.serverFolder,
        configFile: row.configFile,
        setupComplete: !!row.setupComplete,
      }
    : null;
}

export function updateSettings(data) {
  db.prepare(
    `UPDATE panel_settings SET
      panel_name = ?,
      server_folder = ?,
      config_file = ?,
      setup_complete = ?
    WHERE id = 1`
  ).run(
    data.panelName ?? "Arma Panel",
    data.serverFolder ?? "/home/arma/server",
    data.configFile ?? "/home/arma/server/config.json",
    data.setupComplete ? 1 : 0
  );
  return getSettings();
}

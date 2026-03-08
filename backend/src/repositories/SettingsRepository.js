import { resolve } from "path";
import db from "../infrastructure/database.js";

/** Store config file as relative to server folder when it lies under it. */
function normalizeConfigFile(serverFolder, configFile) {
  const cf = (configFile ?? "").trim();
  if (!cf) return cf;
  if (!cf.startsWith("/")) return cf;
  const base = resolve(serverFolder);
  const full = resolve(cf);
  const rel = full.startsWith(base + "/") ? full.slice(base.length + 1) : full.startsWith(base + "\\") ? full.slice(base.length + 1) : cf;
  return rel !== full ? rel : cf;
}

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
  const serverFolder = data.serverFolder ?? "/home/arma/server";
  const configFile = normalizeConfigFile(serverFolder, data.configFile ?? "config.json") || "config.json";
  db.prepare(
    `UPDATE panel_settings SET
      panel_name = ?,
      server_folder = ?,
      config_file = ?,
      setup_complete = ?
    WHERE id = 1`
  ).run(
    data.panelName ?? "Arma Panel",
    serverFolder,
    configFile,
    data.setupComplete ? 1 : 0
  );
  return getSettings();
}

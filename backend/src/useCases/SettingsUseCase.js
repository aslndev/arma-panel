import { existsSync, readdirSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import * as SettingsRepo from "../repositories/SettingsRepository.js";

const ARMA_EXECUTABLE = "ArmaReforgerServer";
const LINUXGSM_SCRIPT = "armarserver";
const LINUXGSM_SERVERFILES = "serverfiles";
const CONFIG_CANDIDATES = ["armarserver_config.json", "config.json", "server_config.json", "server.json"];

/**
 * Find server folder and config file based on LinuxGSM install.
 * LinuxGSM: user runs ./armarserver install → script in ~/armarserver, game files in ~/serverfiles.
 * See https://linuxgsm.com/servers/armarserver/
 */
function getLinuxGSMCandidates() {
  const out = [];
  if (process.platform !== "linux") return out;
  try {
    const home = "/home";
    const entries = readdirSync(home, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith(".")) continue;
      const userHome = join(home, e.name);
      const scriptPath = join(userHome, LINUXGSM_SCRIPT);
      const serverfilesPath = join(userHome, LINUXGSM_SERVERFILES);
      const exePath = join(serverfilesPath, ARMA_EXECUTABLE);
      if (existsSync(scriptPath) && existsSync(exePath)) {
        out.push(serverfilesPath);
      }
    }
  } catch (_) {}
  return out;
}

/**
 * Detect failed or incomplete LinuxGSM/armarserver install: script exists but serverfiles missing or binary missing.
 * Returns { found: true, user, reason, message } for first incomplete install, or { found: false }.
 */
function getIncompleteLinuxGSM() {
  if (process.platform !== "linux") return { found: false };
  try {
    const home = "/home";
    const entries = readdirSync(home, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith(".")) continue;
      const userHome = join(home, e.name);
      const scriptPath = join(userHome, LINUXGSM_SCRIPT);
      const serverfilesPath = join(userHome, LINUXGSM_SERVERFILES);
      const exePath = join(serverfilesPath, ARMA_EXECUTABLE);
      if (!existsSync(scriptPath)) continue;
      if (!existsSync(serverfilesPath)) {
        return {
          found: true,
          user: e.name,
          reason: "no_serverfiles",
          message: `LinuxGSM script found for user "${e.name}" but server files are missing. Run: sudo su - ${e.name} then ./armarserver install`,
        };
      }
      if (!existsSync(exePath)) {
        return {
          found: true,
          user: e.name,
          reason: "no_binary",
          message: `LinuxGSM serverfiles exist for "${e.name}" but ${ARMA_EXECUTABLE} is missing. Run: sudo su - ${e.name} then ./armarserver install`,
        };
      }
    }
  } catch (_) {}
  return { found: false };
}

/** Fallback: paths that might contain ArmaReforgerServer (non-LinuxGSM or legacy). */
function getFallbackCandidates() {
  const candidates = [
    "/home/armarserver/serverfiles",
    "/home/armarserver",
    "/opt/armarserver/serverfiles",
    "/opt/armarserver",
  ];
  if (process.platform !== "linux") return [];
  try {
    const home = "/home";
    const entries = readdirSync(home, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith(".")) continue;
      const serverfiles = join(home, e.name, LINUXGSM_SERVERFILES);
      const homedir = join(home, e.name);
      if (!candidates.includes(serverfiles)) candidates.push(serverfiles);
      if (!candidates.includes(homedir)) candidates.push(homedir);
    }
  } catch (_) {}
  return candidates;
}

function pickConfigInDir(dir) {
  for (const name of CONFIG_CANDIDATES) {
    if (existsSync(join(dir, name))) return name;
  }
  return null;
}

async function findConfigInDir(dir) {
  let configFile = pickConfigInDir(dir);
  if (configFile) return configFile;
  const files = await readdir(dir).catch(() => []);
  const json = files.filter((f) => f.endsWith(".json"));
  for (const f of json) {
    const raw = await readFile(join(dir, f), "utf8").catch(() => "");
    if (raw && /"(?:bindPort|publicPort|gameHost|rcon|publicAddress)"/.test(raw)) return f;
  }
  return json.length > 0 ? json[0] : CONFIG_CANDIDATES[0];
}

/**
 * Detect server folder and config file. Prefers LinuxGSM installs (user with armarserver script + serverfiles).
 * Also detects failed/incomplete LinuxGSM install (script present but serverfiles or binary missing).
 * Returns { serverFolder, configFile, source?, installStatus, installMessage?, linuxgsmUser? }.
 * installStatus: 'ok' | 'incomplete' | 'not_found'
 */
export async function detectServer() {
  if (process.platform !== "linux") {
    return {
      serverFolder: null,
      configFile: null,
      installStatus: "not_found",
      installMessage: "Detection only supported on Linux.",
    };
  }
  const linuxgsmPaths = getLinuxGSMCandidates();
  const fallbackPaths = getFallbackCandidates();
  const ordered = [...linuxgsmPaths];
  for (const p of fallbackPaths) {
    if (ordered.includes(p)) continue;
    const exe = join(p, ARMA_EXECUTABLE);
    if (existsSync(exe)) ordered.push(p);
  }
  for (const dir of ordered) {
    try {
      const exe = join(dir, ARMA_EXECUTABLE);
      if (!existsSync(exe)) continue;
      const configFile = await findConfigInDir(dir);
      return {
        serverFolder: dir,
        configFile: configFile || CONFIG_CANDIDATES[0],
        source: linuxgsmPaths.includes(dir) ? "linuxgsm" : undefined,
        installStatus: "ok",
      };
    } catch (_) {
      continue;
    }
  }
  const incomplete = getIncompleteLinuxGSM();
  if (incomplete.found) {
    return {
      serverFolder: null,
      configFile: null,
      installStatus: "incomplete",
      installMessage: incomplete.message,
      linuxgsmUser: incomplete.user,
      reason: incomplete.reason,
    };
  }
  return {
    serverFolder: null,
    configFile: null,
    installStatus: "not_found",
    installMessage: "No Arma Reforger server or LinuxGSM install found. Install via: curl -Lo linuxgsm.sh https://linuxgsm.sh && bash linuxgsm.sh armarserver then ./armarserver install",
  };
}

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

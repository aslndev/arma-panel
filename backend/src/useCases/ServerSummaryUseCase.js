import { readdir, stat, readFile } from "fs/promises";
import { join, resolve } from "path";
import * as SettingsRepo from "../repositories/SettingsRepository.js";

const LOGS_SUBPATH = "profiles/server/logs";

function getServerFolder() {
  const s = SettingsRepo.getSettings();
  const folder = (s?.serverFolder ?? "").trim();
  if (!folder) throw new Error("Server folder is not configured.");
  return resolve(folder);
}

function getLogsPath() {
  return join(getServerFolder(), LOGS_SUBPATH);
}

function safeJoin(base, ...parts) {
  const full = resolve(base, ...parts);
  if (!full.startsWith(resolve(base))) throw new Error("Invalid path");
  return full;
}

/** List log session dirs (logs_YYYY-MM-DD_HH-mm-ss) sorted newest first */
export async function listSessions() {
  const logsPath = getLogsPath();
  try {
    const entries = await readdir(logsPath, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory() && e.name.startsWith("logs_"))
      .map((e) => e.name)
      .sort()
      .reverse();
    return dirs;
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

/** Get path to latest session's console.log; null if none */
export async function getLatestConsolePath() {
  const sessions = await listSessions();
  if (sessions.length === 0) return null;
  const logsPath = getLogsPath();
  const p = safeJoin(logsPath, sessions[0], "console.log");
  try {
    await stat(p);
    return p;
  } catch {
    return null;
  }
}

/** Read file content from a log session. sessionName can be "logs_2026-03-08_06-13-03" or "2026-03-08_06-13-03". tail = last N lines. */
export async function readLogFile(sessionName, fileName, tail) {
  const logsPath = getLogsPath();
  const allowed = ["console.log", "error.log", "script.log"];
  if (!allowed.includes(fileName)) throw new Error("Invalid file name");
  const dirName = sessionName.startsWith("logs_") ? sessionName : `logs_${sessionName}`;
  const safeName = dirName.replace(/[^a-zA-Z0-9_.-]/g, "");
  if (safeName !== dirName) throw new Error("Invalid session name");
  const filePath = safeJoin(logsPath, dirName, fileName);
  const content = await readFile(filePath, "utf8").catch((e) => {
    if (e.code === "ENOENT") throw new Error("File not found");
    throw e;
  });
  if (tail != null && tail > 0) {
    const lines = content.split("\n");
    const start = Math.max(0, lines.length - Number(tail));
    return lines.slice(start).join("\n");
  }
  return content;
}

/** Session name without "logs_" prefix for API */
export function sessionNameFromDir(dirName) {
  if (!dirName.startsWith("logs_")) return null;
  return dirName.slice(5);
}

export async function getSummary(reqHost) {
  const serverFolder = getServerFolder();
  const sessions = await listSessions();
  let sessionStartedAt = null;
  let uptimeSeconds = 0;
  if (sessions.length > 0) {
    const logsPath = getLogsPath();
    const latestDir = join(logsPath, sessions[0]);
    try {
      const st = await stat(latestDir);
      sessionStartedAt = st.mtime.toISOString();
      uptimeSeconds = Math.max(0, Math.floor((Date.now() - st.mtime.getTime()) / 1000));
    } catch (_) {}
  }
  let address = "";
  let port = null;
  try {
    const s = SettingsRepo.getSettings();
    const configPath = (s?.configFile ?? "").trim();
    if (configPath) {
      const fullPath = configPath.startsWith("/") ? resolve(configPath) : join(serverFolder, configPath);
      const raw = await readFile(fullPath, "utf8").catch(() => null);
      if (raw) {
        const cfg = JSON.parse(raw);
        address = cfg.publicAddress ?? cfg.bindAddress ?? "";
        port = cfg.publicPort ?? cfg.bindPort ?? null;
      }
    }
  } catch (_) {}
  if (!address && reqHost) address = reqHost.replace(/:.*/, "");

  return {
    serverFolder,
    sessionStartedAt,
    uptimeSeconds,
    address: address || null,
    port: port != null ? Number(port) : null,
    hasSession: sessions.length > 0,
  };
}

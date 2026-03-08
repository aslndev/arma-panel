import RCON from "battleye-node";
import * as ConfigUseCase from "./ConfigUseCase.js";
import * as ActivityRepo from "../repositories/ActivityRepository.js";

const RCON_TIMEOUT_MS = 15000;
const RCON_RESPONSE_IDLE_MS = 600;

/**
 * Read RCON connection params from the server config file (same file as Config Editor).
 * Config JSON must have: rcon: { address?, port?, password? }, base: { bindAddress?, publicAddress? }.
 */
export async function getRconConfig() {
  const content = await ConfigUseCase.getContent();
  if (!content || !content.trim()) throw new Error("Config file is empty or not set.");
  let cfg;
  try {
    cfg = JSON.parse(content);
  } catch (e) {
    throw new Error("Config file is not valid JSON.");
  }
  const rcon = cfg.rcon || {};
  const base = cfg.base || {};
  const port = Number(rcon.port) || 19999;
  const password = String(rcon.password ?? "").trim();
  if (!password) throw new Error("RCON password is not set in config. Set it in Config Editor → RCON.");
  let host = String(rcon.address ?? "").trim();
  if (!host) host = String(base.publicAddress ?? base.bindAddress ?? "127.0.0.1").trim() || "127.0.0.1";
  return { host, port, password };
}

/**
 * Execute a single RCON command using battleye-node (BattleEye UDP RCON).
 * Used by Arma Reforger and other BattleEye-protected servers.
 */
function sendCommand(host, port, password, command) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const cleanup = () => {
      try {
        rcon.removeAllListeners();
        rcon.logout();
      } catch (_) {}
    };
    const done = (err, result) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      clearTimeout(idleId);
      cleanup();
      if (err) reject(err);
      else resolve(result ?? "");
    };

    const rcon = new RCON({
      address: host,
      port,
      password,
      connectionType: "udp4",
      connectionTimeout: Math.max(RCON_TIMEOUT_MS, 50000),
      connectionInterval: 5000,
      keepAliveInterval: 10000,
    });

    const timeoutId = setTimeout(() => done(new Error("RCON command timeout")), RCON_TIMEOUT_MS);
    let responseChunks = [];
    let idleId = null;

    rcon.on("onConnect", (connected) => {
      if (!connected) {
        done(new Error("RCON authentication failed"));
        return;
      }
      responseChunks = [];
      rcon.commandSend(command);
      idleId = setTimeout(() => done(null, responseChunks.join("")), RCON_RESPONSE_IDLE_MS);
    });

    rcon.on("message", (msg) => {
      if (typeof msg === "string") responseChunks.push(msg);
      if (idleId) clearTimeout(idleId);
      idleId = setTimeout(() => done(null, responseChunks.join("")), RCON_RESPONSE_IDLE_MS);
    });

    rcon.on("error", (msg) => {
      done(new Error(typeof msg === "string" ? msg : "RCON error"));
    });

    rcon.login();
  });
}

/**
 * Run an RCON command using config from the config file.
 */
export async function runCommand(command, byUser = "admin") {
  const { host, port, password } = await getRconConfig();
  const response = await sendCommand(host, port, password, command);
  try {
    ActivityRepo.log({ type: "rcon", action: "command", detail: command, user: byUser });
  } catch (_) {}
  return response;
}

/** Shared persistent RCON used for players list (set by panelWs). Commands like kick/ban run on this when available. */
let sharedPlayersRcon = null;

export function setSharedPlayersRcon(rcon) {
  sharedPlayersRcon = rcon;
}

export function clearSharedPlayersRcon() {
  sharedPlayersRcon = null;
}

/**
 * Run command on the shared persistent RCON if connected, otherwise open a one-shot connection.
 * Using the same connection as the players list ensures kick/ban/unban are accepted by the server.
 */
async function runCommandPreferredShared(command, byUser = "admin") {
  const rcon = sharedPlayersRcon;
  if (rcon && rcon.isRconConnected) {
    const response = await sendCommandOnConnection(rcon, command);
    try {
      ActivityRepo.log({ type: "rcon", action: "command", detail: command, user: byUser });
    } catch (_) {}
    return response;
  }
  return runCommand(command, byUser);
}

/**
 * Create a persistent RCON connection and wait until connected. Returns the rcon instance.
 * Call rcon.logout() when done. Rejects on auth failure or timeout.
 */
export function connectPersistent(host, port, password) {
  return new Promise((resolve, reject) => {
    const rcon = new RCON({
      address: host,
      port,
      password,
      connectionType: "udp4",
      connectionTimeout: Math.max(RCON_TIMEOUT_MS, 50000),
      connectionInterval: 5000,
      keepAliveInterval: 10000,
    });
    const t = setTimeout(() => {
      rcon.removeAllListeners();
      try { rcon.logout(); } catch (_) {}
      reject(new Error("RCON connection timeout"));
    }, RCON_TIMEOUT_MS);
    rcon.on("onConnect", (connected) => {
      clearTimeout(t);
      if (connected) resolve(rcon);
      else {
        try { rcon.logout(); } catch (_) {}
        reject(new Error("RCON authentication failed"));
      }
    });
    rcon.on("error", (msg) => {
      clearTimeout(t);
      reject(new Error(typeof msg === "string" ? msg : "RCON error"));
    });
    rcon.login();
  });
}

/**
 * Send one command on an already-connected RCON. Resolves with response text.
 * The rcon must already have fired onConnect(true); call after createPersistentRcon + login + onConnect.
 */
export function sendCommandOnConnection(rcon, command) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      rcon.removeListener("message", onMessage);
      rcon.removeListener("error", onError);
      resolve("");
    }, 8000);
    const responseChunks = [];
    let idleId = null;
    const finish = (err, result) => {
      clearTimeout(timeoutId);
      if (idleId) clearTimeout(idleId);
      rcon.removeListener("message", onMessage);
      rcon.removeListener("error", onError);
      if (err) reject(err);
      else resolve(result ?? "");
    };
    const onMessage = (msg) => {
      if (typeof msg === "string") responseChunks.push(msg);
      if (idleId) clearTimeout(idleId);
      idleId = setTimeout(() => finish(null, responseChunks.join("")), RCON_RESPONSE_IDLE_MS);
    };
    const onError = (msg) => finish(new Error(typeof msg === "string" ? msg : "RCON error"));
    rcon.on("message", onMessage);
    rcon.on("error", onError);
    rcon.commandSend(command);
  });
}

/** Lines that are RCON log/header, not player data - skip these. */
const RCON_LOG_PATTERNS = [
  /logged\s+in/i,
  /client\s+id\s*:/i,
  /processing\s+command/i,
  /players\s+on\s+server/i,
  /\[player#\]/i,
  /\[player\s+uid\]/i,
  /\[player\s+name\]/i,
];

function isRconLogLine(line) {
  const t = line.toLowerCase();
  return RCON_LOG_PATTERNS.some((p) => p.test(t));
}

/** Match "X/Y" or "X / Y" (current/max players) in server response. */
const PLAYER_COUNT_REGEX = /(\d+)\s*\/\s*(\d+)/;

/**
 * Parse raw "players" response into { players, raw, playerCount? }.
 * Filters out RCON log/header lines. Supports Reforger format: "N ; UID ; Name".
 * Extracts player count (current/max) when present in the response (e.g. "1/64").
 */
export function parsePlayersResponse(raw) {
  const text = String(raw || "");
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const players = [];
  let playerCount = null;
  const countMatch = text.match(PLAYER_COUNT_REGEX);
  if (countMatch) {
    const current = parseInt(countMatch[1], 10);
    const max = parseInt(countMatch[2], 10);
    if (!Number.isNaN(current) && !Number.isNaN(max)) {
      playerCount = { current, max };
    }
  }
  for (const line of lines) {
    if (isRconLogLine(line)) continue;
    const semicolonParts = line.split(/\s*;\s*/).map((s) => s.trim());
    if (semicolonParts.length >= 3 && /^\d+$/.test(semicolonParts[0])) {
      const id = semicolonParts[0];
      const uid = semicolonParts[1] || "";
      const name = semicolonParts.slice(2).join(" ; ").trim() || uid || id;
      players.push({ identityId: id, name });
      continue;
    }
    const parts = line.split(/\s+/);
    if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
      const id = parts[0];
      const name = parts.slice(1).join(" ").trim() || id;
      players.push({ identityId: id, name });
    }
  }
  if (playerCount == null && players.length > 0) {
    playerCount = { current: players.length, max: null };
  }
  return { players, raw, playerCount };
}

/**
 * List connected players. Sends "players". On RCON/config error returns { players: [], error }.
 * Uses same parsing as parsePlayersResponse (filters RCON log lines, supports "N ; UID ; Name").
 * Includes playerCount { current, max } when present in server response.
 */
export async function listPlayers(byUser = "admin") {
  let raw = "";
  try {
    raw = await runCommand("#players", byUser);
  } catch (err) {
    const msg = err?.message || String(err);
    return { players: [], raw: "", error: msg };
  }
  const { players, playerCount } = parsePlayersResponse(raw);
  return { players, raw, playerCount };
}

/**
 * Kick a player by numeric player ID. Arma Reforger: #kick <playerId>
 * Uses shared persistent RCON when available so the server accepts the command.
 */
export async function kickPlayer(identityId, reason, byUser = "admin") {
  const id = String(identityId).trim();
  const cmd = reason ? `#kick ${id} ${reason}` : `#kick ${id}`;
  return runCommandPreferredShared(cmd, byUser);
}

/**
 * Ban a player. Arma Reforger: #ban <playerId> <durationSeconds> (0 = permanent).
 * Uses shared persistent RCON when available.
 */
export async function banPlayer(identityId, reason, durationSeconds, byUser = "admin") {
  const id = String(identityId).trim();
  const duration = Math.max(0, Number(durationSeconds) || 0);
  const cmd = `#ban ${id} ${duration}`;
  return runCommandPreferredShared(cmd, byUser);
}

/**
 * Unban a player. Arma Reforger: #unban <playerId>
 * Uses shared persistent RCON when available.
 */
export async function unbanPlayer(identityId, byUser = "admin") {
  const id = String(identityId).trim();
  return runCommandPreferredShared(`#unban ${id}`, byUser);
}

/**
 * Get ban list. Optional page for pagination.
 */
export async function getBanList(page = 1, byUser = "admin") {
  const raw = await runCommand(`#ban list ${page}`, byUser);
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const bans = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length >= 1) bans.push({ identityId: parts[0], detail: line });
  }
  return { bans, raw };
}

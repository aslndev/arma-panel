import Rcon from "rcon";
import * as ConfigUseCase from "./ConfigUseCase.js";
import * as ActivityRepo from "../repositories/ActivityRepository.js";

const RCON_TIMEOUT_MS = 10000;

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
 * Execute a single RCON command. Uses the 'rcon' npm package (TCP Source-style RCON).
 * Reforger may use a compatible protocol; if connection fails, RCON config or protocol may differ.
 */
function sendCommand(host, port, password, command) {
  return new Promise((resolve, reject) => {
    const client = new Rcon(host, port, password, { tcp: true, challenge: false });
    let resolved = false;
    let responseAcc = "";
    let responseTimer = null;
    const done = (err, result) => {
      if (resolved) return;
      resolved = true;
      if (responseTimer) clearTimeout(responseTimer);
      clearTimeout(timeoutId);
      try { client.disconnect(); } catch (_) {}
      if (err) reject(err);
      else resolve(result ?? "");
    };
    const timeoutId = setTimeout(() => done(new Error("RCON command timeout")), RCON_TIMEOUT_MS);
    client.on("error", (err) => {
      clearTimeout(timeoutId);
      if (responseTimer) clearTimeout(responseTimer);
      done(err);
    });
    client.on("end", () => done(null, responseAcc));
    client.on("response", (str) => {
      if (typeof str === "string") responseAcc += str;
      if (responseTimer) clearTimeout(responseTimer);
      responseTimer = setTimeout(() => done(null, responseAcc), 300);
    });
    client.on("auth", () => client.send(command));
    client.connect();
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

/**
 * List connected players. Sends "players". On RCON/config error returns { players: [], error }.
 * Expected format is often: "ID Name" per line or similar; we try to parse and fallback to raw lines.
 */
export async function listPlayers(byUser = "admin") {
  let raw = "";
  try {
    raw = await runCommand("players", byUser);
  } catch (err) {
    const msg = err?.message || String(err);
    return { players: [], raw: "", error: msg };
  }
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const players = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length >= 1) {
      const id = parts[0];
      const name = parts.slice(1).join(" ").trim() || id;
      if (id && /^[\d]+$/.test(id)) players.push({ identityId: id, name });
      else if (line) players.push({ identityId: line, name: line });
    }
  }
  return { players, raw };
}

/**
 * Kick a player by IdentityId. Optional reason.
 */
export async function kickPlayer(identityId, reason, byUser = "admin") {
  const cmd = reason ? `kick ${identityId} ${reason}` : `kick ${identityId}`;
  return runCommand(cmd, byUser);
}

/**
 * Ban a player. reason optional; durationSeconds 0 or omitted = permanent (if supported).
 */
export async function banPlayer(identityId, reason, durationSeconds, byUser = "admin") {
  const reasonPart = reason ? ` ${reason}` : "";
  const cmd = durationSeconds > 0
    ? `#ban create ${identityId} ${durationSeconds}${reasonPart}`
    : `ban ${identityId}${reasonPart}`;
  return runCommand(cmd.trim(), byUser);
}

/**
 * Unban a player by IdentityId.
 */
export async function unbanPlayer(identityId, byUser = "admin") {
  return runCommand(`#ban remove ${identityId}`, byUser);
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

import { spawn, execSync } from "child_process";
import { join, resolve } from "path";
import { existsSync } from "fs";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import * as SettingsRepo from "../repositories/SettingsRepository.js";
import * as ActivityRepo from "../repositories/ActivityRepository.js";

const ACTIONS = ["start", "stop", "restart"];
const PID_FILE = ".arma-server.pid";
const MAXFPS = "60";
const EXECUTABLE_NAME = "ArmaReforgerServer";
const SYSTEMD_GAME_SERVICE = "arma-server";

/** True if game server should be controlled via systemd (install script marker or unit exists on Linux). */
function useSystemdGameServer() {
  try {
    const dataDir = join(process.cwd(), "data");
    if (existsSync(join(dataDir, ".use-systemd-game-server"))) return true;
    if (process.platform !== "linux") return false;
    execSync(`systemctl list-unit-files ${SYSTEMD_GAME_SERVICE}.service`, {
      encoding: "utf8",
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

/** Write SERVER_FOLDER and CONFIG_FILE for systemd wrapper script. */
async function writeArmaServerEnv() {
  const { serverFolder, configFile } = getSettings();
  const dataDir = join(process.cwd(), "data");
  const envPath = join(dataDir, "arma-server.env");
  const content = `SERVER_FOLDER=${serverFolder}\nCONFIG_FILE=${configFile}\n`;
  await writeFile(envPath, content, "utf8");
}

function systemctl(cmd) {
  execSync(`sudo -n systemctl ${cmd} ${SYSTEMD_GAME_SERVICE}`, {
    encoding: "utf8",
    stdio: "pipe",
  });
}

function getPidPath(serverFolder) {
  return join(serverFolder, PID_FILE);
}

function getSettings() {
  const s = SettingsRepo.getSettings();
  const serverFolder = (s?.serverFolder ?? "").trim();
  const configFile = (s?.configFile ?? "").trim();
  if (!serverFolder) throw new Error("Server folder is not configured. Set it in Settings.");
  if (!configFile) throw new Error("Config file is not configured. Set it in Settings.");
  return { serverFolder, configFile };
}

function isAbsolutePath(p) {
  return p.startsWith("/");
}

function resolveConfigPath(serverFolder, configFile) {
  return isAbsolutePath(configFile) ? resolve(configFile) : join(serverFolder, configFile);
}

function resolveProfilePath(serverFolder) {
  return join(serverFolder, "profiles", "server");
}

/** Start: via systemd if configured, else spawn process. */
export async function start(byUser = "admin") {
  const { serverFolder, configFile } = getSettings();
  const configPath = resolveConfigPath(serverFolder, configFile);
  const profilePath = resolveProfilePath(serverFolder);
  const executable = join(serverFolder, EXECUTABLE_NAME);

  if (!existsSync(serverFolder)) {
    throw new Error(`Server folder does not exist: ${serverFolder}`);
  }
  if (!existsSync(executable)) {
    throw new Error(`${EXECUTABLE_NAME} not found at ${executable}. Ensure the binary is in the server folder.`);
  }
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}. Check Settings > Config File.`);
  }
  try {
    await mkdir(profilePath, { recursive: true });
  } catch (e) {
    throw new Error(`Could not create profile directory ${profilePath}: ${e.message}`);
  }

  if (useSystemdGameServer()) {
    await writeArmaServerEnv();
    try {
      systemctl("start");
    } catch (e) {
      const msg = e.message || String(e);
      ActivityRepo.log({ type: "server", action: "Server start failed", detail: msg, user: byUser });
      throw new Error(`systemctl start ${SYSTEMD_GAME_SERVICE} failed: ${msg}`);
    }
    ActivityRepo.log({
      type: "server",
      action: "Server start requested",
      detail: `systemctl start ${SYSTEMD_GAME_SERVICE}`,
      user: byUser,
    });
    return;
  }

  const args = [
    "-config", configPath,
    "-profile", profilePath,
    "-maxFPS", MAXFPS,
  ];

  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    const settle = (fn) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const stderrChunks = [];
    const child = spawn(executable, args, {
      cwd: serverFolder,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });

    if (child.stderr) {
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk) => stderrChunks.push(chunk));
    }

    child.on("error", (err) => {
      ActivityRepo.log({
        type: "server",
        action: "Server start failed",
        detail: err.message,
        user: byUser,
      });
      const msg = err.code === "ENOENT"
        ? `${EXECUTABLE_NAME} not found at ${executable}. Ensure the binary is in the server folder.`
        : err.message;
      settle(() => rejectPromise(new Error(msg)));
    });

    child.on("exit", (code, signal) => {
      if (settled) return;
      const pidPath = getPidPath(serverFolder);
      unlink(pidPath).catch(() => {});
      const stderrText = stderrChunks.join("").trim();
      const errSnippet = stderrText.length > 800 ? stderrText.slice(-800) : stderrText;
      ActivityRepo.log({
        type: "server",
        action: "Server start failed",
        detail: `Process exited (code=${code}, signal=${signal})${errSnippet ? ": " + errSnippet.slice(0, 200) : ""}`,
        user: byUser,
      });
      let msg =
        code != null && code !== 0
          ? `Server process exited with code ${code}.`
          : "Server process exited immediately.";
      if (errSnippet) {
        msg += ` Output: ${errSnippet.replace(/\s+/g, " ").slice(0, 500)}`;
      } else {
        msg += " Check Logs tab and paths (config, profile).";
      }
      settle(() => rejectPromise(new Error(msg)));
    });

    child.on("spawn", async () => {
      const pid = child.pid;
      const pidPath = getPidPath(serverFolder);
      try {
        await writeFile(pidPath, String(pid), "utf8");
      } catch (e) {
        // non-fatal
      }
      ActivityRepo.log({
        type: "server",
        action: "Server start requested",
        detail: `${executable} -config ${configPath} -profile ${profilePath} -maxFPS ${MAXFPS}`,
        user: byUser,
      });
      // Only resolve after a short delay; if process is still alive, start succeeded
      setTimeout(() => {
        if (settled) return;
        try {
          process.kill(pid, 0);
        } catch (e) {
          if (e.code === "ESRCH") {
            settle(() =>
              rejectPromise(
                new Error("Server process exited shortly after start. Check Logs tab and Settings.")
              )
            );
            return;
          }
        }
        child.unref();
        settle(() => resolvePromise());
      }, 2500);
    });
  });
}

/** Stop: via systemd if configured, else PID file. */
export async function stop(byUser = "admin") {
  if (useSystemdGameServer()) {
    try {
      systemctl("stop");
    } catch (e) {
      const msg = e.message || String(e);
      ActivityRepo.log({ type: "server", action: "Server stop failed", detail: msg, user: byUser });
      throw new Error(`systemctl stop ${SYSTEMD_GAME_SERVICE} failed: ${msg}`);
    }
    ActivityRepo.log({
      type: "server",
      action: "Server stop requested",
      detail: `systemctl stop ${SYSTEMD_GAME_SERVICE}`,
      user: byUser,
    });
    return;
  }

  const { serverFolder } = getSettings();
  const pidPath = getPidPath(serverFolder);
  let pid;
  try {
    const buf = await readFile(pidPath, "utf8");
    pid = parseInt(buf.trim(), 10);
    if (Number.isNaN(pid)) throw new Error("Invalid PID");
  } catch (e) {
    if (e.code === "ENOENT") throw new Error("Server is not running (no PID file).");
    throw e;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch (e) {
    if (e.code === "ESRCH") {
      // process already dead
    } else {
      throw e;
    }
  }

  try {
    await unlink(pidPath);
  } catch (_) {}

  ActivityRepo.log({
    type: "server",
    action: "Server stop requested",
    detail: `Killed process ${pid}`,
    user: byUser,
  });
}

/** Restart: via systemd if configured, else stop then start. */
export async function restart(byUser = "admin") {
  if (useSystemdGameServer()) {
    await writeArmaServerEnv();
    try {
      systemctl("restart");
    } catch (e) {
      const msg = e.message || String(e);
      ActivityRepo.log({ type: "server", action: "Server restart failed", detail: msg, user: byUser });
      throw new Error(`systemctl restart ${SYSTEMD_GAME_SERVICE} failed: ${msg}`);
    }
    ActivityRepo.log({
      type: "server",
      action: "Server restart requested",
      detail: `systemctl restart ${SYSTEMD_GAME_SERVICE}`,
      user: byUser,
    });
    return;
  }

  const { serverFolder } = getSettings();
  const pidPath = getPidPath(serverFolder);
  try {
    const buf = await readFile(pidPath, "utf8");
    const pid = parseInt(buf.trim(), 10);
    if (!Number.isNaN(pid)) {
      try {
        process.kill(pid, "SIGTERM");
      } catch (_) {}
      await unlink(pidPath).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
    }
  } catch (_) {}

  await start(byUser);
  ActivityRepo.log({
    type: "server",
    action: "Server restart requested",
    detail: "Stop then start",
    user: byUser,
  });
}

export async function runAction(action, byUser = "admin") {
  if (!ACTIONS.includes(action)) {
    throw new Error("Invalid action. Use start, stop, or restart.");
  }
  if (action === "start") return start(byUser);
  if (action === "stop") return stop(byUser);
  if (action === "restart") return restart(byUser);
}

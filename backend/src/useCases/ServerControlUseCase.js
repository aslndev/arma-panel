import { spawn } from "child_process";
import { join, resolve } from "path";
import { existsSync } from "fs";
import { writeFile, readFile, unlink } from "fs/promises";
import * as SettingsRepo from "../repositories/SettingsRepository.js";
import * as ActivityRepo from "../repositories/ActivityRepository.js";

const ACTIONS = ["start", "stop", "restart"];
const PID_FILE = ".arma-server.pid";
const MAXFPS = "60";

function getPidPath(serverFolder) {
  return join(serverFolder, PID_FILE);
}

function getSettings() {
  const s = SettingsRepo.getSettings();
  const serverFolder = (s?.serverFolder ?? "").trim();
  const configFile = (s?.configFile ?? "").trim();
  const armaServerFile = (s?.armaServerFile ?? "").trim();
  if (!serverFolder) throw new Error("Server folder is not configured. Set it in Settings.");
  if (!configFile) throw new Error("Config file is not configured. Set it in Settings.");
  if (!armaServerFile) throw new Error("ArmaServer File is not configured. Set it in Settings.");
  return { serverFolder, configFile, armaServerFile };
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

/** Resolve executable path (Linux: absolute or relative to server folder). */
function resolveExecutable(serverFolder, armaServerFile) {
  return isAbsolutePath(armaServerFile)
    ? armaServerFile
    : join(serverFolder, armaServerFile.replace(/^\.\//, ""));
}

/** Start: run ArmaReforgerServer with -config, -profile, -maxFPS. Save PID to .arma-server.pid in server folder. */
export async function start(byUser = "admin") {
  const { serverFolder, configFile, armaServerFile } = getSettings();
  const configPath = resolveConfigPath(serverFolder, configFile);
  const profilePath = resolveProfilePath(serverFolder);
  const executable = resolveExecutable(serverFolder, armaServerFile);

  if (!existsSync(serverFolder)) {
    throw new Error(`Server folder does not exist: ${serverFolder}`);
  }
  if (!existsSync(executable)) {
    throw new Error(`ArmaServer executable not found: ${executable}. Check Settings > ArmaServer File.`);
  }

  const args = [
    "-config", configPath,
    "-profile", profilePath,
    "-maxFPS", MAXFPS,
  ];

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, args, {
      cwd: serverFolder,
      stdio: "ignore",
      detached: true,
    });

    child.on("error", (err) => {
      ActivityRepo.log({
        type: "server",
        action: "Server start failed",
        detail: err.message,
        user: byUser,
      });
      const msg = err.code === "ENOENT"
        ? `Executable not found: ${executable}. Check Settings > ArmaServer File.`
        : err.message;
      rejectPromise(new Error(msg));
    });

    child.on("spawn", async () => {
      const pid = child.pid;
      child.unref();
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
      resolvePromise();
    });
  });
}

/** Stop: read PID from .arma-server.pid and kill that process, then remove the file. */
export async function stop(byUser = "admin") {
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

/** Restart: stop then start. */
export async function restart(byUser = "admin") {
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
      // brief wait for process to exit
      await new Promise((r) => setTimeout(r, 2000));
    }
  } catch (_) {
    // no PID file or already stopped
  }

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

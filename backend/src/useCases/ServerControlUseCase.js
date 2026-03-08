import { spawn } from "child_process";
import { join, resolve } from "path";
import { existsSync } from "fs";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
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
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}. Check Settings > Config File.`);
  }
  try {
    await mkdir(profilePath, { recursive: true });
  } catch (e) {
    throw new Error(`Could not create profile directory ${profilePath}: ${e.message}`);
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
        ? `Executable not found: ${executable}. Check Settings > ArmaServer File.`
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

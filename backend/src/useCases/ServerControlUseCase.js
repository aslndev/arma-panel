import { spawn } from "child_process";
import * as SettingsRepo from "../repositories/SettingsRepository.js";
import * as ActivityRepo from "../repositories/ActivityRepository.js";

const ACTIONS = ["start", "stop", "restart"];

export function runAction(action, byUser = "admin") {
  if (!ACTIONS.includes(action)) {
    throw new Error("Invalid action. Use start, stop, or restart.");
  }
  const settings = SettingsRepo.getSettings();
  const armaServerFile = (settings?.armaServerFile ?? "").trim();
  const serverFolder = (settings?.serverFolder ?? "").trim() || undefined;

  if (!armaServerFile) {
    throw new Error("ArmaServer File is not configured. Set it in Settings.");
  }

  return new Promise((resolve, reject) => {
    const opts = {
      cwd: serverFolder || undefined,
      stdio: "ignore",
      detached: action === "start",
    };
    const child = spawn(armaServerFile, [action], opts);

    if (action === "start" && child.unref) {
      child.unref();
    }

    child.on("error", (err) => {
      ActivityRepo.log({
        type: "server",
        action: `Server ${action} failed`,
        detail: err.message,
        user: byUser,
      });
      reject(err);
    });

    child.on("spawn", () => {
      ActivityRepo.log({
        type: "server",
        action: `Server ${action} requested`,
        detail: `${armaServerFile} ${action}`,
        user: byUser,
      });
      resolve();
    });
  });
}

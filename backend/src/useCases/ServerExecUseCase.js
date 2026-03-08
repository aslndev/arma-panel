import { exec } from "child_process";
import { promisify } from "util";
import * as SettingsRepo from "../repositories/SettingsRepository.js";

const execAsync = promisify(exec);
const TIMEOUT_MS = 30000;
const MAX_BUFFER = 512 * 1024;

export async function runCommand(command, byUser = "admin") {
  const s = SettingsRepo.getSettings();
  const serverFolder = (s?.serverFolder ?? "").trim();
  if (!serverFolder) throw new Error("Server folder is not configured. Set it in Settings.");
  const cmd = (command || "").trim();
  if (!cmd) throw new Error("Command is required.");
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: serverFolder,
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      shell: "/bin/bash",
    });
    return {
      stdout: stdout || "",
      stderr: stderr || "",
      code: 0,
    };
  } catch (err) {
    const code = err.code ?? (err.killed ? 124 : 1);
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || err.message || "",
      code: typeof code === "number" ? code : 1,
    };
  }
}

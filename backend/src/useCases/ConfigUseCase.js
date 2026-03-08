import { readFile, writeFile } from "fs/promises";
import { join, resolve } from "path";
import * as SettingsRepo from "../repositories/SettingsRepository.js";
import * as ActivityRepo from "../repositories/ActivityRepository.js";

function getConfigFilePath() {
  const settings = SettingsRepo.getSettings();
  const serverFolder = (settings?.serverFolder ?? "").trim();
  const configFile = (settings?.configFile ?? "").trim();
  if (!configFile) throw new Error("Config file path is not set. Configure it in Settings.");
  if (configFile.startsWith("/")) return resolve(configFile);
  if (!serverFolder) throw new Error("Server folder is not configured. Set it in Settings.");
  return resolve(join(serverFolder, configFile));
}

export async function getContent() {
  const filePath = getConfigFilePath();
  try {
    const content = await readFile(filePath, "utf8");
    return content;
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

export async function saveContent(content, byUser = "admin") {
  const filePath = getConfigFilePath();
  await writeFile(filePath, content ?? "", "utf8");
  ActivityRepo.log({ type: "config", action: "Config Saved", detail: filePath, user: byUser });
}

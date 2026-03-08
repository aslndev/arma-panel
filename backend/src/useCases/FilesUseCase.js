import * as FileRepo from "../repositories/FileRepository.js";
import * as SettingsRepo from "../repositories/SettingsRepository.js";
import * as ActivityRepo from "../repositories/ActivityRepository.js";

function getBasePath() {
  const settings = SettingsRepo.getSettings();
  const base = (settings?.serverFolder ?? "").trim();
  if (!base) throw new Error("Server folder is not configured. Set it in Settings.");
  return base;
}

export async function list(path) {
  const basePath = getBasePath();
  const listResult = await FileRepo.list(basePath, path || "");
  return listResult.map((f) => ({ ...f, content: undefined }));
}

export async function createFolder(path, name, byUser = "admin") {
  const trimmed = (name || "").trim();
  if (!trimmed) throw new Error("Folder name required");
  const basePath = getBasePath();
  await FileRepo.createFolder(basePath, path || "", trimmed, byUser);
  ActivityRepo.log({ type: "file", action: "Folder Created", detail: trimmed, user: byUser });
  return list(path);
}

export async function uploadFile(path, name, content, size, byUser = "admin") {
  const trimmed = (name || "").trim();
  if (!trimmed) throw new Error("File name required");
  const basePath = getBasePath();
  await FileRepo.writeFileAt(basePath, path || "", trimmed, content ?? "", byUser);
  ActivityRepo.log({ type: "file", action: "File Uploaded", detail: trimmed, user: byUser });
  return list(path);
}

export async function getFileContent(path, name) {
  const basePath = getBasePath();
  return FileRepo.readFileContent(basePath, path || "", name);
}

export async function updateFile(path, name, data, byUser = "admin") {
  const basePath = getBasePath();
  if (data.content !== undefined) {
    await FileRepo.updateContent(basePath, path || "", name, data.content, byUser);
    ActivityRepo.log({ type: "file", action: "File Edited", detail: name, user: byUser });
  }
  if (data.newName) {
    const items = await FileRepo.list(basePath, path || "");
    const entry = items.find((f) => f.name === name);
    await FileRepo.renameEntry(basePath, path || "", name, data.newName, entry?.type, byUser);
    ActivityRepo.log({ type: "file", action: "File Renamed", detail: `${name} -> ${data.newName}`, user: byUser });
  }
  return list(path);
}

export async function removeFile(path, name, byUser = "admin") {
  const basePath = getBasePath();
  const items = await FileRepo.list(basePath, path || "");
  const entry = items.find((f) => f.name === name);
  await FileRepo.remove(basePath, path || "", name, byUser);
  ActivityRepo.log({
    type: "file",
    action: entry?.type === "folder" ? "Folder Deleted" : "File Deleted",
    detail: name,
    user: byUser,
  });
}

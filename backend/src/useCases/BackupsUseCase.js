import * as BackupRepo from "../repositories/BackupRepository.js";
import * as ActivityRepo from "../repositories/ActivityRepository.js";

export function list() {
  return BackupRepo.findAll();
}

export function create(data, byUser = "admin") {
  const name =
    (data.name || "").trim() ||
    `backup-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "-").replace(/\..*/, "")}`;
  BackupRepo.create({ name, size: "—", status: "completed" });
  ActivityRepo.log({
    type: "file",
    action: "Backup Created",
    detail: name,
    user: byUser,
  });
  return BackupRepo.findAll();
}

export function restore(id, byUser = "admin") {
  const list = BackupRepo.findAll();
  const backup = list.find((b) => b.id === id);
  if (backup) {
    ActivityRepo.log({
      type: "server",
      action: "Backup Restore Started",
      detail: backup.name,
      user: byUser,
    });
  }
}

export function remove(id, byUser = "admin") {
  const list = BackupRepo.findAll();
  const backup = list.find((b) => b.id === id);
  if (!backup) return;
  if (backup.locked) {
    throw new Error("Cannot delete locked backup");
  }
  BackupRepo.deleteById(id);
  ActivityRepo.log({ type: "file", action: "Backup Deleted", detail: backup.name, user: byUser });
}

import bcrypt from "bcryptjs";
import * as AuthUserRepo from "../repositories/AuthUserRepository.js";
import * as ActivityRepo from "../repositories/ActivityRepository.js";

const DEFAULT_PERMISSIONS = ["console"];

export function list() {
  return AuthUserRepo.findAll();
}

export function create(data, byUser = "admin") {
  const username = (data.username || "").trim();
  const password = data.password;
  const role = data.role || "subuser";
  const permissions = Array.isArray(data.permissions) ? data.permissions : DEFAULT_PERMISSIONS;
  if (!username) throw new Error("Username is required");
  if (!password || String(password).length < 1) throw new Error("Password is required");
  const passwordHash = bcrypt.hashSync(String(password), 10);
  const id = AuthUserRepo.create(username, passwordHash, role, permissions);
  ActivityRepo.log({
    type: "user",
    action: "User Added",
    detail: `${username} as ${role}`,
    user: byUser,
  });
  const all = AuthUserRepo.findAll();
  return all.find((u) => u.id === id) || { id, username, role, permissions, createdAt: new Date().toISOString() };
}

export function update(id, data, byUser = "admin") {
  const payload = {};
  if (data.role != null) payload.role = data.role;
  if (data.permissions != null) payload.permissions = data.permissions;
  if (data.password != null && String(data.password).length > 0) {
    payload.passwordHash = bcrypt.hashSync(String(data.password), 10);
  }
  if (data.username != null && (data.username || "").trim()) {
    payload.username = data.username.trim();
  }
  if (Object.keys(payload).length === 0) throw new Error("Nothing to update");
  AuthUserRepo.update(id, payload);
  ActivityRepo.log({
    type: "user",
    action: "User Updated",
    detail: id,
    user: byUser,
  });
  return AuthUserRepo.findAll().find((u) => u.id === id) || AuthUserRepo.getById(id);
}

export function remove(id, currentUserId, byUser = "admin") {
  if (String(id) === String(currentUserId)) {
    throw new Error("You cannot remove your own account");
  }
  const list = AuthUserRepo.findAll();
  const target = list.find((u) => u.id === id);
  if (!target) throw new Error("User not found");
  const admins = list.filter((u) => u.role === "admin" || u.role === "owner");
  if (admins.length <= 1 && (target.role === "admin" || target.role === "owner")) {
    throw new Error("Cannot remove the last admin");
  }
  AuthUserRepo.deleteById(id);
  ActivityRepo.log({
    type: "user",
    action: "User Removed",
    detail: target.username,
    user: byUser,
  });
}

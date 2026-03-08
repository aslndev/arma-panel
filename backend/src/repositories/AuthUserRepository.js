import db from "../infrastructure/database.js";

const PERMISSIONS_COL = "permissions_json";
const hasPermissionsCol = () => {
  try {
    const info = db.prepare("PRAGMA table_info(auth_users)").all();
    return info.some((c) => c.name === "role");
  } catch {
    return false;
  }
};

function selectCols() {
  return hasPermissionsCol()
    ? "id, username, password_hash AS passwordHash, role, permissions_json AS permissionsJson, created_at AS createdAt"
    : "id, username, password_hash AS passwordHash, created_at AS createdAt";
}

function selectColsNoPassword() {
  return hasPermissionsCol()
    ? "id, username, role, permissions_json AS permissionsJson, created_at AS createdAt"
    : "id, username, created_at AS createdAt";
}

export function findByUsername(username) {
  const row = db.prepare(`SELECT ${selectCols()} FROM auth_users WHERE username = ?`).get(username);
  if (!row) return null;
  if (row.permissionsJson != null) {
    row.permissions = JSON.parse(row.permissionsJson || "[]");
  } else {
    row.role = row.role || "admin";
    row.permissions = ["console", "start", "stop", "restart", "files", "backups", "users", "schedules"];
  }
  return row;
}

export function getById(id) {
  const row = db.prepare(`SELECT ${selectColsNoPassword()} FROM auth_users WHERE id = ?`).get(id);
  if (!row) return null;
  const out = { id: String(row.id), username: row.username };
  if (row.permissionsJson != null) {
    out.role = row.role || "subuser";
    out.permissions = JSON.parse(row.permissionsJson || "[]");
  } else {
    out.role = "admin";
    out.permissions = ["console", "start", "stop", "restart", "files", "backups", "users", "schedules"];
  }
  if (row.createdAt) out.createdAt = row.createdAt;
  return out;
}

export function findAll() {
  const rows = db.prepare(`SELECT ${selectColsNoPassword()} FROM auth_users ORDER BY created_at ASC`).all();
  return rows.map((r) => ({
    id: String(r.id),
    username: r.username,
    role: r.role || "subuser",
    permissions: r.permissionsJson != null ? JSON.parse(r.permissionsJson || "[]") : [],
    createdAt: r.createdAt,
  }));
}

export function create(username, passwordHash, role, permissions) {
  const perms = JSON.stringify(Array.isArray(permissions) ? permissions : []);
  const r = role || "subuser";
  try {
    const result = db
      .prepare(
        "INSERT INTO auth_users (username, password_hash, role, permissions_json, created_at) VALUES (?, ?, ?, ?, datetime('now'))"
      )
      .run(username, passwordHash, r, perms);
    return String(result.lastInsertRowid);
  } catch (e) {
    if (e.message && e.message.includes("UNIQUE")) throw new Error("Username already exists");
    throw e;
  }
}

export function update(id, data) {
  const updates = [];
  const params = [];
  if (data.username != null) {
    updates.push("username = ?");
    params.push(data.username);
  }
  if (data.passwordHash != null) {
    updates.push("password_hash = ?");
    params.push(data.passwordHash);
  }
  if (data.role != null) {
    updates.push("role = ?");
    params.push(data.role);
  }
  if (data.permissions != null) {
    updates.push("permissions_json = ?");
    params.push(JSON.stringify(data.permissions));
  }
  if (updates.length === 0) return;
  params.push(id);
  db.prepare(`UPDATE auth_users SET ${updates.join(", ")} WHERE id = ?`).run(...params);
}

export function deleteById(id) {
  db.prepare("DELETE FROM auth_users WHERE id = ?").run(id);
}

/** Set or update the first admin user (id 1). Used during installer. */
export function setFirstAdmin(username, passwordHash) {
  const fullPerms = JSON.stringify(["console", "start", "stop", "restart", "files", "backups", "users", "schedules"]);
  const existing = db.prepare("SELECT id FROM auth_users WHERE id = 1").get();
  if (existing) {
    db.prepare("UPDATE auth_users SET username = ?, password_hash = ?, role = 'admin', permissions_json = ? WHERE id = 1").run(username, passwordHash, fullPerms);
  } else {
    db.prepare("INSERT INTO auth_users (id, username, password_hash, role, permissions_json, created_at) VALUES (1, ?, ?, 'admin', ?, datetime('now'))").run(username, passwordHash, fullPerms);
  }
}

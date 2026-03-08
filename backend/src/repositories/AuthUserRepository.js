import db from "../infrastructure/database.js";

export function findByUsername(username) {
  return db.prepare("SELECT id, username, password_hash AS passwordHash FROM auth_users WHERE username = ?").get(username);
}

export function getById(id) {
  return db.prepare("SELECT id, username FROM auth_users WHERE id = ?").get(id);
}

/** Set or update the first admin user (id 1). Used during installer. */
export function setFirstAdmin(username, passwordHash) {
  const existing = db.prepare("SELECT id FROM auth_users WHERE id = 1").get();
  if (existing) {
    db.prepare("UPDATE auth_users SET username = ?, password_hash = ? WHERE id = 1").run(username, passwordHash);
  } else {
    db.prepare("INSERT INTO auth_users (id, username, password_hash, created_at) VALUES (1, ?, ?, datetime('now'))").run(username, passwordHash);
  }
}

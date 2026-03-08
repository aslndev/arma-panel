import db from "../infrastructure/database.js";

export function findAll(limit = 50) {
  const rows = db.prepare(
    "SELECT id, type, action, detail, user, timestamp FROM activity_log ORDER BY timestamp DESC LIMIT ?"
  ).all(limit);
  return rows.map((r) => ({
    id: String(r.id),
    type: r.type,
    action: r.action,
    detail: r.detail,
    user: r.user,
    timestamp: r.timestamp,
  }));
}

export function log(data) {
  db.prepare(
    "INSERT INTO activity_log (type, action, detail, user, timestamp) VALUES (?, ?, ?, ?, datetime('now'))"
  ).run(data.type, data.action, data.detail ?? "", data.user ?? "system");
}

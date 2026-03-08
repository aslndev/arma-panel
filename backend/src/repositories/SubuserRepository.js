import db from "../infrastructure/database.js";

export function findAll() {
  const rows = db.prepare(
    "SELECT id, email, role, permissions_json AS permissionsJson, added_at AS addedAt FROM subusers ORDER BY added_at DESC"
  ).all();
  return rows.map((r) => ({
    id: String(r.id),
    email: r.email,
    role: r.role,
    permissions: JSON.parse(r.permissionsJson || "[]"),
    addedAt: r.addedAt,
  }));
}

export function create(data) {
  const result = db
    .prepare(
      "INSERT INTO subusers (email, role, permissions_json, added_at) VALUES (?, ?, ?, date('now'))"
    )
    .run(data.email, data.role, JSON.stringify(data.permissions || []));
  return String(result.lastInsertRowid);
}

export function deleteById(id) {
  db.prepare("DELETE FROM subusers WHERE id = ?").run(id);
}

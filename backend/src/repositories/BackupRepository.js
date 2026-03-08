import db from "../infrastructure/database.js";

export function findAll() {
  const rows = db.prepare(
    "SELECT id, name, size, created_at AS createdAt, locked, status FROM backups ORDER BY created_at DESC"
  ).all();
  return rows.map((r) => ({
    id: String(r.id),
    name: r.name,
    size: r.size,
    createdAt: r.createdAt,
    locked: !!r.locked,
    status: r.status,
  }));
}

export function create(data) {
  const createdAt = new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }).replace(",", "");
  const result = db
    .prepare(
      "INSERT INTO backups (name, size, created_at, locked, status) VALUES (?, ?, ?, 0, ?)"
    )
    .run(data.name || `backup-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "-").replace(/\..*/, "")}`, data.size ?? "—", createdAt, data.status ?? "completed");
  return String(result.lastInsertRowid);
}

export function deleteById(id) {
  db.prepare("DELETE FROM backups WHERE id = ?").run(id);
}

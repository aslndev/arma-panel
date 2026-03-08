import db from "../infrastructure/database.js";

export function findAll() {
  const rows = db.prepare(
    "SELECT id, name, cron, action, enabled, last_run AS lastRun, next_run AS nextRun FROM schedules ORDER BY id"
  ).all();
  return rows.map((r) => ({
    id: String(r.id),
    name: r.name,
    cron: r.cron,
    action: r.action,
    enabled: !!r.enabled,
    lastRun: r.lastRun || "—",
    nextRun: r.nextRun || "—",
  }));
}

export function create(data) {
  const nextRun = new Date(Date.now() + 3600000).toISOString().slice(0, 16).replace("T", " ");
  const result = db
    .prepare(
      "INSERT INTO schedules (name, cron, action, enabled, last_run, next_run) VALUES (?, ?, ?, 1, '—', ?)"
    )
    .run(data.name, data.cron, data.action, nextRun);
  return String(result.lastInsertRowid);
}

export function update(id, data) {
  db.prepare(
    "UPDATE schedules SET name = ?, cron = ?, action = ?, enabled = ?, next_run = ? WHERE id = ?"
  ).run(
    data.name,
    data.cron,
    data.action,
    data.enabled ? 1 : 0,
    data.nextRun ?? new Date(Date.now() + 3600000).toISOString().slice(0, 16).replace("T", " "),
    id
  );
}

export function deleteById(id) {
  db.prepare("DELETE FROM schedules WHERE id = ?").run(id);
}

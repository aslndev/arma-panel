import db from "../infrastructure/database.js";

export function findAll() {
  const rows = db.prepare(
    "SELECT id, ip, port, alias, primary_flag AS primaryFlag FROM allocations ORDER BY primary_flag DESC, id"
  ).all();
  return rows.map((r) => ({
    id: String(r.id),
    ip: r.ip,
    port: r.port,
    alias: r.alias,
    primary: !!r.primaryFlag,
  }));
}

export function create(data) {
  const count = db.prepare("SELECT COUNT(*) AS c FROM allocations").get();
  const primaryFlag = count.c === 0 ? 1 : 0;
  const result = db
    .prepare(
      "INSERT INTO allocations (ip, port, alias, primary_flag) VALUES (?, ?, ?, ?)"
    )
    .run(data.ip, data.port, data.alias || `Port ${data.port}`, primaryFlag);
  return String(result.lastInsertRowid);
}

export function deleteById(id) {
  db.prepare("DELETE FROM allocations WHERE id = ?").run(id);
}

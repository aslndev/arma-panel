import db from "../infrastructure/database.js";

export function findAll() {
  const rows = db.prepare(
    "SELECT id, name, host, port, username, password, connections, max_connections AS maxConnections FROM databases ORDER BY id"
  ).all();
  return rows.map((r) => ({
    id: String(r.id),
    name: r.name,
    host: r.host,
    port: r.port,
    username: r.username,
    password: r.password,
    connections: r.connections,
    maxConnections: r.maxConnections,
  }));
}

export function create(data) {
  const result = db
    .prepare(
      "INSERT INTO databases (name, host, port, username, password, connections, max_connections) VALUES (?, ?, ?, ?, ?, 0, ?)"
    )
    .run(
      data.name,
      data.host ?? "127.0.0.1",
      data.port ?? 3306,
      data.username ?? data.name?.toLowerCase().replace(/\s+/g, "_") + "_user",
      data.password ?? "••••••••",
      data.maxConnections ?? 10
    );
  return String(result.lastInsertRowid);
}

export function deleteById(id) {
  db.prepare("DELETE FROM databases WHERE id = ?").run(id);
}

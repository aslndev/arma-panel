import * as DatabaseRepo from "../repositories/DatabaseRepository.js";

export function list() {
  return DatabaseRepo.findAll();
}

export function create(data) {
  const name = (data.name || "").trim().replace(/\s+/g, "_");
  if (!name) throw new Error("Database name required");
  const username = (data.username || name.toLowerCase().replace(/\s+/g, "_") + "_user").trim();
  DatabaseRepo.create({
    name,
    host: data.host ?? "127.0.0.1",
    port: data.port ?? 3306,
    username,
    password: data.password ?? "••••••••",
    maxConnections: data.maxConnections ?? 10,
  });
  return DatabaseRepo.findAll();
}

export function remove(id) {
  DatabaseRepo.deleteById(id);
}

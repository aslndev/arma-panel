import * as AllocationRepo from "../repositories/AllocationRepository.js";

export function list() {
  return AllocationRepo.findAll();
}

export function add(data) {
  const port = Number(data.port);
  if (!data.ip?.trim() || isNaN(port) || port < 1 || port > 65535) {
    throw new Error("Valid IP and port required");
  }
  AllocationRepo.create({
    ip: data.ip.trim(),
    port,
    alias: (data.alias || "").trim() || `Port ${port}`,
  });
  return AllocationRepo.findAll();
}

export function remove(id) {
  AllocationRepo.deleteById(id);
  return AllocationRepo.findAll();
}

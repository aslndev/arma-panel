import * as ScheduleRepo from "../repositories/ScheduleRepository.js";
import * as ActivityRepo from "../repositories/ActivityRepository.js";

export function list() {
  return ScheduleRepo.findAll();
}

export function create(data, byUser = "admin") {
  const name = (data.name || "").trim();
  if (!name) throw new Error("Schedule name required");
  ScheduleRepo.create({
    name,
    cron: data.cron || "0 * * * *",
    action: data.action || "restart",
  });
  ActivityRepo.log({
    type: "server",
    action: "Schedule Created",
    detail: name,
    user: byUser,
  });
  return ScheduleRepo.findAll();
}

export function update(id, data, byUser = "admin") {
  const current = ScheduleRepo.findAll().find((s) => s.id === id);
  ScheduleRepo.update(id, {
    name: data.name ?? current?.name,
    cron: data.cron ?? current?.cron,
    action: data.action ?? current?.action,
    enabled: data.enabled ?? current?.enabled,
    nextRun: data.nextRun,
  });
  ActivityRepo.log({
    type: "server",
    action: "Schedule Updated",
    detail: data.name || current?.name,
    user: byUser,
  });
  return ScheduleRepo.findAll();
}

export function remove(id, byUser = "admin") {
  const current = ScheduleRepo.findAll().find((s) => s.id === id);
  ScheduleRepo.deleteById(id);
  if (current) {
    ActivityRepo.log({
      type: "server",
      action: "Schedule Deleted",
      detail: current.name,
      user: byUser,
    });
  }
}

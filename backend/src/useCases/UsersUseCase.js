import * as SubuserRepo from "../repositories/SubuserRepository.js";
import * as ActivityRepo from "../repositories/ActivityRepository.js";

export function list() {
  return SubuserRepo.findAll();
}

export function invite(data, byUser = "admin") {
  const id = SubuserRepo.create({
    email: data.email,
    role: data.role || "subuser",
    permissions: data.permissions || ["console"],
  });
  ActivityRepo.log({
    type: "user",
    action: "User Added",
    detail: `${data.email} added as ${data.role || "subuser"}`,
    user: byUser,
  });
  const all = SubuserRepo.findAll();
  return all.find((u) => u.id === id) || { id, email: data.email, role: data.role || "subuser", permissions: data.permissions || ["console"], addedAt: new Date().toISOString().slice(0, 10) };
}

export function remove(id, byUser = "admin") {
  const list = SubuserRepo.findAll();
  const user = list.find((u) => u.id === id);
  SubuserRepo.deleteById(id);
  if (user) {
    ActivityRepo.log({
      type: "user",
      action: "User Removed",
      detail: user.email,
      user: byUser,
    });
  }
}

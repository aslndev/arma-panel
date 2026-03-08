import * as ActivityRepo from "../repositories/ActivityRepository.js";

export function list(limit = 50) {
  return ActivityRepo.findAll(limit);
}

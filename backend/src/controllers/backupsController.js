import * as BackupsUseCase from "../useCases/BackupsUseCase.js";

export function list(req, res) {
  const list = BackupsUseCase.list();
  res.json(list);
}

export function create(req, res) {
  const body = req.body || {};
  BackupsUseCase.create(body, req.user?.username || "admin");
  const list = BackupsUseCase.list();
  res.status(201).json(list);
}

export function restore(req, res) {
  BackupsUseCase.restore(req.params.id, req.user?.username || "admin");
  res.json({ message: "Restore started" });
}

export function remove(req, res) {
  try {
    BackupsUseCase.remove(req.params.id, req.user?.username || "admin");
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

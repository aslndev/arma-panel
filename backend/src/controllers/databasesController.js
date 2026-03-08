import * as DatabasesUseCase from "../useCases/DatabasesUseCase.js";

export function list(req, res) {
  const list = DatabasesUseCase.list();
  res.json(list);
}

export function create(req, res) {
  try {
    const body = req.body || {};
    DatabasesUseCase.create(body);
    const list = DatabasesUseCase.list();
    res.status(201).json(list);
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export function remove(req, res) {
  DatabasesUseCase.remove(req.params.id);
  res.status(204).send();
}

import * as AllocationsUseCase from "../useCases/AllocationsUseCase.js";

export function list(req, res) {
  const list = AllocationsUseCase.list();
  res.json(list);
}

export function add(req, res) {
  try {
    const body = req.body || {};
    AllocationsUseCase.add(body);
    const list = AllocationsUseCase.list();
    res.status(201).json(list);
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export function remove(req, res) {
  AllocationsUseCase.remove(req.params.id);
  res.status(204).send();
}

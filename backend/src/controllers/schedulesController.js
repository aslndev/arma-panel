import * as SchedulesUseCase from "../useCases/SchedulesUseCase.js";

export function list(req, res) {
  const list = SchedulesUseCase.list();
  res.json(list);
}

export function create(req, res) {
  try {
    const body = req.body || {};
    SchedulesUseCase.create(body, req.user?.username || "admin");
    const list = SchedulesUseCase.list();
    res.status(201).json(list);
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export function update(req, res) {
  try {
    const body = req.body || {};
    SchedulesUseCase.update(req.params.id, body, req.user?.username || "admin");
    const list = SchedulesUseCase.list();
    res.json(list);
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export function remove(req, res) {
  SchedulesUseCase.remove(req.params.id, req.user?.username || "admin");
  res.status(204).send();
}

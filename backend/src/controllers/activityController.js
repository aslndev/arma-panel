import * as ActivityUseCase from "../useCases/ActivityUseCase.js";

export function list(req, res) {
  const limit = parseInt(req.query.limit, 10) || 50;
  const list = ActivityUseCase.list(limit);
  res.json(list);
}

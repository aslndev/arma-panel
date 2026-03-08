import * as UsersUseCase from "../useCases/UsersUseCase.js";

export function list(req, res) {
  const users = UsersUseCase.list();
  res.json(users);
}

export function create(req, res) {
  try {
    const body = req.body || {};
    const user = UsersUseCase.create(
      {
        username: body.username,
        password: body.password,
        role: body.role || "subuser",
        permissions: body.permissions || [],
      },
      req.user?.username || "admin"
    );
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export function update(req, res) {
  try {
    const body = req.body || {};
    const user = UsersUseCase.update(
      req.params.id,
      {
        username: body.username,
        password: body.password,
        role: body.role,
        permissions: body.permissions,
      },
      req.user?.username || "admin"
    );
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export function remove(req, res) {
  try {
    UsersUseCase.remove(req.params.id, req.user?.id, req.user?.username || "admin");
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

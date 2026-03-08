import * as UsersUseCase from "../useCases/UsersUseCase.js";

export function list(req, res) {
  const users = UsersUseCase.list();
  res.json(users);
}

export function invite(req, res) {
  try {
    const body = req.body || {};
    const user = UsersUseCase.invite(
      {
        email: body.email,
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

export function remove(req, res) {
  UsersUseCase.remove(req.params.id, req.user?.username || "admin");
  res.status(204).send();
}

import * as AuthUseCase from "../useCases/AuthLogin.js";

export function login(req, res) {
  const { username, password } = req.body || {};
  const result = AuthUseCase.login(username, password);
  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }
  res.json({ token: result.token, user: result.user });
}

export function me(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ user: req.user });
}

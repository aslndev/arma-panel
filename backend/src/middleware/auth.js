import { verifyToken } from "../useCases/AuthLogin.js";

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.user = user;
  next();
}

/** Require that the user has the given permission or is owner/admin. Use after authMiddleware. */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const role = (req.user.role || "").toLowerCase();
    const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    if (role === "owner" || role === "admin") return next();
    if (perms.includes(permission)) return next();
    return res.status(403).json({ error: "Forbidden: missing permission " + permission });
  };
}

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as AuthUserRepo from "../repositories/AuthUserRepository.js";

const JWT_SECRET = process.env.JWT_SECRET || "arma-panel-secret-change-in-production";

export function login(username, password) {
  if (!username?.trim() || !password) {
    return { success: false, error: "Username and password required" };
  }
  const user = AuthUserRepo.findByUsername(username.trim());
  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }
  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Invalid credentials" };
  }
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  return {
    success: true,
    token,
    user: { id: user.id, username: user.username },
  };
}

export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return AuthUserRepo.getById(decoded.userId);
  } catch {
    return null;
  }
}

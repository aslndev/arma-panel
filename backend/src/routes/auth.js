import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.post("/login", authController.login);
router.get("/me", authMiddleware, authController.me);
export default router;

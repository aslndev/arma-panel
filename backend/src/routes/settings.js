import { Router } from "express";
import * as settingsController from "../controllers/settingsController.js";
import { authMiddleware, requirePermission } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);
router.get("/", settingsController.getSettings);
router.get("/detect", settingsController.detectServer);
router.post("/", requirePermission("settings"), settingsController.completeSetup);
router.put("/", requirePermission("settings"), settingsController.updateSettings);
export default router;

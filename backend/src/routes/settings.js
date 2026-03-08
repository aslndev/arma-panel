import { Router } from "express";
import * as settingsController from "../controllers/settingsController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);
router.get("/", settingsController.getSettings);
router.get("/detect", settingsController.detectServer);
router.post("/", settingsController.completeSetup);
router.put("/", settingsController.updateSettings);
export default router;

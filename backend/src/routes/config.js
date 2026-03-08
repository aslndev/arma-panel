import { Router } from "express";
import * as configController from "../controllers/configController.js";
import { authMiddleware, requirePermission } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);
router.use(requirePermission("config"));
router.get("/content", configController.getContent);
router.put("/content", configController.saveContent);

export default router;

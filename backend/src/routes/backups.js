import { Router } from "express";
import * as backupsController from "../controllers/backupsController.js";
import { authMiddleware, requirePermission } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);
router.use(requirePermission("backups"));
router.get("/", backupsController.list);
router.post("/", backupsController.create);
router.post("/:id/restore", backupsController.restore);
router.delete("/:id", backupsController.remove);
export default router;

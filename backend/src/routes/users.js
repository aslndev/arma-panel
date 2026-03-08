import { Router } from "express";
import * as usersController from "../controllers/usersController.js";
import { authMiddleware, requirePermission } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);
router.use(requirePermission("users"));
router.get("/", usersController.list);
router.post("/", usersController.create);
router.put("/:id", usersController.update);
router.delete("/:id", usersController.remove);
export default router;

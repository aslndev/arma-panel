import { Router } from "express";
import * as allocationsController from "../controllers/allocationsController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);
router.get("/", allocationsController.list);
router.post("/", allocationsController.add);
router.delete("/:id", allocationsController.remove);
export default router;

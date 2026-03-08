import { Router } from "express";
import * as activityController from "../controllers/activityController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);
router.get("/", activityController.list);
export default router;

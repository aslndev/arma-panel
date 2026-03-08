import { Router } from "express";
import * as playersController from "../controllers/playersController.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);
router.use(requirePermission("players"));

router.get("/", playersController.list);
router.post("/kick", playersController.kick);
router.post("/ban", playersController.ban);
router.post("/unban", playersController.unban);
router.get("/bans", playersController.banList);

export default router;

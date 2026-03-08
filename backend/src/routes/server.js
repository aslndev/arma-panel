import { Router } from "express";
import * as serverController from "../controllers/serverController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);
router.get("/summary", serverController.summary);
router.get("/logs/sessions", serverController.listLogSessions);
router.get("/logs/sessions/:session/files/:file", serverController.getLogFile);
router.post("/start", serverController.start);
router.post("/stop", serverController.stop);
router.post("/restart", serverController.restart);
export default router;

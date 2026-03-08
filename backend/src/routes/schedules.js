import { Router } from "express";
import * as schedulesController from "../controllers/schedulesController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);
router.get("/", schedulesController.list);
router.post("/", schedulesController.create);
router.put("/:id", schedulesController.update);
router.delete("/:id", schedulesController.remove);
export default router;

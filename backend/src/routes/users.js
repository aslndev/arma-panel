import { Router } from "express";
import * as usersController from "../controllers/usersController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);
router.get("/", usersController.list);
router.post("/", usersController.invite);
router.delete("/:id", usersController.remove);
export default router;

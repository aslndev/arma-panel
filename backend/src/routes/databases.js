import { Router } from "express";
import * as databasesController from "../controllers/databasesController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);
router.get("/", databasesController.list);
router.post("/", databasesController.create);
router.delete("/:id", databasesController.remove);
export default router;

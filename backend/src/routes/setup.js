import { Router } from "express";
import * as setupController from "../controllers/setupController.js";

const router = Router();
router.get("/status", setupController.getStatus);
router.post("/complete", setupController.complete);
export default router;

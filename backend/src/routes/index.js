import { Router } from "express";
import authRoutes from "./auth.js";
import setupRoutes from "./setup.js";
import settingsRoutes from "./settings.js";
import usersRoutes from "./users.js";
import databasesRoutes from "./databases.js";
import schedulesRoutes from "./schedules.js";
import filesRoutes from "./files.js";
import backupsRoutes from "./backups.js";
import allocationsRoutes from "./allocations.js";
import activityRoutes from "./activity.js";
import serverRoutes from "./server.js";
import configRoutes from "./config.js";

const router = Router();
router.use("/auth", authRoutes);
router.use("/setup", setupRoutes);
router.use("/settings", settingsRoutes);
router.use("/server", serverRoutes);
router.use("/config", configRoutes);
router.use("/users", usersRoutes);
router.use("/databases", databasesRoutes);
router.use("/schedules", schedulesRoutes);
router.use("/files", filesRoutes);
router.use("/backups", backupsRoutes);
router.use("/allocations", allocationsRoutes);
router.use("/activity", activityRoutes);

export default router;

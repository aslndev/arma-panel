import { Router } from "express";
import multer from "multer";
import * as filesController from "../controllers/filesController.js";
import { authMiddleware, requirePermission } from "../middleware/auth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);
router.use(requirePermission("files"));
router.get("/", filesController.list);
router.post("/folder", filesController.createFolder);
router.post("/upload", upload.single("file"), filesController.uploadFile);
router.post("/", filesController.uploadFile); // JSON body: path, name, content
router.get("/content", filesController.getFile);
router.get("/download", filesController.download);
router.put("/", filesController.updateFile);
router.delete("/", filesController.removeFile);
router.post("/zip", filesController.zip);
router.post("/unzip", filesController.unzip);
router.post("/chmod", filesController.chmod);
export default router;

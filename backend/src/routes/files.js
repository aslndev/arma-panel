import { Router } from "express";
import multer from "multer";
import * as filesController from "../controllers/filesController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);
router.get("/", filesController.list);
router.post("/folder", filesController.createFolder);
router.post("/upload", upload.single("file"), filesController.uploadFile);
router.post("/", filesController.uploadFile); // JSON body: path, name, content
router.get("/content", filesController.getFile);
router.put("/", filesController.updateFile);
router.delete("/", filesController.removeFile);
export default router;

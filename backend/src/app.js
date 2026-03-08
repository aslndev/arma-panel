import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import apiRoutes from "./routes/index.js";
import { attachConsoleWs } from "./websocket/consoleTail.js";
import { attachPanelWs } from "./websocket/panelWs.js";
import "./infrastructure/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
attachConsoleWs(server);
attachPanelWs(server);
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://localhost:8080", "http://127.0.0.1:5173", "http://127.0.0.1:8080"];
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiRoutes);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

const staticDir = process.env.STATIC_DIR || path.join(__dirname, "..", "frontend", "dist");
if (existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get("*", (req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

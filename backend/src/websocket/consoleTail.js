import { WebSocketServer } from "ws";
import { readFile, stat, open } from "fs/promises";
import { dirname, basename } from "path";
import { verifyToken } from "../useCases/AuthLogin.js";
import * as ServerSummaryUseCase from "../useCases/ServerSummaryUseCase.js";

const POLL_MS = 1500;

function sessionNameFromPath(filePath) {
  try {
    return basename(dirname(filePath));
  } catch {
    return null;
  }
}

function attachConsoleWs(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname !== "/ws/console") return;
    const token = url.searchParams.get("token");
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    const user = verifyToken(token);
    if (!user) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws) => {
    let lastSize = 0;
    let currentPath = null;
    let intervalId = null;
    let lastErrorAt = 0;
    const ERROR_THROTTLE_MS = 8000;

    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const send = (obj) => {
      try {
        if (ws.readyState === 1) ws.send(JSON.stringify(obj));
      } catch (_) {}
    };

    const poll = async () => {
      try {
        const path = await ServerSummaryUseCase.getLatestConsolePath();
        if (!path) {
          const now = Date.now();
          if (now - lastErrorAt > ERROR_THROTTLE_MS) {
            lastErrorAt = now;
            send({ type: "error", message: "No log session found" });
          }
          return;
        }
        const st = await stat(path).catch(() => null);
        if (!st) return;
        if (path !== currentPath) {
          currentPath = path;
          lastSize = 0;
          const sessionName = sessionNameFromPath(path);
          if (st.size > 0) {
            const content = await readFile(path, "utf8");
            send({ type: "init", data: content, session: sessionName });
            lastSize = Buffer.byteLength(content, "utf8");
          } else {
            send({ type: "init", data: "", session: sessionName });
            lastSize = 0;
          }
          return;
        }
        if (st.size <= lastSize) return;
        const fd = await open(path, "r");
        try {
          const buf = Buffer.alloc(st.size - lastSize);
          const { bytesRead } = await fd.read(buf, 0, buf.length, lastSize);
          if (bytesRead > 0) send({ type: "append", data: buf.slice(0, bytesRead).toString("utf8") });
          lastSize += bytesRead;
        } finally {
          await fd.close();
        }
      } catch (err) {
        send({ type: "error", message: err.message || "Tail error" });
      }
    };

    intervalId = setInterval(poll, POLL_MS);
    poll();

    ws.on("close", stop);
    ws.on("error", stop);
  });
}

export { attachConsoleWs };

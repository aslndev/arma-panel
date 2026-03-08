import { WebSocketServer } from "ws";
import { verifyToken } from "../useCases/AuthLogin.js";
import * as ServerSummaryUseCase from "../useCases/ServerSummaryUseCase.js";
import * as ServerExecUseCase from "../useCases/ServerExecUseCase.js";

const SUMMARY_INTERVAL_MS = 5000;

function attachPanelWs(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname !== "/ws/panel") return;
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

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers?.host || "localhost"}`);
    const token = url.searchParams.get("token");
    const user = token ? verifyToken(token) : null;
    const byUser = user?.username || "admin";

    const send = (obj) => {
      try {
        if (ws.readyState === 1) ws.send(JSON.stringify(obj));
      } catch (_) {}
    };

    const pushSummary = async () => {
      try {
        const reqHost = req.headers?.host?.replace(/:.*/, "") || "";
        const data = await ServerSummaryUseCase.getSummary(reqHost);
        send({ type: "summary", data });
      } catch (_) {
        send({ type: "summary", data: null });
      }
    };

    await pushSummary();
    const intervalId = setInterval(pushSummary, SUMMARY_INTERVAL_MS);

    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "exec" && typeof msg.command === "string" && msg.id != null) {
          const result = await ServerExecUseCase.runCommand(msg.command, byUser);
          send({
            type: "execResult",
            id: msg.id,
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code,
          });
        }
      } catch (_) {}
    });

    ws.on("close", () => clearInterval(intervalId));
    ws.on("error", () => clearInterval(intervalId));
  });
}

export { attachPanelWs };

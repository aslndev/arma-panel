import { WebSocketServer } from "ws";
import { verifyToken } from "../useCases/AuthLogin.js";
import * as ServerSummaryUseCase from "../useCases/ServerSummaryUseCase.js";
import * as ServerExecUseCase from "../useCases/ServerExecUseCase.js";
import * as RconUseCase from "../useCases/RconUseCase.js";

const SUMMARY_INTERVAL_MS = 5000;
const PLAYERS_INTERVAL_MS = 3000;

const playersSubscribers = new Set();
let playersIntervalId = null;

function startPlayersBroadcast() {
  if (playersIntervalId != null) return;
  playersIntervalId = setInterval(async () => {
    if (playersSubscribers.size === 0) return;
    let players = [];
    try {
      const result = await RconUseCase.listPlayers("panel");
      players = result.players ?? [];
    } catch (_) {
      players = [];
    }
    const payload = JSON.stringify({ type: "players", data: { players } });
    for (const ws of playersSubscribers) {
      try {
        if (ws.readyState === 1) ws.send(payload);
        else playersSubscribers.delete(ws);
      } catch (_) {
        playersSubscribers.delete(ws);
      }
    }
  }, PLAYERS_INTERVAL_MS);
}

function stopPlayersBroadcast() {
  if (playersIntervalId != null) {
    clearInterval(playersIntervalId);
    playersIntervalId = null;
  }
}

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
        if (msg.type === "subscribe" && msg.channel === "players") {
          playersSubscribers.add(ws);
          if (playersSubscribers.size === 1) startPlayersBroadcast();
          (async () => {
            let list = [];
            try {
              const result = await RconUseCase.listPlayers("panel");
              list = result.players ?? [];
            } catch (_) {}
            if (ws.readyState === 1) {
              try {
                ws.send(JSON.stringify({ type: "players", data: { players: list } }));
              } catch (_) {}
            }
          })();
        }
        if (msg.type === "unsubscribe" && msg.channel === "players") {
          playersSubscribers.delete(ws);
          if (playersSubscribers.size === 0) stopPlayersBroadcast();
        }
      } catch (_) {}
    });

    ws.on("close", () => {
      clearInterval(intervalId);
      playersSubscribers.delete(ws);
      if (playersSubscribers.size === 0) stopPlayersBroadcast();
    });
    ws.on("error", () => {
      clearInterval(intervalId);
      playersSubscribers.delete(ws);
      if (playersSubscribers.size === 0) stopPlayersBroadcast();
    });
  });
}

export { attachPanelWs };

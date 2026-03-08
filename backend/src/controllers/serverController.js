import * as ServerControlUseCase from "../useCases/ServerControlUseCase.js";
import * as ServerSummaryUseCase from "../useCases/ServerSummaryUseCase.js";
import * as ServerExecUseCase from "../useCases/ServerExecUseCase.js";

export function start(req, res) {
  run("start", req, res);
}

export function stop(req, res) {
  run("stop", req, res);
}

export function restart(req, res) {
  run("restart", req, res);
}

async function run(action, req, res) {
  try {
    await ServerControlUseCase.runAction(action, req.user?.username || "admin");
    res.json({ success: true, action });
  } catch (err) {
    const status = err.message?.includes("not configured") ? 400 : 500;
    res.status(status).json({ error: err.message || "Command failed" });
  }
}

export async function summary(req, res) {
  try {
    const reqHost = req.headers.host?.replace(/:.*/, "") || req.socket?.remoteAddress || "";
    const data = await ServerSummaryUseCase.getSummary(reqHost);
    res.json(data);
  } catch (err) {
    const status = err.message?.includes("not configured") ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to get summary" });
  }
}

export async function listLogSessions(req, res) {
  try {
    const dirs = await ServerSummaryUseCase.listSessions();
    res.json({ sessions: dirs });
  } catch (err) {
    const status = err.message?.includes("not configured") ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to list log sessions" });
  }
}

export async function getLogFile(req, res) {
  try {
    const { session, file } = req.params;
    const tail = req.query.tail ? parseInt(req.query.tail, 10) : undefined;
    const content = await ServerSummaryUseCase.readLogFile(session, file, tail);
    res.type("text/plain").send(content);
  } catch (err) {
    const status = err.message === "Invalid file name" || err.message === "Invalid session name" ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to read log file" });
  }
}

export async function exec(req, res) {
  try {
    const command = req.body?.command;
    const result = await ServerExecUseCase.runCommand(command, req.user?.username || "admin");
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Command failed" });
  }
}

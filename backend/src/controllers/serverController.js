import * as ServerControlUseCase from "../useCases/ServerControlUseCase.js";

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

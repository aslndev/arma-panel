import * as ConfigUseCase from "../useCases/ConfigUseCase.js";

export async function getContent(req, res) {
  try {
    const content = await ConfigUseCase.getContent();
    if (content === null) {
      return res.status(404).json({ error: "Config file not found" });
    }
    res.json({ content });
  } catch (err) {
    const status = err.message?.includes("not set") || err.message?.includes("not configured") ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to read config file" });
  }
}

export async function saveContent(req, res) {
  try {
    const content = typeof req.body === "string" ? req.body : req.body?.content ?? "";
    await ConfigUseCase.saveContent(content, req.user?.username || "admin");
    res.json({ success: true });
  } catch (err) {
    const status = err.message?.includes("not set") || err.message?.includes("not configured") ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to save config file" });
  }
}

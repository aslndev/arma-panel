import * as RconUseCase from "../useCases/RconUseCase.js";

export async function list(req, res) {
  try {
    const result = await RconUseCase.listPlayers(req.user?.username || "admin");
    return res.json({
      players: result.players ?? [],
      raw: result.raw ?? "",
      error: result.error || undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to list players" });
  }
}

export async function kick(req, res) {
  try {
    const identityId = req.body?.identityId ?? req.params?.identityId;
    if (!identityId) return res.status(400).json({ error: "identityId is required" });
    const reason = req.body?.reason ?? "";
    await RconUseCase.kickPlayer(identityId, reason, req.user?.username || "admin");
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Kick failed" });
  }
}

export async function ban(req, res) {
  try {
    const identityId = req.body?.identityId ?? req.params?.identityId;
    if (!identityId) return res.status(400).json({ error: "identityId is required" });
    const reason = req.body?.reason ?? "";
    const durationSeconds = Number(req.body?.durationSeconds) || 0;
    await RconUseCase.banPlayer(identityId, reason, durationSeconds, req.user?.username || "admin");
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Ban failed" });
  }
}

export async function unban(req, res) {
  try {
    const identityId = req.body?.identityId ?? req.params?.identityId;
    if (!identityId) return res.status(400).json({ error: "identityId is required" });
    await RconUseCase.unbanPlayer(identityId, req.user?.username || "admin");
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unban failed" });
  }
}

export async function banList(req, res) {
  try {
    const page = Number(req.query?.page) || 1;
    const { bans, raw } = await RconUseCase.getBanList(page, req.user?.username || "admin");
    return res.json({ bans, raw });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to get ban list" });
  }
}

import bcrypt from "bcryptjs";
import * as SettingsRepo from "../repositories/SettingsRepository.js";
import * as SettingsUseCase from "../useCases/SettingsUseCase.js";
import * as AuthUserRepo from "../repositories/AuthUserRepository.js";

export function getStatus(req, res) {
  const settings = SettingsRepo.getSettings();
  res.json({
    setupComplete: settings?.setupComplete ?? false,
  });
}

/** Public: detect server folder and config (for installer auto-fill). No auth required. */
export async function detect(req, res) {
  try {
    const detected = await SettingsUseCase.detectServer();
    return res.json(detected);
  } catch (err) {
    return res.status(500).json({
      serverFolder: null,
      configFile: null,
      installStatus: "not_found",
      installMessage: err?.message || "Detection failed",
    });
  }
}

export function complete(req, res) {
  const settings = SettingsRepo.getSettings();
  if (settings?.setupComplete) {
    return res.status(400).json({ error: "Setup already completed" });
  }
  const body = req.body || {};
  const username = (body.adminUsername ?? body.username ?? "").trim();
  const password = body.adminPassword ?? body.password ?? "";

  if (!username) {
    return res.status(400).json({ error: "Admin username is required" });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: "Admin password must be at least 4 characters" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  AuthUserRepo.setFirstAdmin(username, passwordHash);

  SettingsRepo.updateSettings({
    panelName: body.panelName ?? "Arma Panel",
    serverFolder: body.serverFolder ?? "/home/arma/server",
    configFile: body.configFile ?? "/home/arma/server/config.json",
    setupComplete: true,
  });
  res.json({ success: true });
}

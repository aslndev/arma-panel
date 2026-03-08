import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync, existsSync } from "fs";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "../../data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}
const dbPath = join(dataDir, "panel.db");
const db = new Database(dbPath, { readonly: false });

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS panel_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      panel_name TEXT NOT NULL DEFAULT 'Arma Panel',
      server_folder TEXT NOT NULL DEFAULT '/home/arma/server',
      config_file TEXT NOT NULL DEFAULT '/home/arma/server/config.json',
      steamcmd_path TEXT NOT NULL DEFAULT '/usr/games/steamcmd',
      arma_server_file TEXT NOT NULL DEFAULT '',
      setup_complete INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS auth_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subusers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions_json TEXT NOT NULL DEFAULT '[]',
      added_at TEXT NOT NULL DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS databases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      host TEXT NOT NULL DEFAULT '127.0.0.1',
      port INTEGER NOT NULL DEFAULT 3306,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      connections INTEGER NOT NULL DEFAULT 0,
      max_connections INTEGER NOT NULL DEFAULT 10
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cron TEXT NOT NULL,
      action TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run TEXT,
      next_run TEXT
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('file', 'folder')),
      size TEXT,
      content TEXT,
      modified TEXT NOT NULL,
      UNIQUE(path, name)
    );

    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      size TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'in_progress'))
    );

    CREATE TABLE IF NOT EXISTS allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      port INTEGER NOT NULL,
      alias TEXT NOT NULL DEFAULT '',
      primary_flag INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      user TEXT NOT NULL DEFAULT '',
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO panel_settings (id, panel_name, server_folder, config_file, steamcmd_path, arma_server_file, setup_complete)
    VALUES (1, 'Arma Panel', '/home/arma/server', '/home/arma/server/config.json', '/usr/games/steamcmd', '', 0);
  `);

  try {
    db.exec("ALTER TABLE panel_settings ADD COLUMN arma_server_file TEXT NOT NULL DEFAULT ''");
  } catch (_) {
    /* column already exists */
  }

  const adminExists = db.prepare("SELECT 1 FROM auth_users WHERE username = ?").get("admin");
  if (!adminExists) {
    const hash = bcrypt.hashSync("admin", 10);
    db.prepare("INSERT INTO auth_users (username, password_hash) VALUES (?, ?)").run("admin", hash);
  }

  const hasAllocations = db.prepare("SELECT 1 FROM allocations LIMIT 1").get();
  if (!hasAllocations) {
    db.prepare(
      "INSERT INTO allocations (ip, port, alias, primary_flag) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)"
    ).run("104.194.10.9", 2486, "Game Port", 1, "104.194.10.9", 2487, "Query Port", 0, "104.194.10.9", 2488, "RCON Port", 0);
  }

  const hasActivity = db.prepare("SELECT 1 FROM activity_log LIMIT 1").get();
  if (!hasActivity) {
    db.prepare(
      "INSERT INTO activity_log (type, action, detail, user, timestamp) VALUES (?, ?, ?, ?, ?)"
    ).run("server", "Server Stopped", "Server stopped manually", "admin@server.com", new Date().toISOString().slice(0, 19).replace("T", " "));
  }
}

initSchema();

export default db;

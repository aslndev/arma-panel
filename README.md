# Arma Panel

Web panel to manage an **Arma Reforger** dedicated server: start/stop/restart, console, RCON, files, backups, schedules, config editor, and user accounts with role-based permissions.

## Features

- **Server control** – Start, stop, restart (via systemd when installed; game server runs independently so panel updates don’t stop the game)
- **Console** – Live server log output
- **Logs** – Browse and download session log files
- **Players** – View online players (RCON)
- **Files** – Browse, edit, upload, download files in the server directory
- **Backups** – Create and restore backups
- **Schedules** – Cron-style scheduled tasks (restart, backup, etc.)
- **Config Editor** – Edit server config JSON with validation
- **Users & permissions** – Owner, admin, and subuser roles; menu and API respect permissions
- **Activity** – Audit log of panel actions

## Requirements

- **Linux** with systemd
- **Node.js 18+** (20 LTS recommended)
- Run install/update/uninstall with `sudo`

## Quick start

```bash
# From project root (after clone or extract)
chmod +x arma-panel.sh
sudo ./arma-panel.sh install
```

Then open **http://localhost:3001** (or your server IP). On first run you’ll go through the web installer: create the first admin password and set **Server folder** and **Config file** (or use auto-detect).

### First user (setup)

The user created during setup gets **owner** role and full permissions. Only owners (and admins) can manage users and see all menu items; subusers see only the menus allowed by their assigned permissions.

## Installation details

The install script can:

- Install the panel to `/opt/arma-panel` (or `ARMA_PANEL_INSTALL_DIR`)
- Optionally install **SteamCMD and game server dependencies** (Debian/Ubuntu: i386, `steamcmd`, `jq`, etc.)
- Create **systemd** services: `arma-panel` (web panel) and `arma-server` (game server, so the game keeps running when you update the panel)
- Optionally run **LinuxGSM** to install the Arma Reforger server from scratch ([LinuxGSM armarserver](https://linuxgsm.com/servers/armarserver/))

Full install/uninstall/update options and environment variables are in **[INSTALL.md](INSTALL.md)**.

## Users and permissions

- **Owner** – Created at setup; full access; all menus and actions.
- **Admin** – Same as owner (all permissions).
- **Subuser** – Access only to allowed areas. Permissions: `console`, `start`, `stop`, `restart`, `files`, `backups`, `users`, `schedules`, `players`, `config`, `settings`, `activity`.

The **menu is filtered by permission**: subusers only see tabs they have permission for (e.g. Console, Files). Owner and admin see everything.

## Server folder and config

- **Server folder** – Path to the Arma Reforger server root (e.g. LinuxGSM `~/serverfiles`).
- **Config file** – Path **relative to the server folder** (e.g. `armarserver_config.json`). The panel stores it as relative; the full path is `Server folder` + `Config file`.

Auto-detect (installer and Settings) looks for LinuxGSM-style installs (`armarserver` script, `serverfiles`, `ArmaReforgerServer`).

## Updating the panel

Run **from your source copy** (not from the installed directory), so the script can copy new code into the install path:

```bash
cd /path/to/arma-panel
sudo ./arma-panel.sh update
```

Or from elsewhere:

```bash
sudo ./arma-panel.sh update /path/to/arma-panel
# or
ARMA_PANEL_UPDATE_SOURCE=/path/to/arma-panel sudo ./arma-panel.sh update
```

Database and settings are preserved.

## Project structure

| Path | Description |
|------|-------------|
| `backend/` | Node.js (Express) API, SQLite DB, server control, RCON |
| `frontend/` | React (Vite, TypeScript, shadcn/ui) |
| `arma-panel.sh` | Install, update, uninstall, systemd; optional LinuxGSM (at project root) |

## Development

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Set the frontend API base URL as needed (e.g. `VITE_API_URL=http://localhost:3001`).

---

For full script usage, env vars, and dependencies, see **[INSTALL.md](INSTALL.md)**.

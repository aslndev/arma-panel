# Arma Panel – Linux script

Single script for install, uninstall, and systemd control.

## Quick start

```bash
# From project root (after cloning / extracting the project)
chmod +x scripts/arma-panel.sh
sudo ./scripts/arma-panel.sh install
```

Then open **http://localhost:3001** (or your server IP).

**Re-run install:** If the install directory already exists, the script overwrites app files and asks: *"Also overwrite database (backend/data)? Settings and users will be reset. [y/N]"* — answer **N** to keep existing panel settings and users; **y** to reset the database.

**"Readonly database" error:** The service runs as `ARMA_PANEL_USER`. The script sets ownership of the install directory to that user. By default it uses the user who ran `sudo` (or `$USER`), so the database is writable without extra steps.

## Commands

| Command     | Description |
|------------|-------------|
| `install`  | Install to `/opt/arma-panel`, build frontend, create and enable systemd service, then start |
| `update`   | Rebuild and restart: copy latest code, `npm install`, build frontend, restart service (keeps database) |
| `uninstall`| Stop service, disable and remove systemd unit, optionally remove install directory |
| `start`    | Start the panel (`systemctl start arma-panel`) |
| `restart`  | Restart the panel |
| `stop`     | Stop the panel |
| `exit`     | Alias for `stop` |
| `status`   | Show service status |

## Options (environment)

- **ARMA_PANEL_INSTALL_DIR** – Install path (default: `/opt/arma-panel`)
- **ARMA_PANEL_USER** – User to run the service (default: detected — user who ran `sudo`, or current `$USER`)
- **ARMA_PANEL_AUTO_INSTALL_DEPS** – Set to `1` to auto-install missing dependencies (e.g. Node.js) without prompting

## Dependency check (install)

When you run `install`, the script checks (in order) and offers to install if missing:

- **curl** – required for downloads and for Node.js (NodeSource) install. On Debian/Ubuntu, `ca-certificates` and `gnupg` are installed with it.
- **crontab** – optional; used for panel scheduled tasks. Installs `cron` (Debian/Ubuntu), `cronie` (RHEL/Fedora/Arch), or `cron` (openSUSE).
- **Node.js 18+** (recommended: 20 LTS)  
  If missing or too old, it will ask: *"Install Node.js 20 LTS now? [Y/n]"*.  
  Supported install methods: **apt** (Debian/Ubuntu via NodeSource), **dnf/yum** (RHEL/Fedora/CentOS via NodeSource), **pacman** (Arch), **zypper** (openSUSE).

For non-interactive installs use: `ARMA_PANEL_AUTO_INSTALL_DEPS=1 sudo ./scripts/arma-panel.sh install`

Example:

```bash
ARMA_PANEL_INSTALL_DIR=/home/arma/panel sudo ./scripts/arma-panel.sh install
```

## Requirements

- Linux with systemd
- Node.js 18+
- Run install/uninstall with `sudo` (for systemd and /opt)

After install you can also use systemd directly:

```bash
sudo systemctl start arma-panel
sudo systemctl restart arma-panel
sudo systemctl stop arma-panel
sudo systemctl status arma-panel
```

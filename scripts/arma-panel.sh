#!/usr/bin/env bash
# Arma Panel - Linux install, uninstall, start, restart, stop (systemd)
# Usage: sudo ./arma-panel.sh { install | uninstall | start | restart | stop | status }

set -e

SERVICE_NAME="arma-panel"
ARMA_SERVER_SERVICE="arma-server"
INSTALL_DIR="${ARMA_PANEL_INSTALL_DIR:-/opt/arma-panel}"
# Default: user who ran sudo (SUDO_USER) or current user
PANEL_USER="${ARMA_PANEL_USER:-${SUDO_USER:-$USER}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_MIN_MAJOR=18
NODE_RECOMMENDED_MAJOR=20
# Set to 1 to auto-install missing deps without prompting
AUTO_INSTALL_DEPS="${ARMA_PANEL_AUTO_INSTALL_DEPS:-0}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

# Detect package manager / distro
detect_pkg_manager() {
  if command -v apt-get &>/dev/null && [[ -f /etc/debian_version ]]; then
    echo "apt"
    return
  fi
  if command -v dnf &>/dev/null; then
    echo "dnf"
    return
  fi
  if command -v yum &>/dev/null; then
    echo "yum"
    return
  fi
  if command -v pacman &>/dev/null; then
    echo "pacman"
    return
  fi
  if command -v zypper &>/dev/null; then
    echo "zypper"
    return
  fi
  echo ""
}

# Install a package using detected package manager (single package name per distro)
install_package() {
  local pkg="$1"
  local pm
  pm=$(detect_pkg_manager)
  case "$pm" in
    apt)   apt-get update -qq && apt-get install -y -qq "$pkg" ;;
    dnf)   dnf install -y "$pkg" 2>/dev/null || yum install -y "$pkg" ;;
    yum)   yum install -y "$pkg" ;;
    pacman) pacman -Sy --noconfirm "$pkg" ;;
    zypper) zypper -n install "$pkg" ;;
    *) return 1 ;;
  esac
}

# Install curl (and ca-certificates/gnupg on Debian for HTTPS)
install_curl() {
  local pm
  pm=$(detect_pkg_manager)
  if [[ "$pm" == "apt" ]]; then
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg
  else
    install_package curl
  fi
  hash -r
}

# Install cron/crontab
install_crontab() {
  local pm
  pm=$(detect_pkg_manager)
  local pkg=""
  case "$pm" in
    apt)   pkg="cron" ;;
    dnf|yum) pkg="cronie" ;;
    pacman) pkg="cronie" ;;
    zypper) pkg="cron" ;;
    *) return 1 ;;
  esac
  [[ -n "$pkg" ]] && install_package "$pkg"
  hash -r
}

# Install SteamCMD and game server deps (Debian/Ubuntu: i386, steamcmd, jq, etc. for LinuxGSM/Arma)
install_steam_game_deps() {
  if [[ "$(detect_pkg_manager)" != "apt" ]]; then
    warn "Steam/game deps (steamcmd, i386 libs) are for Debian/Ubuntu. On other distros install steamcmd and 32-bit libs manually."
    return 0
  fi
  info "Adding i386 architecture and installing SteamCMD + game server dependencies..."
  dpkg --add-architecture i386 2>/dev/null || true
  apt-get update -qq
  apt-get install -y -qq \
    bsdmainutils bzip2 jq lib32gcc-s1 lib32stdc++6 \
    libsdl2-2.0-0:i386 netcat pigz steamcmd unzip
  hash -r
  info "SteamCMD and game server dependencies installed."
}

# Install Node.js via NodeSource (Debian/Ubuntu)
install_nodejs_apt() {
  info "Installing Node.js ${NODE_RECOMMENDED_MAJOR}.x LTS via NodeSource..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_RECOMMENDED_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
  hash -r
}

# Install Node.js via NodeSource (RHEL/Fedora/CentOS)
install_nodejs_dnf() {
  info "Installing Node.js ${NODE_RECOMMENDED_MAJOR}.x LTS via NodeSource..."
  curl -fsSL "https://rpm.nodesource.com/setup_${NODE_RECOMMENDED_MAJOR}.x" | bash -
  dnf install -y nodejs 2>/dev/null || yum install -y nodejs
  hash -r
}

# Install Node.js via pacman (Arch)
install_nodejs_pacman() {
  info "Installing Node.js from Arch repositories..."
  pacman -Sy --noconfirm nodejs npm
  hash -r
}

# Install Node.js via zypper (openSUSE)
install_nodejs_zypper() {
  info "Installing Node.js from openSUSE repositories..."
  zypper -n install nodejs npm
  hash -r
}

# Try to install Node.js; returns 0 on success
install_nodejs() {
  local pm
  pm=$(detect_pkg_manager)
  case "$pm" in
    apt)   install_nodejs_apt ;;
    dnf)   install_nodejs_dnf ;;
    yum)   install_nodejs_dnf ;;
    pacman) install_nodejs_pacman ;;
    zypper) install_nodejs_zypper ;;
    *)
      err "Could not detect package manager (apt/dnf/yum/pacman/zypper). Install Node.js ${NODE_MIN_MAJOR}+ manually: https://nodejs.org/"
      return 1
      ;;
  esac
}

# Full dependency check; installs missing deps (with prompt or auto). Returns 0 only if all deps OK.
check_and_install_deps() {
  local need_node=0 need_npm=0
  local node_ok=0 npm_ok=0

  info "Checking dependencies..."

  # --- curl (required for NodeSource install and general use) ---
  if ! command -v curl &>/dev/null; then
    echo ""
    echo "  [ ] curl (required for downloads / Node.js install)"
    if [[ $AUTO_INSTALL_DEPS -eq 1 ]]; then
      reply="y"
    else
      read -p "      curl not found. Install curl now? [Y/n] " -r reply
      reply="${reply:-y}"
    fi
    if [[ $reply =~ ^[Yy]$ ]]; then
      if ! install_curl; then
        err "Could not install curl. Install it manually (e.g. apt install curl / dnf install curl)."
        return 1
      fi
      info "curl installed."
    else
      err "curl is required (e.g. for Node.js install). Install it and run again."
      return 1
    fi
  fi

  # --- crontab (optional, for scheduled tasks) ---
  if ! command -v crontab &>/dev/null; then
    echo ""
    echo "  [ ] crontab (optional, for panel scheduled tasks)"
    if [[ $AUTO_INSTALL_DEPS -eq 1 ]]; then
      reply="y"
    else
      read -p "      crontab not found. Install cron/crontab now? [Y/n] " -r reply
      reply="${reply:-y}"
    fi
    if [[ $reply =~ ^[Yy]$ ]]; then
      if install_crontab; then
        info "crontab installed."
      else
        warn "Could not install crontab. Install manually if you need scheduled tasks (e.g. cron / cronie)."
      fi
    fi
  fi

  # --- Node.js 18+ ---
  if ! command -v node &>/dev/null; then
    need_node=1
  else
    local major
    major=$(node -v 2>/dev/null | sed -n 's/^v\([0-9]*\).*/\1/p')
    if [[ -z "$major" ]] || [[ "$major" -lt "$NODE_MIN_MAJOR" ]]; then
      warn "Node.js found but version is old (need ${NODE_MIN_MAJOR}+): $(node -v 2>/dev/null)"
      need_node=1
    else
      node_ok=1
    fi
  fi

  if ! command -v npm &>/dev/null; then
    need_npm=1
  else
    npm_ok=1
  fi

  if [[ $need_node -eq 1 ]]; then
    echo ""
    echo "  [ ] Node.js ${NODE_MIN_MAJOR}+ (required)"
    if [[ $AUTO_INSTALL_DEPS -eq 1 ]]; then
      reply="y"
    else
      read -p "      Node.js not found or too old. Install Node.js ${NODE_RECOMMENDED_MAJOR} LTS now? [Y/n] " -r reply
      reply="${reply:-y}"
    fi
    if [[ $reply =~ ^[Yy]$ ]]; then
      if ! install_nodejs; then
        return 1
      fi
      node_ok=1
      npm_ok=1
    else
      err "Install Node.js ${NODE_MIN_MAJOR}+ from https://nodejs.org/ and run this script again."
      return 1
    fi
  fi

  if [[ $need_npm -eq 1 ]] && [[ $npm_ok -eq 0 ]]; then
    echo ""
    echo "  [ ] npm (required, usually comes with Node.js)"
    err "npm not found. Install Node.js ${NODE_MIN_MAJOR}+ (includes npm) and run again."
    return 1
  fi

  # Final check
  if ! command -v node &>/dev/null; then
    err "Node.js still not available in PATH. Try opening a new terminal or run: hash -r"
    return 1
  fi
  local major
  major=$(node -v 2>/dev/null | sed -n 's/^v\([0-9]*\).*/\1/p')
  if [[ -z "$major" ]] || [[ "$major" -lt "$NODE_MIN_MAJOR" ]]; then
    err "Node.js ${NODE_MIN_MAJOR}+ required. Current: $(node -v)"
    return 1
  fi

  local ok_list="node $(node -v), npm $(npm -v)"
  command -v curl &>/dev/null    && ok_list="$ok_list, curl"
  command -v crontab &>/dev/null && ok_list="$ok_list, crontab"
  info "Dependencies OK: $ok_list"
  return 0
}

# Systemd service file content (panel)
get_systemd_content() {
  cat << EOF
[Unit]
Description=Arma Panel - Game server management panel
After=network.target

[Service]
Type=simple
User=${PANEL_USER}
WorkingDirectory=${INSTALL_DIR}/backend
ExecStart=$(command -v node) src/app.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=STATIC_DIR=${INSTALL_DIR}/frontend/dist

[Install]
WantedBy=multi-user.target
EOF
}

# Systemd service for Arma Reforger game server (runs separately so panel updates don't stop the game)
get_arma_server_systemd_content() {
  cat << EOF
[Unit]
Description=Arma Reforger game server (managed by Arma Panel)
After=network.target

[Service]
Type=simple
User=${PANEL_USER}
Environment=ARMA_PANEL_INSTALL_DIR=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/scripts/arma-server-start.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
}

# Wrapper script: reads SERVER_FOLDER and CONFIG_FILE from panel data, runs ArmaReforgerServer
write_arma_server_start_script() {
  cat << 'WRAPPER_EOF' > "${INSTALL_DIR}/scripts/arma-server-start.sh"
#!/usr/bin/env bash
set -e
INSTALL_DIR="${ARMA_PANEL_INSTALL_DIR:-/opt/arma-panel}"
ENV_FILE="${INSTALL_DIR}/backend/data/arma-server.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE (set Server Folder and Config File in panel Settings, then Start the server)" >&2
  exit 1
fi
source "$ENV_FILE"
if [[ -z "$SERVER_FOLDER" ]]; then
  echo "SERVER_FOLDER not set in $ENV_FILE" >&2
  exit 1
fi
if [[ "$CONFIG_FILE" = /* ]]; then
  CONFIG_PATH="$CONFIG_FILE"
else
  CONFIG_PATH="${SERVER_FOLDER}/${CONFIG_FILE}"
fi
PROFILE_PATH="${SERVER_FOLDER}/profiles/server"
EXECUTABLE="${SERVER_FOLDER}/ArmaReforgerServer"
if [[ ! -x "$EXECUTABLE" ]]; then
  echo "Executable not found: $EXECUTABLE" >&2
  exit 1
fi
mkdir -p "$PROFILE_PATH"
# Run from server folder so relative paths (e.g. ./addons) match manual execution
cd "$SERVER_FOLDER"
exec "$EXECUTABLE" -config "$CONFIG_PATH" -profile "$PROFILE_PATH" -maxFPS 60
WRAPPER_EOF
  chmod +x "${INSTALL_DIR}/scripts/arma-server-start.sh"
}

# LinuxGSM Arma Reforger: https://linuxgsm.com/servers/armarserver/
# Creates user, downloads LinuxGSM script, runs interactive ./armarserver install
install_linuxgsm_armarserver() {
  local game_user="${1:-armarserver}"
  if ! id "$game_user" &>/dev/null; then
    info "Creating user ${game_user} for game server..."
    useradd -m -s /bin/bash "$game_user" 2>/dev/null || true
    if ! id "$game_user" &>/dev/null; then
      err "Could not create user ${game_user}. Create it manually and run again."
      return 1
    fi
    info "User ${game_user} created. Set password later with: passwd ${game_user}"
  else
    info "User ${game_user} already exists."
  fi

  if ! command -v tmux &>/dev/null; then
    warn "tmux not found. LinuxGSM uses it for console. Install with: apt install tmux / dnf install tmux"
    install_package tmux 2>/dev/null || true
  fi

  info "Downloading LinuxGSM and setting up armarserver script..."
  if ! sudo -u "$game_user" bash -c 'cd ~ && curl -sSL -o linuxgsm.sh https://linuxgsm.sh && chmod +x linuxgsm.sh && bash linuxgsm.sh armarserver'; then
    err "LinuxGSM download/setup failed."
    return 1
  fi

  info "Starting Arma Reforger server installer (LinuxGSM). Follow the on-screen instructions (Steam login, etc.)..."
  echo ""
  if ! sudo -u "$game_user" -i bash -c 'cd ~ && ./armarserver install'; then
    warn "LinuxGSM install exited with an error. You can run manually: sudo su - ${game_user} then ./armarserver install"
    return 1
  fi

  local home_dir
  home_dir=$(getent passwd "$game_user" | cut -d: -f6)
  [[ -z "$home_dir" ]] && home_dir="/home/${game_user}"
  # Typical LinuxGSM path for game files
  local server_root="${home_dir}/serverfiles"
  if [[ ! -d "$server_root" ]]; then
    server_root="${home_dir}"
  fi

  info "Allowing panel user ${PANEL_USER} to run the game server (group read+execute on server files)..."
  if getent group "$game_user" &>/dev/null; then
    usermod -aG "$game_user" "$PANEL_USER" 2>/dev/null || true
    chmod -R g+rX "$server_root" 2>/dev/null || true
  else
    chmod -R o+rX "$server_root" 2>/dev/null || true
  fi

  echo ""
  info "LinuxGSM Arma Reforger install done. In the panel, open Settings and set:"
  info "  Server Folder: ${server_root}"
  info "  Config File:   (e.g. armarserver_config.json or the path shown by ./armarserver details)"
  info "Then use the panel Start button to run the server via systemd."
  return 0
}

cmd_install() {
  info "Installing Arma Panel to ${INSTALL_DIR}..."

  if ! check_and_install_deps; then
    exit 1
  fi

  if [[ "$(detect_pkg_manager)" == "apt" ]]; then
    echo ""
    local do_steam_deps="n"
    if [[ $AUTO_INSTALL_DEPS -eq 1 ]]; then
      do_steam_deps="y"
    else
      read -p "Install SteamCMD and game server deps (i386, steamcmd, jq, bzip2, etc.) for LinuxGSM/Arma? [Y/n] " -r
      do_steam_deps="${REPLY:-y}"
    fi
    if [[ "$do_steam_deps" =~ ^[Yy]$ ]]; then
      install_steam_game_deps || warn "Steam/game deps install had errors. You can run later: sudo dpkg --add-architecture i386; sudo apt update; sudo apt install bsdmainutils bzip2 jq lib32gcc-s1 lib32stdc++6 libsdl2-2.0-0:i386 netcat pigz steamcmd unzip"
    fi
  fi

  local overwrite_db="n"
  if [[ -d "$INSTALL_DIR" ]]; then
    warn "Directory ${INSTALL_DIR} already exists. Installation will be overwritten."
    echo ""
    if [[ $AUTO_INSTALL_DEPS -eq 1 ]]; then
      overwrite_db="n"
    else
      read -p "Also overwrite database (backend/data)? Settings and users will be reset. [y/N] " -r
      overwrite_db="${REPLY:-n}"
    fi
  else
    mkdir -p "$INSTALL_DIR"
  fi

  local data_backup=""
  if [[ -d "$INSTALL_DIR/backend/data" ]] && [[ ! "$overwrite_db" =~ ^[Yy]$ ]]; then
    data_backup=$(mktemp -d)
    cp -a "$INSTALL_DIR/backend/data/"* "$data_backup/" 2>/dev/null || true
    info "Existing database preserved (will restore after copy)."
  fi

  info "Copying project files..."
  rm -rf "$INSTALL_DIR/backend" "$INSTALL_DIR/frontend"
  cp -r "$PROJECT_ROOT/backend" "$INSTALL_DIR/"
  cp -r "$PROJECT_ROOT/frontend" "$INSTALL_DIR/"
  cp -r "$PROJECT_ROOT/scripts" "$INSTALL_DIR/" 2>/dev/null || true
  mkdir -p "$INSTALL_DIR/backend/data"

  if [[ -n "$data_backup" ]] && [[ -d "$data_backup" ]]; then
    cp -a "$data_backup/"* "$INSTALL_DIR/backend/data/" 2>/dev/null || true
    rm -rf "$data_backup"
    info "Database restored (settings and users kept)."
  fi

  info "Installing backend dependencies..."
  (cd "$INSTALL_DIR/backend" && npm install --omit=dev)

  info "Installing frontend dependencies and building..."
  (cd "$INSTALL_DIR/frontend" && npm install && VITE_API_URL= npm run build)

  if ! id "$PANEL_USER" &>/dev/null; then
    info "Creating system user ${PANEL_USER}..."
    useradd --system --no-create-home --shell /usr/sbin/nologin "$PANEL_USER" 2>/dev/null || true
    if ! id "$PANEL_USER" &>/dev/null; then
      err "Could not create user ${PANEL_USER}. Create it manually or set ARMA_PANEL_USER=root"
      exit 1
    fi
  fi

  info "Creating systemd service (panel)..."
  get_systemd_content > "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"

  info "Creating Arma Reforger game server systemd service (runs separately; panel Start/Stop will use it)..."
  write_arma_server_start_script
  get_arma_server_systemd_content > "/etc/systemd/system/${ARMA_SERVER_SERVICE}.service"
  touch "${INSTALL_DIR}/backend/data/.use-systemd-game-server"
  systemctl daemon-reload
  systemctl enable "$ARMA_SERVER_SERVICE"
  info "Allowing ${PANEL_USER} to control game server via sudo (for panel Start/Stop)..."
  echo "${PANEL_USER} ALL=(ALL) NOPASSWD: /usr/bin/systemctl start ${ARMA_SERVER_SERVICE}, /usr/bin/systemctl stop ${ARMA_SERVER_SERVICE}, /usr/bin/systemctl restart ${ARMA_SERVER_SERVICE}, /usr/bin/systemctl status ${ARMA_SERVER_SERVICE}, /usr/bin/systemctl is-active ${ARMA_SERVER_SERVICE}" > "/etc/sudoers.d/arma-panel-${ARMA_SERVER_SERVICE}"
  chmod 440 "/etc/sudoers.d/arma-panel-${ARMA_SERVER_SERVICE}"
  info "Game server: systemctl start|stop|restart|status $ARMA_SERVER_SERVICE (or use panel Start/Stop)"

  echo ""
  local do_linuxgsm="n"
  if [[ $AUTO_INSTALL_DEPS -eq 1 ]]; then
    do_linuxgsm="n"
  else
    read -p "Install Arma Reforger game server from scratch via LinuxGSM? (https://linuxgsm.com/servers/armarserver/) [y/N] " -r
    do_linuxgsm="${REPLY:-n}"
  fi
  if [[ "$do_linuxgsm" =~ ^[Yy]$ ]]; then
    install_linuxgsm_armarserver "armarserver" || true
  fi

  info "Setting ownership to ${PANEL_USER} (service user) so the panel can write to the database..."
  chown -R "${PANEL_USER}:${PANEL_USER}" "$INSTALL_DIR"

  info "Starting Arma Panel..."
  systemctl start "$SERVICE_NAME"

  info "Installation complete."
  info "Panel URL: http://localhost:3001 (or this host's IP)"
  info "Commands: systemctl start|stop|restart|status $SERVICE_NAME"
  info "Game server runs as $ARMA_SERVER_SERVICE (start/stop from panel or systemctl). Updates to the panel will not stop the game server."
  info "Or use this script: $0 start | stop | restart | status"
}

cmd_uninstall() {
  info "Uninstalling Arma Panel..."

  if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    info "Stopping panel service..."
    systemctl stop "$SERVICE_NAME"
  fi

  if systemctl is-active --quiet "$ARMA_SERVER_SERVICE" 2>/dev/null; then
    info "Stopping game server service..."
    systemctl stop "$ARMA_SERVER_SERVICE"
  fi

  if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    systemctl disable "$SERVICE_NAME"
  fi
  if systemctl is-enabled --quiet "$ARMA_SERVER_SERVICE" 2>/dev/null; then
    systemctl disable "$ARMA_SERVER_SERVICE"
  fi

  local need_reload=0
  if [[ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]]; then
    rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
    need_reload=1
    info "Panel systemd service removed."
  fi
  if [[ -f "/etc/systemd/system/${ARMA_SERVER_SERVICE}.service" ]]; then
    rm -f "/etc/systemd/system/${ARMA_SERVER_SERVICE}.service"
    need_reload=1
    info "Game server systemd service removed."
  fi
  if [[ -f "/etc/sudoers.d/arma-panel-${ARMA_SERVER_SERVICE}" ]]; then
    rm -f "/etc/sudoers.d/arma-panel-${ARMA_SERVER_SERVICE}"
    info "Sudoers rule for game server removed."
  fi
  [[ $need_reload -eq 1 ]] && systemctl daemon-reload

  if [[ -d "$INSTALL_DIR" ]]; then
    read -p "Remove install directory ${INSTALL_DIR}? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      rm -rf "$INSTALL_DIR"
      info "Removed ${INSTALL_DIR}"
    fi
  fi

  info "Uninstall complete."
}

cmd_start() {
  systemctl start "$SERVICE_NAME"
  info "Arma Panel started."
}

cmd_restart() {
  systemctl restart "$SERVICE_NAME"
  info "Arma Panel restarted."
}

cmd_stop() {
  systemctl stop "$SERVICE_NAME"
  info "Arma Panel stopped."
}

cmd_update() {
  if [[ ! -d "$INSTALL_DIR" ]]; then
    err "Not installed at ${INSTALL_DIR}. Run: $0 install"
    exit 1
  fi

  info "Updating Arma Panel at ${INSTALL_DIR} (rebuild + restart)..."

  local data_backup=""
  if [[ -d "$INSTALL_DIR/backend/data" ]]; then
    data_backup=$(mktemp -d)
    cp -a "$INSTALL_DIR/backend/data/"* "$data_backup/" 2>/dev/null || true
    info "Database preserved."
  fi

  info "Copying project files..."
  rm -rf "$INSTALL_DIR/backend" "$INSTALL_DIR/frontend"
  cp -r "$PROJECT_ROOT/backend" "$INSTALL_DIR/"
  cp -r "$PROJECT_ROOT/frontend" "$INSTALL_DIR/"
  cp -r "$PROJECT_ROOT/scripts" "$INSTALL_DIR/" 2>/dev/null || true
  mkdir -p "$INSTALL_DIR/backend/data"

  if [[ -n "$data_backup" ]] && [[ -d "$data_backup" ]]; then
    cp -a "$data_backup/"* "$INSTALL_DIR/backend/data/" 2>/dev/null || true
    rm -rf "$data_backup"
  fi

  info "Installing backend dependencies..."
  (cd "$INSTALL_DIR/backend" && npm install --omit=dev)

  info "Building frontend..."
  (cd "$INSTALL_DIR/frontend" && npm install && VITE_API_URL= npm run build)

  if [[ -f "$INSTALL_DIR/backend/data/.use-systemd-game-server" ]]; then
    info "Recreating game server wrapper script..."
    write_arma_server_start_script
  fi

  chown -R "${PANEL_USER}:${PANEL_USER}" "$INSTALL_DIR"

  info "Restarting Arma Panel..."
  systemctl restart "$SERVICE_NAME"

  info "Update complete."
}

cmd_status() {
  systemctl status "$SERVICE_NAME" --no-pager
}

cmd_usage() {
  echo "Usage: $0 { install | update | uninstall | start | restart | stop | status }"
  echo ""
  echo "  install   - Install panel (+ optional LinuxGSM Arma Reforger server from scratch), create systemd services"
  echo "  update    - Rebuild and restart (copy latest code, npm install, build frontend, restart; keeps DB)"
  echo "  uninstall - Stop services, remove systemd units, optionally remove install dir"
  echo "  start     - Start the panel (systemctl start ${SERVICE_NAME})"
  echo "  restart   - Restart the panel (systemctl restart ${SERVICE_NAME})"
  echo "  stop      - Stop the panel (systemctl stop ${SERVICE_NAME})"
  echo "  exit      - Alias for stop"
  echo "  status    - Show panel service status. Game server: systemctl status ${ARMA_SERVER_SERVICE}"
  echo ""
  echo "Environment:"
  echo "  ARMA_PANEL_INSTALL_DIR       Install path (default: /opt/arma-panel)"
  echo "  ARMA_PANEL_USER              User to run service (default: current/sudo user)"
  echo "  ARMA_PANEL_AUTO_INSTALL_DEPS Set to 1 to auto-install missing deps (e.g. Node.js) without prompt"
  echo ""
  echo "Examples:"
  echo "  sudo $0 install"
  echo "  sudo $0 stop"
  echo "  ARMA_PANEL_INSTALL_DIR=/home/arma/panel sudo $0 install"
  exit 1
}

case "${1:-}" in
  install)   cmd_install ;;
  update)    cmd_update ;;
  uninstall) cmd_uninstall ;;
  start)     cmd_start ;;
  restart)   cmd_restart ;;
  stop|exit) cmd_stop ;;
  status)    cmd_status ;;
  *)         cmd_usage ;;
esac

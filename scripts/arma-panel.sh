#!/usr/bin/env bash
# Arma Panel - Linux install, uninstall, start, restart, stop (systemd)
# Usage: sudo ./arma-panel.sh { install | uninstall | start | restart | stop | status }

set -e

SERVICE_NAME="arma-panel"
INSTALL_DIR="${ARMA_PANEL_INSTALL_DIR:-/opt/arma-panel}"
PANEL_USER="${ARMA_PANEL_USER:-root}"
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

# Systemd service file content
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

cmd_install() {
  info "Installing Arma Panel to ${INSTALL_DIR}..."

  if ! check_and_install_deps; then
    exit 1
  fi

  if [[ -d "$INSTALL_DIR" ]]; then
    warn "Directory ${INSTALL_DIR} already exists. Overwriting."
  else
    mkdir -p "$INSTALL_DIR"
  fi

  info "Copying project files..."
  cp -r "$PROJECT_ROOT/backend" "$INSTALL_DIR/"
  cp -r "$PROJECT_ROOT/frontend" "$INSTALL_DIR/"
  cp -r "$PROJECT_ROOT/scripts" "$INSTALL_DIR/" 2>/dev/null || true
  mkdir -p "$INSTALL_DIR/backend/data"

  info "Installing backend dependencies..."
  (cd "$INSTALL_DIR/backend" && npm install --omit=dev)

  info "Installing frontend dependencies and building..."
  (cd "$INSTALL_DIR/frontend" && npm install && VITE_API_URL= npm run build)

  info "Creating systemd service..."
  get_systemd_content > "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"

  info "Starting Arma Panel..."
  systemctl start "$SERVICE_NAME"

  info "Installation complete."
  info "Panel URL: http://localhost:3001 (or this host's IP)"
  info "Commands: systemctl start|stop|restart|status $SERVICE_NAME"
  info "Or use this script: $0 start | stop | restart | status"
}

cmd_uninstall() {
  info "Uninstalling Arma Panel..."

  if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    info "Stopping service..."
    systemctl stop "$SERVICE_NAME"
  fi

  if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    systemctl disable "$SERVICE_NAME"
  fi

  if [[ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]]; then
    rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
    systemctl daemon-reload
    info "Systemd service removed."
  fi

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

cmd_status() {
  systemctl status "$SERVICE_NAME" --no-pager
}

cmd_usage() {
  echo "Usage: $0 { install | uninstall | start | restart | stop | status }"
  echo ""
  echo "  install   - Install panel to ${INSTALL_DIR}, build frontend, create and enable systemd service"
  echo "  uninstall - Stop service, remove systemd unit, optionally remove install dir"
  echo "  start     - Start the panel (systemctl start ${SERVICE_NAME})"
  echo "  restart   - Restart the panel (systemctl restart ${SERVICE_NAME})"
  echo "  stop      - Stop the panel (systemctl stop ${SERVICE_NAME})"
  echo "  exit      - Alias for stop"
  echo "  status    - Show service status"
  echo ""
  echo "Environment:"
  echo "  ARMA_PANEL_INSTALL_DIR       Install path (default: /opt/arma-panel)"
  echo "  ARMA_PANEL_USER              User to run service (default: root)"
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
  uninstall) cmd_uninstall ;;
  start)     cmd_start ;;
  restart)   cmd_restart ;;
  stop|exit) cmd_stop ;;
  status)    cmd_status ;;
  *)         cmd_usage ;;
esac

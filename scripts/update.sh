#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  Chzzk Recorder Pro — Native 업데이트 스크립트
#  사용법 (원라이너):
#    curl -fsSL https://raw.githubusercontent.com/eruminyu/Chzzk_downloader/main/scripts/update.sh | bash
#
#  또는 설치 디렉토리에서 직접 실행:
#    ~/chzzk-recorder-pro/scripts/update.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

INSTALL_DIR="${INSTALL_DIR:-$HOME/chzzk-recorder-pro}"

info()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✘]${NC} $1"; exit 1; }
step()  { echo -e "\n${BOLD}${CYAN}▶ $1${NC}"; }

# ── 설치 디렉토리 확인 ────────────────────────────────────────
check_install() {
  if [ ! -d "$INSTALL_DIR/.git" ]; then
    error "설치 디렉토리를 찾을 수 없습니다: $INSTALL_DIR\n  먼저 install.sh로 설치해 주세요."
  fi
  info "설치 디렉토리 확인: $INSTALL_DIR ✓"
}

# ── 1. 최신 코드 pull ─────────────────────────────────────────
pull_latest() {
  step "최신 코드 가져오기"
  git -C "$INSTALL_DIR" fetch origin
  LOCAL=$(git -C "$INSTALL_DIR" rev-parse HEAD)
  REMOTE=$(git -C "$INSTALL_DIR" rev-parse origin/main)
  if [ "$LOCAL" = "$REMOTE" ]; then
    info "이미 최신 버전입니다. 업데이트를 건너뜁니다."
    exit 0
  fi
  git -C "$INSTALL_DIR" reset --hard origin/main
  info "코드 업데이트 완료 ✓"
}

# ── 2. 서비스 중지 ────────────────────────────────────────────
stop_service() {
  step "서비스 중지"
  if command -v systemctl &>/dev/null && systemctl is-active --quiet chzzk-recorder 2>/dev/null; then
    sudo systemctl stop chzzk-recorder
    info "systemd 서비스 중지 완료 ✓"
  else
    warn "실행 중인 서비스를 찾을 수 없습니다. 수동으로 중지가 필요할 수 있습니다."
  fi
}

# ── 3. 프론트엔드 재빌드 ──────────────────────────────────────
build_frontend() {
  step "프론트엔드 재빌드"
  cd "$INSTALL_DIR/frontend"
  npm ci --silent
  npm run build
  info "프론트엔드 빌드 완료 ✓"
  cd "$INSTALL_DIR"
}

# ── 4. Python 의존성 업데이트 ─────────────────────────────────
update_python_deps() {
  step "Python 의존성 업데이트"
  VENV_DIR="$INSTALL_DIR/.venv"
  if [ ! -d "$VENV_DIR" ]; then
    error ".venv 디렉토리를 찾을 수 없습니다. install.sh를 다시 실행해 주세요."
  fi
  "$VENV_DIR/bin/pip" install --upgrade -r "$INSTALL_DIR/backend/requirements.txt" -q
  info "Python 의존성 업데이트 완료 ✓"
}

# ── 5. 서비스 재시작 ──────────────────────────────────────────
restart_service() {
  step "서비스 재시작"
  if command -v systemctl &>/dev/null && systemctl is-enabled --quiet chzzk-recorder 2>/dev/null; then
    sudo systemctl start chzzk-recorder
    info "systemd 서비스 재시작 완료 ✓"
    info "서비스 상태: sudo systemctl status chzzk-recorder"
  else
    info "서비스를 수동으로 시작하려면:"
    echo -e "    ${CYAN}$INSTALL_DIR/start.sh${NC}"
  fi
}

# ── 완료 메시지 ──────────────────────────────────────────────
print_done() {
  echo ""
  echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║      🎉 업데이트가 완료되었습니다!         ║${NC}"
  echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════╝${NC}"
  echo ""
  # .env에서 PORT 읽기 (없으면 기본값 8000)
  ENV_FILE="$INSTALL_DIR/.env"
  PORT=8000
  if [ -f "$ENV_FILE" ]; then
    PARSED_PORT=$(grep -E '^PORT=' "$ENV_FILE" | head -1 | cut -d'=' -f2 | tr -d '[:space:]')
    [ -n "$PARSED_PORT" ] && PORT="$PARSED_PORT"
  fi
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
  echo -e "  ${BOLD}▶ 접속 주소:${NC}"
  echo -e "    ${CYAN}http://localhost:$PORT${NC}"
  [ -n "$LOCAL_IP" ] && echo -e "    ${CYAN}http://$LOCAL_IP:$PORT${NC}  (원격)"
  echo ""
}

main() {
  echo ""
  echo -e "${CYAN}${BOLD}  Chzzk Recorder Pro — Native 업데이트${NC}"
  echo ""
  check_install
  pull_latest
  stop_service
  build_frontend
  update_python_deps
  restart_service
  print_done
}

main "$@"

#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Chzzk-Recorder-Pro Linux 설치 스크립트
# 지원: Ubuntu 20.04+, Debian 11+, Fedora 36+, Arch Linux
# 사용: bash scripts/install.sh
# ─────────────────────────────────────────────────────────────
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$REPO_DIR/.venv"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "  ██████╗ ██╗  ██╗███████╗███████╗██╗  ██╗"
echo "  ██╔════╝██║  ██║╚══███╔╝╚══███╔╝██║ ██╔╝"
echo "  ██║     ███████║  ███╔╝   ███╔╝ █████╔╝ "
echo "  ██║     ██╔══██║ ███╔╝   ███╔╝  ██╔═██╗ "
echo "  ╚██████╗██║  ██║███████╗███████╗██║  ██╗"
echo "   ╚═════╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝"
echo "   Recorder Pro - Linux Installer"
echo ""

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── 1. 사전 요구사항 확인 ─────────────────────────────────
log_info "사전 요구사항 확인 중..."

# Python 3.10+
if command -v python3 &>/dev/null; then
    PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    PY_MAJOR=$(echo "$PY_VER" | cut -d. -f1)
    PY_MINOR=$(echo "$PY_VER" | cut -d. -f2)
    if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 10 ]; }; then
        log_error "Python 3.10 이상이 필요합니다. 현재 버전: $PY_VER"
    fi
    log_info "Python $PY_VER ✓"
else
    log_error "Python 3이 설치되어 있지 않습니다. 설치 후 다시 실행하세요."
fi

# ffmpeg
if ! command -v ffmpeg &>/dev/null; then
    log_warn "ffmpeg가 설치되어 있지 않습니다."
    echo "  Ubuntu/Debian: sudo apt install ffmpeg"
    echo "  Fedora:        sudo dnf install ffmpeg"
    echo "  Arch:          sudo pacman -S ffmpeg"
    log_error "ffmpeg 설치 후 다시 실행하세요."
fi
log_info "ffmpeg ✓"

# streamlink
if ! command -v streamlink &>/dev/null; then
    log_warn "streamlink가 설치되어 있지 않습니다."
    echo "  pip: pip install streamlink"
    echo "  또는 시스템 패키지 매니저로 설치하세요."
    log_error "streamlink 설치 후 다시 실행하세요."
fi
log_info "streamlink ✓"

# git
if ! command -v git &>/dev/null; then
    log_warn "git이 설치되어 있지 않습니다 (선택사항)."
fi

# ── 2. 가상환경 생성 ─────────────────────────────────────
log_info "Python 가상환경 생성 중: $VENV_DIR"
python3 -m venv "$VENV_DIR"
log_info "가상환경 생성 완료 ✓"

# ── 3. 의존성 설치 ───────────────────────────────────────
log_info "Python 의존성 설치 중..."
"$VENV_DIR/bin/pip" install --upgrade pip -q
"$VENV_DIR/bin/pip" install -r "$REPO_DIR/backend/requirements.txt" -q
log_info "의존성 설치 완료 ✓"

# ── 4. .env 파일 설정 ─────────────────────────────────────
if [ ! -f "$REPO_DIR/.env" ]; then
    log_info ".env 파일 생성 중... (.env.example 복사)"
    cp "$REPO_DIR/.env.example" "$REPO_DIR/.env"
    log_warn ".env 파일을 편집하여 NID_AUT, NID_SES 등을 설정하세요."
else
    log_info ".env 파일이 이미 존재합니다. 건너뜁니다."
fi

# ── 5. 디렉토리 생성 ─────────────────────────────────────
mkdir -p "$REPO_DIR/recordings" "$REPO_DIR/data" "$REPO_DIR/logs"
log_info "데이터 디렉토리 생성 완료 ✓"

# ── 완료 ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}✅ 설치 완료!${NC}"
echo ""
echo "  서버 실행 방법:"
echo "    cd $REPO_DIR/backend"
echo "    ../.venv/bin/python run.py"
echo ""
echo "  systemd 서비스 등록 (부팅 시 자동 실행):"
echo "    sudo bash $REPO_DIR/scripts/setup_service.sh"
echo ""

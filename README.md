# Chzzk-Recorder-Pro

![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

**Chzzk-Recorder-Pro**는 네이버 치지직(Chzzk) 라이브 스트리밍 녹화 및 VOD 다운로드를 위한 강력한 올인원 솔루션입니다.
안정적인 녹화 파이프라인, 직관적인 웹 대시보드, 그리고 실시간 채팅 아카이빙 기능을 제공합니다.

---

## ✨ 주요 기능

### 🎥 라이브 녹화 (Live Recording)
- **자동 녹화**: 등록한 스트리머가 방송을 켜면 자동으로 녹화를 시작합니다.
- **안정성**: `Fragmented MP4` 기술을 적용하여 정전이나 프로세스 강제 종료 시에도 녹화된 파일이 손상되지 않습니다.
- **고화질**: 원본 화질(Best Quality)을 손실 없이 저장합니다.

### 💾 VOD 다운로드 (VOD Downloader)
- **다양한 소스**: 치지직 다시보기/클립뿐만 아니라 YouTube 등 외부 사이트 영상도 다운로드 가능합니다.
- **대기열 시스템**: 여러 영상을 대기열에 등록하고, 드래그 앤 드롭으로 우선순위를 변경할 수 있습니다.
- **이어받기**: 다운로드가 중단되어도 이어서 받을 수 있습니다.

### 💬 채팅 아카이빙 (Chat Archiving)
- **실시간 수집**: 라이브 녹화와 동시에 채팅 로그를 `.jsonl` 파일로 저장합니다.
- **웹 뷰어**: 내장된 뷰어를 통해 날짜별, 채널별 채팅을 검색하고 조회할 수 있습니다.

### 📊 통계 및 알림
- **대시보드**: 총 녹화 시간, 용량, 채널별 통계를 시각적으로 확인합니다.
- **Discord 알림**: 녹화 시작/종료, 다운로드 완료 시 디스코드 봇을 통해 알림을 받습니다.

---

## 🚀 설치 및 실행

사용 환경에 맞는 방법을 선택하세요:

| 환경 | 방법 | 난이도 |
|------|------|--------|
| 🪟 Windows | `.exe` 실행 파일 | ⭐ 가장 쉬움 |
| 🐧 Linux / macOS | 원라이너 스크립트 (Native) | ⭐ 가장 쉬움 |
| 🐳 Linux / macOS | 원라이너 스크립트 (Docker) | ⚠️ 현재 버그 수정 중 |
| ⚙️ 모든 OS | 직접 실행 (개발자용) | 🔧 고급 |

---

### 🪟 Windows — `.exe` 실행 파일

> **Python 설치 불필요!** Python 인터프리터가 내장되어 있어 더블클릭만으로 바로 실행됩니다.

1. [Releases 페이지](https://github.com/eruminyu/Chzzk_downloader/releases)에서 최신 `chzzk-recorder-pro.exe` 다운로드
2. 파일 더블클릭 → 서버 자동 시작
3. 브라우저에서 `http://localhost:8000` 접속

> ⚠️ Windows Defender가 경고를 표시할 수 있습니다. **"추가 정보" → "실행"** 을 눌러 허용하세요.  
> (서명되지 않은 exe 파일에서 흔히 발생하는 현상입니다)

---

### 🐧 Linux / macOS — 원라이너 (Native 설치)

터미널에 아래 명령어 하나를 붙여넣으세요.  
OS 감지부터 의존성 설치, 빌드, systemd 등록까지 전부 자동으로 처리합니다.

```bash
curl -fsSL https://raw.githubusercontent.com/eruminyu/Chzzk_downloader/main/scripts/install.sh | bash
```

**자동 처리 목록:**
- Ubuntu / Debian / CentOS / Fedora / Arch 자동 감지
- Python 3.12, ffmpeg, Node.js, streamlink 자동 설치
- 프론트엔드 빌드 (React → 정적 파일)
- Python 가상환경 생성 및 의존성 설치
- systemd 서비스 등록 (부팅 시 자동 실행, 선택)

> 📖 상세 가이드: [Linux 설치 가이드](./docs/linux-guide.md)

---

### 🐳 Linux / macOS — 원라이너 (Docker)

> ⚠️ **현재 Docker 환경에서 파일 저장 경로 관련 버그를 수정 중입니다. 안정적인 사용을 위해 Native 설치를 권장합니다.**

Docker가 없는 서버에서도 OK. Docker Engine 설치까지 포함합니다.

```bash
curl -fsSL https://raw.githubusercontent.com/eruminyu/Chzzk_downloader/main/scripts/install-docker.sh | bash
```

**자동 처리 목록:**
- Docker Engine 미설치 시 자동 설치 (공식 `get.docker.com` 사용)
- Docker Compose 플러그인 자동 설치
- 저장소 클론 → 이미지 빌드 → 백그라운드 실행
- 헬스체크로 정상 시작 확인

> 📖 상세 가이드: [Docker 가이드](./docs/docker-guide.md)

---

### ⚙️ 직접 실행 (개발자용)

Python 3.10+, Node.js 18+, `ffmpeg`가 사전 설치되어 있어야 합니다.

```bash
# 저장소 클론
git clone https://github.com/eruminyu/Chzzk_downloader.git
cd Chzzk_downloader

# 프론트엔드 빌드
cd frontend && npm ci && npm run build
cp -r dist ../backend/app/static && cd ..

# Python 환경 설정
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r backend/requirements.txt

# 서버 실행
cd backend && python run.py
```

브라우저에서 `http://localhost:8000` 접속

> `.bat` 파일(`scripts/start.bat`)은 이미 환경이 구성된 개발자가 빠르게 서버를 시작할 때 사용합니다.

---

## ⚙️ 설정 가이드

### 1. 치지직 인증 (성인 방송 녹화)
성인 인증이 필요한 방송을 녹화하려면 네이버 로그인 쿠키가 필요합니다.
1. 웹 브라우저에서 네이버 로그인 후 개발자 도구(F12) → Application → Cookies를 엽니다.
2. `NID_AUT`와 `NID_SES` 값을 복사합니다.
3. Chzzk-Recorder-Pro 설정 페이지(Settings)에서 해당 값을 입력하고 저장합니다.

### 2. Discord 알림 설정
1. Discord Developer Portal에서 새 애플리케이션을 생성하고 Bot을 추가합니다.
2. 봇 토큰(Token)을 복사합니다.
3. 봇을 서버에 초대하고, 알림을 받을 채널 ID를 복사합니다. (디스코드 개발자 모드 켜기 필요)
4. 설정 페이지의 Discord 섹션에 토큰과 채널 ID를 입력합니다.

---

## 📂 디렉토리 구조

```
Chzzk-Recorder-Pro/
├── backend/
│   ├── app/
│   │   ├── api/        # REST API 엔드포인트
│   │   ├── engine/     # 녹화 및 다운로드 코어 로직
│   │   └── services/   # 비즈니스 로직 서비스
│   └── data/           # 설정 및 이력 데이터 (JSON)
├── frontend/
│   └── src/
│       ├── api/        # API 클라이언트
│       ├── components/ # UI 컴포넌트
│       └── pages/      # 페이지
├── scripts/            # 설치 스크립트 (install.sh, install-docker.sh)
└── docs/               # 프로젝트 문서
```

---

## 📝 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

---

## ⚠️ 주의사항

- 이 도구는 개인적인 소장 목적으로만 사용해야 합니다.
- 저작권자가 다운로드를 허용하지 않은 콘텐츠를 무단으로 배포하거나 상업적으로 이용할 경우 법적 책임이 따를 수 있습니다.
- 치지직의 서비스 약관을 준수해 주세요.

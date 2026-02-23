# 테스트 가이드

## 환경별 테스트 시나리오 개요

| 환경 | 목적 | 방법 |
|---|---|---|
| Windows (빌드 전) | 기능/API 최종 검증 | Python + Vite dev server |
| Windows (빌드 후) | 통합 서버 및 `.exe` 검증 | PyInstaller 빌드 후 실행 |
| Ubuntu VM (Docker) | 컨테이너 배포 검증 | `docker compose up` |
| Ubuntu VM (설치형) | Linux Native 배포 검증 | `install.sh` + Native 실행 |

> [!NOTE]
> **빌드 후 테스트부터는 `.env`를 직접 편집하지 않아도 됩니다.**
> 서버 최초 실행 시 브라우저에 **초기 설정 마법사**가 자동으로 표시되어 저장 경로, 품질, 인증 쿠키를 UI에서 설정할 수 있습니다.
> 마법사를 다시 띄우고 싶으면 `data/.setup_complete` 파일을 삭제하세요.

---

## 1. Windows — 빌드 전 기능 테스트

개발 환경 그대로 프론트엔드(Vite)와 백엔드(FastAPI)를 분리 실행한다.
이 환경에서는 개발 편의상 `.env`를 직접 편집해 사용한다.

### 사전 준비
```powershell
cd c:\Project\Chzzk_downloader\backend
.venv\Scripts\pip install -r requirements.txt
```

### 실행

**터미널 1 — 백엔드**
```powershell
cd c:\Project\Chzzk_downloader\backend
.venv\Scripts\python run.py
# 서버 시작 로그 확인: "Uvicorn running on http://0.0.0.0:8000"
```

**터미널 2 — 프론트엔드**
```powershell
cd c:\Project\Chzzk_downloader\frontend
npm install
npm run dev
# 브라우저: http://localhost:3000
```

> [!TIP]
> `localhost:3000`의 `/api/*` 요청은 Vite Proxy를 통해 `:8000`으로 자동 포워딩된다.

### 체크리스트
- [ ] 채널 추가/삭제 동작
- [ ] 라이브 녹화 시작/중지
- [ ] VOD 다운로드
- [ ] 설정 저장 및 불러오기
- [ ] `http://localhost:8000/health` → JSON 응답 확인

---

## 2. Windows — 빌드 후 통합 서버 테스트

`npm run build` 후 FastAPI 단독으로 프론트엔드까지 서빙하는 구조를 검증한다.

### Step A: 프론트엔드 빌드
```powershell
cd c:\Project\Chzzk_downloader\frontend
npm run build
# 완료 후 확인: backend\app\static\index.html 파일 존재 여부
```

### Step B: FastAPI 단독 실행 (Vite 없이)
```powershell
cd c:\Project\Chzzk_downloader\backend
.venv\Scripts\python run.py
# 브라우저: http://localhost:8000
```

**초기 설정 마법사 확인:**
1. `http://localhost:8000` 접속 시 마법사 팝업 자동 표시
2. Step 1: 저장 경로 입력, 품질/포맷 선택
3. Step 2: 치지직 쿠키 입력 또는 건너뛰기
4. Step 3: 설정 요약 확인 후 "설정 완료" 클릭
5. `data/.setup_complete` 파일 생성 확인 → 이후 재접속 시 마법사 미표시

### 체크리스트
- [ ] 마법사 팝업 표시 확인 (최초 접속 시)
- [ ] 마법사 완료 후 `data/.setup_complete` 파일 생성 확인
- [ ] 재접속 시 마법사 미표시 확인
- [ ] `http://localhost:8000/settings` → 새로고침 시에도 React 앱 유지 (SPA 라우팅)
- [ ] `http://localhost:8000/api/stream/channels` → JSON API 응답

### Step C: `.exe` 빌드 및 테스트

> [!IMPORTANT]
> `.exe` 빌드 전 반드시 **Step A**의 `npm run build`를 먼저 완료해야 한다.
> `bin/` 폴더에 `ffmpeg.exe`를 배치하거나 `chzzk_recorder.spec`의 `binaries` 항목 주석을 해제해야 FFmpeg가 번들에 포함된다.

```powershell
# PyInstaller 설치 (최초 1회)
.venv\Scripts\pip install pyinstaller

# 빌드 (프로젝트 루트에서 실행)
cd c:\Project\Chzzk_downloader
.venv\Scripts\pyinstaller chzzk_recorder.spec

# 빌드 결과물: dist\ChzzkRecorder\ChzzkRecorder.exe
```

**클린 환경 테스트** (중요):
- `dist\ChzzkRecorder\` 폴더를 Python/Node가 없는 다른 경로로 복사
- `ChzzkRecorder.exe` 더블클릭 → 브라우저 자동 열림 + **마법사 팝업** 표시 확인
- 트레이 아이콘 우클릭 → 메뉴 동작 확인

---

## 3. Ubuntu VM — Docker 테스트

### 사전 준비
```bash
docker --version
docker compose version

# 프로젝트 루트로 이동 (git clone 또는 scp로 전달)
cd /path/to/Chzzk_downloader
```

### `.env` 파일 준비 (최소 설정)
```bash
cp .env.example .env
# 빌드 후 테스트에서는 .env에 인증 정보를 넣지 않아도 됨
# → 서버 실행 후 마법사를 통해 WebUI에서 설정 가능
```

### 빌드 및 실행
```bash
docker build -t chzzk-recorder .
docker compose up -d
docker compose logs -f
```

### 체크리스트
- [ ] `http://[VM_IP]:8000` 접속 → 마법사 팝업 표시
- [ ] 마법사에서 저장 경로를 `/recordings`로 설정 후 완료
- [ ] `docker compose ps` → `healthy` 상태 확인
- [ ] `docker compose down && docker compose up -d` 후 `data/.setup_complete` 유지 확인 (볼륨 영속성)

### 정리
```bash
docker compose down
docker image rm chzzk-recorder
```

---

## 4. Ubuntu VM — 설치형(Native) 테스트

### 사전 준비
```bash
sudo apt update && sudo apt install -y python3.12 python3.12-venv ffmpeg git
pip install streamlink

cd /path/to/Chzzk_downloader
```

### 설치 스크립트 실행
```bash
bash scripts/install.sh
# .env 파일이 자동으로 .env.example에서 복사됨
# → 직접 편집 불필요, 마법사에서 설정 가능
```

### 프론트엔드 빌드 (Node.js가 없는 서버)
> [!TIP]
> Windows에서 미리 `npm run build`를 실행한 뒤 `backend/app/static/` 폴더를 함께 복사하면 Ubuntu에서 별도 빌드가 필요 없다.

```bash
# Node.js가 있는 경우에만 서버에서 직접 빌드
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
cd frontend && npm install && npm run build
```

### 서버 실행
```bash
cd /path/to/Chzzk_downloader/backend
../.venv/bin/python run.py
# 브라우저: http://[VM_IP]:8000 → 마법사 팝업 확인
```

### systemd 서비스 등록 (선택사항)
```bash
sudo bash scripts/setup_service.sh /path/to/Chzzk_downloader $USER

sudo systemctl status chzzk-recorder@$USER
sudo journalctl -u chzzk-recorder@$USER -f
```

### 체크리스트
- [ ] `http://[VM_IP]:8000` → 마법사 팝업 표시
- [ ] 마법사 완료 후 API 정상 응답 확인
- [ ] systemd 등록 후 재부팅 시 자동 시작 확인

---

## 포트 접근 문제 해결

Ubuntu VM에서 외부(Windows 호스트)에서 접근이 안 될 경우:
```bash
sudo ufw allow 8000
ip addr show | grep 'inet '
```

Docker의 경우 `docker-compose.yml`의 포트 바인딩이 `0.0.0.0:8000:8000`인지 확인한다.

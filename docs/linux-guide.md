# Linux 서버 테스트 가이드

## 개요

Linux 환경에서는 두 가지 방식으로 실행할 수 있습니다:

| 방식 | 대상 | 특징 |
|------|------|------|
| **Docker Compose** | 서버 배포 권장 | 격리 환경, 재현성 보장 |
| **직접 실행 (native)** | 개발/테스트용 | Python 직접 실행 |

---

## 방법 1: Docker Compose (권장)

[docker-guide.md](./docker-guide.md) 와 동일합니다.
Linux 서버에서도 완전히 동일하게 동작합니다.

```bash
docker compose up --build -d    # 백그라운드 실행
docker compose logs -f          # 로그 확인
```

접속: `http://서버IP:8000`

---

## 방법 2: 직접 실행 (Native Python)

### 사전 요구사항

```bash
# Ubuntu/Debian 기준
sudo apt-get update
sudo apt-get install -y python3.12 python3.12-venv ffmpeg

# streamlink
pip3 install streamlink
```

### 설치

```bash
# 저장소 클론
git clone https://github.com/your-repo/chzzk-recorder-pro.git
cd chzzk-recorder-pro

# 프론트엔드 빌드
cd frontend
npm ci && npm run build
cp -r dist ../backend/app/static
cd ..

# Python 의존성 설치
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 실행

```bash
# backend/ 디렉토리에서
source .venv/bin/activate
python run.py
```

접속: `http://서버IP:8000`

### 백그라운드 실행 (systemd)

`/etc/systemd/system/chzzk-recorder.service` 생성:

```ini
[Unit]
Description=Chzzk Recorder Pro
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/chzzk-recorder-pro/backend
ExecStart=/home/ubuntu/chzzk-recorder-pro/backend/.venv/bin/python run.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable chzzk-recorder
sudo systemctl start chzzk-recorder
sudo systemctl status chzzk-recorder
```

---

## 방화벽 설정

원격 접속 시 포트 개방 필요:

```bash
# UFW (Ubuntu)
sudo ufw allow 8000/tcp

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

---

## 초기설정 마법사

Linux/Docker 모두 **브라우저 기반 마법사**를 사용합니다.

1. 서버 실행 후 `http://서버IP:8000` 접속
2. 초기설정 마법사 완료 → `.env` 파일 자동 생성
3. 이후 재시작해도 설정 유지

> `.env` 파일을 삭제하면 마법사가 다시 표시됩니다.

---

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| `python3.12` 없음 | `sudo add-apt-repository ppa:deadsnakes/ppa && sudo apt install python3.12` |
| `ffmpeg` 명령 없음 | `sudo apt install ffmpeg` |
| 포트 접속 불가 | 방화벽 확인, `sudo ufw allow 8000/tcp` |
| Permission denied | `chown -R $USER:$USER ./recordings ./data ./logs` |

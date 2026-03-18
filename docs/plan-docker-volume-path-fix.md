# plan-docker-volume-path-fix

## 목적

도커 환경에서 녹화 파일이 볼륨 마운트 경로 밖에 저장되어 컨테이너 재시작 시 유실되는 버그 수정.
또한 도커 배포 시 저장 경로를 `docker-compose.yml` 볼륨 설정으로만 제어하도록 UX 개선.

## 원인

- `Dockerfile`: WORKDIR을 `/app/backend`로 설정하면서 `/app/recordings` 디렉토리를 별도 생성
- `docker-compose.yml`: 볼륨을 `./recordings:/app/backend/recordings`로 마운트
- 마법사에서 사용자가 `/app/recordings`를 입력하면 볼륨 밖 경로에 저장됨
- 컨테이너 내부 고정 저장 경로와 볼륨 마운트 경로가 불일치

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|---------|
| `Dockerfile` | `/app/recordings` 대신 `/app/backend/recordings` 디렉토리 생성 경로 통일 |
| `docker-compose.yml` | 볼륨 경로를 `./recordings:/app/backend/recordings`로 유지 (이미 올바름) |
| `backend/app/api/setup.py` | 도커 환경 감지 시 `DOWNLOAD_DIR=/app/backend/recordings` 자동 고정 |
| `frontend/src/components/SetupWizard.tsx` | 도커 환경에서 경로 입력 비활성화 + 안내 문구 표시 |

## 구현 방법

### 1. Dockerfile
- `RUN mkdir -p /app/recordings /app/data /app/logs` →
  `RUN mkdir -p /app/backend/recordings /app/backend/data /app/backend/logs`
- WORKDIR `/app/backend` 기준 상대 경로와 일치시킴

### 2. setup.py
- `complete_setup()` 에서 도커 환경(`/.dockerenv` 존재) 감지 시
  `req.download_dir`을 `/app/backend/recordings`로 강제 설정

### 3. SetupWizard.tsx
- 도커 환경일 때 경로 입력 필드(`DirInput`) disabled 처리
- 안내 문구: "Docker 환경에서는 docker-compose.yml의 볼륨 설정으로 경로를 지정하세요"
- 기본값 `/app/backend/recordings` 자동 입력

## 예상 영향 범위

- 도커 신규 설치: 마법사에서 경로 입력 불가, 자동 고정
- 도커 기존 설치: `.env`의 `DOWNLOAD_DIR` 값이 잘못된 경우 재설정 마법사 재실행 필요
- 일반(비도커) 실행: 변경 없음

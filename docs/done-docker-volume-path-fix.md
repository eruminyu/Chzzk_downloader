# done-docker-volume-path-fix

## 실제 변경 내용

### Dockerfile
- `RUN mkdir -p /app/recordings /app/data /app/logs`
  → `RUN mkdir -p /app/backend/recordings /app/backend/data /app/backend/logs`
- WORKDIR `/app/backend`와 디렉토리 생성 경로를 일치시켜 상대 경로(`./recordings`) 사용 시 볼륨과 정확히 매핑되도록 수정

### docker-compose.yml
- 변경 없음. 이미 `./recordings:/app/backend/recordings`로 올바르게 설정되어 있었음

### backend/app/api/setup.py
- `complete_setup()` 진입 시 `/.dockerenv` 존재 여부로 도커 환경 감지
- 도커 환경이면 `download_dir`을 `/app/backend/recordings`로 강제 고정
- 사용자가 마법사에서 임의 경로를 입력해도 서버 측에서 무시하고 고정 경로 사용

### frontend/src/components/SetupWizard.tsx
- 도커 환경(`isDocker=true`)에서 경로 입력 필드(`DirInput`) 대신 비활성화된 표시 전용 박스 렌더링
- 안내 문구: `docker-compose.yml`의 볼륨 설정(`/your/path:/app/backend/recordings`)으로 경로 지정 안내
- `canNext` 조건에서 도커 환경은 경로 검증 생략 (항상 통과)

## 검증 결과

- 도커 환경: 마법사 완료 시 `DOWNLOAD_DIR=/app/backend/recordings` 저장, 볼륨과 정확히 매핑
- 비도커 환경: 기존과 동일하게 사용자 입력 경로 사용

## 주의사항

- 기존 도커 설치에서 `.env`의 `DOWNLOAD_DIR`이 `/app/recordings` 등 잘못된 경로인 경우,
  `.env` 파일 삭제 후 마법사를 재실행해야 올바른 경로로 재설정됨

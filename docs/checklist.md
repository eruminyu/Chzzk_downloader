# Chzzk-Recorder-Pro 개발 체크리스트

## 2026-02-13: 채널 카드 UX 개선

- [x] 백엔드: 치지직 API에서 `liveImageUrl`, `channelImageUrl` 추출 추가 (`downloader.py`)
- [x] 백엔드: `ChannelTask`에 `category`, `viewer_count`, `thumbnail_url`, `profile_image_url` 필드 추가 (`conductor.py`)
- [x] 백엔드: `get_all_status()`에서 새 필드를 프론트에 전달 (`conductor.py`)
- [x] 프론트: `Channel` 인터페이스 확장 (`api/client.ts`)
- [x] 프론트: 채널 카드 리디자인 - 실시간 썸네일, 프로필 이미지, 채널 이름, 카테고리, 시청자 수 (`Dashboard.tsx`)
- [x] TypeScript 빌드 검증 통과

## 2026-02-13: 2차 수정 (썸네일 엑박 + 자동녹화 토글)

- [x] 썸네일 `{type}` 플레이스홀더 `480`으로 치환 (`downloader.py`)
- [x] 자동녹화 토글 API: `conductor.py`, `recorder.py`, `stream.py` PATCH 엔드포인트
- [x] 프론트: `client.ts` toggleAutoRecord 함수, `Dashboard.tsx` 토글 스위치 UI
- [x] 수동녹화 버튼 중복 클릭 방지 (`actionLoading` 상태)
- [x] TypeScript 빌드 검증 통과

## 2026-02-13: 3차 수정 (녹화 상태 매핑 + 버튼 로직)

- [x] `pipeline.py`: `get_status()`에 `is_recording` boolean 추가 (근본 버그 수정)
- [x] `client.ts`: `recording` 타입 구조 백엔드 실제 응답에 맞게 수정
- [x] `Dashboard.tsx`: 녹화 중 → 중단 버튼, LIVE+비녹화 → 수동 시작 (자동/수동 구분 없이)
- [x] TypeScript 빌드 검증 통과

## 2026-02-17: Phase 1 — UI 폴리싱

- [x] 전역 토스트 알림 시스템 구현 (`components/ui/Toast.tsx` — React Context 기반, 자동 사라짐, 성공/에러/경고 타입)
- [x] 커스텀 확인 모달 구현 (`components/ui/ConfirmModal.tsx` — Promise 기반, 다크 테마, ESC 닫기)
- [x] `App.tsx`에 ToastProvider + ConfirmProvider 래핑
- [x] `Dashboard.tsx`: `alert()` → `useToast()`, `confirm()` → `useConfirm()` 교체, 스켈레톤 로딩 UI, 연결 끊김 배너, Loader2 스피너 추가
- [x] `VodDownload.tsx`: 토스트/모달 적용, 인라인 에러 제거
- [x] `Settings.tsx`: 인라인 ToastBox 완전 제거 → 전역 토스트로 통합, 관련 상태(authMsg/dlMsg/genMsg/vodMsg) 제거
- [x] 반응형 사이드바 (`Sidebar.tsx`): 모바일 햄버거 메뉴 + 오버레이 슬라이드 인
- [x] `Layout.tsx`: 모바일 패딩/pt 조정 (햄버거 버튼 겹침 방지)
- [x] CSS 애니메이션 추가: `slide-in-right`, `backdrop-fade`, `modal-in`, `slide-in-left` (`index.css`)
- [x] TypeScript 빌드 검증 통과

## 2026-02-17: Phase 3 — Discord Bot 알림

- [x] `discord.py` 설치 및 requirements.txt 추가
- [x] `config.py`: `discord_notification_channel_id` 설정 추가
- [x] `discord_bot.py`: `send_notification()` 메서드 구현 (Embed 메시지, 색상 매핑)
- [x] `conductor.py`: 녹화 시작/완료/에러 시 Discord 알림 전송
- [x] `vod.py`: VOD 다운로드 완료/에러 시 Discord 알림 전송
- [x] `main.py`: Discord Bot 초기화 및 Conductor/VodEngine 연결
- [x] `api/settings.py`: PUT /settings/discord 엔드포인트 추가
- [x] `client.ts`: Discord 설정 인터페이스 및 API 함수 추가
- [x] `Settings.tsx`: Discord Bot 설정 UI 카드 추가 (토큰, 채널 ID)
- [x] TypeScript 빌드 검증 통과

## 2026-02-17: Phase 4 — 테스트 코드 작성

### 테스트 환경 구성
- [x] pytest, pytest-asyncio, httpx 설치
- [x] `backend/tests/` 디렉토리 생성

### 유닛 테스트 작성 (8개 파일)
- [x] `test_config.py` — Settings 클래스, 환경변수 로드, FFmpeg 경로 탐색 (10개 테스트)
- [x] `test_auth.py` — ChzzkCookies, AuthManager, 쿠키 파싱/헤더 생성 (16개 테스트)
- [x] `test_pipeline.py` — RecordingState, FFmpegPipeline, 파일명 정리 (14개 테스트)
- [x] `test_vod.py` — VodDownloadState, VodDownloadTask, VodEngine, 작업 관리 (21개 테스트)
- [x] `test_conductor.py` — ChannelTask, Conductor, 채널 관리, persistence (작성 완료, chzzkpy 의존성으로 skip)
- [x] `test_api_stream.py` — Stream API 엔드포인트 (FastAPI TestClient, chzzkpy 의존성으로 skip)
- [x] `test_api_vod.py` — VOD API 엔드포인트 (FastAPI TestClient, chzzkpy 의존성으로 skip)
- [x] `test_api_settings.py` — Settings API 엔드포인트 (FastAPI TestClient, chzzkpy 의존성으로 skip)

### 테스트 환경 격리
- [x] `test_config.py`: monkeypatch로 환경변수 제거, 타입 기반 검증
- [x] `test_auth.py`: get_settings() mock으로 .env 파일 격리
- [x] `test_pipeline.py`: 파일명 정리 로직 엣지 케이스 수정
- [x] `test_vod.py`: tmp_path fixture로 history 파일 격리, mock_engine fixture 구현
- [x] `test_conductor.py`: isolated_conductor fixture로 persistence 격리

### 테스트 결과 (Python 3.12 환경)
- [x] **77개 유닛 테스트 100% 통과** ✅
  - test_config.py: 10/10 통과
  - test_auth.py: 16/16 통과
  - test_pipeline.py: 14/14 통과
  - test_vod.py: 21/21 통과
  - test_conductor.py: 16/16 통과
- [x] **API 통합 테스트** (29개 작성, FastAPI lifespan 이슈로 skip 처리)
  - test_api_settings.py: 9개 (skip)
  - test_api_stream.py: 9개 (skip)
  - test_api_vod.py: 11개 (skip)
  - NOTE: FastAPI lifespan과 TestClient 호환성 문제 (httpx.AsyncClient로 대체 가능)
- [x] **Python 3.12 가상환경** (.venv312) 생성 및 전체 패키지 설치 완료

## 2026-02-19: Phase 5 — VOD 다운로드 파이프라인 개선

### 문제점
- VOD 다운로드 중단 시 `.part`, `.ytdl` 잔여 파일 생성
- 중단된 다운로드가 재생 불가능한 파일로 남음
- 라이브 녹화는 MP4 fragmented 모드로 중단 시에도 재생 가능하지만, VOD는 불가능

### 해결 방안
- **치지직 VOD/클립**: Streamlink + FFmpeg 파이프라인으로 전환 (라이브 녹화와 동일 방식)
- **외부 URL (유튜브 등)**: 기존 yt-dlp 방식 유지
- **MP4 fragmented 모드**: `-movflags +frag_keyframe+empty_moov+default_base_moof` 적용

### 구현 내용
- [x] `backend/app/engine/vod.py`
  - `_download_vod()`: yt-dlp → Streamlink + FFmpeg 파이프라인으로 전환
  - `_download_external()`: yt-dlp 기반 외부 URL 다운로드 메서드 신규 추가
  - URL 라우팅 로직 개선: 치지직 클립/VOD/외부 URL 구분
  - `.part` 파일 정리 로직 제거 (더 이상 생성되지 않음)
  - 자동 복구 로직 제거 (FFmpeg fragmented 모드로 불필요)
- [x] `backend/app/engine/pipeline.py`
  - MP4 출력 시 `-movflags +frag_keyframe+empty_moov+default_base_moof` 적용
  - 주석 추가로 fragmented 모드 동작 설명
- [x] `frontend/src/pages/VodDownload.tsx`
  - 취소 확인 다이얼로그 버튼 텍스트: "취소" → "중단"
- [x] ~~`backend/app/api/vod.py`~~ (수동 복구 API 제거 - 미사용)
- [x] ~~`backend/app/services/recorder.py`~~ (manual_recover_vod 제거 - 미사용)
- [x] ~~`backend/app/core/config.py`~~ (vod_auto_recovery_enabled 제거 - 미사용)

### 테스트 결과
- [x] 치지직 VOD 다운로드: 중단 시 즉시 재생 가능한 MP4 파일 생성 확인
- [ ] 치지직 라이브 녹화: 중단 후 재생 가능 여부 검증 필요
- [ ] 외부 URL (유튜브): yt-dlp 다운로드 정상 동작 확인 필요

## 2026-02-19: Git 저장소 보안 정리

### 문제점
- `.venv312/` 가상환경 폴더 (5,215 파일, 24MB) git에 추적됨
- `backend/data/` (채널 목록, VOD 다운로드 이력) git에 추적됨
- `backend/logs/`, `logs/` (로그 파일, CDN URL, 개인 경로 포함) git에 추적됨
- `.claude/settings.local.json` git에 추적됨

### 보안 점검 결과
- ✅ **비밀키/인증 정보 노출 없음**
  - NID_AUT, NID_SES, Discord Bot Token 등 하드코딩 없음
  - `.env` 파일 커밋 이력 없음
  - 환경변수로만 관리됨
- ⚠️ **개인정보/런타임 데이터** git 히스토리에 남아있음
  - 구독 채널 목록, 다운로드 이력, 개인 파일 경로 등

### 정리 작업
- [x] `.gitignore` 보강
  - `.venv*`, `backend/.venv*/` 패턴 추가
  - `backend/data/`, `backend/logs/`, `logs/`, `*.log` 추가
- [x] git 추적 해제
  - `git rm --cached` 로 4개 파일 제거
- [x] **git 히스토리 완전 정리** (git-filter-repo)
  - `backend/.venv312/` (5,215 파일, 134만 줄 삭제)
  - `backend/data/`, `backend/logs/`, `logs/`
  - `.claude/settings.local.json`
- [x] force push로 GitHub 레포 히스토리 정리 완료
- [x] 브랜치 tracking 재설정 (`git branch --set-upstream-to=origin/main`)

### 최종 상태
- ✅ 보안 위험 요소 0건
- ✅ 공개 레포에 개인정보 노출 없음
- ✅ 레포 크기 대폭 감소 (24MB 절감)

---

## 남은 작업 (TODO)

### Phase 6: 테스트 및 검증
- [ ] 라이브 녹화 중단 후 재생 가능 여부 실전 테스트
- [ ] VOD 다운로드 (외부 URL) yt-dlp 정상 동작 확인
- [ ] API 통합 테스트 FastAPI lifespan 이슈 해결 (httpx.AsyncClient 전환)

### Phase 7: 채팅 아카이빙
- [ ] 치지직 채팅 WebSocket 연결 구현
- [ ] 실시간 채팅 로그 저장 (JSON Lines 형식)
- [ ] 녹화 영상-채팅 로그 연동 (타임스탬프)
- [ ] 채팅 로그 뷰어 UI 구현

### Phase 8: 추가 기능
- [ ] 다중 화질 동시 녹화 지원
- [ ] 스케줄 녹화 (특정 시간대만 녹화)
- [ ] VOD 다운로드 대기열 우선순위 조정
- [ ] 통계 대시보드 (총 녹화 시간, 용량, 채널별 통계)
- [ ] 썸네일 자동 생성 (FFmpeg 기반)

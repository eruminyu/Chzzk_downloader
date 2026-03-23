# 완료: 쿠키 만료 감지 + Discord 연동 강화

## 작성일

2026-03-24

## 실제 변경 내용

### 1. `backend/app/engine/twitter_spaces.py`

- `verify_cookie(cookie_file: str) -> dict` 비동기 함수 추가
  - `GET https://api.twitter.com/1.1/account/verify_credentials.json` 호출
  - 반환: `{"valid": bool, "checked_at": ISO8601, "reason": str | None}`
  - 쿠키 파일 없음 / 파싱 실패 / 401 / 네트워크 오류 각각 별도 처리

### 2. `backend/app/engine/conductor.py`

- `Conductor.__init__()` 에 추가:
  - `_COOKIE_CHECK_INTERVAL = 86400` (24시간, 클래스 변수)
  - `_cookie_status: dict` — 최근 검증 결과 캐시
  - `_last_cookie_check: Optional[datetime]`
  - `_cookie_check_task: Optional[asyncio.Task]`
- `start()` 에서 `_cookie_check_loop()` 태스크 생성
- `stop()` 에서 `_cookie_check_task` 취소 추가
- `_cookie_check_loop()` 추가:
  - 1시간마다 wake-up, 마지막 검증 후 24시간 경과 시 `_check_twitter_cookie()` 호출
- `_check_twitter_cookie()` 추가:
  - Twitter Spaces 채널이 없으면 생략
  - `verify_cookie()` 호출 → 상태 저장
  - **만료 감지 시**: 이전 상태가 valid였을 때만 Discord 알림 전송 (반복 알림 방지)
- `_monitor_channel()` 의 m3u8 캡처 직후 Discord 알림 추가:
  - Space 종료 후 `/download-space` 커맨드로 다운로드 유도 메시지 포함
- `get_cookie_status()` 메서드 추가 — API용

### 3. `backend/app/services/discord_bot.py`

- 프리픽스 커맨드 추가:
  - `!spaces` — 캡처된 m3u8 목록 표시
  - `!download-space <url>` — m3u8 URL 다운로드 시작
- 슬래시 커맨드 추가:
  - `/spaces` — 캡처된 m3u8 목록 표시
  - `/download-space url:<url>` — m3u8 URL 다운로드 시작
- 헬퍼 함수 추가:
  - `_get_spaces_embed()` — captured_m3u8_url 보유 채널 목록 Embed
  - `_do_download_space(url)` — `service.download_vod()` 호출 후 결과 Embed 반환

### 4. `backend/app/api/settings.py`

- `GET /api/settings/cookie-status` 추가:
  - `conductor.get_cookie_status()` 반환 (프론트엔드 배너용)
- `POST /api/settings/cookie-status/check` 추가:
  - 즉시 검증 트리거 (24시간 주기 무시)

---

## 주의사항

- **반복 알림 방지**: 쿠키 만료 Discord 알림은 `valid: True → False` 전환 시점에만 발송. 이미 만료 상태이면 매 검증마다 알림을 보내지 않음.
- **쿠키 파일 없어도 정상 동작**: Twitter Spaces 채널이 하나도 없으면 검증 루프가 API 호출을 건너뜀.
- **Discord 봇 없어도 동작**: `_discord_bot is None` 체크 유지.
- **슬래시 커맨드 재동기화 필요**: 새 커맨드(`/spaces`, `/download-space`) 추가로 봇 재시작 시 Discord에 자동 sync됨 (`on_ready` 이벤트에서 `bot.tree.sync()` 호출).

---

## 검증 방법

1. `GET /api/settings/cookie-status` → `{"twitter": {"valid": true, "checked_at": null, "reason": null}}`
2. `POST /api/settings/cookie-status/check` → 즉시 검증 실행 후 결과 반환
3. Discord에서 `/spaces` → 캡처된 목록 또는 "없습니다" 메시지
4. Discord에서 `/download-space url:<m3u8_url>` → task_id 포함 성공 Embed
5. 만료된 쿠키로 테스트: `check` 엔드포인트 호출 → `valid: false` + Discord 알림

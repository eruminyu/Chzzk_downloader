# 완료: Twitter Spaces 수동 캡처 모드 전환

## 작성일

2026-03-24

## 배경

Twitter 비공식 GraphQL API는 폴링 빈도가 높으면 429 Rate Limit이 발생한다.
`MONITOR_INTERVAL=5`로 5초마다 감시 루프가 돌면서 `UserTweets` GraphQL 쿼리가 반복 호출되어
실제 테스트에서 429 응답이 확인됨.

## 결정사항

Twitter Spaces 채널은 **자동 감시 루프를 비활성화**하고,
Discord `/capture-space` 커맨드로 원하는 시점에 m3u8 URL을 수동 캡처하는 방식으로 전환.

채널 등록 자체는 유지 — Dashboard UI에서 채널 정보 조회 및 관리는 가능하다.

---

## 실제 변경 내용

### 1. `backend/app/engine/conductor.py`

- `_monitor_channel()` 수정:
  - `Platform.TWITTER_SPACES` 이면 감시 루프 없이 즉시 return
  - 기존 30초 최소 간격 강제 코드 → 삭제
  - 로그 메시지: "Twitter Spaces 수동 캡처 모드 — 자동 감시 없음. Discord `/capture-space` 커맨드로 수동 캡처"

- `capture_space(username: str) -> dict` 비동기 메서드 추가:
  - `TwitterSpacesEngine.check_live_status(username)` 1회 호출
  - 라이브 + m3u8 URL 캡처 성공 시: `task.captured_m3u8_url` / `captured_m3u8_at` 업데이트 + `_save_persistence()`
  - 등록되지 않은 채널이면 `{"error": "등록되지 않은 채널: ..."}`
  - 반환 스키마:
    ```json
    {
      "captured": true,
      "m3u8_url": "https://...",
      "is_live": true,
      "title": "Space 제목",
      "channel_name": "KalserianT"
    }
    ```

### 2. `backend/app/services/recorder.py`

- `capture_space(username: str) -> dict` 래퍼 메서드 추가:
  - `self._conductor.capture_space(username)` 위임

### 3. `backend/app/services/discord_bot.py`

- 프리픽스 커맨드 추가:
  - `!capture-space <username>` — m3u8 URL 즉시 조회
- 슬래시 커맨드 추가:
  - `/capture-space username:<핸들>` — m3u8 URL 즉시 조회
- 헬퍼 함수 추가:
  - `_do_capture_space(username)` — `service.capture_space()` 호출 후 결과 Embed 반환
  - 캡처 성공: 녹색 Embed + m3u8 URL + `/download-space` 안내
  - 라이브 중이나 캡처 실패: 노란 Embed + 재시도 안내
  - Space 없음: 파란 Embed + 오프라인 안내
  - 오류: 빨간 Embed + 오류 메시지

---

## 사용 방법

```
Discord에서:
/capture-space username:KalserianT
또는
!capture-space KalserianT
```

1. Space가 라이브 중이면 → m3u8 URL 캡처 + 녹색 Embed 반환
2. Space 없으면 → 파란 Embed (오프라인 안내)
3. m3u8 캡처 후 다운로드: `/download-space url:<캡처된_m3u8_url>`

---

## 주의사항

- **자동 방송 시작 감지 없음**: Twitter Spaces 채널은 더 이상 자동으로 라이브를 감지하지 않는다.
  사용자가 Space가 켜졌을 때 직접 `/capture-space`를 호출해야 한다.
- **등록된 채널만 캡처 가능**: Dashboard에서 먼저 Twitter Spaces 채널을 추가해야 한다.
- **슬래시 커맨드 재동기화 필요**: 봇 재시작 시 `on_ready`에서 `bot.tree.sync()` 자동 호출됨.

---

## 검증 방법

1. `!capture-space KalserianT` 또는 `/capture-space username:KalserianT` 실행
2. Space 라이브 중이면 녹색 Embed + m3u8 URL 확인
3. Space 없으면 파란 Embed 확인
4. `/download-space url:<m3u8>` 로 다운로드 시작 확인
5. `service.log`에서 429 오류 로그가 더 이상 출력되지 않는지 확인

# 플랜: 쿠키 만료 감지 + Discord 연동 강화

## 작성일

2026-03-24

## 목적

1. **Twitter 쿠키 만료 자동 감지**: 하루 1회 쿠키 유효성 검증 → 만료 시 웹 UI 배너 + Discord 경고 알림
2. **m3u8 캡처 시 Discord 알림**: Space 감지 → m3u8 URL을 Discord로 자동 전송
3. **Discord 다운로드 커맨드**: `/download-space`, `/spaces` 슬래시 커맨드 추가

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `backend/app/engine/twitter_spaces.py` | `verify_cookie()` 비동기 함수 추가 |
| `backend/app/engine/conductor.py` | 쿠키 검증 스케줄러, m3u8 캡처 Discord 알림 |
| `backend/app/services/discord_bot.py` | `/download-space`, `/spaces` 커맨드 추가 |
| `backend/app/api/settings.py` | 쿠키 유효성 상태 반환 엔드포인트 (`GET /api/settings/cookie-status`) |
| `docs/checklist.md` | 작업 기록 |

---

## 구현 방법

### 1. `verify_cookie()` — `twitter_spaces.py`

```python
async def verify_cookie(cookie_file: str) -> dict:
    """쿠키 파일의 auth_token/ct0로 Twitter 인증 유효성을 확인한다.

    Returns:
        {"valid": bool, "checked_at": ISO8601 str, "reason": str | None}
    """
```

- `GET https://api.twitter.com/1.1/account/verify_credentials.json` 호출
- 200 → `{"valid": True, ...}`
- 401 → `{"valid": False, "reason": "쿠키 만료"}`
- 네트워크 오류 등 → `{"valid": False, "reason": "..."}`

---

### 2. 쿠키 검증 스케줄러 — `conductor.py`

`ChannelConductor`에 다음 추가:

- `_cookie_check_interval = 86400` (24시간, 초 단위)
- `_last_cookie_check: Optional[datetime] = None`
- `_cookie_status: dict = {"valid": True, "checked_at": None, "reason": None}`

`_monitor_loop()` 또는 별도 태스크에서 마지막 검증 시간이 24시간 이상 지났을 때:

```python
result = await verify_cookie(cookie_file)
self._cookie_status = result
if not result["valid"]:
    await discord_bot.send_notification(
        title="⚠️ Twitter 쿠키 만료",
        description="Twitter Spaces 쿠키가 만료되었습니다. 설정 페이지에서 쿠키 파일을 갱신해주세요.",
        color="red",
        fields={"이유": result.get("reason", "알 수 없음")},
    )
```

m3u8 URL 캡처 직후 Discord 알림:

```python
if new_m3u8 and not task.captured_m3u8_url:
    task.captured_m3u8_url = new_m3u8
    task.captured_m3u8_at = datetime.now().isoformat()
    self._save_persistence()
    # Discord 알림
    await discord_bot.send_notification(
        title="🎙️ Twitter Spaces m3u8 캡처",
        description=f"**{channel_name}**의 Space m3u8 URL이 캡처되었습니다.",
        color="blue",
        fields={
            "채널": channel_name,
            "제목": title,
            "m3u8 URL": new_m3u8,
        },
    )
```

---

### 3. Discord 커맨드 — `discord_bot.py`

#### `/spaces` (슬래시 + `!spaces` 프리픽스)
- `service.get_channels()`에서 `platform == "twitter_spaces" and captured_m3u8_url` 필터
- Embed에 채널명, Space 제목, m3u8 URL, 캡처 시각 표시
- 각 항목에 `composite_key` 표시 (다운로드 커맨드 참조용)

#### `/download-space url:<m3u8_url>` (슬래시 + `!download-space <url>` 프리픽스)
- `service.download_vod(url=url)` 호출
- 응답: task_id + 시작 메시지 Embed

---

### 4. API 엔드포인트 — `settings.py`

```
GET /api/settings/cookie-status
```

응답:
```json
{
  "twitter": {
    "valid": true,
    "checked_at": "2026-03-24T12:00:00",
    "reason": null
  }
}
```

웹 프론트엔드 Settings 페이지에서 만료 배너 표시에 사용.

---

## 예상 영향 범위

- 기존 쿠키 파싱/검증 로직에 영향 없음 (verify_cookie는 별도 함수)
- Discord 봇 없이도 동작 (HAS_DISCORD 가드 및 bot ready 체크 유지)
- 쿠키 검증 실패해도 Space 감지 루프에 영향 없음 (상태만 기록)

---

## 검증 방법

1. 유효한 쿠키 파일로 서버 기동 → `/api/settings/cookie-status` → `valid: true`
2. 만료된 auth_token으로 교체 → 다음 검증 주기(강제 트리거 또는 24h 후) → Discord 알림 + `valid: false`
3. Space 라이브 중 m3u8 캡처 → Discord 알림 수신 확인
4. Discord에서 `/spaces` → 캡처된 목록 표시 확인
5. Discord에서 `/download-space url:<m3u8_url>` → 다운로드 시작 확인

# 멀티 플랫폼 감시+녹화 확장 계획

## 목적

치지직(Chzzk) 전용이던 감시/녹화 기능을 **TwitCasting**과 **Twitter Spaces**로 확장.
단일 Conductor 아키텍처를 유지하면서 플랫폼 추상화 레이어를 도입한다.

## 변경 파일 목록

### 신규 파일

| 파일 | 역할 |
|------|------|
| `backend/app/engine/base.py` | `PlatformEngine` Protocol, `LiveStatus` TypedDict, `Platform` Enum |
| `backend/app/engine/twitcasting.py` | TwitcastingEngine — API 상태 확인 + Streamlink 스트림 추출 |
| `backend/app/engine/twitter_spaces.py` | TwitterSpacesEngine — API 상태 확인 + yt-dlp 오디오 녹화 |
| `backend/app/api/platforms.py` | 멀티 플랫폼 채널 관리 REST API 라우터 (`/api/platforms`) |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `backend/app/engine/conductor.py` | ChannelTask에 platform 필드, 복합 키, 플랫폼별 엔진 분기, Twitter Spaces 별도 녹화 경로 |
| `backend/app/core/config.py` | TwitCasting/Twitter 인증 설정 필드 추가 |
| `backend/app/services/recorder.py` | 플랫폼 채널 추가/제거 메서드, toggle_auto_record 복합 키 대응 |
| `backend/app/api/settings.py` | get_current_settings에 TwitCasting/Twitter 설정 여부 추가 |
| `backend/app/main.py` | platforms_router 등록 |
| `frontend/src/api/client.ts` | Platform 타입, Channel에 platform/composite_key 필드, 멀티 플랫폼 API 함수 |
| `frontend/src/pages/Dashboard.tsx` | 플랫폼 배지 + 채널 추가 드롭다운 |
| `frontend/src/pages/Settings.tsx` | 6탭 구조로 전면 재편 (인증 탭에 TwitCasting/Twitter Spaces 섹션 추가) |

## 구현 방법

### 플랫폼 추상화

```
PlatformEngine (Protocol)
 ├── StreamLinkEngine  — Chzzk (기존, @runtime_checkable로 자동 호환)
 ├── TwitcastingEngine — TwitCasting API v2 + Streamlink twitcasting.tv
 └── TwitterSpacesEngine — Twitter API v2 + yt-dlp subprocess
```

### 채널 키 체계

- **복합 키**: `"platform:channel_id"` (예: `"chzzk:abc123"`, `"twitcasting:someuser"`)
- **레거시 마이그레이션**: 키에 `:` 없으면 자동으로 `"chzzk:"` 접두사 추가

### Twitter Spaces 특수 처리

streamlink가 Twitter Spaces를 지원하지 않으므로 별도 경로:
1. `check_live_status()` → space_id 획득
2. `_start_spaces_recording()` → yt-dlp asyncio subprocess
3. `_stop_spaces_recording()` → process.terminate()

## 예상 영향 범위

- 기존 Chzzk 채널: 자동 마이그레이션으로 영향 없음
- `/api/stream` 엔드포인트: 하위 호환 유지 (제거 안 함)
- `channels.json` 포맷: 자동 마이그레이션 (첫 실행 시)

# 멀티 플랫폼 감시+녹화 확장 — 완료 보고서

## 실제 변경 내용

### 백엔드

**신규 파일**
- `backend/app/engine/base.py`: `Platform(str, Enum)`, `LiveStatus(TypedDict)`, `PlatformEngine(Protocol, @runtime_checkable)` 정의
- `backend/app/engine/twitcasting.py`: `TwitcastingEngine` — API v2 Basic Auth, 404=오프라인 처리, Streamlink twitcasting.tv 스트림 추출
- `backend/app/engine/twitter_spaces.py`: `TwitterSpacesEngine` — Bearer Token Auth, space_id 획득, yt-dlp asyncio subprocess 녹화
- `backend/app/api/platforms.py`: `/api/platforms` 라우터 — 채널 추가/제거/목록/토글, 플랫폼 상태 조회, TwitCasting/Twitter 설정 저장

**수정 파일**
- `backend/app/core/config.py`: `twitcasting_client_id`, `twitcasting_client_secret`, `twitter_bearer_token`, `twitter_cookie_file` 추가
- `backend/app/engine/conductor.py`:
  - `ChannelTask`: `platform`, `spaces_process`, `_current_space_id` 필드 추가
  - `_get_engine()`: 플랫폼별 엔진 지연 초기화 및 반환
  - `make_composite_key()`, `parse_composite_key()`: 복합 키 유틸리티
  - `_load_persistence()`: 레거시 키 자동 마이그레이션 (`abc` → `chzzk:abc`)
  - `_save_persistence()`: 플랫폼/channel_id/auto_record 모두 저장
  - `_monitor_channel()`: Twitter Spaces space_id 업데이트, 채팅 아카이빙 Chzzk 전용으로 한정
  - `_start_spaces_recording()`, `_stop_spaces_recording()`: Twitter Spaces 전용 경로
  - `get_all_status()`: composite_key, platform 필드 추가 반환
- `backend/app/services/recorder.py`: `add_platform_channel()`, `remove_platform_channel()` 추가, `toggle_auto_record` 복합 키 대응
- `backend/app/api/settings.py`: TwitCasting/Twitter 설정 여부 반환 (실제 값은 마스킹)
- `backend/app/main.py`: `platforms_router` 등록

### 프론트엔드

- `frontend/src/api/client.ts`: `Platform` 타입, `PLATFORM_LABELS`, `Channel`에 `composite_key`/`platform` 필드, `PlatformStatus`, `TwitcastingSettingsUpdate`, `TwitterSettingsUpdate`, 멀티 플랫폼 API 함수 6개 추가
- `frontend/src/pages/Dashboard.tsx`:
  - 플랫폼 드롭다운 (치지직/TwitCasting/Twitter Spaces) 추가
  - 플랫폼 배지 (보라=Chzzk, 주황=TwitCasting, 하늘=Spaces)
  - 채널 조작 함수들을 composite_key 기반으로 전환
- `frontend/src/pages/Settings.tsx`:
  - 6탭 구조로 전면 재편 (일반/다운로드/인증/알림/외관/정보)
  - 인증 탭: Chzzk NID 쿠키 + TwitCasting Client ID/Secret + Twitter Bearer Token/쿠키 파일
  - 정보 탭: TwitCasting/Twitter Spaces 설정 여부 표시

## 발견된 특이사항

- `client_raw` 임시 변수 사용: Dashboard.tsx에서 `/platforms/channels` 엔드포인트에 직접 접근하기 위해 `client`를 `client_raw`로 alias. 추후 `api.getChannels()` 통합 검토 권장.
- Twitter Spaces `user_ids` 파라미터는 numeric user_id만 허용 (Twitter API v2 제한). `@핸들` 사용 시 별도 user lookup API 필요.
- TwitCasting API v2 인증 없이도 공개 방송은 감지 가능하지만, Basic Auth 설정 권장 (API Rate Limit 완화).

## 검증 체크리스트

- [ ] 기존 Chzzk 채널 자동 마이그레이션 (`channels.json`에 `:` 없는 키)
- [ ] TwitCasting 채널 추가 → 라이브 감지 → 녹화 시작
- [ ] Twitter Spaces 채널 추가 → 라이브 감지 → yt-dlp 녹화
- [ ] Settings 탭 전환 정상 동작
- [ ] TwitCasting/Twitter 인증 설정 저장 및 반영
- [ ] TypeScript 빌드 검증

## 주의사항

- yt-dlp가 PATH에 없으면 Twitter Spaces 녹화 불가 (`pip install yt-dlp` 필요)
- Twitter Bearer Token은 OAuth 2.0 App-Only (읽기 전용 앱으로 충분)
- Twitter Spaces API `user_ids`는 숫자 형식 user_id 필요 (예: `"783214"`)

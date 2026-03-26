# Done: twitter → X 전체 rename

## 개요

코드베이스 전체에서 `twitter` 명칭을 `x`로 변경.
`twitcast`/`twitcasting` 관련 명칭은 유지.

## 변경 파일 목록 및 내용

### 파일 이름 변경
- `backend/app/engine/twitter_spaces.py` → `x_spaces.py`

### `backend/app/engine/base.py`
- `Platform.TWITTER_SPACES = "twitter_spaces"` → `Platform.X_SPACES = "x_spaces"`
- 주석 "Twitter Spaces" → "X Spaces"

### `backend/app/engine/x_spaces.py`
- 클래스: `TwitterSpacesEngine` → `XSpacesEngine`
- 상수: `TWITTER_SPACES_URL` → `X_SPACES_URL`
- `settings.twitter_cookie_file` → `settings.x_cookie_file`
- 로그 접두사: `[TwitterSpaces:]` → `[XSpaces:]`
- 카테고리 문자열: `"Twitter Spaces"` → `"X Spaces"`
- 주석/docstring의 "Twitter" → "X"
- HTTP 헤더 이름(`x-twitter-auth-type` 등)은 실제 API 스펙이므로 유지

### `backend/app/core/config.py`
- `twitter_bearer_token` → `x_bearer_token`
- `twitter_cookie_file` → `x_cookie_file`

### `backend/.env`
- `TWITTER_BEARER_TOKEN` → `X_BEARER_TOKEN`
- `TWITTER_COOKIE_FILE` → `X_COOKIE_FILE`

### `backend/app/api/platforms.py`
- `TwitterSettingsRequest` → `XSettingsRequest`
- `extract_twitter_id` import → `extract_x_id`
- `Platform.TWITTER_SPACES` → `Platform.X_SPACES`
- `settings.twitter_bearer_token` → `settings.x_bearer_token`
- `settings.twitter_cookie_file` → `settings.x_cookie_file`
- 에러 메시지 내 `twitter_spaces` → `x_spaces`
- 엔드포인트: `PUT /settings/twitter` → `PUT /settings/x`
- 엔드포인트: `POST /twitter/cookie` → `POST /x/cookie`
- 엔드포인트: `DELETE /twitter/cookie` → `DELETE /x/cookie`
- 쿠키 저장 경로: `data/twitter_cookies.txt` → `data/x_cookies.txt`
- 함수명: `update_twitter_settings` → `update_x_settings`
- 함수명: `upload_twitter_cookie` → `upload_x_cookie`
- 함수명: `delete_twitter_cookie` → `delete_x_cookie`
- env var 키: `TWITTER_BEARER_TOKEN` → `X_BEARER_TOKEN`, `TWITTER_COOKIE_FILE` → `X_COOKIE_FILE`
- 플랫폼 상태 응답 키: `"twitter_spaces"` → `"x_spaces"`

### `backend/app/engine/conductor.py`
- import: `from app.engine.twitter_spaces import TwitterSpacesEngine` → `from app.engine.x_spaces import XSpacesEngine`
- import: `from app.engine.twitter_spaces import verify_cookie` → `from app.engine.x_spaces import verify_cookie`
- `self._twitter_spaces_engine` → `self._x_spaces_engine`
- `Platform.TWITTER_SPACES` → `Platform.X_SPACES`
- `settings.twitter_cookie_file` → `settings.x_cookie_file`
- `"twitter_spaces"` 문자열 → `"x_spaces"`
- `_check_twitter_cookie` → `_check_x_cookie`
- "Twitter Spaces" 문자열 → "X Spaces"
- "Twitter 쿠키" → "X 쿠키"

### `backend/app/api/settings.py`
- 응답 키: `"twitter_bearer_token"` → `"x_bearer_token"`, `"twitter_cookie_file"` → `"x_cookie_file"`
- `settings.twitter_bearer_token` → `settings.x_bearer_token`
- `settings.twitter_cookie_file` → `settings.x_cookie_file`
- `conductor._check_twitter_cookie()` → `conductor._check_x_cookie()`
- 응답 키: `{"twitter": ...}` → `{"x": ...}`
- 엔드포인트 summary/docstring 업데이트

### `backend/app/api/stream.py`
- `"twitter_spaces:"` prefix → `"x_spaces:"`

### `backend/app/api/archive.py`
- "Twitter Spaces" → "X Spaces" (모든 문자열/주석)
- `"twitter_spaces"` → `"x_spaces"`
- composite_key 예시: `twitter_spaces:username` → `x_spaces:username`

### `backend/app/core/utils.py`
- `extract_twitter_id` → `extract_x_id`

### `backend/app/services/discord_bot.py`
- "Twitter Spaces" → "X Spaces"
- `"twitter_spaces"` → `"x_spaces"`
- "Twitter 계정 핸들" → "X 계정 핸들"

### `frontend/src/api/client.ts`
- `Platform` 타입: `"twitter_spaces"` → `"x_spaces"`
- `PLATFORM_LABELS`: `twitter_spaces: "Twitter Spaces"` → `x_spaces: "X Spaces"`
- `Settings` 인터페이스: `twitter_bearer_token` → `x_bearer_token`, `twitter_cookie_file` → `x_cookie_file`
- `PlatformStatus`: `twitter_spaces` → `x_spaces`
- `TwitterSettingsUpdate` → `XSettingsUpdate`
- `updateTwitterSettings` → `updateXSettings` (엔드포인트: `/platforms/settings/x`)
- `uploadTwitterCookie` → `uploadXCookie` (엔드포인트: `/platforms/x/cookie`)
- `deleteTwitterCookie` → `deleteXCookie` (엔드포인트: `/platforms/x/cookie`)

### `frontend/src/pages/Settings.tsx`
- 상태 변수: `twitterBearerToken` → `xBearerToken`, `twitterCookieFileSet` → `xCookieFileSet`, `twitterSaving` → `xSaving`, `twitterCookieUploading` → `xCookieUploading`
- `platformStatus.twitter_spaces` → `platformStatus.x_spaces`
- `settings?.twitter_bearer_token` → `settings?.x_bearer_token`
- 핸들러: `handleSaveTwitter` → `handleSaveX`, `handleUploadTwitterCookie` → `handleUploadXCookie`, `handleDeleteTwitterCookie` → `handleDeleteXCookie`
- API 호출: `api.updateXSettings`, `api.uploadXCookie`, `api.deleteXCookie`
- UI 텍스트: "Twitter Spaces" → "X Spaces", "Twitter API v2 Bearer Token" → "X API v2 Bearer Token" 등
- 링크: `developer.twitter.com` → `developer.x.com`

### `frontend/src/pages/Dashboard.tsx`
- `twitter_spaces` → `x_spaces` (PLATFORM_BADGE_STYLES 키, platformStatus 접근)

### `frontend/src/pages/Archive.tsx`
- `TwitterSpacesTab` → `XSpacesTab`
- `"twitter_spaces"` → `"x_spaces"` (TabKey 타입, 탭 설정)
- "Twitter Spaces" → "X Spaces" (UI 텍스트)
- "Twitter API" → "X API"

## 검증 결과
- TypeScript `tsc --noEmit` 통과 (에러 없음)

## 주의사항

1. **기존 채널 데이터 마이그레이션 필요**: `channels.json`에 `"twitter_spaces:username"` 형식으로 저장된 채널은 `"x_spaces:username"`으로 변경되어야 함. 앱 재시작 후 해당 채널을 재등록해야 함.

2. **쿠키 파일 재업로드 필요**: 기존 `data/twitter_cookies.txt`는 더 이상 참조되지 않음. Settings UI에서 쿠키 파일을 다시 업로드해야 함 (새 저장 경로: `data/x_cookies.txt`).

3. **HTTP 헤더 이름 유지**: `x-twitter-auth-type`, `x-twitter-client-language` 등 실제 X API 스펙에 정의된 헤더 이름은 변경하지 않음.

4. **API 엔드포인트 URL (실제 X API)**: `https://twitter.com/i/api/...`, `https://api.twitter.com/...` 등 실제 API 호출 URL은 변경하지 않음.

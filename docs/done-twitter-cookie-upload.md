# Done: Twitter Spaces 쿠키 파일 업로드 UI + 사이드바 이탈 경고

## 실제 변경 내용

### 백엔드 (`backend/app/api/platforms.py`)
- `fastapi.UploadFile`, `fastapi.File`, `pathlib.Path` import 추가
- `TwitterSettingsRequest`에서 `cookie_file` 필드 제거
- `PUT /settings/twitter`: Bearer Token 전용으로 간소화
- `POST /api/platforms/twitter/cookie`: Netscape 쿠키 파일 업로드 → `data/twitter_cookies.txt` 저장 (절대경로로 `.env` 업데이트)
- `DELETE /api/platforms/twitter/cookie`: 파일 삭제 + `.env` 초기화

### 프론트엔드 (`frontend/src/api/client.ts`)
- `TwitterSettingsUpdate` 인터페이스에서 `cookie_file` 제거
- `uploadTwitterCookie(file: File)`: multipart/form-data POST
- `deleteTwitterCookie()`: DELETE

### 프론트엔드 (`frontend/src/pages/Settings.tsx`)
- `useBlocker` import 추가 (react-router-dom)
- `Upload`, `Trash2`, `CheckCircle2` 아이콘 import 추가
- `twitterCookieFile` state 제거 → `twitterCookieFileSet`, `twitterCookieUploading`, `cookieFileInputRef` 추가
- `loadSettings()`: `getPlatformStatus()` 병렬 호출 추가, `twitterCookieFileSet` 초기화
- `isTabDirty("auth")`: `twitterCookieFile !== ""` 조건 제거
- `handleTabChange`: `setTwitterCookieFile("")` 제거
- `handleSaveTwitter`: `cookie_file` 인자 제거
- `handleUploadTwitterCookie`: 파일 선택 즉시 업로드, 성공 시 `twitterCookieFileSet(true)`
- `handleDeleteTwitterCookie`: confirm 후 삭제, 성공 시 `twitterCookieFileSet(false)`
- 쿠키 파일 섹션 UI: 상태 배지(업로드됨/없음) + 파일 선택 버튼 + 삭제 버튼
- `useBlocker`: pathname 변경 + dirty 탭 존재 시 이탈 차단 → confirm 모달 → proceed/reset

## 검증 결과
- TypeScript `tsc --noEmit` 통과 (에러 없음)

## 주의사항
- 업로드된 쿠키 파일은 `backend/data/twitter_cookies.txt` (절대 경로)에 고정 저장됨
- 기존에 `.env`에 수동으로 경로를 입력한 사용자는 UI에서 재업로드 필요
- `useBlocker`는 같은 페이지 내 탭 전환에는 작동하지 않음 (기존 `handleTabChange`가 처리)

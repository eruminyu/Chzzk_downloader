# Plan: Twitter Spaces 쿠키 파일 업로드 UI + 사이드바 이탈 경고

## 목적

두 가지 버그를 수정한다.

- **Bug 1**: Twitter Spaces 설정 저장 후에도 "미저장 변경사항" 경고가 오작동하는 문제
  - 근본 원인: `twitterCookieFile` 경로 입력창이 저장 후에도 값이 남아 dirty 판정
  - 해결: 경로 직접 입력 방식을 파일 업로드 방식으로 교체 → dirty 개념 자체가 사라짐
- **Bug 2**: 사이드바로 페이지 이탈 시 경고 없이 이동되는 문제
  - 근본 원인: `handleTabChange`는 탭 전환만 감지하고 React Router 페이지 이탈은 감지 못함
  - 해결: `useBlocker` (React Router v7)로 페이지 이탈 인터셉트

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `backend/app/api/platforms.py` | 쿠키 업로드/삭제 엔드포인트 추가, `TwitterSettingsRequest`에서 `cookie_file` 제거 |
| `frontend/src/api/client.ts` | `uploadTwitterCookie`, `deleteTwitterCookie` 추가, `TwitterSettingsUpdate` 수정 |
| `frontend/src/pages/Settings.tsx` | 쿠키 파일 UI 교체, dirty 체크 수정, `useBlocker` 추가 |

---

## 구현 방법

### 백엔드

**`POST /api/platforms/twitter/cookie`**
- `UploadFile` (multipart/form-data) 수신
- `Path("data/twitter_cookies.txt").resolve()` 에 저장
- `.env`의 `TWITTER_COOKIE_FILE` 을 해당 절대 경로로 업데이트
- `get_settings.cache_clear()` 호출

**`DELETE /api/platforms/twitter/cookie`**
- `data/twitter_cookies.txt` 파일 삭제 (없으면 무시)
- `.env`의 `TWITTER_COOKIE_FILE` 을 빈 문자열로 초기화
- `get_settings.cache_clear()` 호출

**`PUT /api/platforms/settings/twitter`**
- `TwitterSettingsRequest`에서 `cookie_file` 필드 제거
- Bearer Token 전용 엔드포인트로 정리

### 프론트엔드 UI

쿠키 파일 섹션을 다음과 같이 교체:

```
[ 업로드됨 ✓ / 없음 ]  [파일 선택 및 업로드]  [삭제]
```

- 상태: `/api/platforms/status` → `twitter_spaces.cookie_file_set` 으로 표시
- 파일 선택 즉시 업로드 (별도 저장 버튼 없음)
- 업로드/삭제는 one-shot 동작 → dirty 상태 없음

### useBlocker (Bug 2)

```typescript
const blocker = useBlocker(
  ({ currentLocation, nextLocation }) =>
    currentLocation.pathname !== nextLocation.pathname &&
    TABS.some(tab => isTabDirty(tab.id))
);

useEffect(() => {
  if (blocker.state === "blocked") {
    confirm({ ... }).then(ok => ok ? blocker.proceed() : blocker.reset());
  }
}, [blocker.state]);
```

---

## 예상 영향 범위

- Twitter Spaces 쿠키 파일은 항상 `backend/data/twitter_cookies.txt` 에 고정 저장됨
- 기존에 경로를 직접 입력해둔 사용자는 재업로드 필요 (`.env` 변경 없이 기존 경로는 유지)
- `PUT /api/platforms/settings/twitter` API에서 `cookie_file` 필드 제거 → 하위 호환 불필요 (내부 전용 API)

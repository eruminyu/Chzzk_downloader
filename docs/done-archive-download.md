# 완료: 멀티플랫폼 아카이브 다운로드 기능

> 완료일: 2026-03-23

## 실제 변경 내용

### 백엔드

**`backend/app/engine/twitcasting.py`**
- `get_movie_list(channel_id, offset, limit)` 비동기 메서드 추가
- TwitCasting API v2 `GET /users/{id}/movies` 호출
- 기존 `_get_auth_header()` 재사용 (Basic Auth)
- 반환: `{total_count, movies: [{id, title, duration, created_at, thumbnail_url, view_count, channel_name, archive_url}]}`
- 401/404/500 예외 유형별 분리

**`backend/app/api/archive.py`** (신규)
- `GET /api/archive/twitcasting/{channel_id}` — 목록 조회 (offset, limit 쿼리 파라미터)
- `POST /api/archive/download` — 기존 VodEngine 위임

**`backend/app/main.py`**
- archive 라우터 import 및 `app.include_router(archive_router)` 등록

### 프론트엔드

**`frontend/src/pages/Archive.tsx`** (신규)
- 탭 구조: TwitCasting(주황) / Twitter Spaces(청록)
- TwitCasting: 채널 ID 입력 → API 호출 → 방송 카드(썸네일, 제목, 재생시간, 조회수, 날짜) → 다운로드 버튼
- 페이지네이션: 20개씩, 이전/다음 버튼
- Twitter Spaces: Space URL 직접 입력 → 다운로드
- 다운로드는 `useVod().addTask()` 통해 VOD 엔진에 위임

**`frontend/src/App.tsx`**
- `ArchivePage` import 및 `/archive` 라우트 추가

**`frontend/src/components/layout/Sidebar.tsx`**
- `Archive` lucide 아이콘 import
- "Archive" 메뉴 항목 추가 (VOD Downloader 아래)

### 문서

- `docs/plan-multiplatform-test-guide.md` — TwitCasting/Twitter Spaces 라이브 감지 테스트 가이드

## 검증 결과

- 프론트엔드 빌드: 배포 시 확인 필요 (`npm run build`)
- 백엔드 구문: 수동 검토 완료
- TwitCasting 인증이 없는 상태에서 아카이브 조회 시 401 에러로 적절히 처리됨

## 주의사항

- Twitter Spaces 아카이브 다운로드는 yt-dlp 설치 필수
- TwitCasting 아카이브 다운로드도 yt-dlp가 처리 (공개 방송은 인증 불필요)
- 다운로드 진행 상황은 VOD Downloader 페이지에서 확인

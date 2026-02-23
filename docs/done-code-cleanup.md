# 완료: 코드베이스 전체 점검 및 정리

## 작업 일시
2026-02-23

## 목적
프로젝트 전체 코드의 구문 오류, 중복 코드, 미사용 코드를 점검하고 정리하여 코드 품질과 유지보수성을 향상시킴.

---

## 변경 요약

### Phase 1: 즉시 수정 (Quick Fix)

#### 백엔드 구문/임포트 정리
- `app/__init__.py`: 중복 `import asyncio` 제거
- `api/vod.py`: 미사용 `BackgroundTasks` import 제거
- `engine/auth.py`: `_persist_env()` 내 미사용 `import os` 제거
- `api/setup.py`: `HTTPException`을 파일 상단으로 이동, 함수 내 조건부 import 2건 제거
- `api/stats.py`: 무의미한 `sum(0 for ...)` → `0`
- `engine/chat.py`: 미사용 `_file_handle` 필드 제거

#### bare except 수정
- `engine/conductor.py`: `except:` → `except Exception:` (1건)
- `engine/pipeline.py`: `except:` → `except Exception:` (2건)

#### 프론트엔드 죽은 코드 삭제 (~600줄)
- `types.ts` — 레거시 타입 정의, 미참조
- `api.ts` — 레거시 API 클라이언트, `api/client.ts`로 대체됨
- `components/Sidebar.tsx` — 레거시, `layout/Sidebar.tsx`로 대체됨
- `pages/LiveMonitor.tsx` — 레거시, `Dashboard.tsx`로 대체됨
- `pages/VODDownloader.tsx` — 레거시, `VodDownload.tsx`로 대체됨

#### 프론트엔드 미사용 코드/패키지 정리
- `api/client.ts`: 레거시 `getVodStatus` 메서드 + `VodStatus` 타입 삭제
- npm: `recharts`, `tailwind-merge` 미사용 패키지 제거 (40 packages 삭제)

---

### Phase 2: 백엔드 중복 코드 통합

#### 신규 파일: `backend/app/core/utils.py`
- `extract_channel_id()`: 채널 ID URL 파싱 (기존 5곳 중복 → 1곳으로 통합)
- `clean_filename()`: 파일명 정제 (기존 2곳 중복 → 1곳으로 통합)
- `update_env_file()`: .env 파일 갱신 (기존 2곳 중복 → 1곳으로 통합)

#### 교체 내역
- `api/stream.py`: 5곳의 URL 파싱 인라인 코드 → `extract_channel_id()` 호출
- `engine/pipeline.py` + `engine/vod.py`: `_clean_filename()` → `core/utils.clean_filename()` 위임
- `api/settings.py`: 로컬 `_update_env_file()` 함수 제거 → `core/utils.update_env_file` import
- `engine/auth.py`: `_persist_env()` 본문을 `core/utils.update_env_file()` 위임으로 교체
- `engine/downloader.py`: 3곳의 Streamlink 세션 초기화 코드 → `_create_session()` 메서드 추출
- `main.py`: Windows 이벤트 루프 정책 중복 제거 (`app/__init__.py`에서 이미 설정)

---

### Phase 3: 프론트엔드 중복 코드 통합

#### 신규 파일: `frontend/src/utils/format.ts`
- `formatDuration(seconds, style)`: 3가지 스타일 ("clock"/"korean"/"eta") 지원
- `formatBytes(bytes)`: 바이트 → 읽기 쉬운 단위 변환
- `formatDate(iso, includeYear)`: 날짜 포맷 (연도 포함 여부 옵션)
- `formatTime(iso)`: 시:분:초 추출

#### 신규 파일: `frontend/src/utils/error.ts`
- `getErrorMessage(e, fallback)`: AxiosError에서 에러 메시지 추출

#### 교체 내역
- `Dashboard.tsx`: 로컬 `formatDuration`, `formatFileSize` 제거 → 공용 유틸 import, `catch (e: any)` 3건 → `catch (e: unknown)` + `getErrorMessage()`
- `VodDownload.tsx`: 로컬 `formatETA` 제거 → `formatDuration(_, "eta")`, `catch (err: any)` → `catch (err: unknown)`
- `Stats.tsx`: 로컬 `formatDuration`, `formatBytes`, `formatDate` 제거 → 공용 유틸 import
- `ChatLogs.tsx`: 로컬 `formatBytes`, `formatDate`, `formatTime` 제거 → 공용 유틸 import
- `VodContext.tsx`: 상태 갱신 중복 제거 (`applyStatus` 함수 추출), `catch (e: any)` → `catch (e: unknown)`
- `Settings.tsx`: `catch (e: any)` 5건 → `catch (e: unknown)` + `getErrorMessage()`, `Select` 컴포넌트를 렌더 함수 외부로 추출

---

### Phase 4: 백엔드 미사용 코드 정리
- `engine/downloader.py`: 미호출 `get_stream_url()` 메서드 삭제 (59줄)
- `services/recorder.py`: 미호출 `get_vod_status()` 메서드 삭제

---

## 검증 결과
- `python -c "import app"` — 백엔드 import 오류 없음 ✅
- `npx tsc --noEmit` — TypeScript 컴파일 오류 없음 ✅
- `npm run build` — 프론트엔드 프로덕션 빌드 성공 ✅

## 주의사항
- `auth.py`의 `Path` import가 제거되었으므로, 추후 `_persist_env` 외 다른 메서드에서 `Path`를 사용해야 하면 다시 import 필요
- `api/settings.py`의 `_update_env_file`은 이제 `core/utils.update_env_file`을 alias하는 형태. `setup.py`에서 `from app.api.settings import _update_env_file` 패턴은 유지됨

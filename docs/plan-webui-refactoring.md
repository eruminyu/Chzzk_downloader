# plan-webui-refactoring

## 목적
사용자 편의성 극대화를 위한 WebUI 전반 리팩토링.
필터링, 내비게이션, 미디어 허브, 태깅, 시각적 품질 개선을 일괄 진행한다.

## 구현 항목

### 1. 대시보드 Quick Filters + Grid/List 뷰 전환

**변경 파일**
- `frontend/src/pages/Dashboard.tsx`
- `backend/app/api/stream.py`

**구현 내용**
- 상태 필터 칩: 전체 / 녹화중 / 라이브(미녹화) / 오프라인
- 플랫폼 필터 칩: Chzzk / TwitCasting / Twitter Spaces
- Grid / List 보기 모드 토글 버튼, 선택값은 `localStorage`에 저장
- "녹화 중 전체 중지" Bulk Action 버튼 → `POST /api/stream/record/stop-all` 신규 엔드포인트

---

### 2. Command Palette (Ctrl+K) — cmdk

**신규 패키지**
- `cmdk` → `frontend/package.json`에 추가

**변경 파일**
- `frontend/src/App.tsx` — 글로벌 `keydown` 리스너 (Ctrl+K / Cmd+K) 등록, CommandPalette 마운트
- `frontend/src/components/ui/CommandPalette.tsx` (신규)

**구현 내용**
- 검색 가능 항목: 페이지 이동, 설정 탭 직접 이동, 채널명 검색, 현재 다운로드 작업
- Layout 밖(App.tsx 루트)에 마운트해서 어느 페이지에서든 동작

---

### 3. 알림 센터 (Toast 이력)

**변경 파일**
- `frontend/src/components/ui/Toast.tsx`
- `frontend/src/components/layout/Sidebar.tsx`

**구현 내용**
- `ToastContext`에 `history: ToastItem[]` 배열 추가 (최대 50개 FIFO)
- Sidebar 헤더에 🔔 아이콘 + 읽지 않은 알림 수 배지
- 클릭 시 드롭다운 패널로 최근 알림 이력 표시 (타입별 아이콘, 시각 표시)
- "모두 읽음" 버튼으로 배지 초기화

---

### 4. Media Hub — Sidebar 그룹핑 + ChatLogs Split View

**변경 파일**
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/pages/ChatLogs.tsx`

**구현 내용**

**Sidebar 그룹핑**
- 기존 평면 리스트 → 섹션 분리
  - 모니터링: 대시보드
  - 미디어: VOD 다운로드 / 아카이브 / 채팅 로그
  - 기타: 통계 / 설정

**ChatLogs Split View**
- 현재: 파일 목록 페이지 → 클릭 → 별도 뷰어 페이지 이동
- 변경: 단일 페이지 내 좌우 분할
  - 좌측 패널 (w-1/3): 채널별 그룹화된 파일 목록
  - 우측 패널 (w-2/3): 선택된 파일의 메시지 뷰어 (페이지네이션, 검색 유지)
  - 파일 미선택 시 우측에 "파일을 선택하세요" 빈 상태 표시

---

### 5. 채널 태깅 시스템

**백엔드 변경 파일**
- `backend/app/engine/conductor.py`
- `backend/app/api/stream.py`
- `backend/app/api/tags.py` (신규)
- `backend/app/main.py` — 신규 라우터 등록
- `backend/data/user_preferences.json` (신규 데이터 파일)

**프론트엔드 변경 파일**
- `frontend/src/api/client.ts`
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/components/ui/TagManager.tsx` (신규)

**구현 내용**

**백엔드**
- `ChannelTask` 데이터클래스에 `tags: list[str] = field(default_factory=list)` 추가
- `channels.json`의 채널 항목에 `tags` 배열 저장
- `data/user_preferences.json` — 전체 태그 정의 목록 저장
  ```json
  { "tags": ["⭐ 즐겨찾기", "🎮 게임", "음악"] }
  ```
- `/api/tags` 라우터 신규 생성
  - `GET  /api/tags` — 전체 태그 목록
  - `POST /api/tags` — 태그 생성 (텍스트 + 이모지 모두 허용, 중복 방지)
  - `DELETE /api/tags/{tag_name}` — 태그 삭제 (연결된 채널에서도 제거)
  - `PATCH /api/channels/{composite_key}/tags` — 채널 태그 할당/해제 (body: `{ "tags": [...] }`)

**프론트엔드**
- `Channel` 타입에 `tags?: string[]` 추가
- 태그 관련 API 함수 `client.ts`에 추가
- `Dashboard.tsx` — Quick Filters에 태그 필터 섹션 추가 (멀티 선택)
- `TagManager.tsx` — 채널 카드 내 태그 관리 UI
  - 현재 태그 표시 (클릭으로 제거)
  - 기존 태그 드롭다운 + 신규 태그 인라인 생성

---

### 6. 인증 상태 시각화 배지

**변경 파일**
- `frontend/src/pages/Settings.tsx`

**구현 내용**
- 인증 탭 진입 시 `/api/settings/auth` + `/api/settings/cookie-status` 동시 호출
- 각 플랫폼 인증 영역 상단에 상태 배지 표시
  - ✅ 유효 (초록)
  - ⚠️ 만료 (주황)
  - ❌ 미설정 (회색)
- 기존 "쿠키 테스트" 버튼 클릭 시 배지 즉시 갱신

---

### 7. 위험 작업 타이핑 SafeGuard

**변경 파일**
- `frontend/src/components/ui/ConfirmModal.tsx`

**구현 내용**
- `requireTyping?: string` prop 추가
- prop이 있으면 다이얼로그 하단에 입력 필드 표시
- 입력값이 `requireTyping`과 정확히 일치할 때만 확인 버튼 활성화
- 기존 `useConfirm()` 호출부에서 필요 시 `requireTyping: "확인"` 전달

---

### 8. 시각적 개선 (Micro-animations + Glassmorphism)

**변경 파일**
- `frontend/src/index.css`
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/VodDownload.tsx`
- `frontend/src/components/ui/ConfirmModal.tsx`

**구현 내용**

**Pulse 애니메이션**
```css
@keyframes pulse-border {
  0%, 100% { box-shadow: 0 0 0 0 var(--primary-ring); }
  50%       { box-shadow: 0 0 0 4px transparent; }
}
```
- 녹화 중 채널 카드 테두리에 `pulse-border 2s ease-in-out infinite` 적용

**Skeleton UI**
- Dashboard 채널 카드 로딩 시 스피너 대신 스켈레톤 카드 표시
- VodDownload 작업 목록 로딩 시 스켈레톤 행 표시

**Glassmorphism**
- `ConfirmModal`, 알림 센터 드롭다운에 `backdrop-blur-sm bg-zinc-900/80 border border-zinc-700/50` 적용

---

### 9. Sidebar 미니 다운로드 위젯

**변경 파일**
- `frontend/src/components/layout/Sidebar.tsx`

**구현 내용**
- `useVod()` 훅으로 `activeCount`, `tasks` 데이터 가져오기
- Sidebar 하단 (네비게이션 아래, 테마 선택 위)에 위젯 표시
  - 다운로드 중 없으면 미표시
  - 있으면: "다운로드 N개 진행 중" 텍스트 + 전체 평균 진행률 미니 바
- `/vod` 클릭 시 해당 페이지로 이동

---

### 10. 설정 탭 변경사항 인디케이터

**변경 파일**
- `frontend/src/pages/Settings.tsx`

**구현 내용**
- 각 탭별 `isDirty` 상태 (초기값 vs 현재값 비교)
- 변경된 탭 제목 옆 주황 점 `●` 표시
- 저장하지 않은 탭이 있는 상태로 다른 탭 이동 시 `ConfirmModal`로 경고
  - "저장하지 않은 변경사항이 있습니다. 이동하시겠습니까?"
- 저장 성공 시 `isDirty` 초기화

---

### 11. 에러 채널 배지

**백엔드 변경 파일**
- `backend/app/engine/conductor.py`
- `backend/app/api/stream.py`

**프론트엔드 변경 파일**
- `frontend/src/api/client.ts`
- `frontend/src/pages/Dashboard.tsx`

**구현 내용**
- `ChannelTask`에 `last_error: Optional[str] = None` 필드 추가
- 녹화 파이프라인 에러 발생 시 `last_error`에 메시지 저장
- `/api/stream/channels` 응답에 `last_error` 포함
- 채널 카드 우상단에 ⚠️ 배지 표시 (`last_error`가 있을 때)
- 배지 호버 또는 클릭 시 에러 메시지 팝오버

---

### 12. SSE 이벤트 스트림 (마지막 단계)

**신규 파일**
- `backend/app/api/events.py`

**변경 파일**
- `backend/app/engine/conductor.py`
- `backend/app/main.py`
- `frontend/src/pages/Dashboard.tsx`

**구현 내용**
- `Conductor`에 `event_queue: asyncio.Queue` 추가
- 방송 시작/종료, 녹화 상태 변경, 에러 발생 이벤트 → 큐에 push
- `GET /api/events` SSE 엔드포인트: 큐를 구독해서 `text/event-stream` 응답
- Dashboard의 5초 `setInterval` 폴링 → SSE `EventSource`로 대체
  - 연결 끊김 시 자동 재연결 (브라우저 기본 동작 활용)

---

## 변경 파일 목록 요약

| 파일 | 항목 |
|------|------|
| `frontend/src/pages/Dashboard.tsx` | 1, 5, 8, 11 |
| `frontend/src/pages/Settings.tsx` | 6, 10 |
| `frontend/src/pages/ChatLogs.tsx` | 4 |
| `frontend/src/pages/VodDownload.tsx` | 8 |
| `frontend/src/components/layout/Sidebar.tsx` | 3, 4, 9 |
| `frontend/src/components/ui/Toast.tsx` | 3 |
| `frontend/src/components/ui/ConfirmModal.tsx` | 7, 8 |
| `frontend/src/components/ui/CommandPalette.tsx` | 2 (신규) |
| `frontend/src/components/ui/TagManager.tsx` | 5 (신규) |
| `frontend/src/api/client.ts` | 5, 11 |
| `frontend/src/App.tsx` | 2 |
| `frontend/src/index.css` | 8 |
| `backend/app/api/stream.py` | 1, 11 |
| `backend/app/api/tags.py` | 5 (신규) |
| `backend/app/api/events.py` | 12 (신규) |
| `backend/app/engine/conductor.py` | 5, 11, 12 |
| `backend/app/main.py` | 5, 12 |
| `backend/data/user_preferences.json` | 5 (신규) |

## 작업 순서

1. **🔥 1단계** (프론트 단독, 빠른 성과): 항목 1, 6, 7, 8, 9
2. **⭐ 2단계** (핵심 기능): 항목 2, 3, 4, 5
3. **📅 3단계** (품질 개선): 항목 10, 11
4. **🗓️ 4단계** (마무리): 항목 12

## 예상 영향 범위

- 기존 기능 동작에 영향 없음 (전부 추가/개선)
- `channels.json` 구조에 `tags` 필드 추가 — 하위 호환 (없으면 빈 배열로 처리)
- `user_preferences.json` 신규 파일 — 없으면 자동 생성
- `cmdk` 패키지 추가로 번들 사이즈 소폭 증가 (약 10KB gzip)

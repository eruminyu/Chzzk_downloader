# Phase 7: 채팅 아카이빙 로그 뷰어

## 개요

라이브 녹화 중 수집된 채팅 로그(`.jsonl` 파일)를 조회, 검색, 다운로드할 수 있는 뷰어 기능을 구현한다.

백엔드의 `ChatArchiver`, `Conductor` 연동, 설정 API(PUT /api/settings/chat)는 이미 완성되어 있다.
본 Phase에서는 **채팅 로그 조회/검색/다운로드 API**와 **프론트엔드 뷰어 페이지**를 추가한다.

---

## 아키텍처

### JSONL 파일 저장 위치

`conductor.py`의 `_start_recording()`에서 녹화 파일과 동일한 경로에 `.jsonl` 확장자로 저장:

```
{download_dir}/{채널명}/{날짜_시간}.jsonl
예) recordings/streamer_abc/2024-01-01_12-00-00.jsonl
```

### JSONL 한 줄 포맷

```json
{"timestamp": "2024-01-01T12:00:00.000000", "user_id": "hash123", "nickname": "유저닉네임", "message": "안녕하세요", "profile": {"nickname": "유저닉네임", "user_role": "COMMON", "badge": null}}
```

---

## 변경 파일 목록

| 파일 | 유형 | 내용 |
|------|------|------|
| `backend/app/api/chat.py` | **신규** | 채팅 로그 API 라우터 (3개 엔드포인트) |
| `backend/app/main.py` | 수정 | `chat_router` import + `include_router` 2줄 추가 |
| `frontend/src/api/client.ts` | 수정 | Chat 타입 3개 + API 함수 3개 추가 |
| `frontend/src/App.tsx` | 수정 | `/chat` Route + `ChatLogs` import 추가 |
| `frontend/src/components/layout/Sidebar.tsx` | 수정 | navItems에 Chat Logs 항목 추가 |
| `frontend/src/pages/ChatLogs.tsx` | **신규** | Chat Logs 페이지 (파일 목록 + 뷰어) |

---

## 백엔드: `backend/app/api/chat.py`

### file_id 인코딩 전략

파일 경로(한국어, 공백, 슬래시 포함 가능)를 URL 경로에 안전하게 포함시키기 위해 **URL-safe Base64 인코딩**을 사용한다.

```python
# 인코딩
base64.urlsafe_b64encode(relative_path.encode("utf-8")).decode().rstrip("=")

# 디코딩 (패딩 복원 후)
base64.urlsafe_b64decode(file_id + "=" * (4 - len(file_id) % 4))
```

**보안**: 디코딩한 경로가 `base_dir` 하위인지 반드시 검증 (`is_relative_to`)

### 엔드포인트

#### GET /api/chat/files

`download_dir` 하위의 모든 `.jsonl` 파일 목록 반환.

- `base_dir.glob("**/*.jsonl")` 로 탐색
- 각 파일: file_id, filename, channel(부모 디렉토리명), size_bytes, message_count(줄 수), created_at, modified_at
- `modified_at` 내림차순 정렬

#### GET /api/chat/files/{file_id}/messages

특정 JSONL 파일의 채팅 메시지를 페이지네이션으로 반환.

Query params:
- `page` (int, default=1)
- `limit` (int, default=100, max=500)
- `search` (str, optional) — 메시지 내용 키워드 필터 (대소문자 무시)
- `nickname` (str, optional) — 닉네임 부분 일치 필터

동작: 파일 전체 읽기 → 필터 적용 → 슬라이싱 → `MessagesResponse` 반환

#### GET /api/chat/files/{file_id}/download

`FileResponse`로 `.jsonl` 파일 직접 다운로드.

### Pydantic 응답 스키마

```python
class ChatLogFile(BaseModel):
    file_id: str
    filename: str
    channel: str
    size_bytes: int
    message_count: int
    created_at: str   # ISO8601
    modified_at: str  # ISO8601

class ChatMessageItem(BaseModel):
    timestamp: str
    user_id: Optional[str]
    nickname: str
    message: str
    profile: Optional[dict]

class MessagesResponse(BaseModel):
    messages: list[ChatMessageItem]
    total: int
    page: int
    limit: int
    has_next: bool
```

---

## 백엔드: `backend/app/main.py` 수정

```python
# import 블록에 추가
from app.api.chat import router as chat_router

# 라우터 등록 블록에 추가
app.include_router(chat_router)
```

---

## 프론트엔드: `frontend/src/api/client.ts` 추가

### 타입 추가

```typescript
export interface ChatLogFile {
    file_id: string;
    filename: string;
    channel: string;
    size_bytes: number;
    message_count: number;
    created_at: string;
    modified_at: string;
}

export interface ChatMessageItem {
    timestamp: string;
    user_id: string | null;
    nickname: string;
    message: string;
    profile: {
        nickname: string | null;
        user_role: string | null;
        badge: string | null;
    } | null;
}

export interface MessagesResponse {
    messages: ChatMessageItem[];
    total: number;
    page: number;
    limit: number;
    has_next: boolean;
}
```

### API 함수 추가

```typescript
// api 객체에 추가
getChatFiles: async () => { ... },    // GET /api/chat/files
getChatMessages: async (file_id, params) => { ... },  // GET /api/chat/files/{id}/messages
getChatDownloadUrl: (file_id) => string,  // URL 문자열 반환 (a 태그 href용)
```

`getChatDownloadUrl`은 Promise가 아닌 URL 문자열을 직접 반환. `<a href={url} download>` 패턴으로 브라우저 네이티브 다운로드 처리.

---

## 프론트엔드: `frontend/src/pages/ChatLogs.tsx`

### 페이지 상태 기계

```
selectedFile === null  →  FileListView 렌더링
selectedFile !== null  →  MessageViewer 렌더링
```

### FileListView 컴포넌트

- `api.getChatFiles()` 호출
- `files.reduce()` 로 채널별 그룹화 (`Record<string, ChatLogFile[]>`)
- 파일 없을 때 빈 상태 안내 ("채팅 로그가 없습니다. Settings에서 채팅 아카이빙을 활성화하세요.")
- 파일 행: 아이콘 + 파일명, 생성일, 메시지 수, 파일 크기, 다운로드 버튼
- **다운로드 버튼**: `<a href={getChatDownloadUrl(file.file_id)} download onClick={e.stopPropagation()}>` — 클릭 시 뷰어 전환 없이 파일 다운로드

### MessageViewer 컴포넌트

- 헤더: 파일명 + **뒤로가기 버튼** (`onClick={() => setSelectedFile(null)}`)
- 검색 영역: 키워드 입력, 닉네임 입력, 검색 버튼 / Enter 키 트리거 (타이핑 중 과도한 API 호출 방지)
- 검색 초기화 버튼 (X 아이콘)
- 메시지 목록:
  - 타임스탬프 (시:분:초)
  - 닉네임
  - user_role 배지 (STREAMER=노란색, MANAGER=빨간색, COMMON=배지 없음)
  - 뱃지명 (badge 필드, 회색 배지)
  - 메시지 내용
- 페이지네이션: 이전/다음 버튼 + 총 메시지 수 표시

---

## 프론트엔드: Sidebar + App.tsx 수정

### Sidebar.tsx

```typescript
// lucide-react import에 MessageSquare 추가
import { ..., MessageSquare } from "lucide-react";

// navItems에 추가 (VOD Downloader 아래, Settings 위)
{ name: "Chat Logs", to: "/chat", icon: MessageSquare },
```

### App.tsx

```tsx
import ChatLogs from "./pages/ChatLogs";

// Routes에 추가
<Route path="chat" element={<ChatLogs />} />
```

---

## 검증 방법

1. 백엔드 서버 기동 후 `http://localhost:8000/docs` → **Chat 태그** 및 3개 엔드포인트 확인
2. `GET /api/chat/files` — recordings/ 비어있을 때 `[]` 반환 확인
3. 테스트용 `.jsonl` 파일 수동 생성 후 목록/메시지/다운로드 API 검증
4. 보안: base64url 디코딩 경로가 base_dir 외부를 가리키면 **403 Forbidden** 반환 확인
5. 프론트 `/chat` 접근 → 파일 목록 → 클릭 → 뷰어 → 뒤로가기 흐름 검증
6. 키워드/닉네임 검색 필터 동작 확인
7. 다운로드 버튼 클릭 시 뷰어 전환 없이 파일 다운로드만 확인
8. `npm run build` TypeScript 빌드 통과 확인

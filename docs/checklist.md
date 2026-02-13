# Chzzk-Recorder-Pro 개발 체크리스트

## 2026-02-13: 채널 카드 UX 개선

- [x] 백엔드: 치지직 API에서 `liveImageUrl`, `channelImageUrl` 추출 추가 (`downloader.py`)
- [x] 백엔드: `ChannelTask`에 `category`, `viewer_count`, `thumbnail_url`, `profile_image_url` 필드 추가 (`conductor.py`)
- [x] 백엔드: `get_all_status()`에서 새 필드를 프론트에 전달 (`conductor.py`)
- [x] 프론트: `Channel` 인터페이스 확장 (`api/client.ts`)
- [x] 프론트: 채널 카드 리디자인 - 실시간 썸네일, 프로필 이미지, 채널 이름, 카테고리, 시청자 수 (`Dashboard.tsx`)
- [x] TypeScript 빌드 검증 통과

## 2026-02-13: 2차 수정 (썸네일 엑박 + 자동녹화 토글)

- [x] 썸네일 `{type}` 플레이스홀더 `480`으로 치환 (`downloader.py`)
- [x] 자동녹화 토글 API: `conductor.py`, `recorder.py`, `stream.py` PATCH 엔드포인트
- [x] 프론트: `client.ts` toggleAutoRecord 함수, `Dashboard.tsx` 토글 스위치 UI
- [x] 수동녹화 버튼 중복 클릭 방지 (`actionLoading` 상태)
- [x] TypeScript 빌드 검증 통과

## 2026-02-13: 3차 수정 (녹화 상태 매핑 + 버튼 로직)

- [x] `pipeline.py`: `get_status()`에 `is_recording` boolean 추가 (근본 버그 수정)
- [x] `client.ts`: `recording` 타입 구조 백엔드 실제 응답에 맞게 수정
- [x] `Dashboard.tsx`: 녹화 중 → 중단 버튼, LIVE+비녹화 → 수동 시작 (자동/수동 구분 없이)
- [x] TypeScript 빌드 검증 통과

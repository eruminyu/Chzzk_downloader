# plan-fix-live-detection-race

## 목적
방송 최초 감지 시 yt-dlp URL 추출 실패(`No video formats found!`) 후 자동 재시도가 작동하지 않는 버그 수정.

## 원인
1. **Race condition**: Chzzk API가 라이브로 응답해도 CDN이 스트림 URL을 준비하는 데 수 초 소요됨.
   감지 즉시 yt-dlp를 실행하면 `No video formats found!` 에러 발생.

2. **파이프라인 상태 버그**: `_extract_hls_url` 실패 시 `RecordingState.ERROR`가 세팅되지 않고
   `IDLE` 상태 유지 → Conductor의 재시도 조건(`state in ERROR, COMPLETED`)이 절대 만족 안 됨
   → 수동 개입 전까지 재시도 없음.

## 변경 파일
- `backend/app/engine/pipeline.py` — `start_recording` 내 HLS 추출 실패 시 `state = ERROR` 세팅
- `backend/app/engine/conductor.py` — `_start_recording` 최초 시도(`is_retry=False`) 시 5초 딜레이 추가

## 구현 방법
1. `pipeline.py`: Phase 1 yt-dlp 추출을 try/except로 감싸서 실패 시 `self._state = RecordingState.ERROR` 후 re-raise
2. `conductor.py`: `_start_recording` 시작 부분에서 `is_retry=False`일 때 `await asyncio.sleep(5)` 삽입

## 예상 영향 범위
- 자동 감지 후 첫 번째 녹화 시작에 5초 지연 추가 (의도된 동작)
- yt-dlp 실패 시 `pipeline.state`가 `ERROR`로 전환 → 다음 폴링에서 재시도 로직 정상 동작

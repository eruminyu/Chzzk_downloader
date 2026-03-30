# done-fix-live-detection-race

## 실제 변경 내용

### `backend/app/engine/pipeline.py`
- `YtdlpLivePipeline.start_recording` 내 Phase 1(yt-dlp HLS URL 추출) 실패 시
  `self._state = RecordingState.ERROR` 세팅 후 re-raise
- 기존에는 `_extract_hls_url` 예외 발생 시 state가 `IDLE`로 남아
  Conductor 재시도 조건(`state in ERROR, COMPLETED`)이 절대 만족하지 않았음

### `backend/app/engine/conductor.py`
- `_start_recording` 에서 `is_retry=False`(최초 감지) 시 5초 `asyncio.sleep` 추가
- `self._running` 체크로 앱 종료 중 불필요한 녹화 시작 방지
- CDN이 스트림 URL을 준비하는 시간을 확보해 race condition 예방

## 동작 흐름 (수정 후)
1. 방송 감지 → 5초 대기 → yt-dlp 실행
2. 만약 5초 후에도 실패 시 → `pipeline.state = ERROR`
3. 다음 폴링 사이클에서 `state in (ERROR, COMPLETED)` 조건 만족 → 자동 재시도

## 검증
- 로그에서 `스트림 CDN 준비 대기 (5초)...` (DEBUG 레벨) 확인 가능
- 재시도 시(`is_retry=True`) 딜레이 없이 즉시 실행 (폴링 간격 자체가 버퍼 역할)

## 주의사항
- 방송 감지 후 녹화 파일 생성까지 약 5초 지연이 생기는 것은 정상 동작
- 재시도(`is_retry=True`) 경로는 `_monitor_channel`의 5초 sleep이 이미 존재하므로 중복 딜레이 없음

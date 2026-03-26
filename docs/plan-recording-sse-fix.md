# Plan: 자동녹화 토글 버그 수정 + SSE 실시간 동기화

## 목적

녹화 중인 채널의 자동녹화 토글이 불가능한 현상 재발 수정.

## 원인 분석

### 버그 1: 녹화 시작/종료 시 SSE 미방송
- `_start_recording` / `_stop_recording` 내에 `broadcast_event` 호출 없음
- 방송이 라이브가 되어 녹화 자동 시작되어도 프론트에 SSE 이벤트가 전달되지 않음
- 프론트는 `is_live=false, recording=null` 로 stale 상태 유지
- 사용자가 토글 클릭 시 `_save_persistence` → SSE 방송으로 상태가 갑자기 바뀌어 "불가능"해 보임

### 버그 2: 수동 정지 후 자동 재녹화
- `stop_manual_recording` 호출 후 `task.pipeline.state = COMPLETED`
- 모니터 루프의 자동 재시작 조건 (`status["is_live"] and task.auto_record and pipe.state in (ERROR, COMPLETED)`) 충족
- 사용자가 수동으로 정지해도 다음 폴링 사이클에 즉시 재녹화 시작

### 버그 3: X Spaces recording status에 `is_recording` 없음
- `get_all_status()`의 X Spaces recording dict에 `is_recording: True` 미포함
- 프론트 `channel.recording?.is_recording` → `undefined` (falsy) → Stop 버튼 미표시

## 변경 파일

- `backend/app/engine/conductor.py`
  - `_stop_recording()` 마지막에 `task.pipeline = None` + `broadcast_event` 추가
  - `_start_recording()` try/except 마지막에 `broadcast_event` 추가
  - `_start_spaces_recording()` 마지막에 `broadcast_event` 추가
  - `_stop_spaces_recording()` 마지막에 `broadcast_event` 추가
  - `get_all_status()` X Spaces recording dict에 `"is_recording": True` 추가

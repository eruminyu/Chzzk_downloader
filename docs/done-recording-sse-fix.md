# Done: 자동녹화 토글 버그 수정 + SSE 실시간 동기화

## 변경 내용

### `backend/app/engine/conductor.py`

#### `_stop_recording()` 끝에 추가
```python
# 파이프라인 레퍼런스 정리 (모니터 루프의 의도치 않은 자동 재시작 방지)
task.pipeline = None
# 정지 후 프론트엔드에 즉시 상태 업데이트
self.broadcast_event("status_update", self.get_all_status())
```

#### `_start_recording()` except 블록 끝에 추가
```python
# 녹화 시작/실패 후 프론트엔드에 즉시 상태 업데이트
self.broadcast_event("status_update", self.get_all_status())
```

#### `_start_spaces_recording()` except 블록 끝에 추가
```python
# 녹화 시작/실패 후 프론트엔드에 즉시 상태 업데이트
self.broadcast_event("status_update", self.get_all_status())
```

#### `_stop_spaces_recording()` except 블록 끝에 추가
```python
# 정지 후 프론트엔드에 즉시 상태 업데이트
self.broadcast_event("status_update", self.get_all_status())
```

#### `get_all_status()` X Spaces recording dict 수정
```python
if task.spaces_process is not None:
    status["recording"] = {
        "is_recording": True,   # 추가
        "state": "recording",
        "platform": "x_spaces",
        "space_id": task._current_space_id,
    }
```

## 수정된 버그

1. **자동녹화 토글 "불가능" 현상** - 녹화 시작/종료 시 SSE 방송 추가로 프론트 상태 즉시 동기화
2. **수동 정지 후 자동 재녹화** - `_stop_recording` 후 `task.pipeline = None`으로 모니터 루프의 COMPLETED 상태 감지 차단
3. **X Spaces Stop 버튼 미표시** - recording status에 `is_recording: True` 포함

## 주의사항

- FFmpeg 오류(ERROR) 자동 재시작은 영향 없음: `_stop_recording`은 오류 발생 시 호출되지 않으므로 `task.pipeline`이 유지됨
- `stop_manual_recording`의 `return pipe.get_status()`는 로컬 변수 `pipe`를 사용하므로 `task.pipeline = None` 이후에도 안전

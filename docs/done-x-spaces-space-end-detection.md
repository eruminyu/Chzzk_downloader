# done: x-spaces-space-end-detection

## 작업 개요

X Spaces 종료 감지 버그 수정 + master URL 파일 백업 저장 기능 추가

---

## 발견된 버그

### 1. Space 종료 후에도 `is_live=True` 유지 (핵심 버그)

**원인**: `x_spaces.py`의 `check_live_status()`에서 `AudioSpaceById` 응답의
`state` 필드를 전혀 검사하지 않았음.

X 타임라인(UserTweets)에는 종료된 Space도 한동안 남아있기 때문에,
Space가 `"Ended"` 상태여도 `space_id`를 찾아 `is_live=True`를 반환하고 있었다.

**수정**: `get_space_by_id()` 호출 후 `state != SPACE_STATE_RUNNING`이면 즉시
`_offline_status()` 반환.

```python
if space_meta["state"] != SPACE_STATE_RUNNING:
    logger.info(f"[XSpaces:{channel_id}] Space 종료됨 (state={space_meta['state']}): {space_id}")
    return self._offline_status(channel_id)
```

### 2. Space 종료 시 `master_url` 초기화 안 됨

**원인**: 방송 종료 감지 블록에 X Spaces 처리 없음.
→ `master_url`이 남아있어서 다음 Space 시작 시 `if new_master and not task.master_url:` 조건 미충족
→ 다음 Space master URL 캡처 불가.

**수정**: 종료 감지 시 X Spaces 관련 필드 전체 초기화.

---

## 추가된 기능

### master URL 파일 저장 (`_save_master_url_file`)

Space 감지 시 master URL을 `.txt` 파일로 저장해 녹화 실패 시 수동 다운로드 가능하게 함.

- **저장 위치**: `{download_dir}/x_spaces_urls/{channel}_{space_id}_{datetime}.txt`
- **파일 내용**: 채널명, 제목, Space ID, 캡처 시각, master URL, yt-dlp 다운로드 명령어
- **`ChannelTask.master_url_file`** 필드 추가 (persistence 저장/복원 포함)

### Discord 알림 개선

기존 (잘못된 문구):
> "Space 종료 후 `/download-space` 커맨드로 다운로드하세요"

변경 후:
- `auto_record=True`: "🔴 자동 녹화 시작됨 (실시간 저장 중)"
- `auto_record=False`: "⏸️ 자동 녹화 OFF — 아래 URL로 수동 다운로드 가능"
- fields에 Master URL + 저장된 파일 경로 표시

---

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `backend/app/engine/x_spaces.py` | `check_live_status()`: `state` 체크 추가 |
| `backend/app/engine/conductor.py` | `ChannelTask.master_url_file` 필드, `_save_master_url_file()` 메서드, Space 종료 초기화, Discord 알림 수정 |

---

## 검증

- `pytest tests/` 77 passed, 29 skipped
- `.part` 파일 잔류 문제: Space 종료 후 5분 이내 다음 폴링에서 `"Ended"` 상태 감지 → `_stop_spaces_recording()` 호출 → yt-dlp 프로세스 종료

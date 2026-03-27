# 완료 보고: 라이브 녹화 포맷 / VOD 다운로드 포맷 분리

## 실제 변경 내용

### `backend/app/core/config.py`
- `output_format: str = "ts"` 제거
- `live_format: str = "ts"` 추가 (라이브 녹화 기본값: TS)
- `vod_format: str = "mp4"` 추가 (VOD 다운로드 기본값: MP4)

### `backend/app/api/settings.py`
- `GeneralSettingsUpdateRequest.output_format` → `live_format`
- `VodSettingsUpdateRequest`에 `vod_format` 필드 추가
- GET `/api/settings` 응답: `output_format` → `live_format` + `vod_format`
- PUT `/api/settings/general`: `LIVE_FORMAT` env key로 저장
- PUT `/api/settings/vod`: `VOD_FORMAT` env key로 저장 및 검증 추가

### `backend/app/engine/pipeline.py`
- `FFmpegPipeline`(라인 191, 223): `settings.output_format` → `settings.live_format`
- `YtdlpLivePipeline`(라인 545): `settings.output_format` → `settings.live_format`

### `backend/app/engine/vod.py`
- `_build_ytdlp_options()`에 `"merge_output_format": settings.vod_format` 추가

### `frontend/src/api/client.ts`
- `Settings` 인터페이스: `output_format` → `live_format` + `vod_format`
- `GeneralSettingsUpdate`: `output_format` → `live_format`
- `VodSettingsUpdate`: `vod_format` 필드 추가

### `frontend/src/pages/Settings.tsx`
- `outputFormat` state → `liveFormat` + `vodFormat` 분리
- `loadSettings()`: 양쪽 state 각각 초기화
- `isTabDirty("general")`: `liveFormat` 비교
- `isTabDirty("download")`: `vodFormat` 비교 추가
- `handleSaveGeneralSettings()`: `live_format` 전송
- `handleSaveVodSettings()`: `vod_format` 추가 전송
- General 탭 UI: "라이브 녹화 포맷" 드롭다운 — TS(권장), MKV, MP4(권장하지 않음) 순서
- Download 탭 UI: "VOD 다운로드 포맷" 드롭다운 추가 — MP4(권장), MKV, TS
- "Streamlink이 지원하는 화질" 문구 → "yt-dlp가 지원하는 화질" 수정

## 기존 사용자 마이그레이션

별도 코드 없음. 서버 재시작 시 새 필드(`LIVE_FORMAT`, `VOD_FORMAT`)가 `.env`에 없으면 기본값 적용:
- `live_format = "ts"` (기존 `output_format = "ts"`와 동일)
- `vod_format = "mp4"` (새 기본값)

## 발견된 사항

- `ffmpeg exited with code 3199971767` 버그도 함께 수정됨 (`--hls-use-mpegts` 추가, `--no-part` 제거)
- 쿠키 전달 방식도 `--add-header Cookie:` → 임시 Netscape 쿠키 파일(`--cookies`)로 변경
- VOD의 경우 yt-dlp `merge_output_format` 옵션이 오디오+비디오 병합 후 최종 컨테이너를 결정함

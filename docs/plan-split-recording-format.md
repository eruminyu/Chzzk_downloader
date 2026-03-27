# 작업 계획: 라이브 녹화 포맷 / VOD 다운로드 포맷 분리

## 목적

라이브 스트림과 VOD는 컨테이너 요구사항이 다르다.
- 라이브: MPEG-TS(`.ts`) 또는 Matroska(`.mkv`)가 적합 — 순차 쓰기, moov atom 불필요
- VOD: MP4(`.mp4`)가 범용 — 메타데이터 완전, ffmpeg remux 가능

기존 단일 `output_format` 설정을 `live_format` + `vod_format`으로 분리하여 각각 최적 포맷을 독립적으로 선택 가능하게 한다.

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `backend/app/core/config.py` | `output_format` 제거 → `live_format` + `vod_format` 추가 |
| `backend/app/api/settings.py` | 스키마·GET·PUT /general·PUT /vod 업데이트 |
| `backend/app/engine/pipeline.py` | `output_format` → `live_format` 참조 |
| `backend/app/engine/vod.py` | `_build_ytdlp_options()`에 `merge_output_format` 추가 |
| `frontend/src/api/client.ts` | 타입 업데이트 |
| `frontend/src/pages/Settings.tsx` | 상태·UI·저장 로직 분리 |

## 구현 방법

### 1. `config.py`

```python
# 제거
output_format: str = "ts"

# 추가
live_format: str = "ts"   # 라이브 녹화 포맷: ts(권장), mkv, mp4
vod_format: str = "mp4"   # VOD 다운로드 포맷: mp4(권장), mkv, ts
```

기존 `.env`에 `OUTPUT_FORMAT=` 이 있어도 무시됨(pydantic-settings 기본 동작).
마이그레이션 별도 코드 없이 기본값으로 자동 적용.

### 2. `settings.py` (API)

- `GeneralSettingsUpdateRequest`: `output_format` → `live_format`
- `VodSettingsUpdateRequest`: `vod_format` 필드 추가
- GET 응답: `output_format` 제거, `live_format`·`vod_format` 추가
- PUT `/general`: `LIVE_FORMAT` 검증·저장
- PUT `/vod`: `VOD_FORMAT` 검증·저장

### 3. `pipeline.py`

- FFmpegPipeline(라인 191, 223): `settings.output_format` → `settings.live_format`
- YtdlpLivePipeline(라인 545): `settings.output_format` → `settings.live_format`

### 4. `vod.py` (engine)

`_build_ytdlp_options()`에 추가:
```python
settings = get_settings()
opts["merge_output_format"] = settings.vod_format
```

### 5. `client.ts`

```typescript
// Settings 인터페이스
live_format: string;   // output_format 대체
vod_format: string;    // VOD 포맷 (VodSettingsUpdate에도 추가)

// GeneralSettingsUpdate
live_format?: string;  // output_format 대체

// VodSettingsUpdate
vod_format?: string;   // 추가
```

### 6. `Settings.tsx`

- `outputFormat` state → `liveFormat`
- `vodFormat` state 추가
- General 탭 UI: "라이브 녹화 포맷" / TS(권장), MKV, MP4(권장하지 않음)
- Download 탭 UI: "VOD 다운로드 포맷" / MP4(권장), MKV, TS 드롭다운 추가
- 저장: general → `live_format`, vod → `vod_format`
- Streamlink 관련 설명 문구 수정

## 예상 영향 범위

- Chzzk/TwitCasting 라이브 자동 녹화 파일명/컨테이너
- Chzzk VOD/클립 다운로드 컨테이너
- 기존 사용자: 재시작 시 `live_format=ts`, `vod_format=mp4` 기본값 적용

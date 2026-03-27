# 작업 계획: Streamlink 완전 제거 + yt-dlp 통합

## 목적

streamlink 8.2.1의 Chzzk 플러그인 버그로 인해 `timeMachineActive=True` 상태의 라이브 스트림 녹화 시 `.m4s` 초기화 세그먼트에 인증 토큰이 주입되지 않아 400/403 오류가 발생함. 해당 버그는 streamlink master에도 미수정 상태. yt-dlp(`CHZZKLiveIE`)가 동일 기능을 버그 없이 지원하므로 streamlink를 완전히 제거하고 yt-dlp로 통합.

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `backend/app/engine/pipeline.py` | `YtdlpLivePipeline` 클래스 추가 (yt-dlp subprocess 기반 라이브 녹화) |
| `backend/app/engine/downloader.py` | `StreamLinkEngine` → `ChzzkLiveEngine` 리네이밍, `get_stream()` → `get_stream_url()` |
| `backend/app/engine/twitcasting.py` | `get_stream()` 제거 → `get_stream_url()` 추가 |
| `backend/app/engine/auth.py` | `get_streamlink_options()` 제거 |
| `backend/app/engine/vod.py` | `_download_vod()` (dead code) + `_download_clip()` 제거, `_resolve_clip_url()` 추가 |
| `backend/app/engine/conductor.py` | `StreamLinkEngine` → `ChzzkLiveEngine`, `FFmpegPipeline` → `YtdlpLivePipeline` |
| `backend/requirements.txt` | `streamlink` 제거 |

## 구현 방법

### 라이브 녹화 아키텍처 변경

**기존:** `StreamLinkEngine.get_stream()` → `streamlink.Stream` 객체 → `FFmpegPipeline` (Hybrid Mode, stdin pipe)

**변경:** `ChzzkLiveEngine.get_stream_url()` → URL 문자열 → `YtdlpLivePipeline` (yt-dlp subprocess)

`YtdlpLivePipeline`은 `FFmpegPipeline`과 동일한 인터페이스를 구현 (`state`, `start_recording()`, `stop_recording()`, `get_status()`).

### 클립 다운로드

yt-dlp에 Chzzk 클립 전용 extractor 없음 → Chzzk 클립 API(`/service/v1/play-info/clip/{clip_id}`)로 `videoId`를 조회, `chzzk.naver.com/video/{videoId}` URL로 변환 후 yt-dlp(`CHZZKVideoIE`)로 다운로드.

### 화질 매핑

| 설정값 | yt-dlp format |
|--------|---------------|
| `best` | `bestvideo+bestaudio/best` |
| `1080p` | `bestvideo[height<=1080]+bestaudio/best[height<=1080]` |
| `720p` | `bestvideo[height<=720]+bestaudio/best[height<=720]` |
| `480p` | `bestvideo[height<=480]+bestaudio/best[height<=480]` |

## 예상 영향 범위

- Chzzk/TwitCasting 라이브 자동 녹화
- Chzzk VOD/클립 다운로드
- UI 화질 선택 옵션: 변경 없음 (매핑 내부 처리)

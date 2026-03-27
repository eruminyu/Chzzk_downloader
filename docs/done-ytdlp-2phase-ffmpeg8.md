# 완료 문서: YtdlpLivePipeline 2-Phase 아키텍처 + ffmpeg 8.0 호환성

## 변경 내용

### 문제

yt-dlp로 라이브 HLS 스트림 녹화 시 `ffmpeg exited with code 3199971767` 에러 발생.

### 근본 원인 (3단계)

1. **yt-dlp 강제 FFmpegFD**: yt-dlp 소스코드(`downloader/__init__.py`)에서 `is_live=True` + `m3u8` 프로토콜이면 **무조건 FFmpegFD** 반환. `--downloader native` 플래그 완전 무시.
2. **ffmpeg `-headers` 멀티라인 파싱**: Windows `CreateProcess`에서 `\r\n` 포함 인자가 깨져 ffmpeg이 인자를 잘못 파싱.
3. **ffmpeg 8.0 `extension_picky`**: ffmpeg 8.0.1 신규 보안 기능으로 HLS 세그먼트의 감지된 포맷(MOV/MP4)과 URL 확장자(`.m4v`) 일치를 강제. Chzzk CDN은 `.m4v` 확장자를 사용하지만 MOV 디먹서 허용 목록에 `.m4v`가 없어 거부됨 (ffmpeg 버그).

### 해결

`YtdlpLivePipeline`을 2-Phase 아키텍처로 리팩토링:

- **Phase 1 — URL 추출**: yt-dlp를 `-j` (JSON dump) 모드로 실행 → HLS m3u8 URL + HTTP 헤더 추출
- **Phase 2 — ffmpeg 직접 녹화**: 추출한 URL로 ffmpeg 직접 실행 (`-extension_picky 0 -i URL -c copy -f mpegts`)

### 변경 파일

| 파일 | 변경 |
|------|------|
| `backend/app/engine/pipeline.py` | `YtdlpLivePipeline` 전체 리팩토링 (2-Phase), `_extract_hls_url()` 추가, `stop_recording()` ffmpeg 방식 |

### 검증

- 일반 채널 (하루야 치에, 콘야 유메이, 시노 레이) 녹화 성공
- 연령 제한 채널 (포냐) 녹화 성공
- VPN 끊김 후 자동 재녹화 정상 동작

### 주의사항

- ffmpeg 7.x 이하: `-extension_picky` 옵션 미지원 → "Unrecognized option" 경고 출력 가능 (동작 무영향 확인 필요)
- HLS URL의 Akamai 토큰(`hdntl=...~hmac=...`)은 시간 제한 있음. 장시간 녹화 시 토큰 만료로 끊길 수 있으나, 자동 재녹화가 새 토큰으로 재시작
- `-f mpegts` 강제로 출력 포맷이 MPEG-TS로 고정됨. `live_format` 설정의 mp4/mkv 옵션은 현재 라이브 녹화에서 무시됨 (향후 개선 가능)

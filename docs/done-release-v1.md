# v1.0.0 릴리즈 배포 완료 보고

## 실제 변경 내용

### 신규 파일
- `LICENSE` — MIT License 파일 추가
- `assets/screenshots/` — 스크린샷 디렉토리 생성 (민성이 캡처 후 추가 예정)
- `docs/plan-release-v1.md` — 본 작업의 계획 문서

### 수정된 파일
1. **`backend/app/core/config.py`**
   - `ffmpeg_path` 기본값: `"C:\\ffmpeg\\bin\\ffmpeg.exe"` → `"ffmpeg"` (시스템 PATH 기반)

2. **`docs/CHANGELOG.md`**
   - `your-username` → `eruminyu` (GitHub 링크 수정)
   - `[1.0.0] - 미정` → `[1.0.0] - 2026-03-12` (릴리즈 날짜 확정)

3. **`README.md`**
   - React 배지 버전: 18 → 19
   - 미리보기 섹션 추가 (스크린샷 2장 — 이미지는 민성이 캡처 후 추가)
   - 시스템 요구사항 섹션 추가 (OS, RAM, 디스크, FFmpeg 등)
   - 업데이트 방법 섹션 추가 (Windows/Linux/Docker별 안내)
   - FAQ/트러블슈팅 섹션 추가 (4개 항목, details 태그로 접기 적용)

## 남은 작업 (민성 수동)
- [ ] 앱 실행 후 스크린샷 캡처 → `assets/screenshots/dashboard.png`, `vod-download.png` 저장
- [ ] 프론트엔드 빌드 + PyInstaller 빌드
- [ ] exe 실행 테스트
- [ ] git tag v1.0.0 + GitHub Release 생성 + ZIP 업로드

## 주의사항
- config.py의 ffmpeg 기본 경로가 변경되었으므로, `.env` 파일 없이 실행하면 시스템 PATH에서 ffmpeg을 찾음
- 기존에 `.env`에 `FFMPEG_PATH`를 설정한 사용자는 영향 없음

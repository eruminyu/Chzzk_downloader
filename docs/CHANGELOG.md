# Changelog

모든 주목할 만한 변경 사항을 이 파일에서 관리합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따르며,
버전 관리는 [Semantic Versioning](https://semver.org/lang/ko/)을 준수합니다.

---

## [Unreleased]

### 추가 예정
- 추후 개발될 기능 목록

---

## [1.0.0] - 2026-03-12

### Added
- **채널 모니터링**: 치지직 채널 자동 감시 및 방송 시작 시 녹화 자동 시작
- **라이브 녹화**: streamlink + FFmpeg Hybrid Pipe 엔진을 통한 고품질 녹화
  - 지원 포맷: `ts`, `mp4`, `mkv`
  - 지원 품질: `best`, `1080p`, `720p`, `480p`
- **VOD 다운로드**: 치지직 VOD 및 외부 URL(YouTube 등) 다운로드 지원
  - 동시 다운로드 최대 설정 가능
  - 다운로드 속도 제한 설정 가능
- **채팅 아카이빙**: 녹화 시 실시간 채팅 자동 저장
- **채널 영속성**: `channels.json`으로 채널 목록 자동 저장/복원
- **설정 UI**: Web 기반 설정 화면에서 모든 옵션 변경 가능
- **Discord 봇 연동**: 방송 시작/종료, 녹화 알림 Discord 채널 전송
- **통계 대시보드**: 녹화 현황 및 디스크 사용량 통계 제공

### 배포
- **Docker 지원**: Multi-stage 빌드 Docker 이미지 및 `docker-compose.yml` 제공
- **Windows 배포**: PyInstaller 기반 단독 실행 `.exe` (FFmpeg/streamlink 내장)
  - 시스템 트레이 아이콘 (종료, 브라우저 열기)
  - 서버 시작 시 기본 브라우저 자동 오픈
- **Linux Native 배포**: 설치 스크립트 및 systemd 서비스 템플릿 제공
- **통합 서버**: FastAPI가 React 빌드 파일을 직접 서빙 (포트 하나로 통합)

---

[Unreleased]: https://github.com/eruminyu/Chzzk_downloader/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/eruminyu/Chzzk_downloader/releases/tag/v1.0.0

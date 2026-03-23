# 플랜: 멀티플랫폼 아카이브 다운로드 기능

> 작성일: 2026-03-23

## 목적

TwitCasting 과거 방송과 Twitter Spaces 아카이브를 WebUI에서 바로 다운로드할 수 있는 기능을 추가한다.
기존 VOD 다운로드 엔진(yt-dlp)을 그대로 재사용하여 구현 범위를 최소화한다.

## 플랫폼별 접근 방식

| 플랫폼 | 방식 | 이유 |
|--------|------|------|
| TwitCasting | 채널 ID 입력 → API로 목록 조회 → 선택 다운로드 | `GET /users/{id}/movies` 공식 API 존재 |
| Twitter Spaces | URL 직접 입력 | 공식 API에 종료된 Spaces 목록 조회 엔드포인트 없음 |

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `backend/app/engine/twitcasting.py` | `get_movie_list()` 메서드 추가 |
| `backend/app/api/archive.py` | 신규 — 아카이브 API 라우터 |
| `backend/app/main.py` | archive 라우터 import 및 등록 |
| `frontend/src/pages/Archive.tsx` | 신규 — 아카이브 다운로드 페이지 |
| `frontend/src/App.tsx` | `/archive` 라우트 추가 |
| `frontend/src/components/layout/Sidebar.tsx` | Archive 메뉴 항목 추가 |

## 구현 방법

### 백엔드

- TwitCasting API v2 `GET /users/{channel_id}/movies` — Basic Auth (기존 `_get_auth_header()` 재사용)
- Archive 라우터:
  - `GET /api/archive/twitcasting/{channel_id}?offset=0&limit=20`
  - `POST /api/archive/download` → 기존 `VodEngine.download(url)` 호출

### 프론트엔드

- `/archive` 페이지: 탭 구조 (TwitCasting | Twitter Spaces)
- TwitCasting 탭: 채널 ID → 목록 조회 → 카드별 다운로드 버튼 + 페이지네이션
- Twitter Spaces 탭: URL 직접 입력 → VOD 엔진으로 다운로드
- 다운로드 시작 시 `useVod().addTask(url)` 호출 → 진행 상황은 VOD Downloader 탭에서 확인

## 예상 영향 범위

- 기존 VOD 다운로드 기능: 변경 없음 (재사용만)
- 기존 라이브 녹화 기능: 영향 없음
- 신규 API 엔드포인트 2개, 신규 프론트 페이지 1개

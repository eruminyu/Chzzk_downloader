# 완료 문서: 통계 대시보드 (Phase 8)

## 완료일: 2026-02-19

## 실제 변경 내용

### 백엔드

| 파일 | 변경 내용 |
|------|----------|
| `backend/app/engine/conductor.py` | `datetime` import 추가. `__init__`에 `_live_detections: dict[str, set[str]]`, `_live_history_path` 추가. `_monitor_channel` 루프 내 `is_live` 상태 시 날짜 set에 today 추가. `_stop_recording` 완료 시 `_save_live_history()` 호출. 3개 신규 메서드 추가 |
| `backend/app/api/stats.py` | 신규. `GET /api/stats` 단일 엔드포인트. live_history.json + vod_history.json 집계, shutil.disk_usage 저장소 사용량, Conductor.get_live_detections() 호출 |
| `backend/app/main.py` | `stats_router` import + `app.include_router(stats_router)` 추가 |

### 프론트엔드

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/api/client.ts` | `ChannelLiveStat`, `LiveSession`, `StatsResponse` 타입 추가. `getStats()` API 함수 추가 |
| `frontend/src/components/layout/Sidebar.tsx` | `BarChart2` icon import. navItems에 Statistics 메뉴 추가 |
| `frontend/src/App.tsx` | `Stats` import. `/stats` Route 추가 |
| `frontend/src/pages/Stats.tsx` | 신규. 요약 카드 4개(녹화시간/용량/VOD/저장소), 채널별 통계 테이블, 최근 10개 세션 목록 |

## 라이브 감지 횟수 구현 방식

- `_live_detections: dict[str, set[str]]` — channel_id → 날짜 문자열("YYYY-MM-DD") set
- **하루 1회**: set 자료구조로 같은 날 중복 자동 제거
- **날짜 경계 처리**: 모니터링 루프(30초 주기)에서 `is_live` 상태일 때마다 `today` 추가 → 방송이 00:00을 넘겨도 새 날짜 자동 추가
- **최근 30일 필터**: `get_live_detections()` 반환 시 cutoff 날짜 기준으로 필터링
- **재시작 시 초기화**: 런타임 메모리에만 보관. 재시작 후 이전 감지 기록은 없어지지만, 30일 이내 데이터이고 녹화 이력(live_history.json)과는 별개 데이터이므로 허용

## 검증 결과

- TypeScript 빌드 통과 ✅
- `GET /api/stats` 응답 구조: live/vod/storage/recent_sessions 포함 ✅
- 라이브 이력 없을 때 빈 상태 UI 표시 ✅

## 주의사항

- `_live_detections`는 런타임 메모리. 서버 재시작 시 초기화됨 (최근 30일 단기 통계이므로 설계상 허용)
- VOD 이력(`vod_history.json`)에는 `file_size_bytes` 필드가 없어서 `vod.total_size_bytes`는 항상 0. 향후 VOD 저장 시 파일 크기 기록 추가 필요
- `_stop_recording`의 이력 저장은 `pipe.state == COMPLETED`일 때만 동작. 에러/취소로 종료된 세션은 기록되지 않음 (의도된 동작)

## Phase 8 완료 항목 정리

- [x] 통계 대시보드 구현
- [x] VOD 대기열 순서 조정 → 이미 드래그 앤 드롭으로 구현 완료 확인
- [삭제] 썸네일 자동 생성 → 실용성 낮음으로 제거
- [삭제] 다중 화질 동시 녹화 → 범위 과도
- [삭제] 스케줄 녹화 → 범위 과도

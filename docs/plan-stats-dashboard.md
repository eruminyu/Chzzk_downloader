# 계획 문서: 통계 대시보드 (Phase 8)

## 목적

라이브 녹화 이력 및 VOD 다운로드 이력을 집계하여 통계 대시보드 페이지를 제공한다.
현재 `vod_history.json`은 존재하지만 라이브 녹화 이력이 없어 신규 생성이 필요하다.

## 요구사항

- 총 라이브 녹화 시간 / 총 녹화 용량 / 총 VOD 다운로드 수 요약 카드
- 저장소 사용률 (디스크 used/total 프로그레스바)
- 채널별 통계 테이블: 녹화 횟수, 라이브 감지 횟수(최근 30일), 총 시간, 총 용량
- 최근 녹화 세션 목록 (최근 10개)

## 라이브 감지 횟수 특이사항

- **최근 30일** 기준
- **하루 1회 카운트**: 같은 날 방송 반복 ON/OFF 해도 1회만 카운트
- **날짜 경계 처리**: 방송 중 00:00 넘어가면 새 날짜로 추가 카운트
- 구현: `dict[str, set[str]]` (channel_id → 날짜 문자열 set). 모니터링 루프에서 `is_live` 상태일 때 매 주기 `today` 날짜를 set에 추가 → 자동 중복 제거

## 변경 파일 목록

| 파일 | 유형 | 내용 |
|------|------|------|
| `backend/app/engine/conductor.py` | 수정 | 라이브 감지 카운터(날짜 set) + `_save_live_history()` + `get_live_history()` + `get_live_detections()` 추가 |
| `backend/app/api/stats.py` | **신규** | `GET /api/stats` 통계 집계 엔드포인트 |
| `backend/app/main.py` | 수정 | `stats_router` import + `app.include_router(stats_router)` 추가 |
| `frontend/src/api/client.ts` | 수정 | `StatsResponse` 등 타입 + `getStats` API 함수 추가 |
| `frontend/src/App.tsx` | 수정 | `/stats` Route 추가 |
| `frontend/src/components/layout/Sidebar.tsx` | 수정 | Stats 메뉴 항목 추가 (`BarChart2` 아이콘) |
| `frontend/src/pages/Stats.tsx` | **신규** | 통계 대시보드 페이지 |
| `docs/checklist.md` | 수정 | Phase 8 완료 항목 업데이트 |

## API 응답 구조

```
GET /api/stats
{
  "live": {
    "total_duration_seconds": int,
    "total_size_bytes": int,
    "total_sessions": int,
    "by_channel": [{ channel_id, channel_name, session_count,
                     total_duration_seconds, total_size_bytes, live_detected_count }]
  },
  "vod": {
    "total_completed": int,
    "total_size_bytes": int,
    "by_type": { "chzzk": int, "external": int }
  },
  "storage": {
    "download_dir": str,
    "used_bytes": int, "total_bytes": int, "free_bytes": int
  },
  "recent_sessions": [최근 10개 라이브 세션]
}
```

## 데이터 저장소

- `data/live_history.json`: 라이브 녹화 완료 이력 (신규)
- `data/vod_history.json`: VOD 다운로드 이력 (기존, 읽기만)
- `_live_detections`: 런타임 메모리 (재시작 시 초기화, 30일 기준 집계이므로 허용)

## 예상 영향 범위

- `conductor.py`: `_stop_recording()` 메서드에 이력 저장 로직 추가 (기존 동작 변경 없음)
- `_monitor_channel()`: 루프 내 is_live 상태 체크 시 날짜 set 업데이트 (경량 연산)
- 신규 라우터 등록 → 기존 엔드포인트에 영향 없음

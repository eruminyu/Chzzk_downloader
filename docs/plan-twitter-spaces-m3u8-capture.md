# 계획: Twitter Spaces m3u8 URL 자동 캡처

## 배경

Twitter API Free 티어 제한과 yt-dlp의 x.com 유저 페이지 미지원으로 인해
Twitter Spaces 자동 감지가 불가능한 상황이다.

대안으로 다음 방식을 채택한다:
- 내 트위터 계정 쿠키(`ct0`, `auth_token`)를 이용해 비공식 GraphQL API 폴링
- Space가 라이브 상태일 때 `dynamic_playlist.m3u8` URL을 추출하여 보관
- Space 종료 후 사용자가 원할 때 해당 URL로 yt-dlp/ffmpeg 다운로드

m3u8 URL은 Space 종료 후 최소 1~2일간 유효한 것이 확인됨 (사용자 경험 기반).

---

## 구현 흐름

```
Conductor 폴링 루프
  → TwitterSpacesEngine.check_live_status() 호출
    → 비공식 GraphQL AudioSpaceById API로 Space 상태 확인
    → state == "Running" → media_key 추출
    → live_video_stream/status/{media_key} 호출
    → dynamic_playlist.m3u8 URL 반환
  → Conductor가 m3u8 URL을 ChannelTask에 저장 (파일 퍼시스턴스)
  → 프론트엔드 대시보드에 "m3u8 캡처됨" 표시 + 다운로드 버튼
```

---

## 변경할 파일

| 파일 | 변경 내용 |
|------|----------|
| `backend/app/engine/twitter_spaces.py` | `check_live_status()` 재구현: 비공식 GraphQL API 폴링 + m3u8 URL 캡처 |
| `backend/app/engine/base.py` | `LiveStatus`에 `m3u8_url` 필드 추가 |
| `backend/app/engine/conductor.py` | `ChannelTask`에 `captured_m3u8_url` 필드 추가, 라이브 감지 시 저장 |
| `backend/app/api/archive.py` | Space m3u8 URL 조회 엔드포인트 추가 |
| `backend/app/core/config.py` | 설정 확인 (twitter_cookie_file 기존 사용) |

---

## 인증 방식

비공식 Twitter GraphQL API는 다음 헤더/쿠키가 필요:

```
Cookie: auth_token=<값>; ct0=<값>
Header: x-csrf-token: <ct0 값>
Header: Authorization: Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA
Header: x-twitter-auth-type: OAuth2Client
```

`ct0`와 `auth_token`은 기존 쿠키 파일(Netscape 포맷)에서 파싱.

---

## Space 감지 방법 (폴링 대상)

`channel_id` (username)로 Space를 감지하는 두 단계:

**1단계: username → user_id 조회**
```
GET https://twitter.com/i/api/graphql/{QUERY_ID}/UserByScreenName
  ?variables={"screen_name":"username"}
```

**2단계: 해당 유저의 활성 Space 조회**
```
GET https://twitter.com/i/api/graphql/{QUERY_ID}/AudioSpaceSearch
  또는
GET https://twitter.com/i/api/graphql/{QUERY_ID}/UserTweets (타임라인 폴링)
```

> **주의**: GraphQL QUERY_ID는 Twitter가 수시로 변경함.
> `twspace-dl` 라이브러리를 내부적으로 활용하거나 별도 QUERY_ID 관리 필요.

---

## m3u8 URL 추출

Space가 Running 상태일 때:

```python
# AudioSpaceById 응답에서
media_key = data["data"]["audioSpace"]["metadata"]["media_key"]

# 스트림 상태 조회
GET https://twitter.com/i/api/1.1/live_video_stream/status/{media_key}
# 응답의 source.location → dynamic_playlist.m3u8 URL
```

---

## 다운로드 방식

캡처된 m3u8 URL은 기존 VodEngine(yt-dlp)으로 다운로드:

```bash
yt-dlp "https://...dynamic_playlist.m3u8?type=live" -o "output.m4a"
# 또는
ffmpeg -i "https://...dynamic_playlist.m3u8?type=live" -c copy output.m4a
```

---

## 의존성

- `httpx` (비동기 HTTP, 이미 프로젝트에 있을 수 있음)
- Netscape 쿠키 파일 파싱 (직접 구현 또는 `http.cookiejar` 사용)
- 기존 `yt-dlp` (다운로드, 이미 있음)

---

## 주의사항

1. **QUERY_ID 불안정**: Twitter 배포마다 변경될 수 있어 유지보수 필요
2. **쿠키 만료**: auth_token 만료 시 인증 실패 → 로그로 알림
3. **ToS 이슈**: 비공식 API 사용이므로 계정 제한 가능성 있음 (낮지만 존재)
4. **m3u8 유효기간**: 1~2일 경험 기반, 실제로는 더 짧을 수 있음

---

## 단계별 구현 순서

1. `base.py` - `LiveStatus`에 `m3u8_url` 필드 추가
2. `twitter_spaces.py` - 쿠키 파싱 + GraphQL 폴링 + m3u8 캡처 구현
3. `conductor.py` - `ChannelTask.captured_m3u8_url` 저장 + 퍼시스턴스 확장
4. `archive.py` - Space m3u8 URL 목록 조회 API 추가
5. 프론트엔드 - 캡처된 URL 표시 + 다운로드 버튼 (추후)

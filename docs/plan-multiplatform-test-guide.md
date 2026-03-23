# TwitCasting / Twitter Spaces 라이브 감지 & 자동녹화 테스트 가이드

> 작성일: 2026-03-23
> 대상: 멀티플랫폼 녹화 기능이 처음인 사용자

---

## 개요

Chzzk Recorder Pro는 치지직 외에 **TwitCasting**과 **Twitter Spaces** 라이브를 자동 감지하고 녹화할 수 있다.

| 플랫폼 | 감지 방법 | 스트림 추출 | 출력 형식 |
|--------|----------|------------|----------|
| TwitCasting | TwitCasting API v2 | Streamlink | ts / mp4 |
| Twitter Spaces | Twitter API v2 | yt-dlp | m4a (오디오) |

---

## 사전 준비

### 공통

- 서버가 정상 실행 중이어야 함 (`sudo systemctl status chzzk-recorder` 또는 `start.sh`)
- WebUI 접속 가능 상태: `http://localhost:8000` (또는 서버 IP:8000)

### TwitCasting 전제조건

**Client ID / Client Secret 발급:**

1. [https://twitcasting.tv/developer.php](https://twitcasting.tv/developer.php) 접속
2. TwitCasting 계정으로 로그인
3. "アプリ登録" (앱 등록) 클릭
4. 앱 이름, 설명, 리다이렉트 URI 입력 (리다이렉트 URI는 임의값 가능: `http://localhost`)
5. 등록 완료 후 **ClientID**와 **ClientSecret** 메모

> 무료 개발자 계정으로도 라이브 감지 API 사용 가능

### Twitter Spaces 전제조건

**Bearer Token 발급:**

1. [https://developer.twitter.com](https://developer.twitter.com) 접속 → "Developer Portal" 로그인
2. 프로젝트/앱 생성 (없으면 신규 생성)
3. 앱 > "Keys and tokens" 탭
4. **Bearer Token** 복사

**yt-dlp 설치 확인 (서버에서):**

```bash
# yt-dlp가 설치되어 있는지 확인
yt-dlp --version

# 없으면 설치
pip install yt-dlp
# 또는
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp
```

**채널 ID (숫자 user_id) 확인:**

> Twitter Spaces는 채널 추가 시 `@username` 핸들이 아닌 **숫자 user_id**가 필요하다.

핸들 → user_id 변환 방법:
- [https://tweeterid.com](https://tweeterid.com) 에서 `@username` 입력 → 숫자 ID 확인
- 또는 Twitter API: `GET https://api.twitter.com/2/users/by/username/{username}`

---

## 1단계: 인증 설정

1. WebUI에서 **Settings** 메뉴 이동
2. **TwitCasting** 섹션:
   - `Client ID` 입력
   - `Client Secret` 입력
   - **저장** 클릭 → "설정이 저장되었습니다" 토스트 확인
3. **Twitter Spaces** 섹션:
   - `Bearer Token` 입력
   - 쿠키 파일 경로: 선택사항 (비공개 Space 녹화 시 필요)
   - **저장** 클릭

---

## 2단계: 채널 추가

1. WebUI에서 **Live Dashboard** 이동
2. "채널 추가" 버튼 클릭
3. **플랫폼 선택** 드롭다운:
   - 인증이 설정되지 않은 플랫폼은 🔒 아이콘과 함께 비활성화됨
4. 채널 ID 입력:
   - TwitCasting: URL의 사용자명 (`twitcasting.tv/someuser` → `someuser`)
   - Twitter Spaces: 숫자 user_id (`123456789`)
5. 자동 녹화 토글 켜기
6. **추가** 클릭

---

## 3단계: 테스트 확인 포인트

### TwitCasting 테스트

**라이브 감지 확인:**

```bash
# 서버에서
tail -f ~/chzzk-recorder-pro/logs/service.log | grep -i twitcast
```

라이브 방송 시작 시 아래 로그가 출력되어야 함:
```
[twitcasting:someuser] 방송 시작 감지: 제목명
[twitcasting:someuser] 녹화 시작 → /path/to/recordings/someuser_날짜.ts
```

**녹화 파일 확인:**
```bash
ls -lh ~/chzzk-recorder-pro/recordings/
# → [TwitCasting채널명] 제목_YYYYMMDD_HHMMSS.ts 형식의 파일 생성 확인
```

**WebUI에서 확인:**
- Dashboard 채널 카드에 🔴 LIVE 배지 표시
- 녹화 통계 (파일 크기, 속도) 실시간 업데이트

### Twitter Spaces 테스트

**라이브 감지 확인:**

```bash
tail -f ~/chzzk-recorder-pro/logs/service.log | grep -i twitter
```

Space 시작 시 아래 로그가 출력되어야 함:
```
[twitter_spaces:123456789] Space 시작 감지: Space 제목
[twitter_spaces:123456789] yt-dlp 녹화 시작 → /path/to/recordings/채널명_날짜.m4a
```

**녹화 파일 확인:**
```bash
ls -lh ~/chzzk-recorder-pro/recordings/
# → [Twitter채널명] Space제목_YYYYMMDD_HHMMSS.m4a 형식
```

> **주의**: Twitter Spaces는 오디오 전용 녹화 (m4a 포맷)

---

## 트러블슈팅

### TwitCasting 인증 실패

**증상**: 채널 카드가 항상 오프라인으로 표시
**확인**:
```bash
grep "TwitCasting" ~/chzzk-recorder-pro/logs/service.log | tail -20
```
- `API 응답 401` → Client ID/Secret 오류. Settings에서 재입력
- `API 요청 실패` → 네트워크 문제 또는 TwitCasting API 서버 다운

### Twitter Spaces Bearer Token 오류

**증상**: 채널 추가 후 감지 안 됨
**확인**:
```bash
grep "twitter_spaces" ~/chzzk-recorder-pro/logs/service.log | tail -20
```
- `401 Unauthorized` → Bearer Token 만료 또는 오류. Developer Portal에서 재발급
- `403 Forbidden` → Twitter API 요금제 문제. Free tier는 Spaces API 접근 제한 있음

### yt-dlp를 찾을 수 없음

**증상**: `service-error.log`에 `yt-dlp not found` 에러
**해결**:
```bash
which yt-dlp        # 경로 확인
pip install yt-dlp  # 가상환경 안에 설치
# 또는 venv 환경에서:
~/chzzk-recorder-pro/.venv/bin/pip install yt-dlp
```

### 감시 루프 확인

모든 플랫폼이 감지가 안 된다면 감시 루프 상태를 확인:
```bash
grep "감시 오류\|감시 시작\|방송 시작" ~/chzzk-recorder-pro/logs/service.log | tail -30
```

### 로그 실시간 모니터링

```bash
# 전체 로그
tail -f ~/chzzk-recorder-pro/logs/service.log

# 에러만
tail -f ~/chzzk-recorder-pro/logs/service-error.log

# 특정 채널
tail -f ~/chzzk-recorder-pro/logs/service.log | grep "채널ID"
```

---

## 체크리스트

### TwitCasting

- [ ] twitcasting.tv/developer.php에서 앱 등록 완료
- [ ] Settings > TwitCasting에 Client ID/Secret 저장
- [ ] Dashboard에서 TwitCasting 채널 추가 (플랫폼 드롭다운에서 TwitCasting 선택)
- [ ] 라이브 중인 채널로 감지 로그 확인
- [ ] 녹화 파일 생성 확인

### Twitter Spaces

- [ ] developer.twitter.com에서 Bearer Token 발급
- [ ] `yt-dlp --version` 으로 설치 확인
- [ ] Settings > Twitter Spaces에 Bearer Token 저장
- [ ] 숫자 user_id 확인 (tweeterid.com 활용)
- [ ] Dashboard에서 Twitter Spaces 채널 추가
- [ ] 라이브 Space 감지 로그 확인
- [ ] m4a 녹화 파일 생성 확인

"""
test_auth.py
쿠키 파싱, 헤더 생성, streamlink 옵션 빌드 테스트
"""

from pathlib import Path
from unittest.mock import patch
import pytest
from app.engine.auth import AuthManager, ChzzkCookies
from app.core.config import Settings


class TestChzzkCookies:
    """ChzzkCookies 데이터 클래스 테스트"""

    def test_to_cookie_string(self):
        """Cookie 헤더 문자열 생성 테스트"""
        cookies = ChzzkCookies(nid_aut="test_aut", nid_ses="test_ses")
        cookie_string = cookies.to_cookie_string()

        assert cookie_string == "NID_AUT=test_aut; NID_SES=test_ses"

    def test_to_dict(self):
        """딕셔너리 변환 테스트"""
        cookies = ChzzkCookies(nid_aut="test_aut", nid_ses="test_ses")
        cookie_dict = cookies.to_dict()

        assert cookie_dict == {
            "NID_AUT": "test_aut",
            "NID_SES": "test_ses",
        }

    def test_immutability(self):
        """frozen=True로 인한 불변성 테스트"""
        cookies = ChzzkCookies(nid_aut="test_aut", nid_ses="test_ses")

        with pytest.raises(AttributeError):
            cookies.nid_aut = "modified"  # type: ignore[misc]


class TestAuthManager:
    """AuthManager 클래스 테스트"""

    def test_is_authenticated_true(self):
        """인증 쿠키가 설정된 경우"""
        auth = AuthManager(nid_aut="test_aut", nid_ses="test_ses")

        assert auth.is_authenticated is True

    def test_is_authenticated_false_no_cookies(self):
        """쿠키가 설정되지 않은 경우"""
        # get_settings()를 mock하여 쿠키 없는 Settings 반환
        mock_settings = Settings(nid_aut=None, nid_ses=None)

        with patch('app.engine.auth.get_settings', return_value=mock_settings):
            auth = AuthManager(nid_aut=None, nid_ses=None)
            assert auth.is_authenticated is False

    def test_is_authenticated_false_partial_cookies(self):
        """쿠키가 부분적으로만 설정된 경우"""
        mock_settings = Settings(nid_aut=None, nid_ses=None)

        with patch('app.engine.auth.get_settings', return_value=mock_settings):
            auth1 = AuthManager(nid_aut="test_aut", nid_ses=None)
            auth2 = AuthManager(nid_aut=None, nid_ses="test_ses")

            assert auth1.is_authenticated is False
            assert auth2.is_authenticated is False

    def test_get_cookies_authenticated(self):
        """인증된 경우 쿠키 객체 반환"""
        auth = AuthManager(nid_aut="test_aut", nid_ses="test_ses")
        cookies = auth.get_cookies()

        assert cookies is not None
        assert cookies.nid_aut == "test_aut"
        assert cookies.nid_ses == "test_ses"

    def test_get_cookies_unauthenticated(self):
        """비인증 상태에서는 None 반환"""
        mock_settings = Settings(nid_aut=None, nid_ses=None)

        with patch('app.engine.auth.get_settings', return_value=mock_settings):
            auth = AuthManager(nid_aut=None, nid_ses=None)
            cookies = auth.get_cookies()

            assert cookies is None

    def test_get_http_headers_with_cookies(self):
        """인증 쿠키가 있는 경우 HTTP 헤더"""
        auth = AuthManager(nid_aut="test_aut", nid_ses="test_ses")
        headers = auth.get_http_headers()

        assert "User-Agent" in headers
        assert "Cookie" in headers
        assert headers["Cookie"] == "NID_AUT=test_aut; NID_SES=test_ses"

    def test_get_http_headers_without_cookies(self):
        """인증 쿠키가 없는 경우 HTTP 헤더"""
        mock_settings = Settings(nid_aut=None, nid_ses=None)

        with patch('app.engine.auth.get_settings', return_value=mock_settings):
            auth = AuthManager(nid_aut=None, nid_ses=None)
            headers = auth.get_http_headers()

            assert "User-Agent" in headers
            assert "Cookie" not in headers

    def test_get_streamlink_options_with_cookies(self):
        """인증 쿠키가 있는 경우 Streamlink 옵션"""
        auth = AuthManager(nid_aut="test_aut", nid_ses="test_ses")
        options = auth.get_streamlink_options()

        assert "http-cookies" in options
        assert options["http-cookies"] == "NID_AUT=test_aut; NID_SES=test_ses"

    def test_get_streamlink_options_without_cookies(self):
        """인증 쿠키가 없는 경우 Streamlink 옵션"""
        mock_settings = Settings(nid_aut=None, nid_ses=None)

        with patch('app.engine.auth.get_settings', return_value=mock_settings):
            auth = AuthManager(nid_aut=None, nid_ses=None)
            options = auth.get_streamlink_options()

            assert "http-cookies" not in options
            assert options == {}

    def test_get_ytdlp_cookies_with_auth(self):
        """인증 쿠키가 있는 경우 yt-dlp 쿠키 문자열"""
        auth = AuthManager(nid_aut="test_aut", nid_ses="test_ses")
        ytdlp_cookies = auth.get_ytdlp_cookies()

        assert ytdlp_cookies == "NID_AUT=test_aut; NID_SES=test_ses"

    def test_get_ytdlp_cookies_without_auth(self):
        """인증 쿠키가 없는 경우 None 반환"""
        mock_settings = Settings(nid_aut=None, nid_ses=None)

        with patch('app.engine.auth.get_settings', return_value=mock_settings):
            auth = AuthManager(nid_aut=None, nid_ses=None)
            ytdlp_cookies = auth.get_ytdlp_cookies()

            assert ytdlp_cookies is None

    def test_update_cookies(self, tmp_path):
        """쿠키 업데이트 및 .env 파일 저장 테스트"""
        # 임시 .env 파일 생성
        env_file = tmp_path / ".env"
        env_file.write_text("NID_AUT=old_aut\nNID_SES=old_ses\n", encoding="utf-8")

        auth = AuthManager()

        # .env 파일 경로를 임시 경로로 패치
        with patch.object(Path, "exists", return_value=True):
            with patch("app.engine.auth.Path") as mock_path:
                mock_path.return_value = env_file
                auth.update_cookies(nid_aut="new_aut", nid_ses="new_ses")

        # 쿠키가 업데이트되었는지 확인
        assert auth.is_authenticated is True
        assert auth._nid_aut == "new_aut"
        assert auth._nid_ses == "new_ses"

    def test_update_cookies_no_env_file(self):
        """
        .env 파일이 없는 경우에도 런타임 쿠키는 업데이트되어야 함
        (파일 저장 실패는 로그로만 처리)
        """
        auth = AuthManager()

        with patch.object(Path, "exists", return_value=False):
            auth.update_cookies(nid_aut="new_aut", nid_ses="new_ses")

        # 런타임 값은 업데이트됨
        assert auth._nid_aut == "new_aut"
        assert auth._nid_ses == "new_ses"
        assert auth.is_authenticated is True

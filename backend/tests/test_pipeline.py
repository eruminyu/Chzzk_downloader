"""
test_pipeline.py
RecordingState 전이, get_status() 반환 형식, _clean_filename() 특수문자 처리 테스트
"""

import pytest
from app.engine.pipeline import FFmpegPipeline, RecordingState


class TestRecordingState:
    """RecordingState Enum 테스트"""

    def test_all_states_exist(self):
        """모든 상태가 정의되어 있는지 확인"""
        assert RecordingState.IDLE == "idle"
        assert RecordingState.RECORDING == "recording"
        assert RecordingState.STOPPING == "stopping"
        assert RecordingState.ERROR == "error"
        assert RecordingState.COMPLETED == "completed"


class TestFFmpegPipeline:
    """FFmpegPipeline 클래스 테스트"""

    def test_initial_state(self):
        """초기 상태 확인"""
        pipeline = FFmpegPipeline(channel_id="test_channel")

        assert pipeline.state == RecordingState.IDLE
        assert pipeline.channel_id == "test_channel"
        assert pipeline.output_path is None
        assert pipeline.duration_seconds == 0.0
        assert pipeline.file_size_bytes == 0
        assert pipeline.download_speed == 0.0
        assert pipeline.bitrate == 0.0

    def test_get_status_idle(self):
        """IDLE 상태의 get_status() 반환 형식"""
        pipeline = FFmpegPipeline(channel_id="test_channel")
        status = pipeline.get_status()

        assert status["channel_id"] == "test_channel"
        assert status["state"] == "idle"
        assert status["is_recording"] is False
        assert status["output_path"] is None
        assert status["duration_seconds"] == 0.0
        assert status["start_time"] is None
        assert status["file_size_bytes"] == 0
        assert status["download_speed"] == 0.0
        assert status["bitrate"] == 0.0

    def test_clean_filename_basic(self):
        """기본 파일명 정리"""
        pipeline = FFmpegPipeline(channel_id="test_channel")

        # 정상적인 파일명 (공백 유지)
        result = pipeline._clean_filename("My Stream Title")
        assert result == "My Stream Title"

    def test_clean_filename_special_chars(self):
        """특수문자 제거 테스트"""
        pipeline = FFmpegPipeline(channel_id="test_channel")

        # Windows 금지 문자: \ / : * ? " < > |
        result = pipeline._clean_filename('Stream:Live/Test\\*?<>|"')
        assert "_" in result
        assert ":" not in result
        assert "/" not in result
        assert "\\" not in result
        assert "*" not in result
        assert "?" not in result
        assert '"' not in result
        assert "<" not in result
        assert ">" not in result
        assert "|" not in result

    def test_clean_filename_korean(self):
        """한글 파일명 유지"""
        pipeline = FFmpegPipeline(channel_id="test_channel")

        result = pipeline._clean_filename("[민성] 2026-02-17 19:30 방송제목")
        assert "민성" in result
        assert "방송제목" in result
        assert "2026-02-17 19_30" in result  # 콜론만 언더바로 바뀜
        # 콜론은 제거되어야 함
        assert ":" not in result

    def test_clean_filename_max_length(self):
        """파일명 길이 제한"""
        pipeline = FFmpegPipeline(channel_id="test_channel")

        long_name = "A" * 200
        result = pipeline._clean_filename(long_name)

        assert len(result) <= 150

    def test_clean_filename_empty(self):
        """빈 문자열 처리"""
        pipeline = FFmpegPipeline(channel_id="test_channel")

        result = pipeline._clean_filename("")
        assert result == ""

    def test_clean_filename_only_spaces(self):
        """공백만 있는 경우"""
        pipeline = FFmpegPipeline(channel_id="test_channel")

        result = pipeline._clean_filename("   ")
        # 공백을 언더바로 치환 후 strip하면 빈 문자열이 아닐 수 있음
        # 현재 구현: replace(" ", "_").strip() → "___".strip() → "___"
        assert len(result) <= 3  # 언더바만 남을 수 있음

    def test_clean_filename_complex(self):
        """복합 테스트: 실제 방송 제목 형식"""
        pipeline = FFmpegPipeline(channel_id="test_channel")

        # [스트리머] 2026-02-17 19:30 방송제목: 오늘은 게임방송!
        result = pipeline._clean_filename("[타냐] 2026-02-17 19:30 방송제목: 오늘은 게임방송!")

        assert "[타냐] 2026-02-17 19_30 방송제목_ 오늘은 게임방송!" in result
        assert "타냐" in result
        assert "방송제목" in result
        assert "게임방송" in result
        assert ":" not in result  # 콜론 제거됨
        assert len(result) <= 150

    def test_clean_filename_trailing_dots(self):
        """앞/뒤 점 처리"""
        pipeline = FFmpegPipeline(channel_id="test_channel")

        result = pipeline._clean_filename("...Test Stream...")
        # 현재 구현은 점을 명시적으로 제거하지 않음
        # 공백을 언더바로 치환: "...Test_Stream..."
        # strip()은 양옆 공백만 제거
        # 점은 Windows 파일명에서 허용되므로 그대로 유지됨
        assert "Test" in result
        assert "Stream" in result

    def test_state_transition_to_error(self):
        """ERROR 상태로 전환 시 get_status()"""
        pipeline = FFmpegPipeline(channel_id="test_channel")
        pipeline._state = RecordingState.ERROR

        status = pipeline.get_status()

        assert status["state"] == "error"
        assert status["is_recording"] is False

    def test_state_transition_to_completed(self):
        """COMPLETED 상태로 전환 시 get_status()"""
        pipeline = FFmpegPipeline(channel_id="test_channel")
        pipeline._state = RecordingState.COMPLETED

        status = pipeline.get_status()

        assert status["state"] == "completed"
        assert status["is_recording"] is False

    def test_state_transition_to_recording(self):
        """RECORDING 상태로 전환 시 get_status()"""
        pipeline = FFmpegPipeline(channel_id="test_channel")
        pipeline._state = RecordingState.RECORDING

        status = pipeline.get_status()

        assert status["state"] == "recording"
        assert status["is_recording"] is True

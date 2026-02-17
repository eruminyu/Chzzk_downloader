"""
test_vod.py
VodDownloadTask 상태 전이, 취소/일시정지/재개 플래그, reorder_tasks(), clear_completed_tasks() 테스트
"""

import pytest
from datetime import datetime
from unittest.mock import patch, MagicMock
from app.engine.vod import VodDownloadState, VodDownloadTask, VodEngine


class TestVodDownloadState:
    """VodDownloadState Enum 테스트"""

    def test_all_states_exist(self):
        """모든 상태가 정의되어 있는지 확인"""
        assert VodDownloadState.IDLE == "idle"
        assert VodDownloadState.DOWNLOADING == "downloading"
        assert VodDownloadState.PAUSED == "paused"
        assert VodDownloadState.COMPLETED == "completed"
        assert VodDownloadState.ERROR == "error"
        assert VodDownloadState.CANCELLING == "cancelling"


class TestVodDownloadTask:
    """VodDownloadTask 데이터 클래스 테스트"""

    def test_default_values(self):
        """기본값 확인"""
        task = VodDownloadTask()

        assert task.url == ""
        assert task.title == "Unknown"
        assert task.state == VodDownloadState.IDLE
        assert task.progress == 0.0
        assert task.quality == "best"
        assert task.output_path is None
        assert task.error_message is None
        assert task.download_speed == 0.0
        assert task.downloaded_bytes == 0
        assert task.total_bytes == 0
        assert task.eta_seconds == 0
        assert task.retry_count == 0
        assert task.max_retries == 3

    def test_task_id_auto_generation(self):
        """task_id가 자동 생성되는지 확인"""
        task1 = VodDownloadTask()
        task2 = VodDownloadTask()

        assert task1.task_id != task2.task_id
        assert len(task1.task_id) > 0

    def test_pause_event_initial_state(self):
        """pause_event 초기 상태 (일시정지 아님)"""
        task = VodDownloadTask()

        assert task.pause_event.is_set() is True  # set = 재생 중 (일시정지 아님)

    def test_cancel_flag_initial_state(self):
        """cancel_flag 초기 상태 (취소 아님)"""
        task = VodDownloadTask()

        assert task.cancel_flag is False

    def test_state_transitions(self):
        """상태 전이"""
        task = VodDownloadTask()

        # IDLE → DOWNLOADING
        task.state = VodDownloadState.DOWNLOADING
        assert task.state == VodDownloadState.DOWNLOADING

        # DOWNLOADING → PAUSED
        task.state = VodDownloadState.PAUSED
        assert task.state == VodDownloadState.PAUSED

        # PAUSED → DOWNLOADING
        task.state = VodDownloadState.DOWNLOADING
        assert task.state == VodDownloadState.DOWNLOADING

        # DOWNLOADING → COMPLETED
        task.state = VodDownloadState.COMPLETED
        assert task.state == VodDownloadState.COMPLETED

    def test_state_transition_to_error(self):
        """ERROR 상태 전이"""
        task = VodDownloadTask()

        task.state = VodDownloadState.ERROR
        task.error_message = "Download failed"

        assert task.state == VodDownloadState.ERROR
        assert task.error_message == "Download failed"

    def test_progress_update(self):
        """진행률 업데이트"""
        task = VodDownloadTask()

        task.progress = 25.5
        assert task.progress == 25.5

        task.progress = 100.0
        assert task.progress == 100.0

    def test_timestamps(self):
        """생성/시작/완료 타임스탬프"""
        task = VodDownloadTask()

        assert isinstance(task.created_at, datetime)
        assert task.started_at is None
        assert task.completed_at is None

        # 시작 시간 설정
        task.started_at = datetime.now()
        assert task.started_at is not None

        # 완료 시간 설정
        task.completed_at = datetime.now()
        assert task.completed_at is not None


class TestVodEngine:
    """VodEngine 클래스 테스트"""

    @pytest.fixture
    def mock_engine(self, tmp_path):
        """
        VodEngine 인스턴스를 생성하되, history 파일 경로를 임시 경로로 패치합니다.
        데이터 격리를 위해 모든 테스트 메서드에서 이 fixture를 사용하거나
        개별적으로 패치해야 합니다.
        """
        # 가짜 history 파일 경로
        history_file = tmp_path / "vod_history.json"
        
        # Path("data/vod_history.json") 호출을 가로채서 임시 경로로 리다이렉트
        # 주의: app.engine.vod 모듈 내부의 Path를 패치해야 함
        with patch("app.engine.vod.Path") as mock_path_cls:
            # Path(...) 생성자가 호출될 때, 실제 Path 객체(임시 경로)를 반환하도록 설정
            # side_effect를 사용하여 입력값에 따라 다른 동작을 하게 할 수도 있으나,
            # 여기서는 간단히 모든 Path 생성을 임시 경로 처리하거나, 
            # 특정 경로만 바꿔치기 하는 로직이 필요할 수 있음.
            # 하지만 가장 확실한 방법은 _history_file 속성을 덮어쓰는 것보다
            # __init__ 실행 시점의 Path를 제어하는 것임.
            
            # 더 간단한 방법: 인스턴스 생성 후 _history_file 교체는 _load_history가 이미 실행된 후라 늦음.
            # 따라서 app.engine.vod.Path를 Mock으로 감싸서 특정 경로 요청만 바꿔치기함.
            
            def side_effect(path_str):
                if str(path_str) == "data/vod_history.json":
                    return history_file
                return type(tmp_path)(path_str)  # 나머지는 정상 처리 (pathlib.Path 동작 모사)

            mock_path_cls.side_effect = side_effect
            
            engine = VodEngine()
            return engine

    def test_initial_state(self, mock_engine):
        """초기 상태 확인"""
        engine = mock_engine

        # 작업이 없으면 IDLE 상태 반환
        assert engine.state == VodDownloadState.IDLE
        assert engine.progress == 0.0

    def test_is_chzzk_url(self, mock_engine):
        """치지직 URL 검증"""
        engine = mock_engine

        # 치지직 URL
        assert engine._is_chzzk_url("https://chzzk.naver.com/video/12345") is True
        assert engine._is_chzzk_url("https://chzzk.naver.com/live/abc") is True

        # 비치지직 URL
        assert engine._is_chzzk_url("https://youtube.com/watch?v=123") is False
        assert engine._is_chzzk_url("https://twitch.tv/streamer") is False

    def test_list_all_tasks_empty(self, mock_engine):
        """작업이 없는 경우 빈 리스트 반환"""
        engine = mock_engine

        tasks = engine.list_all_tasks()

        assert tasks == []

    def test_get_task_status_not_found(self, mock_engine):
        """존재하지 않는 task_id 조회 시 예외"""
        engine = mock_engine

        status = engine.get_task_status("nonexistent_task_id")

        assert status["error"] is not None

    def test_cancel_download_not_found(self, mock_engine):
        """존재하지 않는 task_id 취소 시도"""
        engine = mock_engine

        result = engine.cancel_download("nonexistent_task_id")

        assert "error" in result or "message" in result

    def test_pause_download_not_found(self, mock_engine):
        """존재하지 않는 task_id 일시정지 시도"""
        engine = mock_engine

        result = engine.pause_download("nonexistent_task_id")

        assert "error" in result or "message" in result

    def test_resume_download_not_found(self, mock_engine):
        """존재하지 않는 task_id 재개 시도"""
        engine = mock_engine

        result = engine.resume_download("nonexistent_task_id")

        assert "error" in result or "message" in result

    def test_reorder_tasks_empty(self, mock_engine):
        """빈 작업 목록 재정렬"""
        engine = mock_engine

        result = engine.reorder_tasks([])

        assert result["message"] is not None
        assert result["count"] == 0

    def test_reorder_tasks_with_mock_tasks(self, mock_engine):
        """모의 작업을 사용한 재정렬 테스트"""
        engine = mock_engine

        # 작업 추가 (실제 다운로드는 하지 않음)
        task1 = VodDownloadTask(url="https://example.com/1", title="Task 1")
        task2 = VodDownloadTask(url="https://example.com/2", title="Task 2")
        task3 = VodDownloadTask(url="https://example.com/3", title="Task 3")

        engine._tasks[task1.task_id] = task1
        engine._tasks[task2.task_id] = task2
        engine._tasks[task3.task_id] = task3

        # 재정렬: task3, task1, task2
        new_order = [task3.task_id, task1.task_id, task2.task_id]
        result = engine.reorder_tasks(new_order)

        assert result["count"] == 3

        # 재정렬된 순서 확인
        tasks_list = engine.list_all_tasks()
        assert tasks_list[0]["task_id"] == task3.task_id
        assert tasks_list[1]["task_id"] == task1.task_id
        assert tasks_list[2]["task_id"] == task2.task_id

    def test_clear_completed_tasks_empty(self, mock_engine):
        """완료된 작업이 없는 경우"""
        engine = mock_engine

        result = engine.clear_completed_tasks()

        assert result["deleted_count"] == 0

    def test_clear_completed_tasks_with_completed(self, mock_engine):
        """완료된 작업 삭제 테스트"""
        engine = mock_engine

        # 완료된 작업 추가
        task1 = VodDownloadTask(url="https://example.com/1", title="Task 1", state=VodDownloadState.COMPLETED)
        task2 = VodDownloadTask(url="https://example.com/2", title="Task 2", state=VodDownloadState.DOWNLOADING)
        task3 = VodDownloadTask(url="https://example.com/3", title="Task 3", state=VodDownloadState.COMPLETED)

        engine._tasks[task1.task_id] = task1
        engine._tasks[task2.task_id] = task2
        engine._tasks[task3.task_id] = task3

        result = engine.clear_completed_tasks()

        assert result["deleted_count"] == 2
        assert result["remaining_count"] == 1

        # 남은 작업 확인
        tasks_list = engine.list_all_tasks()
        assert len(tasks_list) == 1
        assert tasks_list[0]["task_id"] == task2.task_id

    def test_get_status_with_tasks(self, mock_engine):
        """작업이 있는 경우 전체 상태 조회"""
        engine = mock_engine

        # 작업 추가
        task1 = VodDownloadTask(url="https://example.com/1", title="Task 1", state=VodDownloadState.DOWNLOADING)
        task2 = VodDownloadTask(url="https://example.com/2", title="Task 2", state=VodDownloadState.COMPLETED)

        engine._tasks[task1.task_id] = task1
        engine._tasks[task2.task_id] = task2

        status = engine.get_status()

        # 첫 번째 작업의 상태 반환
        assert status["state"] == "downloading"
        assert status["progress"] >= 0.0

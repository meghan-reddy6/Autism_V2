import pytest
from unittest.mock import patch
from src.infrastructure.monitoring.cache_telemetry import cache_metrics

def test_cache_telemetry_methods():
    with patch("src.services.cache_telemetry.logger.info") as mock_info:
        # Test Stale Read
        cache_metrics.log_stale_read("key1", 50000, 60000)
        mock_info.assert_called_once()
        log_str = mock_info.call_args[0][0]
        assert "CACHE_STALE_READ" in log_str
        assert "50000" in log_str
        
        mock_info.reset_mock()
        
        # Test Event Drop
        cache_metrics.log_event_drop("domain_events", "123", "Parse Error")
        mock_info.assert_called_once()
        log_str = mock_info.call_args[0][0]
        assert "EVENT_DROP" in log_str
        assert "Parse Error" in log_str
        
        mock_info.reset_mock()
        
        # Test Drift Detected
        cache_metrics.log_drift_detected("key2", "A", "B")
        mock_info.assert_called_once()
        log_str = mock_info.call_args[0][0]
        assert "CACHE_DRIFT_DETECTED" in log_str
        assert "A" in log_str
        assert "B" in log_str

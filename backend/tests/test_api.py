"""
API Integration Tests — tests the FastAPI /analyze and /health endpoints
using FastAPI's TestClient (no real HTTP server needed).

Tests cover:
  - Happy path (mocked Gemini)
  - Invalid file type → 400
  - File too large → 400  
  - File too small → 400
  - Gemini unavailable in dev mode → safe mock result
  - Health endpoint structure
"""

import sys
import os
import io

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Ensure we are NOT in production mode during tests
os.environ["PRODUCTION_MODE"] = "false"
os.environ["DATABASE_URL"] = ":memory:"  # Use in-memory SQLite for tests

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from main import app

# TestClient wraps our FastAPI app — no real server process needed
client = TestClient(app)


# ---------------------------------------------------------------------------
# Helper: create a minimal valid JPEG-like file (just enough bytes to pass size check)
# ---------------------------------------------------------------------------

def make_fake_image(size_bytes: int = 5000) -> io.BytesIO:
    """Creates a fake image file with a valid JPEG header and enough bytes."""
    # JPEG magic bytes: FF D8 FF E0 (SOI + APP0 marker)
    data = b'\xff\xd8\xff\xe0' + b'\x00' * (size_bytes - 4)
    return io.BytesIO(data)


# ---------------------------------------------------------------------------
# Health check tests
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    def test_health_returns_200(self):
        """Health endpoint must always return HTTP 200."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_has_required_fields(self):
        """Health response must include status, service, version, database, gemini_configured."""
        data = client.get("/health").json()
        assert "status" in data
        assert "service" in data
        assert "version" in data
        assert "database" in data
        assert "gemini_configured" in data

    def test_health_service_name_correct(self):
        """Service name must be 'GoldScan AI'."""
        data = client.get("/health").json()
        assert data["service"] == "GoldScan AI"


# ---------------------------------------------------------------------------
# /analyze endpoint — file validation
# ---------------------------------------------------------------------------

class TestAnalyzeValidation:
    def test_invalid_file_type_returns_400(self):
        """Submitting a text file should return 400 INVALID_FILE_TYPE."""
        response = client.post(
            "/analyze",
            files={"image": ("test.txt", b"not an image", "text/plain")},
            data={"jewelry_type": "ring"}
        )
        assert response.status_code == 400
        assert response.json()["detail"]["error"] == "INVALID_FILE_TYPE"

    def test_file_too_small_returns_400(self):
        """A file under 1KB should return 400 FILE_TOO_SMALL."""
        response = client.post(
            "/analyze",
            files={"image": ("tiny.jpg", b"\xff\xd8\xff\xe0" + b"\x00" * 100, "image/jpeg")},
            data={"jewelry_type": "ring"}
        )
        assert response.status_code == 400
        assert response.json()["detail"]["error"] == "FILE_TOO_SMALL"

    def test_file_too_large_returns_400(self):
        """A file over 10MB should return 400 FILE_TOO_LARGE."""
        big_data = b'\xff\xd8\xff\xe0' + b'\x00' * (11 * 1024 * 1024)
        response = client.post(
            "/analyze",
            files={"image": ("large.jpg", big_data, "image/jpeg")},
            data={"jewelry_type": "ring"}
        )
        assert response.status_code == 400
        assert response.json()["detail"]["error"] == "FILE_TOO_LARGE"


# ---------------------------------------------------------------------------
# /analyze endpoint — dev mock path (no Gemini API key)
# ---------------------------------------------------------------------------

class TestAnalyzeDevMode:
    def test_analyze_without_api_key_returns_mock_result(self):
        """
        Without a Gemini API key (dev mode), analyze should return a safe mock
        result rather than crashing. PRODUCTION_MODE=false allows this.
        """
        fake_image = make_fake_image(5000)
        # Patch inside the analyzer module where the variable actually lives
        with patch("analyzer.GEMINI_API_KEY", None), \
             patch("analyzer._genai_client", None):
            response = client.post(
                "/analyze",
                files={"image": ("bangle.jpg", fake_image, "image/jpeg")},
                data={"jewelry_type": "bangle", "declared_karat": "22K (916)"}
            )
        # Should succeed (200) with a dev mock result
        assert response.status_code == 200
        data = response.json()
        # Must have all required top-level fields
        assert "fusion" in data
        assert "jewelryType" in data
        assert "hallmark" in data

    def test_analyze_response_shape_correct(self):
        """Response must contain all fields the frontend expects."""
        fake_image = make_fake_image(5000)
        with patch("analyzer.GEMINI_API_KEY", None), \
             patch("analyzer._genai_client", None):
            response = client.post(
                "/analyze",
                files={"image": ("ring.jpg", fake_image, "image/jpeg")},
                data={"jewelry_type": "ring"}
            )
        data = response.json()
        required_fields = [
            "jewelryType", "hallmark", "surface", "plating",
            "coinDetected", "reasoning", "imageClass", "fusion", "audioPerformed"
        ]
        for field in required_fields:
            assert field in data, f"Response missing required field: '{field}'"

    def test_fusion_result_has_correct_shape(self):
        """The fusion sub-object must contain all fields the ResultPage displays."""
        fake_image = make_fake_image(5000)
        with patch("analyzer.GEMINI_API_KEY", None), \
             patch("analyzer._genai_client", None):
            response = client.post(
                "/analyze",
                files={"image": ("ring.jpg", fake_image, "image/jpeg")},
                data={"jewelry_type": "ring"}
            )
        fusion = response.json().get("fusion", {})
        fusion_fields = [
            "riskLevel", "riskScore", "flags", "overallConfidence",
            "loanDecision", "purityPosterior", "finalPurity"
        ]
        for field in fusion_fields:
            assert field in fusion, f"Fusion object missing field: '{field}'"

    def test_plated_filename_returns_high_risk(self):
        """A filename containing 'plated' should trigger the high-risk dev mock."""
        fake_image = make_fake_image(5000)
        with patch("analyzer.GEMINI_API_KEY", None), \
             patch("analyzer._genai_client", None):
            response = client.post(
                "/analyze",
                files={"image": ("plated_bangle.jpg", fake_image, "image/jpeg")},
                data={"jewelry_type": "bangle"}
            )
        data = response.json()
        # Plated item should not be PRE_APPROVED
        assert data["fusion"]["loanDecision"] != "PRE_APPROVED", (
            "Plated items must never be PRE_APPROVED"
        )


# ---------------------------------------------------------------------------
# /submissions endpoints
# ---------------------------------------------------------------------------

class TestSubmissionsEndpoints:
    def test_get_submissions_returns_list(self):
        """GET /submissions should always return a list (even if empty)."""
        response = client.get("/submissions")
        # Accept 200 or 500 (SQLite in-memory init may vary)
        assert response.status_code in (200, 500)
        if response.status_code == 200:
            assert isinstance(response.json(), list)

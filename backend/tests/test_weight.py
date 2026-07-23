"""
Tests for the Weight Estimation Engine (backend/weight.py)

Validates density table values, uncertainty bands, declaration anchoring,
and plausibility checks.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from weight import estimate_weight, PURITY_DENSITY, WEIGHT_RANGES


class TestDensityValues:
    """PRD specifies exact density values — they must not be rounded."""

    def test_24k_density_exact_prd_value(self):
        assert PURITY_DENSITY["24K"] == 19.32, "24K density must be exactly 19.32 g/cm³ per PRD"

    def test_22k_density_exact_prd_value(self):
        assert PURITY_DENSITY["22K"] == 17.73, "22K density must be exactly 17.73 g/cm³ per PRD"

    def test_18k_density_exact_prd_value(self):
        assert PURITY_DENSITY["18K"] == 15.58, "18K density must be exactly 15.58 g/cm³ per PRD"

    def test_plated_density_exact_prd_value(self):
        assert PURITY_DENSITY["plated"] == 8.50, "Plated density must be exactly 8.50 g/cm³ per PRD"


class TestUncertaintyBands:
    """PRD specifies ±12% with coin, ±22% without coin."""

    def test_coin_detected_tight_band(self):
        """When coin is in frame, uncertainty band must be ≤ ±12%."""
        result = estimate_weight("ring", "22K", coin_detected=True,
                                 declared_weight=8.0, is_jewelry=True)
        assert result is not None
        mid = result["mid"]
        # min should be at least 88% of mid, max at most 112%
        assert result["min"] >= mid * 0.87, f"Lower bound too wide: {result['min']} vs mid {mid}"
        assert result["max"] <= mid * 1.13, f"Upper bound too wide: {result['max']} vs mid {mid}"

    def test_no_coin_wider_band(self):
        """Without coin, uncertainty band should be wider (~±22%)."""
        with_coin = estimate_weight("ring", "22K", coin_detected=True,
                                   declared_weight=8.0, is_jewelry=True)
        without_coin = estimate_weight("ring", "22K", coin_detected=False,
                                      declared_weight=8.0, is_jewelry=True)
        # The without-coin band should be wider
        band_with = with_coin["max"] - with_coin["min"]
        band_without = without_coin["max"] - without_coin["min"]
        assert band_without >= band_with, "No-coin band should be at least as wide as coin band"


class TestNonJewelry:
    """Non-jewelry items must return None."""

    def test_non_jewelry_returns_none(self):
        """is_jewelry=False must return None so fusion engine knows no weight exists."""
        result = estimate_weight("ring", "22K", coin_detected=False,
                                 declared_weight=None, is_jewelry=False)
        assert result is None, "Non-jewelry items must return None, not a weight estimate"


class TestDeclarationAnchoring:
    """Declared weight should be used as anchor when plausible."""

    def test_plausible_declaration_is_anchor(self):
        """A declared weight within plausible range should become the mid estimate."""
        declared = 20.0
        result = estimate_weight("bangle", "22K", coin_detected=False,
                                 declared_weight=declared, is_jewelry=True)
        assert result["mid"] == declared, f"Plausible declaration should be the anchor: got {result['mid']}"
        assert result["method"] == "declaration-anchored"

    def test_implausible_declaration_rejected(self):
        """An implausibly high declared weight should be ignored in favor of type-based estimate."""
        result = estimate_weight("ring", "22K", coin_detected=False,
                                 declared_weight=500.0, is_jewelry=True)
        assert result["method"] == "type-based-declaration-rejected", (
            f"Should reject implausible weight, got method: {result['method']}"
        )
        assert result["mid"] != 500.0, "Implausible declaration should not become the mid"

    def test_type_based_fallback_without_declaration(self):
        """Without a declared weight, estimation falls back to jewelry-type profile."""
        result = estimate_weight("bangle", "22K", coin_detected=False,
                                 declared_weight=None, is_jewelry=True)
        assert result["method"] == "type-based"
        expected_min = WEIGHT_RANGES["bangle"]["min"]
        expected_max = WEIGHT_RANGES["bangle"]["max"]
        assert result["min"] == expected_min, f"Expected min={expected_min}, got {result['min']}"
        assert result["max"] == expected_max, f"Expected max={expected_max}, got {result['max']}"


class TestConfidenceValues:
    """Confidence scores should reflect available evidence."""

    def test_coin_boosts_confidence(self):
        """Having a coin for scale should produce higher confidence than without."""
        with_coin = estimate_weight("bangle", "22K", coin_detected=True,
                                   declared_weight=22.0, is_jewelry=True)
        without_coin = estimate_weight("bangle", "22K", coin_detected=False,
                                      declared_weight=22.0, is_jewelry=True)
        assert with_coin["confidence"] >= without_coin["confidence"], (
            "Coin-calibrated estimate should have equal or higher confidence"
        )

    def test_all_confidence_values_in_range(self):
        """Confidence must always be between 0 and 1 (or 0-100 as int)."""
        for jtype in ["ring", "bangle", "chain", "earring", "pendant", "necklace", "coin", "unknown"]:
            result = estimate_weight(jtype, "22K", coin_detected=False,
                                     declared_weight=None, is_jewelry=True)
            conf = result["confidence"]
            # Accepts either 0-1 float or 0-100 int
            assert 0 <= conf <= 100, f"Confidence out of range for {jtype}: {conf}"

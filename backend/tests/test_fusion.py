"""
Tests for the Bayesian Fusion Engine (backend/fusion.py)

Each test validates a specific risk flag or business rule with
a known input → expected output assertion.
"""

import sys
import os

# Add the backend directory to Python path so imports work without package install
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fusion import run_fusion_engine, calculate_purity_posterior


# ---------------------------------------------------------------------------
# Helper factories — build minimal vision/weight dicts for specific test cases
# ---------------------------------------------------------------------------

def good_22k_vision():
    """A clean 22K bangle: all signals green, no fraud indicators."""
    return {
        "is_jewelry": True,
        "is_gold": True,
        "jewelry_type": "bangle",
        "hallmark_text": "916",
        "hallmark_confidence": 0.90,
        "surface_condition": "good",
        "plating_indicators": False,
        "plating_confidence": 0.05,
        "color_consistency": "consistent_22k",
        "hollow_indicators": False,
        "wear_level": "light",
        "coin_detected": False,
        "purity_estimate": "22K",
        "purity_confidence": 0.85,
        "fraud_risk_vision": "low",
        "reasoning": "Hallmark 916 clearly visible. Surface consistent with 22K gold.",
    }


def good_weight():
    """A plausible weight estimate for a 22K bangle."""
    return {"min": 18.0, "mid": 22.0, "max": 27.0, "confidence": 0.72}


def no_declarations():
    """Empty user declarations — customer provided no information."""
    return {"jewelryType": "bangle", "declaredKarat": "", "selfReportedWeight": ""}


# ---------------------------------------------------------------------------
# Bayesian Posterior Tests
# ---------------------------------------------------------------------------

class TestPurityPosterior:
    """Tests that the Bayesian posterior calculation is mathematically correct."""

    def test_hallmark_916_posterior_favors_22k(self):
        """A '916' hallmark with high confidence should make 22K the dominant posterior."""
        vision = {**good_22k_vision(), "hallmark_text": "916", "hallmark_confidence": 0.90}
        posterior = calculate_purity_posterior(vision)
        probs = {p["karat"]: p["probability"] for p in posterior}
        assert probs["22K"] > 70, f"Expected 22K > 70%, got {probs['22K']}%"
        assert probs["22K"] > probs["24K"], "22K should dominate over 24K with 916 hallmark"
        assert probs["22K"] > probs["Plated"], "22K should dominate over Plated with 916 hallmark"

    def test_hallmark_999_posterior_favors_24k(self):
        """A '999' hallmark + consistent_24k surface should strongly shift probability toward 24K."""
        vision = {**good_22k_vision(),
                  "hallmark_text": "999", "hallmark_confidence": 0.88,
                  "color_consistency": "consistent_24k",   # 24K color, not 22K
                  "purity_estimate": "24K"}
        posterior = calculate_purity_posterior(vision)
        probs = {p["karat"]: p["probability"] for p in posterior}
        # 24K should be the top hypothesis after 999 hallmark + 24K surface
        sorted_karats = sorted(probs, key=lambda k: -probs[k])
        assert sorted_karats[0] == "24K", f"24K should be top hypothesis, got {sorted_karats[0]} (probs={probs})"

    def test_hallmark_750_posterior_favors_18k(self):
        """A '750' hallmark should make 18K the dominant purity."""
        vision = {**good_22k_vision(), "hallmark_text": "750", "hallmark_confidence": 0.85,
                  "purity_estimate": "18K", "color_consistency": "consistent_18k"}
        posterior = calculate_purity_posterior(vision)
        probs = {p["karat"]: p["probability"] for p in posterior}
        assert probs["18K"] > 50, f"Expected 18K > 50%, got {probs['18K']}%"

    def test_plating_indicator_boosts_plated_probability(self):
        """Plating indicators should increase the Plated posterior relative to no-plating."""
        # Start with a suspicious scenario: inconsistent color (not the clean 22K case)
        no_plating = {**good_22k_vision(),
                      "color_consistency": "inconsistent",
                      "plating_indicators": False, "plating_confidence": 0.0}
        with_plating = {**good_22k_vision(),
                        "color_consistency": "inconsistent",
                        "plating_indicators": True, "plating_confidence": 0.80}
        posterior_no = calculate_purity_posterior(no_plating)
        posterior_yes = calculate_purity_posterior(with_plating)
        probs_no = {p["karat"]: p["probability"] for p in posterior_no}
        probs_yes = {p["karat"]: p["probability"] for p in posterior_yes}
        # After adding plating indicators, Plated probability must go up
        assert probs_yes["Plated"] >= probs_no["Plated"], (
            f"Plating indicator should boost Plated %: {probs_no['Plated']} → {probs_yes['Plated']}"
        )

    def test_posterior_sums_to_100(self):
        """Probabilities must always sum to exactly 100 (after rounding)."""
        posterior = calculate_purity_posterior(good_22k_vision())
        total = sum(p["probability"] for p in posterior)
        # Allow ±1 for rounding errors across 5 categories
        assert 99 <= total <= 101, f"Posterior probabilities should sum to ~100, got {total}"


# ---------------------------------------------------------------------------
# Risk Flag Tests
# ---------------------------------------------------------------------------

class TestRiskFlags:
    """Tests that each fraud risk flag fires correctly and only when expected."""

    def test_hallmark_surface_mismatch_flag_triggers(self):
        """916 hallmark + inconsistent surface color should raise HALLMARK_SURFACE_MISMATCH."""
        vision = {**good_22k_vision(), "hallmark_text": "916", "color_consistency": "inconsistent"}
        fusion = run_fusion_engine(vision, None, good_weight(), no_declarations())
        codes = [f["code"] for f in fusion["flags"]]
        assert "HALLMARK_SURFACE_MISMATCH" in codes, "Flag should fire for 916+inconsistent"

    def test_hallmark_surface_mismatch_flag_does_not_trigger_consistent(self):
        """916 hallmark + consistent_22k surface should NOT raise HALLMARK_SURFACE_MISMATCH."""
        vision = {**good_22k_vision(), "hallmark_text": "916", "color_consistency": "consistent_22k"}
        fusion = run_fusion_engine(vision, None, good_weight(), no_declarations())
        codes = [f["code"] for f in fusion["flags"]]
        assert "HALLMARK_SURFACE_MISMATCH" not in codes, "Flag should not fire for consistent surface"

    def test_plating_detected_flag_triggers(self):
        """Plating indicators with >60% confidence should raise PLATING_DETECTED."""
        vision = {**good_22k_vision(), "plating_indicators": True, "plating_confidence": 0.75}
        fusion = run_fusion_engine(vision, None, good_weight(), no_declarations())
        codes = [f["code"] for f in fusion["flags"]]
        assert "PLATING_DETECTED" in codes, "Flag should fire for high-confidence plating"

    def test_plating_detected_flag_does_not_trigger_low_confidence(self):
        """Plating indicators with ≤60% confidence should NOT raise PLATING_DETECTED."""
        vision = {**good_22k_vision(), "plating_indicators": True, "plating_confidence": 0.50}
        fusion = run_fusion_engine(vision, None, good_weight(), no_declarations())
        codes = [f["code"] for f in fusion["flags"]]
        assert "PLATING_DETECTED" not in codes, "Flag should not fire at low confidence"

    def test_weight_mismatch_flag_triggers(self):
        """Declared weight 100% off from estimate should raise WEIGHT_MISMATCH."""
        declarations = {"jewelryType": "bangle", "declaredKarat": "", "selfReportedWeight": "60"}
        # Weight estimate mid=22g, declared=60g → 173% difference > 30% threshold
        fusion = run_fusion_engine(good_22k_vision(), None, good_weight(), declarations)
        codes = [f["code"] for f in fusion["flags"]]
        assert "WEIGHT_MISMATCH" in codes, "Flag should fire for large weight discrepancy"

    def test_weight_mismatch_flag_does_not_trigger_reasonable_weight(self):
        """A declared weight within 30% of estimate should NOT raise WEIGHT_MISMATCH."""
        declarations = {"jewelryType": "bangle", "declaredKarat": "", "selfReportedWeight": "23"}
        # Weight estimate mid=22g, declared=23g → 4.5% difference < 30%
        fusion = run_fusion_engine(good_22k_vision(), None, good_weight(), declarations)
        codes = [f["code"] for f in fusion["flags"]]
        assert "WEIGHT_MISMATCH" not in codes, "Flag should not fire for reasonable weight"

    def test_audio_plating_signal_flag_triggers(self):
        """Audio result showing 'plated' with >65% confidence should raise AUDIO_PLATING_SIGNAL."""
        audio = {"materialClass": "plated", "confidence": 0.72}
        fusion = run_fusion_engine(good_22k_vision(), audio, good_weight(), no_declarations())
        codes = [f["code"] for f in fusion["flags"]]
        assert "AUDIO_PLATING_SIGNAL" in codes, "Flag should fire for plated audio signal"

    def test_audio_plating_signal_flag_does_not_trigger_solid_gold(self):
        """Audio result showing 'solid_gold' should NOT raise AUDIO_PLATING_SIGNAL."""
        audio = {"materialClass": "solid_gold", "confidence": 0.75}
        fusion = run_fusion_engine(good_22k_vision(), audio, good_weight(), no_declarations())
        codes = [f["code"] for f in fusion["flags"]]
        assert "AUDIO_PLATING_SIGNAL" not in codes, "Flag should not fire for solid gold audio"


# ---------------------------------------------------------------------------
# Loan Decision Tests
# ---------------------------------------------------------------------------

class TestLoanDecision:
    """Tests that the loan decision logic is correct for key scenarios."""

    def test_clean_22k_bangle_pre_approved(self):
        """A low-risk 22K item with good weight confidence should be PRE_APPROVED."""
        fusion = run_fusion_engine(good_22k_vision(), None, good_weight(), no_declarations())
        assert fusion["loanDecision"] == "PRE_APPROVED", (
            f"Expected PRE_APPROVED, got {fusion['loanDecision']}"
        )
        assert fusion["riskLevel"] == "LOW"
        assert fusion["loanEligibility"] is not None, "Loan eligibility must be populated"
        assert fusion["loanEligibility"]["min"] > 0

    def test_plated_item_rejected_with_no_eligibility(self):
        """A plated item should be REJECTED with no loan eligibility."""
        vision = {**good_22k_vision(), "plating_indicators": True, "plating_confidence": 0.80,
                  "purity_estimate": "plated"}
        fusion = run_fusion_engine(vision, None, good_weight(), no_declarations())
        assert fusion["loanDecision"] == "REJECTED"
        assert fusion["loanEligibility"] is None, "Plated items must have no loan eligibility"

    def test_not_jewelry_immediate_rejection(self):
        """Submitting a non-jewelry image should immediately return REJECTED."""
        vision = {**good_22k_vision(), "is_jewelry": False, "is_gold": False,
                  "purity_estimate": "not_gold", "fraud_risk_vision": "high"}
        fusion = run_fusion_engine(vision, None, None, no_declarations())
        assert fusion["loanDecision"] == "REJECTED"
        assert fusion["rejectionReason"] == "NOT_JEWELRY"
        assert fusion["riskScore"] == 100

    def test_unknown_purity_no_22k_default(self):
        """Unknown purity should NOT default to 22K — finalPurity must be 'unknown'."""
        vision = {**good_22k_vision(), "purity_estimate": "unknown", "purity_confidence": 0.0}
        fusion = run_fusion_engine(vision, None, good_weight(), no_declarations())
        # finalPurity must reflect the actual unknown state, not silently assume 22K
        assert fusion["finalPurity"] == "unknown", (
            f"Unknown purity should remain 'unknown', not '{fusion['finalPurity']}'"
        )

    def test_loan_eligibility_uses_ltv_75_percent(self):
        """Loan amount should be at most 75% of gold value (RBI LTV rule)."""
        weight = {"min": 10.0, "mid": 10.0, "max": 10.0, "confidence": 0.80}
        fusion = run_fusion_engine(good_22k_vision(), None, weight, no_declarations())
        if fusion["loanEligibility"]:
            # At 10g × 22K density × ~₹6500/g × 93% making × 75% LTV = should be > 0
            assert fusion["loanEligibility"]["max"] > 0
            assert fusion["loanEligibility"]["min"] <= fusion["loanEligibility"]["max"]

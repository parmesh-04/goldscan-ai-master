"""
Bayesian Fusion Engine — the decision-making brain of GoldScan AI.

Combines independent signals (Vision AI, Audio, User Declarations) into:
  1. A posterior probability distribution over gold purity (24K/22K/18K/14K/Plated)
  2. A risk score + set of named fraud-risk flags
  3. A final loan eligibility decision (PRE_APPROVED / NEEDS_VERIFICATION / REJECTED)

How Bayesian updating works here:
  - Start with a market-distribution prior (22K is most common in India, ~58%)
  - For each signal (hallmark, surface color, audio, declaration):
      posterior[k] ∝ prior[k] × likelihood(signal | karat=k)
  - Normalize after each update so probabilities sum to 1
  - The final posterior drives the most-likely purity and confidence
"""

# ---------------------------------------------------------------------------
# Constants and lookup tables
# ---------------------------------------------------------------------------

# Gold density by karat (g/cm³) — exact PRD values, used in loan math
PURITY_FACTOR = {
    "24K": 1.000, "22K": 0.916,
    "18K": 0.750, "14K": 0.585,
    "plated": 0.0, "not_gold": 0.0, "unknown": 0.700
}

# Fallback gold price (INR/g) used if MCX live rate is unavailable
# The frontend fetches the live rate and displays it; backend uses this for
# server-side loan range calculation only.
DEFAULT_GOLD_PRICE_PER_GRAM = 6500

# RBI-mandated Loan-to-Value ratio for gold loans
LTV_RATIO = 0.75

# Standard industry making-charge deduction (7%)
MAKING_CHARGE_DEDUCTION = 0.93

# ---------------------------------------------------------------------------
# Bayesian posterior calculation
# ---------------------------------------------------------------------------

def calculate_purity_posterior(vision_result: dict, audio_result: dict | None = None) -> list[dict]:
    """
    Performs a full multi-signal Bayesian update on gold purity.
    
    Prior = Indian gold market distribution (World Gold Council data).
    Each signal updates via: posterior[k] ∝ prior[k] × likelihood[signal][k]
    Returns a sorted list of {karat, probability} dicts.

    Signals applied in order of increasing specificity:
      1. Hallmark OCR  (strongest — near-definitive if legible)
      2. Surface color consistency (medium strength)
      3. Plating visual indicators (contextual boost)
      4. Audio tap-test resonance (secondary — discounted for env noise)
    """

    # Prior: probability distribution of gold karats in the Indian retail market
    posterior = {
        "24K": 0.04,
        "22K": 0.58,   # 22K dominates Indian jewelry market
        "18K": 0.20,
        "14K": 0.09,
        "Plated": 0.09
    }

    # ── UPDATE 1: Hallmark OCR ────────────────────────────────────────────
    # Strongest single signal: a legible BIS hallmark is near-definitive
    hallmark_likelihoods = {
        "999":    {"24K": 0.95, "22K": 0.03, "18K": 0.01,  "14K": 0.005, "Plated": 0.005},
        "916":    {"24K": 0.03, "22K": 0.92, "18K": 0.03,  "14K": 0.01,  "Plated": 0.01},
        "750":    {"24K": 0.01, "22K": 0.05, "18K": 0.88,  "14K": 0.05,  "Plated": 0.01},
        "585":    {"24K": 0.01, "22K": 0.03, "18K": 0.08,  "14K": 0.83,  "Plated": 0.05},
        "375":    {"24K": 0.01, "22K": 0.02, "18K": 0.05,  "14K": 0.10,  "Plated": 0.82},
        "none":   {"24K": 0.05, "22K": 0.25, "18K": 0.20,  "14K": 0.15,  "Plated": 0.35},
        "unclear":{"24K": 0.05, "22K": 0.40, "18K": 0.25,  "14K": 0.15,  "Plated": 0.15},
    }

    hallmark_key = vision_result.get("hallmark_text") or "unclear"
    h_likelihood = hallmark_likelihoods.get(hallmark_key, hallmark_likelihoods["unclear"])
    h_conf = vision_result.get("hallmark_confidence", 0.5)

    # Blend the hallmark signal with a uniform prior weighted by confidence:
    # If confidence is 0, the hallmark adds no information (we use a flat 0.2 per class)
    for k in posterior:
        posterior[k] *= (h_likelihood[k] * h_conf + (1 - h_conf) * 0.2)
    _normalize(posterior)

    # ── UPDATE 2: Surface color consistency ─────────────────────────────
    color_likelihoods = {
        "consistent_22k": {"24K": 0.10, "22K": 0.75, "18K": 0.10, "14K": 0.03, "Plated": 0.02},
        "consistent_18k": {"24K": 0.02, "22K": 0.15, "18K": 0.72, "14K": 0.08, "Plated": 0.03},
        "consistent_24k": {"24K": 0.80, "22K": 0.12, "18K": 0.05, "14K": 0.02, "Plated": 0.01},
        "inconsistent":   {"24K": 0.02, "22K": 0.08, "18K": 0.10, "14K": 0.10, "Plated": 0.70},
        "unknown":        {"24K": 0.05, "22K": 0.35, "18K": 0.25, "14K": 0.15, "Plated": 0.20},
    }

    color_key = vision_result.get("color_consistency") or "unknown"
    c_likelihood = color_likelihoods.get(color_key, color_likelihoods["unknown"])
    c_conf = 0.65  # Surface color is a medium-strength signal

    for k in posterior:
        posterior[k] *= (c_likelihood[k] * c_conf + (1 - c_conf) * 0.2)
    _normalize(posterior)

    # ── UPDATE 3: Plating indicator ──────────────────────────────────────
    # If vision sees wear-through spots, push probability mass toward Plated
    if vision_result.get("plating_indicators"):
        plating_conf = vision_result.get("plating_confidence", 0.5)
        # Proportionally boost Plated; other classes will be renormalized down
        posterior["Plated"] *= (1 + plating_conf * 3)
        _normalize(posterior)

    # ── UPDATE 4: Audio tap-test (acoustic resonance) ─────────────────────
    # P(audio_class | karat) likelihoods are grounded in material physics:
    #   solid gold → high density → fast decay → low qProxy
    #   plated / hollow → slower decay → high qProxy
    # The 0.7 discount on confidence accounts for environmental noise.
    if audio_result and audio_result.get("materialClass"):
        audio_likelihoods = {
            "solid_gold": {"24K": 0.25, "22K": 0.55, "18K": 0.15, "14K": 0.03, "Plated": 0.02},
            "plated":     {"24K": 0.01, "22K": 0.04, "18K": 0.05, "14K": 0.10, "Plated": 0.80},
            "uncertain":  {"24K": 0.05, "22K": 0.35, "18K": 0.25, "14K": 0.15, "Plated": 0.20},
        }
        a_likelihood = audio_likelihoods.get(
            audio_result["materialClass"], audio_likelihoods["uncertain"]
        )
        # Discount confidence by 0.7 — environmental noise degrades acoustic reliability
        a_conf = audio_result.get("confidence", 0.5) * 0.7
        for k in posterior:
            posterior[k] *= (a_likelihood[k] * a_conf + (1 - a_conf) * 0.2)
        _normalize(posterior)

    return [
        {"karat": k, "probability": round(v * 100)}
        for k, v in sorted(posterior.items(), key=lambda x: -x[1])
    ]


def _normalize(d: dict) -> None:
    """Normalizes a probability dict so values sum to 1.0 (in-place)."""
    total = sum(d.values())
    if total > 0:
        for k in d:
            d[k] /= total


# ---------------------------------------------------------------------------
# Fraud risk flags
# ---------------------------------------------------------------------------

def _check_flags(vision_result: dict, audio_result: dict | None, weight_result: dict | None,
                 user_declarations: dict) -> tuple[list, int]:
    """
    Evaluates all fraud risk rules and returns (flags_list, risk_score).
    Each flag has a code, human-readable message, and severity level.
    """
    flags = []
    risk_score = 0

    # Flag 1: Hallmark says 22K but surface color is inconsistent with 22K
    if (vision_result.get("hallmark_text") == "916"
            and vision_result.get("color_consistency") == "inconsistent"):
        flags.append({
            "code": "HALLMARK_SURFACE_MISMATCH",
            "message": "Hallmark reads 916 (22K) but surface color is inconsistent with 22K gold",
            "severity": "high",
        })
        risk_score += 35

    # Flag 2: Visual plating evidence with >60% confidence → strong fraud indicator
    if (vision_result.get("plating_indicators") is True
            and vision_result.get("plating_confidence", 0) > 0.6):
        flags.append({
            "code": "PLATING_DETECTED",
            "message": "Surface analysis indicates gold plating over base metal",
            "severity": "high",
        })
        risk_score += 40

    # Flag 3: Customer declared karat doesn't match the visible hallmark stamp
    declared_karat = user_declarations.get("declaredKarat")
    hallmark_text = vision_result.get("hallmark_text")
    if declared_karat and hallmark_text:
        declared_map = {
            "24K (999)": "999", "22K (916)": "916",
            "18K (750)": "750", "14K (585)": "585",
        }
        expected = declared_map.get(declared_karat)
        if expected and hallmark_text not in (expected, "unclear", "none"):
            flags.append({
                "code": "DECLARATION_HALLMARK_MISMATCH",
                "message": f"Customer declared {declared_karat} but hallmark reads {hallmark_text}",
                "severity": "medium",
            })
            risk_score += 25

    # Flag 4: Self-reported weight differs >30% from AI estimate → possible fraud
    self_weight = user_declarations.get("selfReportedWeight")
    if self_weight and weight_result and weight_result.get("mid"):
        try:
            declared = float(self_weight)
            estimated = weight_result["mid"]
            diff = abs(declared - estimated) / estimated
            if diff > 0.30:
                flags.append({
                    "code": "WEIGHT_MISMATCH",
                    "message": (
                        f"Declared weight ({declared}g) differs from AI estimate "
                        f"({estimated}g) by {round(diff * 100)}%"
                    ),
                    "severity": "medium",
                })
                risk_score += 20
        except (ValueError, ZeroDivisionError):
            pass  # Skip if weight values are malformed

    # Flag 5: Audio resonance matches base metal / plated material pattern
    if (audio_result
            and audio_result.get("materialClass") == "plated"
            and audio_result.get("confidence", 0) > 0.65):
        flags.append({
            "code": "AUDIO_PLATING_SIGNAL",
            "message": "Audio resonance pattern inconsistent with solid gold",
            "severity": "medium",
        })
        risk_score += 25

    # Flag 6: 24K gold is never hollow — structural impossibility
    if (vision_result.get("hollow_indicators") is True
            and user_declarations.get("declaredKarat") == "24K (999)"):
        flags.append({
            "code": "HOLLOW_HIGH_KARAT_MISMATCH",
            "message": "24K gold items are rarely hollow — structural inconsistency detected",
            "severity": "medium",
        })
        risk_score += 15

    # Flag 7: Heavy wear on recently purchased item is suspicious
    if user_declarations.get("purchaseYear"):
        try:
            import datetime
            years_old = datetime.date.today().year - int(user_declarations["purchaseYear"])
            if years_old < 2 and vision_result.get("wear_level") == "heavy":
                flags.append({
                    "code": "WEAR_AGE_MISMATCH",
                    "message": (
                        f"Item declared purchased in {user_declarations['purchaseYear']} "
                        f"but shows heavy wear inconsistent with age"
                    ),
                    "severity": "medium",
                })
                risk_score += 18
        except (ValueError, TypeError):
            pass

    # Escalate score if multiple high-severity flags fire simultaneously
    high_severity_count = sum(1 for f in flags if f["severity"] == "high")
    if high_severity_count >= 2:
        risk_score = max(risk_score, 75)

    return flags, risk_score


def _calculate_overall_confidence(vision_result: dict, audio_result: dict | None,
                                   weight_result: dict | None, flags: list) -> int:
    """
    Computes an overall assessment confidence score (0-100) using a
    weighted combination of individual signal confidences.
    Penalizes for each fraud flag found.
    """
    # Signal weights — hallmark is most diagnostic; declaration is weakest
    signal_weights = {
        "hallmark": 0.35,
        "vision": 0.25,
        "audio": 0.20,
        "weight": 0.12,
        "declaration": 0.08,
    }

    hallmark_score = vision_result.get("hallmark_confidence", 0) * signal_weights["hallmark"]
    vision_score = vision_result.get("purity_confidence", 0) * signal_weights["vision"]
    audio_score = ((audio_result.get("confidence", 0) * signal_weights["audio"])
                   if audio_result else 0)
    weight_conf = (weight_result.get("confidence", 0.5) if weight_result else 0.5)
    weight_score = weight_conf * signal_weights["weight"]
    declaration_score = 0.75 * signal_weights["declaration"]   # Fixed moderate trust

    raw_confidence = hallmark_score + vision_score + audio_score + weight_score + declaration_score

    # Penalize for each flag: -12% for high severity, -6% for medium, -3% for low
    flag_penalty = sum(
        0.12 if f["severity"] == "high" else 0.06 if f["severity"] == "medium" else 0.03
        for f in flags
    )

    clamped = max(0.30, min(0.96, raw_confidence - flag_penalty))
    return round(clamped * 100)


def _calculate_loan_eligibility(weight_result: dict | None, purity_estimate: str,
                                 gold_price_per_gram: float = DEFAULT_GOLD_PRICE_PER_GRAM) -> dict | None:
    """
    Calculates the eligible loan amount range (INR) based on:
      estimated weight × purity factor × gold price × making charge deduction × LTV ratio
    Returns None if the item is not gold-eligible (plated, not_gold).
    """
    if weight_result is None:
        return None

    factor = PURITY_FACTOR.get(purity_estimate, 0.70)
    if factor == 0.0:
        return None  # Plated or not_gold — never loan-eligible

    w_min = weight_result.get("min", 0)
    w_max = weight_result.get("max", 0)

    # Round down to nearest ₹500 — standard NBFC disbursement rounding
    loan_min = int((w_min * factor * gold_price_per_gram * MAKING_CHARGE_DEDUCTION * LTV_RATIO) // 500) * 500
    loan_max = int((w_max * factor * gold_price_per_gram * MAKING_CHARGE_DEDUCTION * LTV_RATIO) // 500) * 500

    if loan_max <= 0:
        return None

    return {"min": loan_min, "max": loan_max}


# ---------------------------------------------------------------------------
# Main fusion entry point
# ---------------------------------------------------------------------------

def run_fusion_engine(vision_result: dict, audio_result: dict | None,
                      weight_result: dict | None, user_declarations: dict,
                      gold_price_per_gram: float = DEFAULT_GOLD_PRICE_PER_GRAM) -> dict:
    """
    Main orchestrator: takes all signals and returns the unified assessment.
    
    Decision flow:
      1. Non-jewelry → immediate REJECTED (no further analysis)
      2. Evaluate all fraud flags and accumulate risk score
      3. Determine risk level (LOW / MEDIUM / HIGH)
      4. Compute Bayesian purity posterior
      5. Compute overall confidence
      6. Make loan decision (PRE_APPROVED / NEEDS_VERIFICATION / REJECTED)
      7. Calculate loan eligibility range (if not rejected)
    """

    # Early exit: non-jewelry submissions cannot be assessed
    if not vision_result.get("is_jewelry", True):
        purity_posterior = calculate_purity_posterior(vision_result, audio_result)
        return {
            "riskLevel": "HIGH",
            "riskScore": 100,
            "flags": [{"code": "NOT_JEWELRY",
                       "message": "The submitted image does not contain jewelry.",
                       "severity": "high"}],
            "overallConfidence": 0,
            "loanDecision": "REJECTED",
            "purityPosterior": purity_posterior,
            "finalPurity": "not_gold",
            "audioPerformed": False,
            "loanEligibility": None,
            "rejectionReason": "NOT_JEWELRY",
            "signalConfidence": {
                "visual": 0, "hallmark": 0, "audio": None, "declared": None
            },
        }

    # Evaluate all fraud risk flags
    flags, risk_score = _check_flags(vision_result, audio_result, weight_result, user_declarations)

    # Determine overall risk tier from score and flag severities
    has_high_flag = any(f["severity"] == "high" for f in flags)
    if risk_score >= 40 or has_high_flag:
        risk_level = "HIGH"
    elif risk_score >= 20 or flags:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Run the Bayesian purity posterior update
    purity_posterior = calculate_purity_posterior(vision_result, audio_result)

    # Compute weighted confidence across all signals
    overall_confidence = _calculate_overall_confidence(vision_result, audio_result, weight_result, flags)

    # The final purity comes from Gemini's visual estimate (most direct signal)
    # We deliberately do NOT default to '22K' if unknown — that would be dishonest
    final_purity = vision_result.get("purity_estimate") or "unknown"

    # Loan decision logic
    weight_conf = weight_result.get("confidence", 0) if weight_result else 0
    if risk_level == "LOW" and weight_conf > 0.6:
        loan_decision = "PRE_APPROVED"
    elif risk_level == "HIGH" or has_high_flag:
        loan_decision = "REJECTED"
    else:
        loan_decision = "NEEDS_VERIFICATION"

    # Populate loan eligibility or rejection reason
    loan_eligibility = None
    rejection_reason = None

    if loan_decision == "REJECTED":
        if not vision_result.get("is_jewelry", True):
            rejection_reason = "NOT_JEWELRY"
        elif final_purity in ("not_gold", "plated"):
            rejection_reason = "NOT_GOLD"
        elif vision_result.get("plating_indicators") and vision_result.get("plating_confidence", 0) > 0.6:
            rejection_reason = "PLATING_DETECTED"
        else:
            rejection_reason = "HIGH_FRAUD_RISK"
    else:
        loan_eligibility = _calculate_loan_eligibility(weight_result, final_purity, gold_price_per_gram)
        # If eligibility comes back None despite PRE_APPROVED (edge case), downgrade
        if loan_eligibility is None and loan_decision == "PRE_APPROVED":
            loan_decision = "NEEDS_VERIFICATION"

    return {
        "riskLevel": risk_level,
        "riskScore": risk_score,
        "flags": flags,
        "overallConfidence": overall_confidence,
        "loanDecision": loan_decision,
        "purityPosterior": purity_posterior,
        "finalPurity": final_purity,
        "audioPerformed": bool(audio_result),
        "loanEligibility": loan_eligibility,
        "rejectionReason": rejection_reason,
        "signalConfidence": {
            "visual": round(vision_result.get("purity_confidence", 0) * 100),
            "hallmark": round(vision_result.get("hallmark_confidence", 0) * 100),
            "audio": (round(audio_result["confidence"] * 100)
                      if audio_result and audio_result.get("confidence") is not None else None),
            "declared": 80 if user_declarations.get("selfReportedWeight") else None,
        },
    }

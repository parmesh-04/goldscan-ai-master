PURITY_FACTOR = {
    "24K": 1.000, "22K": 0.916,
    "18K": 0.750, "14K": 0.585,
    "plated": 0.0, "not_gold": 0.0, "unknown": 0.700
}

# Approximate MCX gold price per gram (INR) used for backend loan estimates.
# The frontend will override this with live MCX on the UI side.
DEFAULT_GOLD_PRICE_PER_GRAM = 6200
LTV_RATIO = 0.75
MAKING_CHARGE_DEDUCTION = 0.93


def _calculate_loan_eligibility(weight_result, purity_estimate):
    """
    Calculate INR loan eligibility from weight and purity.
    Returns {min, max} or None if item is not eligible.
    """
    if weight_result is None:
        return None
    factor = PURITY_FACTOR.get(purity_estimate, 0.70)
    if factor == 0.0:
        return None  # Plated or not_gold — not eligible
    w_min = weight_result.get("min", 0)
    w_max = weight_result.get("max", 0)
    loan_min = int((w_min * factor * DEFAULT_GOLD_PRICE_PER_GRAM * MAKING_CHARGE_DEDUCTION * LTV_RATIO) // 500) * 500
    loan_max = int((w_max * factor * DEFAULT_GOLD_PRICE_PER_GRAM * MAKING_CHARGE_DEDUCTION * LTV_RATIO) // 500) * 500
    if loan_max <= 0:
        return None
    return {"min": loan_min, "max": loan_max}


def run_fusion_engine(vision_result, audio_result, weight_result, user_declarations):
    flags = []
    risk_score = 0

    # Non-jewelry items are an immediate REJECTED decision — no further analysis needed.
    if not vision_result.get("is_jewelry", True):
        purity_posterior = calculate_purity_posterior(vision_result)
        return {
            "riskLevel": "HIGH",
            "riskScore": 100,
            "flags": [{"code": "NOT_JEWELRY", "message": "The submitted image does not contain jewelry.", "severity": "high"}],
            "overallConfidence": 0,
            "loanDecision": "REJECTED",
            "purityPosterior": purity_posterior,
            "finalPurity": "not_gold",
            "audioPerformed": False,
            "loanEligibility": None,
            "rejectionReason": "NOT_JEWELRY",
            "signalConfidence": {
                "visual": 0,
                "hallmark": 0,
                "audio": None,
                "declared": None,
            },
        }

    if vision_result.get("hallmark_text") == "916" and vision_result.get("color_consistency") == "inconsistent":
        flags.append(
            {
                "code": "HALLMARK_SURFACE_MISMATCH",
                "message": "Hallmark reads 916 (22K) but surface color is inconsistent with 22K gold",
                "severity": "high",
            }
        )
        risk_score += 35

    if vision_result.get("plating_indicators") is True and vision_result.get("plating_confidence", 0) > 0.6:
        flags.append(
            {
                "code": "PLATING_DETECTED",
                "message": "Surface analysis indicates gold plating over base metal",
                "severity": "high",
            }
        )
        risk_score += 40

    declared_karat = user_declarations.get("declaredKarat")
    hallmark_text = vision_result.get("hallmark_text")
    if declared_karat and hallmark_text:
        declared_map = {
            "24K (999)": "999",
            "22K (916)": "916",
            "18K (750)": "750",
            "14K (585)": "585",
        }
        expected = declared_map.get(declared_karat)
        if expected and hallmark_text not in (expected, "unclear", "none"):
            flags.append(
                {
                    "code": "DECLARATION_HALLMARK_MISMATCH",
                    "message": f"Customer declared {declared_karat} but hallmark reads {hallmark_text}",
                    "severity": "medium",
                }
            )
            risk_score += 25

    if user_declarations.get("selfReportedWeight") and weight_result.get("mid"):
        declared = float(user_declarations["selfReportedWeight"])
        estimated = weight_result["mid"]
        diff = abs(declared - estimated) / estimated
        if diff > 0.30:
            flags.append(
                {
                    "code": "WEIGHT_MISMATCH",
                    "message": f"Declared weight ({declared}g) differs from estimate ({estimated}g) by {round(diff * 100)}%",
                    "severity": "medium",
                }
            )
            risk_score += 20

    if audio_result and audio_result.get("materialClass") == "plated" and audio_result.get("confidence", 0) > 0.65:
        flags.append(
            {
                "code": "AUDIO_PLATING_SIGNAL",
                "message": "Audio resonance pattern inconsistent with solid gold",
                "severity": "medium",
            }
        )
        risk_score += 25

    if risk_score >= 40 or any(flag["severity"] == "high" for flag in flags):
        risk_level = "HIGH"
    elif risk_score >= 20 or flags:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    purity_posterior = calculate_purity_posterior(vision_result)
    overall_confidence = 1.0
    overall_confidence -= len(flags) * 0.08
    overall_confidence -= (1 - vision_result.get("purity_confidence", 0.7)) * 0.3
    overall_confidence = max(0, min(1, overall_confidence))

    final_purity = vision_result.get("purity_estimate", "unknown")

    if risk_level == "LOW" and weight_result and weight_result.get("confidence", 0) > 0.6:
        loan_decision = "PRE_APPROVED"
    elif risk_level == "HIGH" or any(flag["severity"] == "high" for flag in flags):
        loan_decision = "REJECTED"
    else:
        loan_decision = "NEEDS_VERIFICATION"

    # Build loanEligibility and rejectionReason
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
        loan_eligibility = _calculate_loan_eligibility(weight_result, final_purity)
        # If eligibility comes back None (e.g. plated purity) downgrade decision
        if loan_eligibility is None and loan_decision == "PRE_APPROVED":
            loan_decision = "NEEDS_VERIFICATION"

    return {
        "riskLevel": risk_level,
        "riskScore": risk_score,
        "flags": flags,
        "overallConfidence": round(overall_confidence * 100),
        "loanDecision": loan_decision,
        "purityPosterior": purity_posterior,
        "finalPurity": final_purity,
        "audioPerformed": bool(audio_result),
        "loanEligibility": loan_eligibility,
        "rejectionReason": rejection_reason,
        "signalConfidence": {
            "visual": round(vision_result.get("purity_confidence", 0) * 100),
            "hallmark": round(vision_result.get("hallmark_confidence", 0) * 100),
            "audio": round(audio_result.get("confidence") * 100) if (audio_result and audio_result.get("confidence") is not None) else None,
            "declared": 80 if user_declarations.get("selfReportedWeight") else None,
        },
    }


def calculate_purity_posterior(vision_result):
    priors = {"24K": 0.05, "22K": 0.55, "18K": 0.20, "14K": 0.10, "Plated": 0.10}
    hallmark = vision_result.get("hallmark_text")

    if hallmark == "999":
        priors = {"24K": 0.85, "22K": 0.10, "18K": 0.03, "14K": 0.01, "Plated": 0.01}
    elif hallmark == "916":
        priors = {"24K": 0.05, "22K": 0.82, "18K": 0.08, "14K": 0.03, "Plated": 0.02}
    elif hallmark == "750":
        priors = {"24K": 0.02, "22K": 0.08, "18K": 0.78, "14K": 0.08, "Plated": 0.04}
    elif hallmark == "585":
        priors = {"24K": 0.01, "22K": 0.05, "18K": 0.12, "14K": 0.75, "Plated": 0.07}

    if vision_result.get("plating_indicators"):
        priors["Plated"] = min(0.90, priors["Plated"] + vision_result.get("plating_confidence", 0.6) * 0.5)
        total = sum(priors.values())
        priors = {key: value / total for key, value in priors.items()}

    return [{"karat": key, "probability": round(value * 100)} for key, value in priors.items()]

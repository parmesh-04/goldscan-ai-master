export function runFusionEngine(visionResult, audioResult, weightResult, userDeclarations) {
  const flags = [];
  let riskScore = 0;

  if (visionResult.hallmark_text === '916' && visionResult.color_consistency === 'inconsistent') {
    flags.push({
      code: 'HALLMARK_SURFACE_MISMATCH',
      message: 'Hallmark reads 916 (22K) but surface color is inconsistent with 22K gold',
      severity: 'high'
    });
    riskScore += 35;
  }

  if (visionResult.plating_indicators === true && visionResult.plating_confidence > 0.6) {
    flags.push({
      code: 'PLATING_DETECTED',
      message: 'Surface analysis indicates gold plating over base metal',
      severity: 'high'
    });
    riskScore += 40;
  }

  if (userDeclarations.declaredKarat && visionResult.hallmark_text) {
    const declaredMap = {
      '24K (999)': '999',
      '22K (916)': '916',
      '18K (750)': '750',
      '14K (585)': '585'
    };
    const expectedHallmark = declaredMap[userDeclarations.declaredKarat];
    if (
      expectedHallmark &&
      visionResult.hallmark_text !== expectedHallmark &&
      visionResult.hallmark_text !== 'unclear' &&
      visionResult.hallmark_text !== 'none'
    ) {
      flags.push({
        code: 'DECLARATION_HALLMARK_MISMATCH',
        message: `Customer declared ${userDeclarations.declaredKarat} but hallmark reads ${visionResult.hallmark_text}`,
        severity: 'medium'
      });
      riskScore += 25;
    }
  }

  if (userDeclarations.selfReportedWeight && weightResult.mid) {
    const declared = parseFloat(userDeclarations.selfReportedWeight);
    const estimated = weightResult.mid;
    const diff = Math.abs(declared - estimated) / estimated;
    if (diff > 0.3) {
      flags.push({
        code: 'WEIGHT_MISMATCH',
        message: `Declared weight (${declared}g) differs from estimate (${estimated}g) by ${Math.round(diff * 100)}%`,
        severity: 'medium'
      });
      riskScore += 20;
    }
  }

  if (audioResult && audioResult.materialClass === 'plated' && audioResult.confidence > 0.65) {
    flags.push({
      code: 'AUDIO_PLATING_SIGNAL',
      message: 'Audio resonance pattern inconsistent with solid gold',
      severity: 'medium'
    });
    riskScore += 25;
  }

  // FRAUD CHECK 6: Hollow + high declared value
  if (visionResult.hollow_indicators === true &&
      userDeclarations.declaredKarat === "24K (999)") {
    flags.push({
      code: "HOLLOW_HIGH_KARAT_MISMATCH",
      message: "24K gold items are rarely hollow — structural inconsistency detected",
      severity: "medium"
    });
    riskScore += 15;
  }

  // FRAUD CHECK 7: Wear level vs purchase year
  if (userDeclarations.purchaseYear) {
    const yearsOld = new Date().getFullYear() - 
      parseInt(userDeclarations.purchaseYear);
    if (yearsOld < 2 && 
        visionResult.wear_level === "heavy") {
      flags.push({
        code: "WEAR_AGE_MISMATCH",
        message: `Item declared purchased in ${userDeclarations.purchaseYear} but shows heavy wear inconsistent with age`,
        severity: "medium"
      });
      riskScore += 18;
    }
  }

  // FRAUD CHECK 8: Multiple high signals = escalate
  const highSeverityFlags = flags.filter(
    f => f.severity === "high"
  );
  if (highSeverityFlags.length >= 2) {
    riskScore = Math.max(riskScore, 75);
  }

  let riskLevel;
  if (riskScore >= 40 || flags.filter((flag) => flag.severity === 'high').length >= 1) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 20 || flags.length >= 1) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  const purityPosterior = calculatePurityPosterior(visionResult, audioResult, userDeclarations);

  const overallConfidence = calculateOverallConfidence(visionResult, audioResult, weightResult, flags);

  let loanDecision;
  if (riskLevel === 'LOW' && weightResult.confidence > 0.6) {
    loanDecision = 'PRE_APPROVED';
  } else if (riskLevel === 'HIGH' || flags.filter((flag) => flag.severity === 'high').length >= 1) {
    loanDecision = 'REJECTED';
  } else {
    loanDecision = 'NEEDS_VERIFICATION';
  }

  return {
    riskLevel,
    riskScore,
    flags,
    overallConfidence: overallConfidence,
    loanDecision,
    purityPosterior,
    finalPurity: visionResult.purity_estimate || '22K',
    signalConfidence: {
      visual: Math.round((visionResult.purity_confidence || 0.78) * 100),
      hallmark: Math.round((visionResult.hallmark_confidence || 0.65) * 100),
      audio: audioResult ? Math.round(audioResult.confidence * 100) : 61,
      declared: userDeclarations.selfReportedWeight ? 80 : 55
    }
  };
}

function calculateOverallConfidence(visionResult, audioResult, weightResult, flags) {
  const signalWeights = {
    hallmark: 0.35,
    vision: 0.25,
    audio: 0.20,
    weight: 0.12,
    declaration: 0.08
  };

  const hallmarkScore = 
    (visionResult.hallmark_confidence || 0) * 
    signalWeights.hallmark;
  const visionScore = 
    (visionResult.purity_confidence || 0) * 
    signalWeights.vision;
  const audioScore = audioResult ? 
    (audioResult.confidence || 0) * 
    signalWeights.audio : 0;
  const weightScore = 
    ((weightResult.confidence || 50) / 100) * 
    signalWeights.weight;
  const declarationScore = 0.75 * 
    signalWeights.declaration;

  let rawConfidence = hallmarkScore + visionScore + 
    audioScore + weightScore + declarationScore;

  // Penalize for fraud flags
  const flagPenalty = flags.reduce((total, flag) => {
    return total + (flag.severity === "high" ? 0.12 : 
                    flag.severity === "medium" ? 0.06 : 
                    0.03);
  }, 0);

  rawConfidence = Math.max(0.40, 
    Math.min(0.96, rawConfidence - flagPenalty));

  return Math.round(rawConfidence * 100);
}

export function calculatePurityPosterior(visionResult, audioResult, declarations) {
  // Prior: India gold market distribution
  // Source: World Gold Council India data
  let posterior = {
    "24K": 0.04,
    "22K": 0.58,
    "18K": 0.20,
    "14K": 0.09,
    "Plated": 0.09
  };

  // LIKELIHOOD UPDATE 1: Hallmark OCR
  // This is our strongest signal
  const hallmarkLikelihoods = {
    "999": { "24K":0.95,"22K":0.03,"18K":0.01, "14K":0.005,"Plated":0.005 },
    "916": { "24K":0.03,"22K":0.92,"18K":0.03, "14K":0.01, "Plated":0.01 },
    "750": { "24K":0.01,"22K":0.05,"18K":0.88, "14K":0.05, "Plated":0.01 },
    "585": { "24K":0.01,"22K":0.03,"18K":0.08, "14K":0.83, "Plated":0.05 },
    "375": { "24K":0.01,"22K":0.02,"18K":0.05, "14K":0.10, "Plated":0.82 },
    "none": { "24K":0.05,"22K":0.25,"18K":0.20, "14K":0.15, "Plated":0.35 },
    "unclear": { "24K":0.05,"22K":0.40,"18K":0.25, "14K":0.15,"Plated":0.15 }
  };

  const hallmarkKey = visionResult.hallmark_text || "unclear";
  const hLikelihood = hallmarkLikelihoods[hallmarkKey] || hallmarkLikelihoods["unclear"];

  // Weight the hallmark update by its confidence
  const hConf = visionResult.hallmark_confidence || 0.5;
  Object.keys(posterior).forEach(k => {
    posterior[k] *= (hLikelihood[k] * hConf + (1 - hConf) * 0.2);
  });
  normalizePosterior(posterior);

  // LIKELIHOOD UPDATE 2: Surface color
  if (visionResult.color_consistency) {
    const colorLikelihoods = {
      "consistent_22k": { "24K":0.10,"22K":0.75, "18K":0.10,"14K":0.03,"Plated":0.02 },
      "consistent_18k": { "24K":0.02,"22K":0.15, "18K":0.72,"14K":0.08,"Plated":0.03 },
      "inconsistent":   { "24K":0.02,"22K":0.08, "18K":0.10,"14K":0.10,"Plated":0.70 },
      "unclear":        { "24K":0.05,"22K":0.35, "18K":0.25,"14K":0.15,"Plated":0.20 }
    };
    const cLikelihood = colorLikelihoods[visionResult.color_consistency] || colorLikelihoods["unclear"];
    const cConf = 0.65; // vision surface weight
    Object.keys(posterior).forEach(k => {
      posterior[k] *= (cLikelihood[k] * cConf + (1 - cConf) * 0.2);
    });
    normalizePosterior(posterior);
  }

  // LIKELIHOOD UPDATE 3: Plating detection
  if (visionResult.plating_indicators) {
    const pConf = visionResult.plating_confidence || 0.5;
    posterior["Plated"] *= (1 + pConf * 3);
    normalizePosterior(posterior);
  }

  // LIKELIHOOD UPDATE 4: Audio signal
  if (audioResult && audioResult.materialClass) {
    const audioLikelihoods = {
      "solid_gold": { "24K":0.25,"22K":0.55, "18K":0.15,"14K":0.03,"Plated":0.02 },
      "plated":     { "24K":0.01,"22K":0.04, "18K":0.05,"14K":0.10,"Plated":0.80 },
      "uncertain":  { "24K":0.05,"22K":0.35, "18K":0.25,"14K":0.15,"Plated":0.20 }
    };
    const aLikelihood = audioLikelihoods[audioResult.materialClass] || audioLikelihoods["uncertain"];
    const aConf = audioResult.confidence * 0.7;
    Object.keys(posterior).forEach(k => {
      posterior[k] *= (aLikelihood[k] * aConf + (1 - aConf) * 0.2);
    });
    normalizePosterior(posterior);
  }

  // LIKELIHOOD UPDATE 5: Customer declaration
  if (declarations && declarations.declaredKarat && declarations.declaredKarat !== "Not sure") {
    const declaredMap = {
      "24K (999)":"24K","22K (916)":"22K",
      "18K (750)":"18K","14K (585)":"14K"
    };
    const dk = declaredMap[declarations.declaredKarat];
    if (dk) {
      // Low trust weight for self-declaration
      posterior[dk] *= 1.3;
      normalizePosterior(posterior);
    }
  }

  // Final normalization and format
  normalizePosterior(posterior);

  return Object.entries(posterior)
    .map(([karat, prob]) => ({
      karat,
      probability: Math.round(prob * 100)
    }))
    .sort((a, b) => b.probability - a.probability);
}

function normalizePosterior(posterior) {
  const total = Object.values(posterior).reduce((a, b) => a + b, 0);
  if (total > 0) {
    Object.keys(posterior).forEach(k => {
      posterior[k] = posterior[k] / total;
    });
  }
}

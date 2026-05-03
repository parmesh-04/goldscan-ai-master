export async function fetchGoldPriceINR() {
  try {
    const response = await fetch('https://data-asg.goldprice.org/dbXRates/INR', { mode: 'cors' });
    if (!response.ok) throw new Error('Gold price response failed');
    const data = await response.json();
    const pricePerGram = data.items?.[0]?.xauPrice / 31.1035;
    if (!Number.isFinite(pricePerGram)) throw new Error('Gold price payload missing xauPrice');
    return {
      pricePerGram: Math.round(pricePerGram),
      source: 'goldprice.org',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };
  } catch (error) {
    return {
      pricePerGram: 6200,
      source: 'fallback',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };
  }
}

export function calculateLoanEligibility(weightParam, purityEstimate, pricePerGram, ltvRatio = 0.75) {
  const purityFactor = {
    "24K": 1.000, "22K": 0.916,
    "18K": 0.750, "14K": 0.585,
    "plated": 0.0, "not_gold": 0.0, "unknown": 0.700
  };

  // Making charge deduction (industry standard)
  // Lenders deduct 5-8% for making charges
  const makingChargeDeduction = 0.93;

  const factor = purityFactor[purityEstimate] || 0.70;

  // Handle both old signature (number) and new signature (object)
  const isObject = typeof weightParam === 'object' && weightParam !== null;
  const conservativeWeight = isObject ? (weightParam.min || weightParam.mid * 0.85) : (weightParam * 0.85);
  const optimisticWeight = isObject ? (weightParam.max || weightParam.mid * 1.15) : (weightParam * 1.15);
  const estimatedWeight = isObject ? (weightParam.mid || weightParam.min) : weightParam;

  const grossMin = conservativeWeight * factor * pricePerGram * makingChargeDeduction;
  const grossMax = optimisticWeight * factor * pricePerGram * makingChargeDeduction;

  const loanMin = Math.floor((grossMin * ltvRatio) / 500) * 500;
  const loanMax = Math.floor((grossMax * ltvRatio) / 500) * 500;

  return {
    weightRange: isObject ? weightParam : { min: conservativeWeight, mid: estimatedWeight, max: optimisticWeight },
    estimatedWeight: estimatedWeight, // Backward compatibility for UI
    grossGoldValue: Math.round((grossMin + grossMax) / 2), // Backward compatibility for UI
    purityFactor: factor,
    grossGoldValueMin: Math.round(grossMin),
    grossGoldValueMax: Math.round(grossMax),
    makingChargeDeduction: "7% deducted",
    ltvRatio,
    loanMin,
    loanMax,
    loanDisplay: `₹${(loanMin/1000).toFixed(0)}K – ₹${(loanMax/1000).toFixed(0)}K`,
    pricePerGram,
    calculationNote: "Conservative estimate using minimum weight band. Making charges deducted as per industry standard."
  };
}

export function formatINR(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

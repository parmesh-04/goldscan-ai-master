/*
  ResultPage: The "Moment of Truth" for the customer.
  Displays the AI's findings in a premium, high-trust interface.
  Includes:
  - Loan Decision (Pre-Approved / Needs Review / Rejected).
  - Purity & Weight breakdown.
  - "Share with NBFC" button to push the digital certificate to the lender.
*/

import { ArrowLeft, Brain, Send, Sparkles, ShieldAlert } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ConfidenceBar from '../components/ConfidenceBar.jsx';
import FraudFlags from '../components/FraudFlags.jsx';
import PurityChart from '../components/PurityChart.jsx';
import ResultCard from '../components/ResultCard.jsx';
import WeightChart from '../components/WeightChart.jsx';
import { calculateLoanEligibility, fetchGoldPriceINR, formatINR } from '../utils/goldPrice.js';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-6 text-center">
          <ShieldAlert className="h-16 w-16 text-danger mb-4" />
          <h1 className="text-2xl font-bold text-textPrimary mb-2">Something went wrong</h1>
          <p className="text-textSecondary mb-6">{this.state.error?.message || "An unexpected error occurred while rendering the results."}</p>
          <a href="/scan" className="btn-primary inline-flex">Start New Scan</a>
        </div>
      );
    }
    return this.props.children;
  }
}

const PURITY_LABELS = {
  "not_gold":   "Not Gold",
  "plated":     "Gold Plated",
  "unknown":    "Undetermined",
  "14K":        "14K Gold",
  "18K":        "18K Gold",
  "22K":        "22K Gold",
  "24K":        "24K Gold",
};

const getPurityLabel = (raw) => PURITY_LABELS[raw] ?? (raw || "Undetermined");

export default function ResultPage() {
  return (
    <ErrorBoundary>
      <ResultPageContent />
    </ErrorBoundary>
  );
}

function ResultPageContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [goldPrice, setGoldPrice] = useState({ pricePerGram: 6200, source: 'fallback', timestamp: 'now' });
  const [shared, setShared] = useState(false);
  const result = useMemo(() => location.state?.result || loadLatestResult() || demoResult(), [location.state?.result]);

  useEffect(() => {
    let active = true;
    fetchGoldPriceINR().then((price) => {
      if (active) setGoldPrice(price);
    });
    return () => {
      active = false;
    };
  }, []);

  // Loan eligibility: use backend-computed loanEligibility if available (new API),
  // otherwise fall back to frontend calculation for demo/legacy results.
  const backendLoanEligibility = result.fusion?.loanEligibility;
  const loan = calculateLoanEligibility(result.weight?.mid || 0, result.fusion?.finalPurity || 'unknown', goldPrice.pricePerGram);
  const loanMin = backendLoanEligibility?.min ?? loan.loanMin;
  const loanMax = backendLoanEligibility?.max ?? loan.loanMax;

  const reasoning = buildReasoning(result);
  const risk = result.fusion?.riskLevel || 'LOW';
  const loanDecision = result.fusion?.loanDecision;
  const showLoan = loanDecision === 'PRE_APPROVED' || loanDecision === 'NEEDS_VERIFICATION';
  const rejectionReasonMap = {
    NOT_JEWELRY: 'Item is not jewelry.',
    NOT_GOLD: 'Item does not appear to be gold.',
    PLATING_DETECTED: 'Gold plating detected over base metal.',
    HIGH_FRAUD_RISK: 'High fraud risk indicators detected.',
    VERIFICATION_REQUIRED: 'Manual verification required.',
  };
  const rejectionText = rejectionReasonMap[result.fusion?.rejectionReason] || 'Asset rejected — please bring to branch.';
  const purityFactorLabel = result.fusion?.finalPurity ? `${getPurityLabel(result.fusion.finalPurity)} (${Math.round((loan.purityFactor || 0) * 1000) / 10}%)` : 'Unknown';

  function shareWithNbfc() {
    const stored = safeReadArray('goldscan_results');
    const normalized = {
      ...result,
      submittedAt: 'Just now',
      sharedAt: new Date().toISOString()
    };
    const withoutDuplicate = stored.filter((item) => (item.appId || item.id) !== (result.appId || result.id));
    localStorage.setItem('goldscan_results', JSON.stringify([normalized, ...withoutDuplicate].slice(0, 15)));
    setShared(true);
  }

  return (
    <div className="min-h-screen bg-ink/95 px-4 py-8 text-textPrimary sm:px-6 lg:px-8">
      <main className="mx-auto max-w-7xl">
        <Link to="/scan" className="inline-flex items-center gap-2 text-sm font-semibold text-textSecondary transition-all duration-200 hover:text-gold">
          <ArrowLeft className="h-4 w-4" />
          New Scan
        </Link>
        <div className="mt-5 flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">Scan Analysis Complete</h1>
          <p className="max-w-3xl text-textSecondary">Your asset evaluation is ready. Results are estimates for pre-qualification only.</p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <ResultCard result={result} getPurityLabel={getPurityLabel} />

            <section className="card">
              <h2 className="mb-4 text-xl font-bold">Signal Confidence Breakdown</h2>
              <div className="grid gap-4">
                <ConfidenceBar label="Visual Signal" value={result.fusion?.signalConfidence?.visual} performed={result.fusion?.signalConfidence?.visual != null} />
                <ConfidenceBar label="Hallmark Scan" value={result.fusion?.signalConfidence?.hallmark} performed={result.fusion?.signalConfidence?.hallmark != null} />
                <ConfidenceBar 
                  label="Audio Signal" 
                  value={result.fusion?.signalConfidence?.audio} 
                  performed={!!(result.audioPerformed) && result.fusion?.signalConfidence?.audio != null}
                />
                <ConfidenceBar 
                  label="Declared Data" 
                  value={result.fusion?.signalConfidence?.declared} 
                  performed={result.fusion?.signalConfidence?.declared != null}
                />
              </div>
            </section>

            <section className="card border-l-gold">
              <div className="mb-3 flex items-center gap-2">
                <Brain className="h-5 w-5 text-gold" />
                <h2 className="text-xl font-bold">AI Reasoning</h2>
              </div>
              <p className="leading-7 text-textSecondary">{reasoning}</p>
            </section>

            <FraudFlags flags={risk === 'LOW' ? [] : (result.fusion?.flags || [])} />
          </div>

          <aside className="space-y-6">
            <section className="card">
              <h2 className="text-xl font-bold">Estimated Loan Eligibility</h2>
              {loanDecision === 'REJECTED' ? (
                <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-4">
                  <p className="text-sm font-bold text-danger mb-1">✗ Not eligible for gold loan</p>
                  <p className="text-xs text-textSecondary">{rejectionText}</p>
                  <button type="button" onClick={() => navigate('/scan')} className="btn-primary mt-4 w-full py-2 text-sm">
                    Start New Scan
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-5 space-y-3 text-sm">
                    <Line label="Estimated Weight" value={result.weight ? `${loan.estimatedWeight}g` : 'N/A'} />
                    <Line label="Purity Factor" value={purityFactorLabel} />
                    <Line label="Gross Gold Value" value={result.weight ? formatINR(loan.grossGoldValue) : 'N/A'} />
                    <Line label="LTV Ratio (RBI 75%)" value="x 0.75" />
                  </div>
                  <div className="my-5 border-t border-line" />
                  <p className="text-sm text-textSecondary">Loan Eligibility</p>
                  <p className="mt-2 font-mono text-4xl font-bold text-gold">
                    {showLoan && result.weight ? `${formatINR(loanMin)} – ${formatINR(loanMax)}` : 'N/A'}
                  </p>
                  {loanDecision === 'NEEDS_VERIFICATION' && (
                    <p className="mt-2 text-xs text-warning font-semibold">
                      ⚠ Estimate subject to branch verification
                    </p>
                  )}
                  {result.weight?.warning && (
                    <div className="mt-4 rounded border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                      <span className="font-bold">Weight Warning: </span>
                      {result.weight.warning}
                    </div>
                  )}
                  <p className="mt-4 text-xs text-textSecondary">
                    Live MCX rate {formatINR(goldPrice.pricePerGram)}/g · Updated {goldPrice.timestamp}
                  </p>
                </>
              )}
            </section>

            {result.weight && <WeightChart min={result.weight.min} mid={result.weight.mid} max={result.weight.max} />}

            <section className="card">
              <div className="grid gap-3">
                <button type="button" onClick={shareWithNbfc} className="btn-primary flex items-center justify-center gap-2">
                  <Send className="h-4 w-4" />
                  Share with NBFC
                </button>
                <button type="button" onClick={() => navigate('/scan')} className="btn-secondary">
                  Start New Scan
                </button>
              </div>
              {shared && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-teal/40 bg-teal/10 px-3 py-2 text-sm font-semibold text-tealLight">
                  <Sparkles className="h-4 w-4" />
                  Shared. It now appears in the NBFC dashboard.
                </div>
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-textSecondary">{label}</span>
      <span className="font-mono text-textPrimary">{value}</span>
    </div>
  );
}

function loadLatestResult() {
  try {
    return JSON.parse(localStorage.getItem('goldscan_latest_result'));
  } catch (error) {
    return null;
  }
}

function safeReadArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

function buildReasoning(result) {
  if (result.fusion?.riskLevel !== 'LOW' && result.fusion?.flags?.length) {
    return `${result.reasoning || ''} ${result.fusion.flags.map((flag) => flag.message).join(' ')} ${result.weight ? `Weight estimated ${result.weight.min}-${result.weight.max}g.` : 'Weight unavailable.'} Overall risk: ${result.fusion.riskLevel}.`;
  }
  
  return result.reasoning || 'No analysis reasoning provided.';
}

function demoResult() {
  return {
    id: 'demo-result',
    appId: '#GS-0848',
    applicant: 'Demo Customer, Remote',
    submittedAt: 'Just now',
    images: [],
    declarations: {
      jewelryType: 'Bangle',
      selfReportedWeight: '10.2',
      declaredKarat: '22K (916)'
    },
    vision: {
      jewelry_type: 'bangle',
      hallmark_text: '916',
      hallmark_confidence: 0.94,
      surface_condition: 'good',
      plating_indicators: false,
      plating_confidence: 0.1,
      color_consistency: 'consistent_22k',
      hollow_indicators: false,
      wear_level: 'light',
      coin_detected: true,
      purity_estimate: '22K',
      purity_confidence: 0.87,
      surface_analysis_notes: 'Surface consistent with 22K gold',
      fraud_risk_vision: 'low',
      reasoning: 'Hallmark and surface analysis suggest 22K gold. No plating indicators detected.'
    },
    audio: {
      fundamentalFreq: 820,
      qProxy: 0.12,
      materialClass: 'solid_gold',
      confidence: 0.61,
      decayDescription: 'Fast (dense metal)',
      waveformData: []
    },
    weight: {
      min: 9,
      mid: 10.2,
      max: 12,
      confidence: 0.82,
      method: 'declaration-anchored'
    },
    fusion: {
      riskLevel: 'LOW',
      riskScore: 0,
      flags: [],
      overallConfidence: 87,
      loanDecision: 'PRE_APPROVED',
      finalPurity: '22K',
      purityPosterior: [
        { karat: '24K', probability: 5 },
        { karat: '22K', probability: 82 },
        { karat: '18K', probability: 8 },
        { karat: '14K', probability: 3 },
        { karat: 'Plated', probability: 2 }
      ],
      signalConfidence: {
        visual: 87,
        hallmark: 94,
        audio: 61,
        declared: 80
      }
    }
  };
}

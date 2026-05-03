import { Gem } from 'lucide-react';
import ConfidenceBar from './ConfidenceBar.jsx';
import RiskBadge from './RiskBadge.jsx';

const F = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function ResultCard({ result, getPurityLabel }) {
  const decisionStyles = {
    PRE_APPROVED:        { bg: '#0D2B1F', border: '#22C891', color: '#22C891' },
    NEEDS_VERIFICATION:  { bg: '#2A1F00', border: '#E8A020', color: '#E8A020' },
    REJECTED:            { bg: '#2B0D0D', border: '#E24B4A', color: '#E24B4A' },
  };
  const decisionText = {
    PRE_APPROVED: '✓  PRE-APPROVED — Eligible for gold loan',
    NEEDS_VERIFICATION: '⚠  NEEDS BRANCH VERIFICATION',
    REJECTED: '✗  REJECTED — High fraud risk detected',
  };
  const ds = decisionStyles[result.fusion?.loanDecision] || decisionStyles.NEEDS_VERIFICATION;
  const jewelryLabel = capitalize(result.jewelryType || 'Gold Jewelry');
  const purityLabel = getPurityLabel ? getPurityLabel(result.fusion?.finalPurity) : (result.fusion?.finalPurity || 'Unknown');
  const weightStr = result.weight ? `${result.weight.min}–${result.weight.max}g` : 'N/A';

  return (
    <section style={{
      background: '#161616',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      borderRadius: 16,
      padding: '28px',
      fontFamily: F,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(229,184,66,0.1)', border: '1px solid rgba(229,184,66,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gem size={18} color="#E5B842" />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', margin: 0 }}>{jewelryLabel}</h2>
            <p style={{ fontSize: 12, color: '#A3A3A3', margin: 0, marginTop: 2 }}>AI assessment summary</p>
          </div>
        </div>
        <RiskBadge risk={result.fusion?.riskLevel} />
      </div>

      {/* Metric grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        <MetricBox
          title="WEIGHT"
          value={weightStr}
          sub="Estimated range"
        />
        <MetricBox
          title="PURITY"
          value={purityLabel}
          sub={result.hallmark === '916' ? '916 Fineness' : (result.hallmark === 'none' || !result.hallmark ? 'No Hallmark' : `${result.hallmark} Hallmark`)}
        />
        <MetricBox
          title="CONFIDENCE"
          value={`${result.fusion?.overallConfidence || 0}%`}
          sub="Overall confidence"
          hasBar
          barValue={result.fusion?.overallConfidence || 0}
        />
      </div>

      {/* Decision banner */}
      <div style={{
        background: ds.bg,
        border: `1px solid ${ds.border}`,
        borderRadius: 10,
        padding: '14px 20px',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 600,
        color: ds.color,
        letterSpacing: '0.02em',
      }}>
        {decisionText[result.fusion.loanDecision]}
      </div>
    </section>
  );
}

function MetricBox({ title, value, sub, hasBar, barValue }) {
  return (
    <div style={{
      background: '#1F1F1F',
      border: '1px solid rgba(255,255,255,0.04)',
      borderRadius: 8,
      padding: '16px',
      fontFamily: '"Inter", sans-serif',
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#888888', margin: 0 }}>{title}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF', margin: '10px 0 4px', lineHeight: 1.2 }}>{value}</p>
      <p style={{ fontSize: 12, fontWeight: 400, color: '#A3A3A3', margin: 0 }}>{sub}</p>
      {hasBar && <ConfidenceBar value={barValue} className="mt-3" />}
    </div>
  );
}

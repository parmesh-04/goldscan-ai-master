import { AlertTriangle, ShieldAlert, AlertCircle, Info } from 'lucide-react';

const SEVERITY_CONFIG = {
  high:   { label: 'HIGH',   color: '#E24B4A', bg: 'rgba(226,75,74,0.12)',   border: 'rgba(226,75,74,0.4)',  Icon: ShieldAlert },
  medium: { label: 'MEDIUM', color: '#E8A020', bg: 'rgba(232,160,32,0.10)',  border: 'rgba(232,160,32,0.3)', Icon: AlertTriangle },
  low:    { label: 'LOW',    color: '#6B7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', Icon: Info },
};

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

export default function FraudFlags({ flags = [] }) {
  if (!flags.length) return null;

  // Sort by severity so HIGH flags are always at the top
  const sorted = [...flags].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2)
  );

  const highCount   = flags.filter(f => f.severity === 'high').length;
  const mediumCount = flags.filter(f => f.severity === 'medium').length;

  return (
    <section className="card" style={{ borderColor: 'rgba(226,75,74,0.4)', background: 'rgba(226,75,74,0.05)' }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-danger" />
          <h2 className="text-xl font-bold">Fraud Indicators Detected</h2>
        </div>
        {/* Summary pill counts */}
        <div style={{ display: 'flex', gap: 6 }}>
          {highCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(226,75,74,0.2)', color: '#E24B4A', borderRadius: 99, padding: '3px 10px', border: '1px solid rgba(226,75,74,0.3)' }}>
              {highCount} HIGH
            </span>
          )}
          {mediumCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(232,160,32,0.15)', color: '#E8A020', borderRadius: 99, padding: '3px 10px', border: '1px solid rgba(232,160,32,0.3)' }}>
              {mediumCount} MEDIUM
            </span>
          )}
        </div>
      </div>

      <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map((flag) => {
          const cfg = SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.low;
          const { Icon } = cfg;
          return (
            <li
              key={flag.code}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 14px', borderRadius: 10,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderLeft: `3px solid ${cfg.color}`,
              }}
            >
              <Icon style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }} size={15} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                    color: cfg.color, background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    borderRadius: 4, padding: '1px 6px',
                  }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: 10, color: '#4B5563', fontFamily: 'monospace' }}>
                    {flag.code}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#E0E0E0', margin: 0, lineHeight: 1.5 }}>
                  {flag.message}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <p style={{ marginTop: 14, fontSize: 12, color: '#6B7280', textAlign: 'right' }}>
        {flags.length} indicator{flags.length !== 1 ? 's' : ''} raised · Branch verification required
      </p>
    </section>
  );
}

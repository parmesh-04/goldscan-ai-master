export default function ConfidenceBar({ value = 0, label, className = '', performed = true }) {
  if (!performed || value === null || value === undefined) {
    return (
      <div className={className}>
        {label && (
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-textSecondary">{label}</span>
            <span className="font-mono font-semibold" style={{ color: '#6B7280' }}>Not recorded</span>
          </div>
        )}
        <div className="h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        </div>
      </div>
    );
  }

  const barColor =
    value >= 80 ? '#D4A017' :
    value >= 60 ? '#E8A020' :
    '#E24B4A';

  const textColor =
    value >= 80 ? '#D4A017' :
    value >= 60 ? '#E8A020' :
    '#E24B4A';

  return (
    <div className={className}>
      {label && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-textSecondary">{label}</span>
          <span className="font-mono font-semibold" style={{ color: textColor }}>{value}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: barColor,
            transition: 'width 700ms cubic-bezier(0.16,1,0.3,1)',
            boxShadow: `0 0 8px ${barColor}55`,
          }}
        />
      </div>
    </div>
  );
}

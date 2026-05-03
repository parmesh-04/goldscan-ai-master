const styles = {
  LOW: 'bg-teal/15 text-tealLight border-teal/40',
  MEDIUM: 'bg-warning/15 text-warning border-warning/40',
  HIGH: 'bg-danger/15 text-danger border-danger/40'
};

export default function RiskBadge({ risk = 'LOW', compact = false }) {
  const label = risk === 'MEDIUM' ? 'MED' : risk;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${styles[risk] || styles.LOW}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {compact ? label : `${risk} RISK`}
    </span>
  );
}

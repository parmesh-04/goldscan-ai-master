import { AlertTriangle } from 'lucide-react';

export default function FraudFlags({ flags = [] }) {
  if (!flags.length) return null;

  return (
    <section className="card border-danger/50 bg-danger/10">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-danger" />
        <h2 className="text-xl font-bold">Fraud Indicators Detected</h2>
      </div>
      <ul className="space-y-3">
        {flags.map((flag) => (
          <li key={flag.code} className="flex gap-3 text-sm text-textPrimary">
            <span className="mt-2 h-2 w-2 flex-none rounded-full bg-danger" />
            <span>{flag.message}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
        {flags.length} contradiction {flags.length === 1 ? 'flag' : 'flags'} raised
      </p>
    </section>
  );
}

export default function WeightChart({ min = 9, mid = 10.2, max = 12 }) {
  return (
    <div className="rounded-xl border border-line bg-ink p-4">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-sm text-textSecondary">Estimated weight band</p>
          <p className="font-mono text-2xl font-bold text-gold">{min}-{max}g</p>
        </div>
        <p className="font-mono text-sm text-textSecondary">mid {mid}g</p>
      </div>
      <div className="relative h-3 rounded-full bg-line">
        <div className="absolute inset-y-0 left-[12%] right-[12%] rounded-full bg-gold" />
        <div className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-ink bg-goldLight" style={{ left: '48%' }} />
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs text-textSecondary">
        <span>{min}g</span>
        <span>{max}g</span>
      </div>
    </div>
  );
}

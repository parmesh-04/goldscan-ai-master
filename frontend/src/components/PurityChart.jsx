import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function PurityChart({ data = [] }) {
  const chartData = data.length
    ? data
    : [
        { karat: '24K', probability: 5 },
        { karat: '22K', probability: 82 },
        { karat: '18K', probability: 8 },
        { karat: '14K', probability: 3 },
        { karat: 'Plated', probability: 2 }
      ];

  return (
    <section className="card">
      <h2 className="mb-4 text-xl font-bold">Purity Posterior Distribution</h2>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#2A2D3A" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="karat" tick={{ fill: '#9A9DB0', fontSize: 12 }} axisLine={{ stroke: '#2A2D3A' }} tickLine={false} />
            <YAxis tick={{ fill: '#9A9DB0', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip
              cursor={{ fill: 'rgba(212,160,23,0.08)' }}
              contentStyle={{ background: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: 12, color: '#F0F0F0' }}
              formatter={(value) => [`${value}%`, 'Probability']}
            />
            <Bar dataKey="probability" fill="#D4A017" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

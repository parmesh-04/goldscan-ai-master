/*
  NBFC Dashboard: The "Lender Side" of GoldScan AI.
  This is where loan officers see incoming remote applications.
  Key Features:
  - Real-time queue of scanned items.
  - Signal Decomposition: See WHY the AI made a decision (Visual vs Audio vs Hallmark).
  - Risk Flagging: Immediate visual alerts for potential fraud.
  - LOS Integration: One-click "Approve & Send" to Loan Origination Systems.
*/

import { BarChart3, CheckCircle2, Download, Gem, Pencil, Search, Settings, ShieldAlert, SlidersHorizontal, Trash2, TrendingUp, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfidenceBar from '../components/ConfidenceBar.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import { calculateLoanEligibility, fetchGoldPriceINR, formatINR } from '../utils/goldPrice.js';

// Error Boundary for the whole dashboard or specific panels
class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-ink text-textPrimary">
          <div className="text-center p-8 glass border-danger/30">
            <ShieldAlert className="mx-auto h-12 w-12 text-danger mb-4" />
            <h1 className="text-xl font-bold mb-2">Dashboard Error</h1>
            <p className="text-textSecondary mb-4 text-sm">A rendering error occurred in the applications queue.</p>
            <button onClick={() => window.location.reload()} className="btn-primary">Reload Dashboard</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const staticRows = [
  {
    appId: '#GS-0847',
    applicant: 'Priya Sharma, Mumbai MH',
    jewelry: 'Ring',
    weight: '9-12g',
    weightMid: 10.2,
    purity: '22K',
    risk: 'LOW',
    decision: 'PRE-APPROVED',
    submitted: 'Today 10:42 AM',
    images: ['/images/ring.jpg'],
    reasoning: "The item exhibits high surface consistency and standard hallmark markings for 22K gold. Density analysis from the visual capture suggests a solid core. Minimal wear patterns are consistent with the declared age.",
    audioPerformed: true,
    fusion: {
      overallConfidence: 94,
      riskLevel: 'LOW',
      loanDecision: 'PRE_APPROVED',
      finalPurity: '22K',
      signalConfidence: { visual: 92, audio: 88, hallmark: 95 },
      flags: []
    }
  },
  {
    appId: '#GS-0846',
    applicant: 'Ramesh Patel, Ahmedabad GJ',
    jewelry: 'Bangle',
    weight: '18-24g',
    weightMid: 21,
    purity: '18K',
    risk: 'MEDIUM',
    decision: 'NEEDS REVIEW',
    submitted: '10:38 AM',
    images: ['/images/bangles.jpg'],
    reasoning: "Visual inspection shows slight discoloration near the clasp, potentially indicating plating or lower grade alloy. Audio ping test returned a slightly dampened frequency response compared to pure 18K standards.",
    audioPerformed: true,
    fusion: {
      overallConfidence: 76,
      riskLevel: 'MEDIUM',
      loanDecision: 'NEEDS_VERIFICATION',
      finalPurity: '18K',
      signalConfidence: { visual: 78, audio: 65, hallmark: 82 },
      flags: [{ type: 'WARNING', message: 'Inconsistent acoustic resonance detected' }]
    }
  },
  {
    appId: '#GS-0845',
    applicant: 'Sunita Devi, Delhi DL',
    jewelry: 'Chain',
    weight: '12-16g',
    weightMid: 14,
    purity: '22K',
    risk: 'LOW',
    decision: 'PRE-APPROVED',
    submitted: '10:31 AM',
    images: ['/images/chain.jpg'],
    reasoning: "Excellent link integrity and hallmark clarity. The spectral analysis of the gold color matches 22K Indian standard. No structural anomalies detected.",
    audioPerformed: false,
    fusion: {
      overallConfidence: 91,
      riskLevel: 'LOW',
      loanDecision: 'PRE_APPROVED',
      finalPurity: '22K',
      signalConfidence: { visual: 94, audio: null, hallmark: 89 },
      flags: []
    }
  },
  {
    appId: '#GS-0844',
    applicant: 'Arjun Mehta, Bangalore KA',
    jewelry: 'Earrings',
    weight: '4-6g',
    weightMid: 5,
    purity: '18K',
    risk: 'HIGH',
    decision: 'REJECTED',
    submitted: '10:22 AM',
    images: ['/images/earrings.jpg'],
    reasoning: "Severe discrepancies in weight-to-volume ratio. Surface reflections indicate a high copper content alloy under a thin gold layer. Hallmarks appear non-standard or forged.",
    audioPerformed: true,
    fusion: {
      overallConfidence: 62,
      riskLevel: 'HIGH',
      loanDecision: 'REJECTED',
      finalPurity: 'plated',
      signalConfidence: { visual: 45, audio: 68, hallmark: 32 },
      flags: [{ type: 'DANGER', message: 'Potential counterfeit hallmark detected' }, { type: 'DANGER', message: 'Abnormal density profile' }]
    }
  },
  {
    appId: '#GS-0843',
    applicant: 'Kavita Nair, Chennai TN',
    jewelry: 'Necklace',
    weight: '24-30g',
    weightMid: 27,
    purity: '22K',
    risk: 'LOW',
    decision: 'PRE-APPROVED',
    submitted: '10:15 AM',
    images: ['/images/necklace.jpg'],
    reasoning: "Massive solid gold piece with authentic BIS hallmarking. Visual verification confirms consistent purity across all decorative elements. Highly eligible for high-value loan.",
    audioPerformed: false,
    fusion: {
      overallConfidence: 96,
      riskLevel: 'LOW',
      loanDecision: 'PRE_APPROVED',
      finalPurity: '22K',
      signalConfidence: { visual: 98, audio: null, hallmark: 95 },
      flags: []
    },
    declarations: {
      jewelryType: 'necklace',
      purchaseYear: '2015',
      notes: 'Family heirloom passed down from grandmother. Very sentimental.'
    }
  }
];

const decisionStyles = {
  'PRE-APPROVED': 'bg-tealLight/20 text-tealLight border border-tealLight/30',
  'NEEDS REVIEW': 'bg-warning/20 text-warning border border-warning/30',
  REJECTED: 'bg-danger/20 text-danger border border-danger/30'
};

const STAT_CONFIG = [
  { label: 'Total Applications', key: 'total', note: '+12 from yesterday', border: 'rgba(255,255,255,0.08)', numColor: '#FFFFFF' },
  { label: 'Pre-Approved',       key: 'PRE-APPROVED', note: 'Approval rate', border: 'rgba(16,185,129,0.15)', numColor: '#FFFFFF' },
  { label: 'Needs Verification', key: 'NEEDS REVIEW', note: 'Flagged rate', border: 'rgba(245,158,11,0.15)', numColor: '#FFFFFF' },
  { label: 'Rejected',           key: 'REJECTED',  note: 'Rejection rate', border: 'rgba(239,68,68,0.15)', numColor: '#FFFFFF' },
];

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

const APPLICANT_AVATARS = {
  'Priya':    { initials: 'PS', bg: '#1A3A2A', color: '#22C891' },
  'Ramesh':   { initials: 'RP', bg: '#3A2A1A', color: '#E8A020' },
  'Sunita':   { initials: 'SD', bg: '#1A3A2A', color: '#22C891' },
  'Arjun':    { initials: 'AM', bg: '#3A1A1A', color: '#E24B4A' },
  'Kavita':   { initials: 'KN', bg: '#1A3A2A', color: '#22C891' },
  'Mohammed': { initials: 'MR', bg: '#3A2A1A', color: '#E8A020' },
};

export default function DashboardPage() {
  return (
    <DashboardErrorBoundary>
      <DashboardPageContent />
    </DashboardErrorBoundary>
  );
}

function DashboardPageContent() {
  const [goldPrice, setGoldPrice] = useState({ pricePerGram: 6200, source: 'fallback', timestamp: '10:44 AM' });
  const [expanded, setExpanded] = useState('#GS-0847');
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [tick, setTick] = useState(0);

  const handleUpdateDecision = (appId, decision) => {
    try {
      const data = JSON.parse(localStorage.getItem('goldscan_results')) || [];
      const idx = data.findIndex(d => (d.appId || d.id) === appId);
      if (idx !== -1) {
        if (!data[idx].fusion) data[idx].fusion = {};
        const reverseMap = {
          'PRE-APPROVED': 'PRE_APPROVED',
          'NEEDS REVIEW': 'NEEDS_VERIFICATION',
          'REJECTED': 'REJECTED'
        };
        data[idx].fusion.loanDecision = reverseMap[decision] || decision;
        localStorage.setItem('goldscan_results', JSON.stringify(data));
      } else {
        const rowIdx = staticRows.findIndex(r => r.appId === appId);
        if (rowIdx !== -1) {
          staticRows[rowIdx].decision = decision;
        }
      }
      setTick(t => t + 1);
    } catch (e) {
      console.error("Failed to update decision", e);
    }
  };

  const handleDelete = (appId) => {
    try {
      // Try to remove from localStorage (submitted apps)
      const data = JSON.parse(localStorage.getItem('goldscan_results')) || [];
      const filtered = data.filter(d => (d.appId || d.id) !== appId);
      localStorage.setItem('goldscan_results', JSON.stringify(filtered));
      // Try to remove from staticRows (demo apps)
      const rowIdx = staticRows.findIndex(r => r.appId === appId);
      if (rowIdx !== -1) staticRows.splice(rowIdx, 1);
      if (expanded === appId) setExpanded('');
      setTick(t => t + 1);
    } catch (e) {
      console.error("Failed to delete entry", e);
    }
  };

  const handleRenameApplicant = (appId, newName) => {
    try {
      const data = JSON.parse(localStorage.getItem('goldscan_results')) || [];
      const idx = data.findIndex(d => (d.appId || d.id) === appId);
      if (idx !== -1) {
        data[idx].applicant = newName;
        localStorage.setItem('goldscan_results', JSON.stringify(data));
      } else {
        const rowIdx = staticRows.findIndex(r => r.appId === appId);
        if (rowIdx !== -1) staticRows[rowIdx].applicant = newName;
      }
      setTick(t => t + 1);
    } catch (e) {
      console.error("Failed to rename applicant", e);
    }
  };

  useEffect(() => {
    let active = true;
    fetchGoldPriceINR().then((price) => {
      if (active) setGoldPrice(price);
    });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => {
    const _ = tick;
    const submitted = (() => {
      try {
        const data = JSON.parse(localStorage.getItem('goldscan_results'));
        return Array.isArray(data) ? data : [];
      } catch (e) { return []; }
    })();
    const merged = [...submitted, ...staticRows];
    return merged.filter((row) => {
      const j = row.jewelry || row.jewelryType || row.declarations?.jewelryType || 'Bangle';
      const r = row.risk || row.fusion?.riskLevel || 'LOW';
      const term = `${row.appId || ''} ${row.applicant || ''} ${j}`.toLowerCase();
      if (query && !term.includes(query.toLowerCase())) return false;
      if (riskFilter !== 'All' && r !== riskFilter) return false;
      return true;
    });
  }, [query, riskFilter, tick]);

  return (
    <div className="min-h-screen text-textPrimary lg:grid lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <main className="min-w-0">
        <header className="navbar-glass px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="animate-fadeUp">
              <h1 className="section-title" style={{ fontSize: '1.8rem' }}>Applications Queue</h1>
              <p className="mt-1 text-sm text-textSecondary">AI pre-qualification dashboard for remote gold lending.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 animate-fadeUp" style={{ animationDelay: '100ms' }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/5 px-3 py-1.5 text-xs font-medium text-textPrimary">
                <span className="h-1.5 w-1.5 rounded-full bg-tealLight" />
                MCX Live: {formatINR(goldPrice.pricePerGram)}/g
              </span>
              <button className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
                <Download className="h-4 w-4" /> Export
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-black shadow-gold bg-gradient-to-br from-goldLight to-gold">VJ</div>
            </div>
          </div>
        </header>

        <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 bg-[radial-gradient(circle,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]">
          <StatsRow rows={rows} />

          <section className="glass p-6 animate-fadeUp" style={{ animationDelay: '300ms' }}>
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Recent Applications</h2>
                <span className="tag-pill">{rows.length} total</span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-white/5 px-3 py-2 transition-all focus-within:border-gold">
                  <Search className="h-4 w-4 text-textSecondary" />
                  <input className="min-w-0 bg-transparent text-sm outline-none placeholder:text-textSecondary" placeholder="Search apps..." value={query} onChange={(e) => setQuery(e.target.value)} />
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-line bg-white/5 px-3 py-2">
                  <SlidersHorizontal className="h-4 w-4 text-textSecondary" />
                  <select className="bg-transparent text-sm outline-none" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                    {['All', 'LOW', 'MEDIUM', 'HIGH'].map(r => <option key={r} className="bg-ink">{r}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-textSecondary font-semibold">
                  <tr>
                    <th className="px-4 py-2">APP ID</th>
                    <th className="px-4 py-2">APPLICANT</th>
                    <th className="px-4 py-2">JEWELRY</th>
                    <th className="px-4 py-2">WEIGHT</th>
                    <th className="px-4 py-2">PURITY</th>
                    <th className="px-4 py-2">RISK</th>
                    <th className="px-4 py-2">DECISION</th>
                    <th className="px-4 py-2">SUBMITTED</th>
                    <th className="px-4 py-2 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <ApplicationRows 
                      key={row.appId || row.id} 
                      row={row} 
                      expanded={expanded === (row.appId || row.id)} 
                      onToggle={() => setExpanded(expanded === (row.appId || row.id) ? '' : (row.appId || row.id))} 
                      goldPrice={goldPrice} 
                      onUpdateDecision={handleUpdateDecision}
                      onDelete={handleDelete}
                      onRenameApplicant={handleRenameApplicant}
                    />
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && <div className="rounded-xl border border-line p-12 text-center text-textSecondary bg-white/3">No applications found.</div>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Sidebar() {
  const items = [
    ['Applications', CheckCircle2, true],
    ['Analytics', BarChart3, false],
    ['Gold Rates', TrendingUp, false],
    ['Settings', Settings, false]
  ];
  return (
    <aside className="flex min-h-full flex-col px-4 py-6 border-r border-line bg-white/2">
      <Link to="/" className="mb-10 flex items-center gap-2 no-underline">
        <span className="text-gold">◆</span>
        <span className="text-lg font-bold tracking-tight">GoldScan AI</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {items.map(([label, Icon, active]) => (
          <button key={label} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-gold/10 text-gold border-l-2 border-gold' : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'}`}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>
      <div className="mt-auto rounded-xl border border-line p-4 flex items-center gap-3 bg-white/3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold font-bold text-black text-xs">VJ</div>
        <div className="min-w-0">
          <p className="font-semibold text-xs truncate">Vikram Joshi</p>
          <p className="text-[10px] text-textSecondary truncate">Loan Officer</p>
        </div>
      </div>
    </aside>
  );
}

function StatsRow({ rows }) {
  const stats = useMemo(() => {
    const total = rows.length;
    const decisionMap = { PRE_APPROVED: 'PRE-APPROVED', NEEDS_VERIFICATION: 'NEEDS REVIEW', REJECTED: 'REJECTED' };
    const getDec = (r) => r.decision || decisionMap[r.fusion?.loanDecision] || 'PRE-APPROVED';
    
    const approved = rows.filter(r => getDec(r) === 'PRE-APPROVED').length;
    const review = rows.filter(r => getDec(r) === 'NEEDS REVIEW').length;
    const rejected = rows.filter(r => getDec(r) === 'REJECTED').length;
    
    return {
      total,
      'PRE-APPROVED': approved,
      'NEEDS REVIEW': review,
      'REJECTED': rejected,
      approvedPct: total ? Math.round((approved / total) * 100) : 0,
      reviewPct: total ? Math.round((review / total) * 100) : 0,
      rejectedPct: total ? Math.round((rejected / total) * 100) : 0,
    };
  }, [rows]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {STAT_CONFIG.map((s) => (
        <div key={s.label} className="glass p-5 border-white/10" style={{ borderLeft: `1px solid ${s.border}` }}>
          <p className="text-[10px] font-bold text-textSecondary tracking-widest uppercase">{s.label}</p>
          <p className="mt-3 text-3xl font-mono font-bold">{stats[s.key]}</p>
          <p className="mt-2 text-[10px] text-textSecondary opacity-60">
            {s.key === 'total' ? s.note : 
             s.key === 'PRE-APPROVED' ? `${stats.approvedPct}% approval rate` :
             s.key === 'NEEDS REVIEW' ? `${stats.reviewPct}% flagged` : `${stats.rejectedPct}% rejected`}
          </p>
        </div>
      ))}
    </div>
  );
}

function ApplicationRows({ row, expanded, onToggle, goldPrice, onUpdateDecision, onDelete, onRenameApplicant }) {
  const risk = row.risk || row.fusion?.riskLevel || 'LOW';
  const riskColors = { LOW: '#22C88A', MEDIUM: '#E8A020', HIGH: '#E24B4A' };
  const borderColor = riskColors[risk] || '#444';
  
  const jewelry = (row.jewelry || row.jewelryType || row.declarations?.jewelryType || 'Bangle');
  const purityRaw = row.purity || row.fusion?.finalPurity || '22K';
  const weightStr = row.weight && typeof row.weight === 'string' ? row.weight : `${row.weight?.min || 9}–${row.weight?.max || 12}g`;
  const appId = row.appId || row.id?.slice(0, 8) || '#GS-0848';
  const applicant = row.applicant || 'New Customer, Remote';
  const submittedDate = row.submitted || row.submittedAt || 'Just now';
  
  const decisionMap = { PRE_APPROVED: 'PRE-APPROVED', NEEDS_VERIFICATION: 'NEEDS REVIEW', REJECTED: 'REJECTED' };
  const decision = row.decision || decisionMap[row.fusion?.loanDecision] || 'PRE-APPROVED';

  return (
    <React.Fragment>
      <tr onClick={onToggle} className="group cursor-pointer hover:bg-white/[0.04] transition-colors">
        <td className="px-4 py-3.5 border-y border-line border-l-2 font-mono font-bold text-textSecondary text-xs rounded-l-lg" style={{ borderLeftColor: borderColor }}>{appId}</td>
        <td className="px-4 py-3.5 border-y border-line font-medium">
          <div className="flex items-center gap-3">
            <Avatar name={applicant} />
            <span className="truncate max-w-[150px]">{applicant}</span>
          </div>
        </td>
        <td className="px-4 py-3.5 border-y border-line capitalize">{jewelry}</td>
        <td className="px-4 py-3.5 border-y border-line font-mono text-xs">{weightStr}</td>
        <td className="px-4 py-3.5 border-y border-line font-mono text-xs">{getPurityLabel(purityRaw)}</td>
        <td className="px-4 py-3.5 border-y border-line">
          <RiskBadge risk={risk} compact />
        </td>
        <td className="px-4 py-3.5 border-y border-line">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold border ${decisionStyles[decision] || 'bg-white/10 border-white/20'}`}>{decision}</span>
        </td>
        <td className="px-4 py-3.5 border-y border-line text-[10px] text-textSecondary">{submittedDate}</td>
        <td className="px-4 py-3.5 border-y border-line border-r border-line rounded-r-lg text-right">
          <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button title="Approve" onClick={(e) => { e.stopPropagation(); onUpdateDecision(appId, 'PRE-APPROVED'); }} className="p-1.5 rounded-md border border-teal/30 bg-teal/5 text-tealLight hover:bg-teal/20"><CheckCircle2 size={14}/></button>
            <button title="Flag" onClick={(e) => { e.stopPropagation(); onUpdateDecision(appId, 'REJECTED'); }} className="p-1.5 rounded-md border border-danger/30 bg-danger/5 text-danger hover:bg-danger/20"><ShieldAlert size={14}/></button>
            <button title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(appId); }} className="p-1.5 rounded-md border border-white/10 bg-white/5 text-textSecondary hover:bg-danger/20 hover:text-danger hover:border-danger/30"><Trash2 size={14}/></button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="9" className="p-0 border-none">
            <div className="p-4 bg-white/[0.02] border-x border-b border-line rounded-b-xl mx-2 mb-4 animate-fadeUp">
              <ExpandedPanel row={row} goldPrice={goldPrice} onUpdateDecision={onUpdateDecision} onRenameApplicant={onRenameApplicant} />
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

function Avatar({ name }) {
  const firstName = name.split(',')[0].trim().split(' ')[0];
  const av = APPLICANT_AVATARS[firstName] || { initials: firstName.slice(0, 2).toUpperCase(), bg: '#1A2A3A', color: '#6B7280' };
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: av.bg, color: av.color }}>
      {av.initials}
    </div>
  );
}

function ExpandedPanel({ row, goldPrice, onUpdateDecision, onRenameApplicant }) {
  const weightMid = row.weightMid || row.weight?.mid || 10.2;
  const purityRaw = row.purity || row.fusion?.finalPurity || row.vision?.purity_estimate || 'unknown';
  const risk = row.risk || row.fusion?.riskLevel || 'LOW';
  const loan = calculateLoanEligibility(weightMid, purityRaw, goldPrice.pricePerGram);
  
  // Read signal confidence directly — NEVER use numeric fallbacks on audio
  const signals = row.fusion?.signalConfidence || {};
  const visualScore = signals.visual ?? null;
  const audioScore = signals.audio ?? null;  // null = not performed, never fake a number
  const hallmarkScore = signals.hallmark ?? null;
  // audioPerformed: trust the backend flag; for static demo rows default to false
  const audioPerformed = row.audioPerformed ?? false;

  const [editingName, setEditingName] = React.useState(false);
  const [nameInput, setNameInput] = React.useState(row.applicant || 'New Customer, Remote');

  const handleNameSave = () => {
    const trimmed = nameInput.trim();
    if (trimmed) onRenameApplicant(row.appId || row.id, trimmed);
    setEditingName(false);
  };
  
  const reasoning = row.reasoning || 'No analysis reasoning provided.';
  const jewelry = (row.jewelry || row.jewelryType || row.declarations?.jewelryType || 'Bangle');
  const appId = row.appId || row.id || '#GS-0848';
  
  const flags = row.fusion?.flags?.map(f => f.message) || [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4">
        <div className="aspect-square rounded-xl border border-line overflow-hidden bg-black/40 flex items-center justify-center relative group">
          {row.images?.[0] ? (
            <img src={row.images[0]} alt="Jewelry" className="w-full h-full object-cover" />
          ) : (
            <div className="text-4xl opacity-50 select-none">💎</div>
          )}
          <div className="absolute top-3 left-3">
            <RiskBadge risk={risk} />
          </div>
        </div>
        <div className="glass p-4 space-y-3">
          {/* Editable applicant name */}
          <div className="flex items-center justify-between gap-2">
            {editingName ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false); }}
                  className="flex-1 bg-white/10 border border-gold/40 rounded px-2 py-1 text-xs text-textPrimary outline-none"
                />
                <button onClick={handleNameSave} className="p-1 rounded text-tealLight hover:bg-teal/10"><CheckCircle2 size={13}/></button>
                <button onClick={() => setEditingName(false)} className="p-1 rounded text-textSecondary hover:bg-white/10"><X size={13}/></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-semibold truncate">{nameInput}</span>
                <button onClick={() => setEditingName(true)} className="p-1 rounded text-textSecondary hover:text-gold hover:bg-gold/10 shrink-0"><Pencil size={11}/></button>
              </div>
            )}
          </div>
          <DetailLine label="Jewelry Type" value={jewelry} />
          <DetailLine label="Hallmark" value={getPurityLabel(purityRaw)} />
          {(row.declarations?.purchaseYear || row.declarations?.notes) && (
            <div className="pt-2 mt-2 border-t border-line/30">
              {row.declarations.purchaseYear && <DetailLine label="Purchased" value={row.declarations.purchaseYear} />}
              {row.declarations.notes && (
                <div className="mt-2">
                  <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">Customer Note</p>
                  <p className="text-[11px] text-textSecondary leading-relaxed bg-white/5 p-2 rounded italic">"{row.declarations.notes}"</p>
                </div>
              )}
            </div>
          )}
          <div className="pt-2 border-t border-line">
            <div className="flex justify-between mb-1.5 text-[10px] font-bold text-textSecondary uppercase">AI Confidence</div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gold transition-all duration-1000" style={{ width: `${row.fusion?.overallConfidence || 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="glass p-5 border-l-2 border-l-gold relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-[8px] font-bold text-gold/40 uppercase tracking-widest">Gemini Engine</div>
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
            <Gem size={14} className="text-gold" /> AI Reasoning
          </h3>
          <p className="text-xs leading-relaxed text-textSecondary italic">"{reasoning}"</p>
          {flags.length > 0 && (
            <div className="mt-4 space-y-2">
              {flags.map((f, i) => (
                <div key={i} className="flex gap-2 text-[10px] text-danger font-medium bg-danger/5 p-2 rounded-lg border border-danger/10">
                  <ShieldAlert size={12} className="shrink-0" /> {f}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="glass p-5 space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-textSecondary">Signal Decomposition</h3>
          <ConfidenceBar label="Visual" value={visualScore} performed={visualScore !== null} />
          <ConfidenceBar label="Audio" value={audioScore} performed={audioPerformed && audioScore !== null} />
          <ConfidenceBar label="Hallmark" value={hallmarkScore} performed={hallmarkScore !== null} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="glass p-5 flex-1 flex flex-col">
          <h3 className="text-sm font-bold mb-4">Loan Eligibility</h3>
          <div className="space-y-3 mb-6">
            <DetailLine label="Estimated Weight" value={`${loan.estimatedWeight}g`} />
            <DetailLine label="Purity Factor" value={`${getPurityLabel(purityRaw)} (${Math.round(loan.purityFactor * 100)}%)`} />
            <DetailLine label="LTV Ratio" value="75%" />
          </div>
          <div className="mt-auto pt-4 border-t border-line">
            <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">Approved Range</p>
            <p className="text-2xl font-mono font-bold text-gold">{formatINR(loan.loanMin)} – {formatINR(loan.loanMax)}</p>
          </div>
        </div>
        <div className="grid gap-2">
          <button onClick={() => onUpdateDecision(appId, 'PRE-APPROVED')} className="btn-primary w-full py-3 text-xs">Approve & Send to LOS</button>
          <button onClick={() => onUpdateDecision(appId, 'NEEDS REVIEW')} className="btn-secondary w-full py-3 text-xs border-warning/30 text-warning">Flag for Verification</button>
        </div>
      </div>
    </div>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-textSecondary">{label}</span>
      <span className="font-mono font-bold capitalize">{value}</span>
    </div>
  );
}

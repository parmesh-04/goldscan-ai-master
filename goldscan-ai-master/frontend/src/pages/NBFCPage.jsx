import { Link } from 'react-router-dom';

const GOLD = '#D4A853';
const PAGE_PT = 60;

const PAIN = [
  'Customer must travel to your nearest branch',
  'A trained appraiser is required on-site',
  'XRF machine or touchstone test dependency',
  '3–5 days average processing time',
  '₹800–₹1,200 per customer acquisition cost',
  'No digital audit trail for compliance',
  'Cannot scale beyond branch geography',
];
const GAINS = [
  'Customer submits from anywhere in India',
  'AI handles visual and acoustic pre-screening',
  'No specialized hardware required',
  'Under 3 minutes from photo to decision',
  'Fraction of traditional acquisition cost',
  'Full XAI audit report per application',
  'Scale to any district without branch investment',
];

const STATS = [
  { value:'100×', label:'Faster Processing', ctx:'From days to under 3 minutes', border:GOLD },
  { value:'75%', label:'LTV Compliant', ctx:'RBI gold loan guideline, built-in', border:'#22C891' },
  { value:'4', label:'Fraud Signal Checks', ctx:'Vision, audio, hallmark, declaration', border:'#7B6CF6' },
  { value:'0', label:'Hardware Required', ctx:'Works on any ₹8,000 Android phone', border:'rgba(255,255,255,0.3)' },
];

const STEPS = [
  { icon:'📱', title:'Customer Submits', desc:'They photograph the jewelry at home — 5 angles, optional tap test. Takes under 3 minutes. No branch visit.' },
  { icon:'🤖', title:'AI Pre-Qualifies', desc:'Four parallel models analyze the images and audio. We produce a weight band, purity estimate, risk level, and loan ceiling.' },
  { icon:'✅', title:'Your Team Decides', desc:'Pre-qualified applications arrive in your dashboard with full AI reasoning attached. One click sends the approval to your LOS.' },
];

const FEATURES = [
  { icon:'🛡️', title:'Fraud Detection', desc:'Six-signal contradiction engine. Flags fake hallmarks, plating indicators, and declaration mismatches before your team reviews.' },
  { icon:'📊', title:'Explainable Decisions', desc:'Every output includes plain-English AI reasoning. Audit-ready for RBI and internal compliance teams.' },
  { icon:'📈', title:'Live Gold Rates', desc:'MCX and IBJA integration. Loan eligibility recalculates in real-time against your configured LTV ratio.' },
  { icon:'🔗', title:'LOS Integration', desc:'REST API export to your existing Loan Origination System. No manual re-keying of applicant data.' },
  { icon:'📱', title:'No App Required', desc:'Customers access via a browser link you send. No download friction. Works on any smartphone.' },
  { icon:'🔒', title:'RBI Guideline Alignment', desc:'Built around the 75% LTV rule for gold loans. Every calculation is traceable back to the methodology.' },
];

export default function NBFCPage() {
  return (
    <div style={{ minHeight:'100vh', color:'rgba(255,255,255,0.88)', fontFamily:'"Inter",-apple-system,sans-serif', position:'relative' }}>
      <div style={{ position:'relative', zIndex:1, maxWidth:1100, margin:'0 auto', padding:`${PAGE_PT + 60}px 24px 80px` }}>

        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom:96 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(212,168,83,0.08)', border:'1px solid rgba(212,168,83,0.2)', borderRadius:99, padding:'6px 14px', fontSize:12, color:GOLD, fontWeight:600, marginBottom:28, letterSpacing:'0.05em', textTransform:'uppercase' }}>
            Built for Lenders
          </div>
          <h1 style={{ fontSize:'clamp(2rem,5vw,3rem)', fontWeight:700, letterSpacing:'-0.02em', lineHeight:1.15, margin:0, marginBottom:20, color:'#FFFFFF' }}>
            Pre-qualify gold loans from any district<br />
            in India. <span style={{ color:GOLD }}>No branch visit needed.</span>
          </h1>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.55)', maxWidth:560, margin:'0 auto 36px', lineHeight:1.65 }}>
            GoldScan AI slots into your existing loan origination workflow.
            Cut acquisition cost, remove the branch dependency,
            and reach customers your competitors cannot.
          </p>
          <Link to="/dashboard" style={{ display:'inline-flex', alignItems:'center', gap:8, background:GOLD, color:'#000', padding:'12px 28px', borderRadius:100, fontWeight:600, fontSize:14, textDecoration:'none', transition:'all 200ms ease' }}
            onMouseEnter={e=>{e.currentTarget.style.background='#C49840';e.currentTarget.style.transform='translateY(-1px)';}}
            onMouseLeave={e=>{e.currentTarget.style.background=GOLD;e.currentTarget.style.transform='translateY(0)';}}>
            View Live Dashboard →
          </Link>
        </div>

        {/* Old Way vs GoldScan */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:96 }}>
          <div style={{ background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.12)', borderLeft:`3px solid rgba(239,68,68,0.4)`, borderRadius:16, padding:'32px' }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:'rgba(239,68,68,0.8)', margin:'0 0 24px', letterSpacing:'-0.02em' }}>The Old Way</h2>
            {PAIN.map(p => (
              <div key={p} style={{ display:'flex', gap:12, padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,0.03)', fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.5 }}>
                <span style={{ color:'rgba(239,68,68,0.5)', fontWeight:700, flexShrink:0, marginTop:1 }}>✗</span>{p}
              </div>
            ))}
          </div>
          <div style={{ background:'rgba(16,185,129,0.04)', border:'1px solid rgba(16,185,129,0.12)', borderLeft:`3px solid rgba(16,185,129,0.5)`, borderRadius:16, padding:'32px' }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:'#10B981', margin:'0 0 24px', letterSpacing:'-0.02em' }}>With GoldScan AI</h2>
            {GAINS.map(g => (
              <div key={g} style={{ display:'flex', gap:12, padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,0.03)', fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.5 }}>
                <span style={{ color:'#10B981', fontWeight:700, flexShrink:0, marginTop:1 }}>✓</span>{g}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:96 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderLeft:`3px solid ${s.border}`, borderRadius:14, padding:'28px 20px' }}>
              <p style={{ fontSize:'3.5rem', fontWeight:700, color:'#FFFFFF', margin:'0 0 8px', lineHeight:1, letterSpacing:'-0.03em', fontVariantNumeric:'tabular-nums' }}>{s.value}</p>
              <p style={{ fontSize:13, fontWeight:600, color:'#FFFFFF', margin:'0 0 4px' }}>{s.label}</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:0, lineHeight:1.5 }}>{s.ctx}</p>
            </div>
          ))}
        </div>

        {/* Workflow */}
        <div style={{ marginBottom:96 }}>
          <h2 style={{ fontSize:22, fontWeight:700, color:'#FFFFFF', textAlign:'center', letterSpacing:'-0.02em', marginBottom:48 }}>Fits Into Your Existing LOS Workflow</h2>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'center', gap:16, flexWrap:'wrap' }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
                <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'32px 24px', maxWidth:260, textAlign:'center' }}>
                  <div style={{ fontSize:36, marginBottom:16 }}>{s.icon}</div>
                  <h3 style={{ fontSize:15, fontWeight:700, color:'#FFFFFF', margin:'0 0 10px', letterSpacing:'-0.02em' }}>{s.title}</h3>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.65, margin:0 }}>{s.desc}</p>
                </div>
                {i < STEPS.length-1 && <span style={{ color:GOLD, fontSize:20, fontWeight:700, paddingTop:60, flexShrink:0 }}>→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div style={{ marginBottom:96 }}>
          <h2 style={{ fontSize:22, fontWeight:700, color:'#FFFFFF', textAlign:'center', letterSpacing:'-0.02em', marginBottom:40 }}>What You Get</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'28px' }}>
                <div style={{ fontSize:24, marginBottom:14 }}>{f.icon}</div>
                <h3 style={{ fontSize:14, fontWeight:700, color:'#FFFFFF', margin:'0 0 8px', letterSpacing:'-0.01em' }}>{f.title}</h3>
                <p style={{ fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.65, margin:0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA footer */}
        <div style={{ background:'rgba(255,255,255,0.02)', border:`1px solid rgba(212,168,83,0.2)`, borderRadius:20, padding:'56px', textAlign:'center' }}>
          <h2 style={{ fontSize:26, fontWeight:700, color:'#FFFFFF', margin:'0 0 12px', letterSpacing:'-0.02em' }}>See a live demo →</h2>
          <p style={{ fontSize:15, color:'rgba(255,255,255,0.5)', margin:'0 0 36px', lineHeight:1.65 }}>
            The dashboard has 6 pre-loaded applications with full AI reasoning, signal decomposition, and loan eligibility calculations.
          </p>
          <div style={{ display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap' }}>
            <Link to="/dashboard" style={{ background:GOLD, color:'#000', padding:'12px 28px', borderRadius:100, fontWeight:600, fontSize:14, textDecoration:'none', transition:'all 200ms ease' }}
              onMouseEnter={e=>{e.currentTarget.style.background='#C49840';}}
              onMouseLeave={e=>{e.currentTarget.style.background=GOLD;}}>
              Open Dashboard
            </Link>
            <Link to="/scan" style={{ border:'1px solid rgba(255,255,255,0.15)', color:'#FFFFFF', padding:'12px 28px', borderRadius:100, fontWeight:600, fontSize:14, textDecoration:'none', transition:'all 200ms ease' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
              Try Customer Scan
            </Link>
          </div>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:32 }}>Built for TenzorX 2026 · Team ByteRave · Poonawalla Fincorp National AI Hackathon</p>
        </div>
      </div>
    </div>
  );
}

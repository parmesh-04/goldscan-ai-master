import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const GOLD = '#D4A853';
const PAGE_PT = 60; // navbar height

function StarField() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < 80; i++) {
      const d = document.createElement('div');
      d.style.cssText = `position:absolute;width:1px;height:1px;background:#fff;border-radius:50%;
        left:${Math.random()*100}%;top:${Math.random()*100}%;
        opacity:${0.1+Math.random()*0.2};pointer-events:none;`;
      el.appendChild(d);
    }
  }, []);
  return <div ref={ref} style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }} aria-hidden />;
}

// Simple Icons CDN — reliable, covers all major tools
const SI = (name) => `https://cdn.simpleicons.org/${name}/888888`;

function SectionLabel({ text, color = GOLD }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
      <div style={{ width:64, height:1.5, background:color, flexShrink:0 }} />
      <span style={{ fontSize:11, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', color, whiteSpace:'nowrap' }}>{text}</span>
    </div>
  );
}

function TechCard({ logo, name, tooltip, delay=0, accentColor=GOLD }) {
  const isImg = typeof logo === 'string';
  return (
    <div
      title={tooltip}
      style={{
        width:100, height:100,
        background:'rgba(255,255,255,0.025)',
        border:'1px solid rgba(255,255,255,0.07)',
        borderRadius:16,
        display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', gap:8, cursor:'default',
        transition:'all 200ms cubic-bezier(0.16,1,0.3,1)',
        opacity:0,
        animation:`cardIn 0.5s ease-out ${delay}s forwards`,
        flexShrink:0, position:'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform='translateY(-4px)';
        e.currentTarget.style.borderColor=`${accentColor}50`;
        const img = e.currentTarget.querySelector('img');
        if (img) img.style.filter='brightness(1.4)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform='translateY(0)';
        e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';
        const img = e.currentTarget.querySelector('img');
        if (img) img.style.filter='brightness(1)';
      }}
    >
      {isImg
        ? <img
            src={logo}
            alt={name}
            style={{ height:36, width:'auto', maxWidth:56, objectFit:'contain', filter:'brightness(1)', transition:'filter 200ms ease' }}
            onError={e => {
              e.target.style.display='none';
              const fb = document.createElement('span');
              fb.style.cssText = 'font-family:monospace;font-size:10px;color:#888;text-align:center;padding:2px 4px;';
              fb.textContent = name;
              e.target.parentNode.insertBefore(fb, e.target);
            }}
          />
        : <div style={{ height:40, display:'flex', alignItems:'center', justifyContent:'center' }}>{logo}</div>
      }
      <span style={{ fontSize:10, fontWeight:500, color:'rgba(255,255,255,0.5)', textAlign:'center', lineHeight:1.3, paddingInline:8 }}>{name}</span>
    </div>
  );
}

const SECTIONS = [
  {
    label:'AI & Vision Models', color:GOLD,
    cards:[
      { logo:SI('googlegemini'),  name:'Gemini Vision', tooltip:'Multimodal vision analysis of jewelry photos' },
      { logo:SI('tensorflow'),    name:'EfficientNet',  tooltip:'Image classification for jewelry type detection' },
      { logo:<div style={{background:'#1a1a2e',width:40,height:40,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:12}}>v8</div>, name:'YOLOv8n', tooltip:'Object detection — hallmark localization' },
      { logo:SI('microsoft'),     name:'TrOCR',         tooltip:'Transformer OCR — reads hallmark stamps' },
      { logo:<div style={{background:'#0f1a30',width:40,height:40,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#4a90d9',fontWeight:700,fontSize:11}}>MiDaS</div>, name:'MiDaS Depth', tooltip:'Monocular depth estimation for volume calculation' },
    ]
  },
  {
    label:'Frontend', color:'#22C891',
    cards:[
      { logo:SI('react'),         name:'React 18',      tooltip:'UI framework — component-based scan flow' },
      { logo:SI('vite'),          name:'Vite',          tooltip:'Build tool — fast HMR and bundling' },
      { logo:SI('tailwindcss'),   name:'Tailwind CSS',  tooltip:'Utility-first CSS for layout' },
      { logo:SI('framer'),        name:'Framer Motion', tooltip:'Animations — page transitions and step reveals' },
      { logo:<div style={{background:'#1a2a3a',width:40,height:40,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#4ECDC4',fontWeight:800,fontSize:14}}>RC</div>, name:'Recharts', tooltip:'Chart library for signal confidence visualization' },
    ]
  },
  {
    label:'Signal Processing & Inference', color:'#7B6CF6',
    cards:[
      { logo:SI('python'),        name:'Python 3.11',   tooltip:'Backend runtime for all signal processing' },
      { logo:SI('fastapi'),       name:'FastAPI',        tooltip:'REST API layer for the fusion engine' },
      { logo:<div style={{background:'#1a1a1a',width:40,height:40,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:GOLD,fontSize:18}}>〰</div>, name:'librosa', tooltip:'Audio analysis — fundamental frequency + decay' },
      { logo:SI('numpy'),         name:'NumPy',          tooltip:'Numerical arrays for Bayesian inference' },
      { logo:<div style={{background:'#1a2030',width:40,height:40,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:11}}>PyMC</div>, name:'PyMC Bayes', tooltip:'Probabilistic model for purity posterior' },
    ]
  },
  {
    label:'Infrastructure', color:'#E24B4A',
    cards:[
      { logo:SI('amazonaws'),     name:'AWS Lambda',     tooltip:'Serverless compute for vision inference' },
      { logo:SI('tensorflow'),    name:'TFLite Edge',    tooltip:'On-device model inference — no server round-trip' },
      { logo:<div style={{background:'#0f1a2a',width:40,height:40,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🔊</div>, name:'Web Audio', tooltip:'Browser audio capture for tap test' },
      { logo:SI('github'),        name:'GitHub',          tooltip:'Version control and CI/CD' },
      { logo:<div style={{background:'#1a1500',width:40,height:40,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:GOLD,fontSize:20,fontWeight:900}}>₹</div>, name:'Gold Price API', tooltip:'Live MCX spot prices via goldprice.org' },
    ]
  },
];

const PIPELINE = [
  { icon:'📷', label:'Photo Upload',       desc:'5 angles' },
  { icon:'🔍', label:'Quality Check',      desc:'Local' },
  { icon:'🤖', label:'Gemini Vision',      desc:'4 models' },
  { icon:'🌊', label:'Signal Fusion',      desc:'Bayesian' },
  { icon:'⚖️', label:'Loan Decision',      desc:'RBI 75% LTV' },
];

const REFS = [
  { label:'EfficientNet', url:'https://arxiv.org/abs/1905.11946' },
  { label:'YOLOv8',       url:'https://github.com/ultralytics/ultralytics' },
  { label:'MiDaS',        url:'https://arxiv.org/abs/1907.01341' },
  { label:'Depth Anything v2', url:'https://arxiv.org/abs/2406.09414' },
  { label:'librosa',      url:'https://librosa.org' },
];

export default function TechStackPage() {
  let cardIdx = 0;
  return (
    <div style={{ minHeight:'100vh', color:'rgba(255,255,255,0.88)', fontFamily:'"Inter",-apple-system,sans-serif', position:'relative' }}>
      <StarField />
      <div style={{ position:'relative', zIndex:1, maxWidth:1100, margin:'0 auto', padding:`${PAGE_PT + 60}px 24px 80px` }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:80 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(212,168,83,0.08)', border:'1px solid rgba(212,168,83,0.2)', borderRadius:99, padding:'6px 14px', fontSize:12, color:GOLD, fontWeight:600, marginBottom:28, letterSpacing:'0.05em', textTransform:'uppercase' }}>
            Built with Production-Grade AI
          </div>
          <h1 style={{ fontSize:'clamp(2rem,5vw,3rem)', fontWeight:700, letterSpacing:'-0.02em', lineHeight:1.1, margin:0, marginBottom:20, color:'#FFFFFF' }}>
            The Technology Behind<br />
            <span style={{ color:GOLD }}>GoldScan AI</span>
          </h1>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.55)', maxWidth:560, margin:'0 auto', lineHeight:1.65 }}>
            We built this entirely on open-source and free-tier infrastructure.<br />
            No proprietary black boxes. Every component is auditable.
          </p>
        </div>

        {/* Tech Grids */}
        {SECTIONS.map(({ label, color, cards }) => (
          <div key={label} style={{ marginBottom:60 }}>
            <SectionLabel text={label} color={color} />
            <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
              {cards.map(({ logo, name, tooltip }) => {
                const d = cardIdx++ * 0.05;
                return <TechCard key={name} logo={logo} name={name} tooltip={tooltip} delay={d} accentColor={color} />;
              })}
            </div>
          </div>
        ))}

        {/* Pipeline SVG */}
        <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'40px 32px', marginBottom:56 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:32 }}>Processing Pipeline</p>
          <div style={{ overflowX:'auto', paddingBottom:8 }}>
            <svg width="100%" viewBox="0 0 800 120" style={{ minWidth:600 }}>
              {PIPELINE.map((step, i) => {
                const x = 80 + i * 160;
                const hasArrow = i < PIPELINE.length - 1;
                return (
                  <g key={i}>
                    {/* Node rect */}
                    <rect x={x-56} y={20} width={112} height={72} rx={10}
                      fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                    {/* Icon */}
                    <text x={x} y={50} textAnchor="middle" fontSize={22} dy="0.35em">{step.icon}</text>
                    {/* Label */}
                    <text x={x} y={76} textAnchor="middle" fill="#FFFFFF" fontSize={11} fontWeight={600} fontFamily="Inter,sans-serif">{step.label}</text>
                    {/* Sub */}
                    <text x={x} y={88} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={9} fontFamily="Inter,sans-serif">{step.desc}</text>
                    {/* Arrow */}
                    {hasArrow && (
                      <g>
                        <line x1={x+57} y1={56} x2={x+103} y2={56} stroke={GOLD} strokeWidth={1.5} opacity={0.6} />
                        <polygon points={`${x+103},52 ${x+111},56 ${x+103},60`} fill={GOLD} opacity={0.6} />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          {/* Stats row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginTop:32 }}>
            {[['4 AI Models','Running in parallel'],['< 3 Min','End-to-end processing'],['0 Hardware','Any smartphone']]
              .map(([n, l]) => (
                <div key={n} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'20px', textAlign:'center' }}>
                  <p style={{ fontSize:26, fontWeight:700, color:GOLD, margin:0, lineHeight:1, letterSpacing:'-0.02em' }}>{n}</p>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', margin:'8px 0 0' }}>{l}</p>
                </div>
              ))}
          </div>
        </div>

        {/* References */}
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.25)', margin:0 }}>
            Built on published research ·{' '}
            {REFS.map((r, i) => (
              <span key={r.label}>
                <a href={r.url} target="_blank" rel="noreferrer" style={{ color:GOLD, textDecoration:'none', fontSize:12 }}>{r.label}</a>
                {i < REFS.length-1 && <span style={{ color:'rgba(255,255,255,0.2)' }}> · </span>}
              </span>
            ))}
          </p>
        </div>
      </div>
      <style>{`@keyframes cardIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

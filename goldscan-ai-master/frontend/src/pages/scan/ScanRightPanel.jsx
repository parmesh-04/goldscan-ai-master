import { Gem, Check, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const STEPS = [
  { n: 1, label: 'Upload Photos' },
  { n: 2, label: 'Tap Test' },
  { n: 3, label: 'Declare Details' },
  { n: 4, label: 'AI Analysis' },
];

const G = '#D4A017';
const PANEL = '#0F1117';
const BORDER = '#1A1D27';

export default function ScanRightPanel({ step }) {
  const pct = Math.round(((step - 1) / (STEPS.length - 1)) * 100);

  return (
    <div style={{
      width:'40%', minHeight:'100vh', background:PANEL,
      borderLeft:`1px solid ${BORDER}`, display:'flex',
      flexDirection:'column', padding:'32px 28px',
      position:'relative', zIndex:2, flexShrink:0,
    }}>
      {/* Logo */}
      <Link to="/" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none',marginBottom:48}}>
        <Gem size={22} style={{color:G}} />
        <div>
          <div style={{fontWeight:800,fontSize:15,color:'#F0F0F0',letterSpacing:'-0.3px'}}>GoldScan AI</div>
          <div style={{fontSize:10,color:'#6B7280',letterSpacing:'1px',textTransform:'uppercase'}}>Asset Evaluation</div>
        </div>
      </Link>

      {/* Steps */}
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:0}}>
          {STEPS.map((s, i) => {
          const done = step > s.n;
          const active = step === s.n;
          const last = i === STEPS.length - 1;
          return (
            <div key={s.n} style={{display:'flex',gap:14,position:'relative'}}>
              {/* Connector line */}
              {!last && (
                <div style={{
                  position:'absolute', left:15, top:34, width:2, height:44,
                  background:'#1E2130',
                  zIndex:0,
                }}>
                  <div style={{
                    position:'absolute', top:0, left:0, width:'100%',
                    background:`linear-gradient(180deg,${G},#F0C040)`,
                    height: done ? '100%' : '0%',
                    transition:'height 0.4s ease',
                    borderRadius:4,
                  }} />
                </div>
              )}

              {/* Circle */}
              <div style={{flexShrink:0,position:'relative',width:30,height:30,marginTop:4,zIndex:1}}>
                {active && (
                  <div style={{
                    position:'absolute',inset:-6,borderRadius:'50%',
                    border:`1px solid rgba(212,160,23,0.5)`,
                    animation:'outerPulse 2s ease-out infinite',
                  }} />
                )}
                <div style={{
                  width:30,height:30,borderRadius:'50%',
                  background: done ? G : active ? 'rgba(212,160,23,0.15)' : '#141620',
                  border: done ? 'none' : active ? `2px solid ${G}` : '2px solid #2A2D3A',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  boxShadow: active ? `0 0 14px rgba(212,160,23,0.5)` : 'none',
                  transition:'all 300ms',
                }}>
                  {done
                    ? <Check size={14} style={{color:'#0A0B0F'}} />
                    : <span style={{fontSize:12,fontWeight:700,color: active ? G : '#3D4050'}}>{s.n}</span>
                  }
                </div>
              </div>

              {/* Label + status */}
              <div style={{paddingTop:6,paddingBottom:36}}>
                <div style={{
                  fontSize:13,fontWeight: active ? 700 : 500,
                  color: done ? '#F0F0F0' : active ? G : '#3D4050',
                  transition:'color 300ms',
                }}>{s.label}</div>
                {done && <div style={{fontSize:11,color:'#22C891',marginTop:2}}>✓ Complete</div>}
                {active && <div style={{fontSize:11,color:'#6B7280',marginTop:2,display:'flex',alignItems:'center',gap:3}}>
                  In progress<span style={{animation:'dotBounce 1.2s infinite',display:'inline-block'}}>...</span>
                </div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{marginBottom:24}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <span style={{fontSize:11,color:'#6B7280'}}>Progress</span>
          <span style={{fontSize:11,color:G,fontWeight:600}}>{pct}%</span>
        </div>
        <div style={{height:3,background:'#1E2130',borderRadius:4,overflow:'hidden'}}>
          <div style={{height:'100%',background:`linear-gradient(90deg,${G},#F0C040)`,
            width:`${pct}%`,borderRadius:4,transition:'width 400ms ease'}} />
        </div>
      </div>

      {/* Security card */}
      <div style={{background:'#141620',border:'1px solid #1E2130',borderRadius:10,padding:'14px 16px',
        display:'flex',alignItems:'flex-start',gap:10}}>
        <Lock size={14} style={{color:G,flexShrink:0,marginTop:2}} />
        <div>
          <div style={{fontSize:12,fontWeight:600,color:'#F0F0F0',marginBottom:2}}>Bank-grade security</div>
          <div style={{fontSize:11,color:'#6B7280',lineHeight:1.5}}>Your data is encrypted and never stored on our servers.</div>
        </div>
      </div>

      <style>{`
        @keyframes outerPulse{0%{transform:scale(1);opacity:1}70%{transform:scale(1.4);opacity:0}100%{transform:scale(1.4);opacity:0}}
        @keyframes dotBounce{0%,100%{opacity:0.3}50%{opacity:1}}
      `}</style>
    </div>
  );
}

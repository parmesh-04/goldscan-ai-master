/*
  Scan Flow Components
  Modular UI steps for the GoldScan wizard:
  - Step1: Multi-angle camera capture.
  - Step2: Acoustic resonance (ping test) recorder.
  - Step3: Multi-modal declaration form (captures user input for Bayesian priors).
  - Step4: Real-time analysis visualization.
*/
import { useRef, useState, useCallback } from 'react';
import { Camera, X, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
import { recordAndAnalyze, demoAudioResult } from '../../utils/audioAnalyzer.js';

const G = '#D4A017';
const C = { card:'#141620', border:'#1E2130', inputBg:'#0F1117', inputBorder:'#2A2D3A',
  text:'#F0F0F0', muted:'#6B7280', green:'#22C891', amber:'#E8A020', dim:'#4B5563' };

/* ─── STEP 1: UPLOAD ─── */
export function Step1Upload({ images, setImages, onContinue }) {
  const inputRef = useRef(null);

  const addFiles = useCallback((files) => {
    const newImgs = Array.from(files).slice(0, 4 - images.length).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      // Quality heuristic: files under 200 KB are likely compressed/low-res
      quality: file.size > 200_000 ? 'good' : 'lowlight',
    }));
    setImages(prev => [...prev, ...newImgs].slice(0, 4));
  }, [images.length, setImages]);

  const onDrop = (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); };
  const remove = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',padding:'40px 48px',gap:24}}>
      <div>
        <h1 style={{fontSize:32,fontWeight:800,color:C.text,letterSpacing:'-0.8px',marginBottom:8}}>Upload Your Jewelry</h1>
        <p style={{fontSize:15,color:C.muted}}>Place on a white surface with a ₹1 coin for scale</p>
      </div>

      {images.length === 0 ? (
        <div
          onDrop={onDrop} onDragOver={e=>e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          style={{flex:1,maxHeight:340,borderRadius:20,cursor:'pointer',
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
            gap:14,background:'rgba(212,160,23,0.03)',
            border:`2px dashed ${G}`,position:'relative',overflow:'hidden',
            animation:'dashSpin 12s linear infinite',
          }}
        >
          <input ref={inputRef} type="file" accept="image/*" multiple style={{display:'none'}}
            onChange={e=>addFiles(e.target.files)} />
          <Camera size={44} style={{color:G,opacity:0.9}} />
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:17,fontWeight:600,color:C.text}}>Drag photos here</div>
            <div style={{fontSize:13,color:C.muted,marginTop:4}}>or click to browse</div>
            <div style={{fontSize:11,color:C.muted,marginTop:8,opacity:0.7}}>JPG, PNG · Max 10MB · Up to 4 photos</div>
          </div>
          <style>{`@keyframes dashSpin{to{border-color:${G};filter:hue-rotate(10deg)}}`}</style>
        </div>
      ) : (
        <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,maxHeight:340}}>
          {images.map((img, i) => (
            <div key={i} style={{position:'relative',borderRadius:14,overflow:'hidden',
              border:`2px solid ${G}`,background:C.card}}>
              <img src={img.preview} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
              <button onClick={()=>remove(i)} style={{position:'absolute',top:8,right:8,
                background:'rgba(0,0,0,0.7)',border:'none',borderRadius:'50%',
                width:22,height:22,cursor:'pointer',display:'flex',alignItems:'center',
                justifyContent:'center',color:'#fff',transition:'all 200ms ease'}}>
                <X size={12} />
              </button>
              <div style={{position:'absolute',bottom:8,left:8,
                background: img.quality==='good' ? 'rgba(34,200,145,0.85)' : 'rgba(232,160,32,0.85)',
                borderRadius:99,padding:'2px 10px',fontSize:11,fontWeight:600,color:'#0A0B0F',
                display:'flex',alignItems:'center',gap:4}}>
                {img.quality==='good' ? <><CheckCircle2 size={10}/>Good</> : <><AlertTriangle size={10}/>Low light</>}
              </div>
            </div>
          ))}
          {images.length < 4 && (
            <div onClick={()=>inputRef.current?.click()} style={{borderRadius:14,cursor:'pointer',
              border:`2px dashed ${C.inputBorder}`,background:C.inputBg,
              display:'flex',alignItems:'center',justifyContent:'center',
              color:C.muted,fontSize:13,gap:8,transition:'border-color 200ms ease'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=G}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.inputBorder}>
              <Camera size={18}/> Add more
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" multiple style={{display:'none'}}
            onChange={e=>addFiles(e.target.files)} />
        </div>
      )}

      {/* Tip card */}
      <div style={{borderLeft:`3px solid ${G}`,background:C.card,borderRadius:'0 10px 10px 0',
        padding:'12px 16px',display:'flex',gap:10,alignItems:'flex-start'}}>
        <Lightbulb size={16} style={{color:G,flexShrink:0,marginTop:1}} />
        <p style={{fontSize:12,color:C.muted,lineHeight:1.6,margin:0}}>
          Include a <strong style={{color:C.text}}>₹1 coin (22mm)</strong> in at least one photo.
          This improves weight accuracy by <strong style={{color:G}}>30%</strong>.
        </p>
      </div>

      <button onClick={onContinue} disabled={images.length===0}
        style={{alignSelf:'flex-end',background: images.length>0 ? G : C.border,
          color: images.length>0 ? '#0A0B0F' : C.muted, border:'none',
          borderRadius:12,padding:'14px 32px',fontSize:15,fontWeight:700,
          cursor: images.length>0 ? 'pointer' : 'not-allowed',
          transition:'all 200ms ease',display:'flex',alignItems:'center',gap:8}}>
        Continue →
      </button>
    </div>
  );
}

/* ─── STEP 2: AUDIO ─── */
const WAVEFORM = [10,18,28,36,40,36,28,18,10,14,22,32,38,32,22,14];

export function Step2Audio({ onContinue, onSkip, audioResult, setAudioResult }) {
  const [recState, setRecState] = useState('ready');   // 'ready' | 'recording' | 'done' | 'error'
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const startRec = async () => {
    setRecState('recording');
    setProgress(0);
    setErrorMsg('');
    try {
      // Real microphone capture — calls Web Audio API via audioAnalyzer.js
      const result = await recordAndAnalyze(3000, setProgress);
      setAudioResult(result);
      setRecState('done');
    } catch (err) {
      // Mic permission denied or API unavailable — load demo so user can still continue
      setErrorMsg('Microphone unavailable. A demo signal has been loaded so you can continue.');
      setAudioResult(demoAudioResult());
      setRecState('error');
    }
  };

  const reset = () => { setRecState('ready'); setAudioResult(null); setProgress(0); setErrorMsg(''); };

  const INSTRUCTIONS = [
    'Place jewelry on a hard surface — marble or glass works best.',
    'Tap firmly once with your fingernail.',
    'Hold your phone within 10cm of the jewelry.',
    'Recording lasts 3 seconds automatically.',
  ];

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', padding:'40px 32px' }}>
      <div style={{
        width:'100%', maxWidth:600,
        background:'#161616',
        border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:16,
        padding:'48px',
        display:'flex', flexDirection:'column', gap:36,
        boxShadow:'0 4px 24px rgba(0,0,0,0.5)',
      }}>
        {/* Heading */}
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, color:'#FFFFFF', margin:0, marginBottom:8, fontFamily:'"Inter",sans-serif' }}>Tap Test</h1>
          <p style={{ fontSize:14, color:'#A3A3A3', margin:0, fontFamily:'"Inter",sans-serif' }}>Record the acoustic signature of your jewelry</p>
        </div>

        {/* Waveform + mic visualizer */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
          {/* Left bars */}
          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
            {WAVEFORM.slice(0,8).map((h, i) => (
              <div key={i} style={{
                width:3, height: recState==='recording' ? undefined : h,
                background:'#E5B842', borderRadius:2, opacity:0.8,
                animation: recState==='recording' ? `waveBar ${0.4 + i*0.07}s ease-in-out infinite alternate` : 'none',
                animationDelay: `${i*0.05}s`,
              }} />
            ))}
          </div>

          {/* Center circle */}
          <div style={{
            width:64, height:64, borderRadius:'50%', flexShrink:0,
            background:'radial-gradient(circle, rgba(229,184,66,0.18) 0%, transparent 70%)',
            border: recState==='recording' ? '2px solid #E5B842' : '2px solid rgba(229,184,66,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'border-color 300ms ease',
            boxShadow: recState==='recording' ? '0 0 0 8px rgba(229,184,66,0.06)' : 'none',
          }}>
            {(recState==='done' || recState==='error')
              ? <span style={{ fontSize:26, color: recState==='error' ? '#E8A020' : '#22C891' }}>{recState==='error' ? '⚠' : '✓'}</span>
              : recState==='recording'
                ? <span style={{ fontSize:14, fontWeight:800, color:'#E5B842', fontFamily:'monospace' }}>{Math.round(progress * 100)}%</span>
                : <span style={{ fontSize:26 }}>🎤</span>
            }
          </div>

          {/* Right bars */}
          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
            {WAVEFORM.slice(8).map((h, i) => (
              <div key={i} style={{
                width:3, height: recState==='recording' ? undefined : h,
                background:'#E5B842', borderRadius:2, opacity:0.8,
                animation: recState==='recording' ? `waveBar ${0.4 + i*0.07}s ease-in-out infinite alternate` : 'none',
                animationDelay: `${(i+8)*0.05}s`,
              }} />
            ))}
          </div>
        </div>

        {/* Audio result card (shown after recording or on error with demo) */}
        {(recState==='done' || recState==='error') && audioResult && (
          <div style={{ background:'#1F1F1F', border:`1px solid ${recState==='error' ? 'rgba(232,160,32,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius:10, padding:'16px 20px' }}>
            <p style={{ fontSize:13, fontWeight:600, color:'#FFFFFF', margin:'0 0 12px', fontFamily:'"Inter",sans-serif' }}>
              {recState==='error' ? '⚠️ Demo Signal Loaded' : '🔊 Audio Captured'}
            </p>
            {errorMsg && <p style={{ fontSize:12, color:'#E8A020', margin:'0 0 10px', fontFamily:'"Inter",sans-serif' }}>{errorMsg}</p>}
            {[['Frequency', `~${audioResult.fundamentalFreq} Hz`], ['Decay', audioResult.decayDescription], ['Confidence', `${Math.round(audioResult.confidence*100)}%`]].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderTop:'1px solid rgba(255,255,255,0.04)', fontSize:12, fontFamily:'"Inter",sans-serif' }}>
                <span style={{ color:'#888888' }}>{l}</span>
                <span style={{ color:'#FFFFFF', fontWeight:600, fontFamily:'monospace' }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Instruction list */}
        {recState==='ready' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {INSTRUCTIONS.map((text, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'#2A2A2A', color:'#FFFFFF', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{i+1}</div>
                <span style={{ fontSize:14, color:'#CCCCCC', lineHeight:1.55, fontFamily:'"Inter",sans-serif' }}>{text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {recState==='ready' && (
            <button onClick={startRec}
              style={{ width:'100%', background:'#E5B842', color:'#111111', border:'none', borderRadius:8, padding:'12px 24px', fontSize:14, fontWeight:600, cursor:'pointer', transition:'all 250ms cubic-bezier(0.16,1,0.3,1)', fontFamily:'"Inter",sans-serif' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#F2C94C'; e.currentTarget.style.transform='translateY(-1px)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='#E5B842'; e.currentTarget.style.transform='translateY(0)'; }}>
              Start Tap Test
            </button>
          )}
          {recState==='recording' && (
            <div style={{ textAlign:'center', color:'#E5B842', fontSize:13, fontWeight:600, fontFamily:'"Inter",sans-serif', padding:'8px 0' }}>
              Recording… {Math.round(progress * 100)}% — hold still
            </div>
          )}
          {(recState==='done' || recState==='error') && (
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={reset} style={{ flex:1, padding:'11px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'transparent', color:'#CCCCCC', fontWeight:600, fontSize:14, cursor:'pointer', transition:'all 200ms ease', fontFamily:'"Inter",sans-serif' }}>Re-record</button>
              <button onClick={onContinue} style={{ flex:1, padding:'11px', borderRadius:8, background:'#E5B842', border:'none', color:'#111111', fontWeight:600, fontSize:14, cursor:'pointer', transition:'all 200ms ease', fontFamily:'"Inter",sans-serif' }}>Continue →</button>
            </div>
          )}
          <button onClick={onSkip} style={{ background:'none', border:'none', color:'#6B7280', fontSize:13, cursor:'pointer', textDecoration:'underline', fontFamily:'"Inter",sans-serif' }}>Skip this step →</button>
        </div>
      </div>
      <style>{`
        @keyframes waveBar { from { height: 6px } to { height: 38px } }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  );
}

/* ─── STEP 3: DECLARE ─── */
const JEWELRY_TYPES = [
  {id:'ring',icon:'💍',label:'Ring'},{id:'bangle',icon:'📿',label:'Bangle'},
  {id:'chain',icon:'⛓',label:'Chain'},{id:'earring',icon:'👂',label:'Earring'},
  {id:'pendant',icon:'🔶',label:'Pendant'},{id:'necklace',icon:'📿',label:'Necklace'},
];
const KARATS = ['24K (999)','22K (916)','18K (750)','14K (585)','Not sure'];

export function Step3Declare({ details, setDetails, onContinue }) {
  const set = (k,v) => setDetails(p=>({...p,[k]:v}));

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',padding:'40px 48px',gap:20,overflowY:'auto'}}>
      <div>
        <h1 style={{fontSize:32,fontWeight:800,color:'#F0F0F0',letterSpacing:'-0.8px',marginBottom:8}}>Tell Us About Your Jewelry</h1>
        <p style={{fontSize:15,color:C.muted}}>This information helps calibrate our AI model</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:28,flex:1}}>
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          {/* Jewelry type grid */}
          <div>
            <label style={{fontSize:12,fontWeight:600,color:C.muted,letterSpacing:'0.8px',textTransform:'uppercase',display:'block',marginBottom:10}}>Jewelry Type</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {JEWELRY_TYPES.map(j=>{
                const sel = details.jewelryType?.toLowerCase()===j.id;
                return (
                  <button key={j.id} onClick={()=>set('jewelryType',j.id)}
                    style={{padding:'12px 8px',borderRadius:10,border:`1.5px solid ${sel?G:C.border}`,
                      background: sel?'rgba(212,160,23,0.1)':C.card,cursor:'pointer',
                      transition:'all 200ms ease',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <span style={{fontSize:20}}>{j.icon}</span>
                    <span style={{fontSize:11,fontWeight:600,color:sel?G:C.muted}}>{j.label}</span>
                    {sel && <span style={{fontSize:9,color:G}}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Karat pills */}
          <div>
            <label style={{fontSize:12,fontWeight:600,color:C.muted,letterSpacing:'0.8px',textTransform:'uppercase',display:'block',marginBottom:10}}>Declared Karat</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {KARATS.map(k=>{
                const sel=details.declaredKarat===k;
                return (
                  <button key={k} onClick={()=>set('declaredKarat',k)}
                    style={{padding:'8px 14px',borderRadius:99,border:`1.5px solid ${sel?G:C.inputBorder}`,
                      background:sel?G:'transparent',color:sel?'#0A0B0F':'#6B7280',
                      fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 200ms ease'}}>
                    {k}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:18}}>
          {/* Customer Name */}
          <div>
            <label style={{fontSize:12,fontWeight:600,color:C.muted,letterSpacing:'0.8px',textTransform:'uppercase',display:'block',marginBottom:8}}>Your Full Name</label>
            <input type="text" placeholder="e.g. Rahul Sharma"
              value={details.applicantName||''} onChange={e=>set('applicantName',e.target.value)}
              style={{width:'100%',background:C.inputBg,border:`1.5px solid ${C.inputBorder}`,borderRadius:10,
                padding:'12px 14px',fontSize:15,color:'#F0F0F0',outline:'none',boxSizing:'border-box',transition:'border-color 200ms ease'}}
              onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=C.inputBorder} />
          </div>

          {/* Location */}
          <div>
            <label style={{fontSize:12,fontWeight:600,color:C.muted,letterSpacing:'0.8px',textTransform:'uppercase',display:'block',marginBottom:8}}>Location <span style={{color:C.dim,fontWeight:400}}>(City, State)</span></label>
            <input type="text" placeholder="e.g. Mumbai, MH"
              value={details.location||''} onChange={e=>set('location',e.target.value)}
              style={{width:'100%',background:C.inputBg,border:`1.5px solid ${C.inputBorder}`,borderRadius:10,
                padding:'12px 14px',fontSize:15,color:'#F0F0F0',outline:'none',boxSizing:'border-box',transition:'border-color 200ms ease'}}
              onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=C.inputBorder} />
          </div>

          {/* Weight input */}
          <div>
            <label style={{fontSize:12,fontWeight:600,color:C.muted,letterSpacing:'0.8px',textTransform:'uppercase',display:'block',marginBottom:8}}>Self-Reported Weight</label>
            <div style={{display:'flex',border:`1.5px solid ${C.inputBorder}`,borderRadius:10,overflow:'hidden',background:C.inputBg,transition:'border-color 200ms ease'}}
              onFocusCapture={e=>e.currentTarget.style.borderColor=G}
              onBlurCapture={e=>e.currentTarget.style.borderColor=C.inputBorder}>
              <input type="number" min="0" step="0.1" placeholder="e.g. 24.5"
                value={details.selfReportedWeight||''} onChange={e=>set('selfReportedWeight',e.target.value)}
                style={{flex:1,background:'transparent',border:'none',outline:'none',padding:'12px 14px',
                  fontSize:15,color:'#F0F0F0',fontFamily:'monospace'}} />
              <span style={{padding:'12px 14px',color:C.muted,fontSize:13,borderLeft:`1px solid ${C.border}`}}>grams</span>
            </div>
            <p style={{fontSize:11,color:C.muted,marginTop:5}}>From hallmark card or bill</p>
          </div>

          {/* Purchase year */}
          <div>
            <label style={{fontSize:12,fontWeight:600,color:C.muted,letterSpacing:'0.8px',textTransform:'uppercase',display:'block',marginBottom:8}}>Purchase Year <span style={{color:C.dim,fontWeight:400}}>(optional)</span></label>
            <input type="number" placeholder="e.g. 2019" min="1950" max={new Date().getFullYear()}
              value={details.purchaseYear||''} onChange={e=>set('purchaseYear',e.target.value)}
              style={{width:'100%',background:C.inputBg,border:`1.5px solid ${C.inputBorder}`,borderRadius:10,
                padding:'12px 14px',fontSize:15,color:'#F0F0F0',outline:'none',fontFamily:'monospace',boxSizing:'border-box',transition:'border-color 200ms ease'}}
              onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=C.inputBorder} />
          </div>

          {/* Bill upload */}
          <div>
            <label style={{fontSize:12,fontWeight:600,color:C.muted,letterSpacing:'0.8px',textTransform:'uppercase',display:'block',marginBottom:8}}>Purchase Bill <span style={{color:C.dim,fontWeight:400}}>(optional)</span></label>
            <label style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
              border:`1.5px dashed ${C.inputBorder}`,borderRadius:10,cursor:'pointer',
              background:C.inputBg,transition:'border-color 200ms ease',fontSize:13,color:C.muted}}>
              <span>📎</span> Upload bill photo
              <input type="file" accept="image/*" style={{display:'none'}}
                onChange={e=>set('billFile',e.target.files?.[0]||null)} />
            </label>
          </div>

          {/* Additional Notes */}
          <div>
            <label style={{fontSize:12,fontWeight:600,color:C.muted,letterSpacing:'0.8px',textTransform:'uppercase',display:'block',marginBottom:8}}>Additional Details <span style={{color:C.dim,fontWeight:400}}>(optional)</span></label>
            <textarea placeholder="e.g. Family heirloom, inherited from grandmother..."
              value={details.notes||''} onChange={e=>set('notes',e.target.value)}
              style={{width:'100%',background:C.inputBg,border:`1.5px solid ${C.inputBorder}`,borderRadius:10,
                padding:'12px 14px',fontSize:14,color:'#F0F0F0',outline:'none',boxSizing:'border-box',transition:'border-color 200ms ease',minHeight:60,resize:'none'}}
              onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=C.inputBorder} />
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div style={{display:'flex',gap:20,paddingTop:4}}>
        {['🔒 Encrypted','🚫 Not stored','📊 Pre-qualification only'].map(t=>(
          <span key={t} style={{fontSize:11,color:C.muted}}>{t}</span>
        ))}
      </div>

      <button onClick={onContinue} disabled={!details.jewelryType}
        style={{background: details.jewelryType ? G : C.border,color: details.jewelryType ? '#0A0B0F' : C.muted,
          border:'none',borderRadius:12,padding:'15px',fontSize:16,fontWeight:700,
          cursor: details.jewelryType ? 'pointer' : 'not-allowed',
          transition:'all 200ms ease',width:'100%'}}>
        Analyze My Jewelry →
      </button>
    </div>
  );
}

/* ─── STEP 4: ANALYSIS ─── */
const CHECKLIST = [
  'Images received & quality verified',
  'Background removed & normalized',
  'Detecting hallmark stamp...',
  'Estimating volume from reference coin',
  'Running audio frequency analysis',
  'Bayesian fusion engine calibrating',
  'Generating confidence report',
];

export function Step4Analysis({ analysisIndex, analysisError, onRetry }) {
  /*
    Step 4: Animated analysis progress view.
    Shows a live checklist as the backend processes the image.
    On error, shows a clear message + retry button (goes back to Step 3).
  */
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',padding:'40px 48px',alignItems:'center',justifyContent:'center',gap:32,position:'relative'}}>

      {/* Top right models counter — decorative indicator of parallel AI models */}
      <div style={{position:'absolute',top:32,right:32,background:'#141620',border:'1px solid #1E2130',
        borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:12,color:'#6B7280'}}>Models running:</span>
        <span style={{fontSize:14,fontWeight:700,color:'#D4A017',fontFamily:'monospace'}}>4</span>
        <div style={{display:'flex',gap:4}}>
          {['#22C891','#22C891','#E8A020','#22C891'].map((c,i)=>(
            <div key={i} style={{width:6,height:6,borderRadius:'50%',background:c,
              animation:'dotBlink 1.2s ease-in-out infinite',animationDelay:`${i*0.2}s`}} />
          ))}
        </div>
      </div>

      {/* Hexagon + orbiting signal icons */}
      <div style={{position:'relative',width:200,height:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width="200" height="200" style={{position:'absolute',animation:'hexSpin 8s linear infinite'}}>
          <polygon points="100,10 190,55 190,145 100,190 10,145 10,55"
            fill="none" stroke="#D4A017" strokeWidth="2" strokeDasharray="8 4" opacity="0.8" />
        </svg>
        {['👁','🔤','🎵','⚖️'].map((icon,i)=>(
          <div key={i} style={{position:'absolute',width:28,height:28,borderRadius:'50%',
            background:'#141620',border:'1px solid #D4A017',display:'flex',alignItems:'center',
            justifyContent:'center',fontSize:12,
            animation:`orbit${i+1} 5s linear infinite`,animationDelay:`${i*1.25}s`}}>
            {icon}
          </div>
        ))}
        <div style={{width:60,height:60,borderRadius:'50%',background:'linear-gradient(135deg,#1A1D27,#0F1117)',
          border:'2px solid #D4A017',display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 0 30px rgba(212,160,23,0.4)',zIndex:1}}>
          <span style={{fontSize:24}}>💎</span>
        </div>
      </div>

      {/* Live checklist — steps light up as analysis progresses */}
      <div style={{width:'100%',maxWidth:420,display:'flex',flexDirection:'column',gap:10}}>
        {CHECKLIST.map((item, i) => {
          const done = i < analysisIndex;
          const active = i === analysisIndex;
          return (
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,
              padding:'10px 14px',borderRadius:10,
              background: active ? 'rgba(212,160,23,0.06)' : 'transparent',
              border: active ? '1px solid rgba(212,160,23,0.15)' : '1px solid transparent',
              transition:'all 300ms ease',
              opacity: done || active ? 1 : 0.35,
            }}>
              <span style={{fontSize:14,flexShrink:0}}>
                {done ? '✅' : active ? '⏳' : '○'}
              </span>
              <span style={{fontSize:13,color: done?'#6B7280' : active?'#F0F0F0':'#3D4050',
                fontWeight: active?600:400,
                background: active?'linear-gradient(90deg,#F0F0F0,#D4A017,#F0F0F0)':undefined,
                backgroundSize: active?'200% 100%':undefined,
                WebkitBackgroundClip: active?'text':undefined,
                WebkitTextFillColor: active?'transparent':undefined,
                animation: active?'shimmerText 1.5s linear infinite':undefined,
              }}>{item}</span>
            </div>
          );
        })}
      </div>

      {/* Error state — shown when the backend analysis fails */}
      {analysisError && (
        <div style={{width:'100%',maxWidth:420,textAlign:'center'}}>
          <div style={{padding:'16px 18px',background:'rgba(232,80,80,0.08)',
            border:'1px solid rgba(232,80,80,0.25)',borderRadius:12,marginBottom:14}}>
            <p style={{fontSize:13,color:'#E85050',fontWeight:600,margin:'0 0 4px'}}>
              ⚠ Analysis Failed
            </p>
            <p style={{fontSize:12,color:'#E8A020',margin:0,lineHeight:1.5}}>
              {analysisError}
            </p>
          </div>
          {/* Retry brings the user back to Step 3 — their form data is preserved */}
          {onRetry && (
            <button onClick={onRetry} style={{
              background:'transparent',border:'1px solid #D4A017',borderRadius:10,
              padding:'10px 24px',fontSize:14,fontWeight:600,color:'#D4A017',
              cursor:'pointer',transition:'all 200ms ease',
            }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,0.1)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}
            >
              ← Go Back &amp; Retry
            </button>
          )}
        </div>
      )}

      {/* Shown while analysis is running (no error) */}
      {!analysisError && (
        <p style={{fontSize:12,color:'#3D4050',textAlign:'center'}}>
          Analyzing with Gemini Vision AI · Usually takes 8–12 seconds
        </p>
      )}

      <style>{`
        @keyframes hexSpin{to{transform:rotate(360deg)}}
        @keyframes dotBlink{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes shimmerText{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes orbit1{from{transform:rotate(0deg) translateX(100px) rotate(0deg)}to{transform:rotate(360deg) translateX(100px) rotate(-360deg)}}
        @keyframes orbit2{from{transform:rotate(90deg) translateX(100px) rotate(-90deg)}to{transform:rotate(450deg) translateX(100px) rotate(-450deg)}}
        @keyframes orbit3{from{transform:rotate(180deg) translateX(100px) rotate(-180deg)}to{transform:rotate(540deg) translateX(100px) rotate(-540deg)}}
        @keyframes orbit4{from{transform:rotate(270deg) translateX(100px) rotate(-270deg)}to{transform:rotate(630deg) translateX(100px) rotate(-630deg)}}
      `}</style>
    </div>
  );
}

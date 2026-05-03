import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';

function Particles() {
  const containerRef = useRef(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = ''; // clear
    for (let i = 0; i < 80; i++) {
      const p = document.createElement('div');
      const size = Math.random() * 2 + 1;
      p.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: #C8922A;
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        bottom: ${Math.random() * 100}%;
        opacity: 0;
        box-shadow: 0 0 8px rgba(200, 146, 42, 0.4);
        animation: floatUp ${10 + Math.random() * 15}s infinite linear ${Math.random() * 5}s;
      `;
      el.appendChild(p);
    }
    return () => { el.innerHTML = ''; };
  }, []);
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 0.5; }
          80% { opacity: 0.3; }
          100% { transform: translateY(-20vh); opacity: 0; }
        }
      `}} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} ref={containerRef} aria-hidden="true" />
    </>
  );
}


/* ── One-time count-up (fires once on mount, no repeat) ── */
function useCountUpOnce(target, duration = 1.5) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // small delay so layout paints first
    const delay = setTimeout(() => {
      let raf;
      let startTs = null;
      const tick = (ts) => {
        if (!startTs) startTs = ts;
        const elapsed = ts - startTs;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(eased * target);
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, 200);
    return () => clearTimeout(delay);
  }, []);
  return value;
}

/* ── Individual stat card ── */
const STAT_DATA = [
  {
    Icon: 'scale',
    rawValue: 25000,
    format: (v) => Math.round(v).toLocaleString('en-IN'),
    unit: 'T',
    label: 'Private Gold in India',
    context: "World's largest household gold reserve",
    accent: '#D4A017',
    glow: 'rgba(212,160,23,0.04)',
  },
  {
    Icon: 'trending',
    rawValue: 5.7,
    format: (v) => `₹${v.toFixed(1)}L`,
    unit: 'Cr',
    label: 'Gold Loan Market',
    context: 'Fastest growing lending segment in India',
    accent: '#22C891',
    glow: 'rgba(34,200,145,0.04)',
  },
  {
    Icon: 'users',
    rawValue: 120,
    format: (v) => Math.round(v),
    unit: 'M+',
    label: 'Potential Borrowers',
    context: 'Underserved in semi-urban & rural India',
    accent: '#7B6CF6',
    glow: 'rgba(123,108,246,0.04)',
  },
  {
    Icon: 'clipboard',
    rawValue: 80,
    format: (v) => Math.round(v),
    unit: '%',
    label: 'Still Manual',
    context: 'Of valuations done at branch level today',
    accent: '#E24B4A',
    glow: 'rgba(226,75,74,0.04)',
  },
];

/* SVG icons as components (no extra import) */
function IconScale() {
  return (
    <svg width="16" height="16" fill="none" stroke="#D4A017" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 3v18M3 9l9-6 9 6M5 21h14"/><line x1="3" y1="9" x2="21" y2="9"/><path d="M7 15l-4-6h8zm10 0l-4-6h8z"/>
    </svg>
  );
}
function IconTrending({ color = '#22C891' }) {
  return (
    <svg width="16" height="16" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  );
}
function IconUsers({ color = '#7B6CF6' }) {
  return (
    <svg width="16" height="16" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconClipboard({ color = '#E24B4A' }) {
  return (
    <svg width="16" height="16" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  );
}

const ICONS = [IconScale, IconTrending, IconUsers, IconClipboard];

function StatCard({ data, index }) {
  const val = useCountUpOnce(data.rawValue, 1.5);
  const formatted = data.format(val);
  const Icon = ICONS[index];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#111318',
        border: '1px solid #1E2130',
        borderLeft: `3px solid ${data.accent}`,
        borderRadius: '16px',
        padding: '28px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'box-shadow 300ms ease',
        boxShadow: hovered ? `0 0 0 1px ${data.accent}` : 'none',
      }}
    >
      {/* Radial gradient texture top-right */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '180px', height: '180px',
        background: `radial-gradient(circle at top right, ${data.glow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Icon badge */}
      <div style={{
        width: '32px', height: '32px', borderRadius: '8px',
        background: '#1A1D27', border: '1px solid #2A2D3A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px',
      }}>
        <Icon color={data.accent} />
      </div>

      {/* Number + unit */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', lineHeight: 1 }}>
        <span style={{
          fontSize: '48px', fontWeight: 800,
          color: '#F5F0E8', letterSpacing: '-2px',
          fontFamily: '"Inter", sans-serif', lineHeight: 1,
        }}>
          {formatted}
        </span>
        <span style={{
          fontSize: '20px', fontWeight: 700,
          color: '#D4A017', letterSpacing: '0',
          fontFamily: '"Inter", sans-serif',
          verticalAlign: 'super', lineHeight: 1,
        }}>
          {data.unit}
        </span>
      </div>

      {/* Label */}
      <p style={{
        marginTop: '14px', marginBottom: '4px',
        fontSize: '14px', fontWeight: 500, color: '#F0F0F0',
      }}>
        {data.label}
      </p>

      {/* Context */}
      <p style={{
        fontSize: '12px', color: '#6B7280',
        fontStyle: 'italic', lineHeight: 1.5, margin: 0,
      }}>
        {data.context}
      </p>
    </div>
  );
}

function StatsSection() {
  return (
    <section style={{
      padding: '100px 0 80px',
      position: 'relative', zIndex: 1,
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}>
          {STAT_DATA.map((d, i) => (
            <StatCard key={i} data={d} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}


/* ── Journey Visuals adapted to Dark Fintech Theme ── */
function VisualStep1({ active }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${active ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 -translate-y-3 duration-[220ms] ease-in delay-0'}`}>
      <div style={{ width: '280px', height: '320px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ width: '180px', height: '180px', borderRadius: '50%', background: '#C8922A', opacity: 0.15, filter: 'blur(20px)' }} />
        <div style={{ position: 'absolute', bottom: '40px', right: '40px', width: '22px', height: '22px', borderRadius: '50%', background: '#C8922A', border: '2px solid #111' }} />
        <div style={{ position: 'absolute', bottom: '-12px', background: 'rgba(5, 150, 105, 0.15)', color: '#22C55E', border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '999px', transition: 'all 400ms cubic-bezier(0.16,1,0.3,1)', transitionDelay: '300ms', opacity: active ? 1 : 0, transform: active ? 'translateY(0)' : 'translateY(8px)' }}>
          ✓ Good quality
        </div>
      </div>
    </div>
  );
}

function VisualStep2({ active }) {
  const bars = Array.from({ length: 40 }).map((_, i) => {
    const dist = Math.abs(i - 20) / 20; 
    const targetHeight = (1 - dist) * 60 + 10 + Math.random() * 10;
    return { targetHeight, delay: i * 18 };
  });
  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${active ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 -translate-y-3 duration-[220ms] ease-in delay-0'}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '100px' }}>
        {bars.map((bar, i) => (
          <div key={i} style={{ width: '4px', background: '#C8922A', borderRadius: '2px', height: active ? `${bar.targetHeight}px` : '0px', transition: 'height 400ms cubic-bezier(0.16,1,0.3,1)', transitionDelay: active ? `${bar.delay}ms` : '0ms' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
        <span style={{ background: 'rgba(200, 146, 42, 0.1)', border: '1px solid rgba(200, 146, 42, 0.2)', color: '#C8922A', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px' }}>~ 820 Hz</span>
        <span style={{ background: 'rgba(200, 146, 42, 0.1)', border: '1px solid rgba(200, 146, 42, 0.2)', color: '#C8922A', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px' }}>Fast decay</span>
      </div>
    </div>
  );
}

function VisualStep3({ active }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${active ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 -translate-y-3 duration-[220ms] ease-in delay-0'}`}>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', width: '280px', boxShadow: '0 2px 12px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 400ms cubic-bezier(0.16,1,0.3,1)', opacity: active ? 1 : 0, transform: active ? 'translateY(0)' : 'translateY(16px)' }}>
        <div style={{ height: '36px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', paddingLeft: '12px', display: 'flex', alignItems: 'center', fontSize: '14px', color: '#F1E8D0' }}>Bangle ▾</div>
        <div style={{ height: '36px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', paddingLeft: '12px', paddingRight: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#F1E8D0' }}>
          <span>24.5</span>
          <span style={{ color: '#999999' }}>grams</span>
        </div>
        <div style={{ height: '36px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', paddingLeft: '12px', display: 'flex', alignItems: 'center', fontSize: '14px', color: '#F1E8D0' }}>22K (916) ▾</div>
      </div>
    </div>
  );
}

function VisualStep4({ active }) {
  const models = [
    { label: 'Vision Model', val: 87, delay: 0 },
    { label: 'Hallmark OCR', val: 94, delay: 150 },
    { label: 'Audio Model', val: 61, delay: 300, warn: true },
    { label: 'Weight Engine', val: 72, delay: 450 },
  ];
  return (
    <div className={`absolute inset-0 flex flex-col justify-center px-10 transition-all duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${active ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 -translate-y-3 duration-[220ms] ease-in delay-0'}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
        {models.map((m) => (
          <div key={m.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: '#999999' }}>{m.label}</span>
              <span style={{ fontSize: '12px', color: '#C8922A', fontWeight: 600 }}>{active ? m.val : 0}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', width: '100%', position: 'relative' }}>
              <div style={{ height: '100%', borderRadius: '6px', background: '#C8922A', width: active ? `${m.val}%` : '0%', transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)', transitionDelay: active ? `${m.delay}ms` : '0ms' }} />
              {m.warn && <span style={{ position: 'absolute', right: active ? `calc(${100 - m.val}% - 20px)` : '100%', top: '-5px', fontSize: '12px', opacity: active ? 1 : 0, transition: 'all 200ms ease', transitionDelay: active ? `${m.delay + 400}ms` : '0ms' }}>⚠️</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualStep5({ active }) {
  const bars = [
    { label: '24K', val: 5 },
    { label: '22K', val: 82, highlight: true },
    { label: '18K', val: 8 },
    { label: '14K', val: 3 },
    { label: 'Plated', val: 2 },
  ];
  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${active ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 -translate-y-3 duration-[220ms] ease-in delay-0'}`}>
      <div style={{ fontSize: '11px', color: '#999999', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '20px' }}>Purity Posterior Distribution</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', width: '280px', height: '160px', justifyContent: 'center' }}>
        {bars.map((b, i) => (
          <div key={b.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', background: b.highlight ? '#C8922A' : 'rgba(255,255,255,0.1)', borderRadius: '4px 4px 0 0', height: active ? `${(b.val / 82) * 120}px` : '0px', transition: 'height 400ms cubic-bezier(0.16,1,0.3,1)', transitionDelay: active ? `${i * 80}ms` : '0ms' }} />
            <span style={{ fontSize: '11px', color: '#999999' }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualStep6({ active }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center p-6 transition-all duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${active ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 -translate-y-3 duration-[220ms] ease-in delay-0'}`}>
      <div style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', transform: active ? 'scale(1)' : 'scale(0.96)', transition: 'transform 400ms cubic-bezier(0.16,1,0.3,1)', transitionDelay: active ? '100ms' : '0ms' }}>
        <div style={{ color: '#22C55E', fontWeight: 700, fontSize: '14px', marginBottom: '20px', letterSpacing: '-0.3px' }}>✓ PRE-APPROVED</div>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#999999', marginBottom: '4px' }}>Weight</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#F1E8D0', letterSpacing: '-0.5px' }}>9–12g</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#999999', marginBottom: '4px' }}>Purity</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#F1E8D0', letterSpacing: '-0.5px' }}>22K</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#999999', marginBottom: '4px' }}>Confidence</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#F1E8D0', letterSpacing: '-0.5px' }}>87%</div>
          </div>
        </div>
        <div style={{ background: 'rgba(5, 150, 105, 0.2)', border: '1px solid rgba(5, 150, 105, 0.3)', color: '#22C55E', padding: '12px', borderRadius: '8px', textAlign: 'center', fontSize: '13px', fontWeight: 500 }}>
          Eligible for gold loan · ₹28,000 – ₹36,000
        </div>
      </div>
    </div>
  );
}

/* ── Animated Step Number ── */
function AnimatedStepNumber({ number, shouldStart }) {
  const [count, setCount] = useState(0);
  const startedRef = useRef(false);
  useEffect(() => {
    if (!shouldStart || startedRef.current) return;
    startedRef.current = true;
    let raf;
    let startTs = null;
    const duration = 400;
    const tick = (ts) => {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / duration, 1);
      setCount(Math.round(progress * number));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shouldStart, number]);

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '38px',
      height: '38px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, rgba(200,146,42,0.18) 0%, rgba(200,146,42,0.06) 100%)',
      border: '1.5px solid rgba(200,146,42,0.35)',
      fontSize: '15px',
      fontWeight: 800,
      color: '#C8922A',
      letterSpacing: '-0.5px',
      fontFamily: '"Inter", monospace',
      flexShrink: 0,
    }}>
      {count}
    </span>
  );
}

/* ── Animated Dot Trail Connector ── */
function DotTrailConnector({ visible }) {
  const dots = Array.from({ length: 7 });
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      margin: '0 0 8px 0',
      height: '14px',
    }}>
      {dots.map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={visible ? { opacity: i === 0 ? 1 : 0.4 - i * 0.04, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{
            delay: visible ? 0.9 + i * 0.06 : 0,
            type: 'spring',
            stiffness: 200,
            damping: 18,
          }}
          style={{
            width: i === 0 ? '8px' : '5px',
            height: i === 0 ? '8px' : '5px',
            borderRadius: '50%',
            background: '#C8922A',
            boxShadow: i === 0 ? '0 0 8px rgba(200,146,42,0.6)' : 'none',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SCROLL-LOCKED JOURNEY  (sticky + useScroll)
   Each step owns 100vh of scroll budget → speed-invariant
══════════════════════════════════════════════════════ */

const G = '#D4A853';
const STEPS = [
  {
    num: '01', label: 'UPLOAD PHOTOS',
    title: 'Photograph Your Jewelry',
    body: 'Take 5 angles on any plain surface. Include a ₹1 coin for our size-reference algorithm — it improves weight accuracy by up to 30%. Photos never leave your device until analysis.',
    tag: 'Local Quality Check',
    visual: 'upload',
    stat: { value: '5', unit: 'photos', note: 'minimum required' },
  },
  {
    num: '02', label: 'TAP TEST',
    title: 'Record the Acoustic Signature',
    body: 'Tap the jewelry on marble or glass and record 3 seconds of audio. The resonance frequency and decay envelope distinguish solid gold, hollow forms, and base-metal plating with high reliability.',
    tag: 'Audio Spectrogram',
    visual: 'audio',
    stat: { value: '3s', unit: 'recording', note: 'auto-stops' },
  },
  {
    num: '03', label: 'DECLARE DETAILS',
    title: 'Provide Context Data',
    body: 'Self-report weight, purchase year, and jewelry type. These become contextual priors in our Bayesian model — if your declaration contradicts the visual evidence, the fraud flag triggers automatically.',
    tag: 'Bayesian Priors',
    visual: 'declare',
    stat: { value: '3', unit: 'fields', note: '< 60 seconds' },
  },
  {
    num: '04', label: 'AI ANALYSIS',
    title: 'Four Models Run in Parallel',
    body: 'Gemini Vision identifies jewelry type and hallmarks. EfficientNet classifies purity markers. YOLOv8 localizes stamp regions. TrOCR reads the hallmark text. All four run simultaneously in under 8 seconds.',
    tag: '4 Models Parallel',
    visual: 'analysis',
    stat: { value: '< 8s', unit: 'inference', note: 'all 4 models' },
  },
  {
    num: '05', label: 'FUSION ENGINE',
    title: 'Bayesian Signal Fusion',
    body: 'Signals from vision, audio, hallmark OCR, and declared data are fused using a Bayesian posterior. Contradictions between signals increase the fraud risk score. No single signal can be spoofed alone.',
    tag: 'Posterior Computed',
    visual: 'fusion',
    stat: { value: '6', unit: 'signals', note: 'cross-validated' },
  },
  {
    num: '06', label: 'INSTANT RESULT',
    title: 'Decision in Under 3 Minutes',
    body: 'Weight band, purity estimate, risk level, and loan eligibility — calculated against live MCX gold prices at your configured LTV. One tap sends the full AI reasoning report to your NBFC dashboard.',
    tag: 'Decision Ready',
    visual: 'result',
    stat: { value: '< 3 min', unit: 'total', note: 'start to result' },
  },
];

/* ── Rich Visual Panels ── */
function UploadVisual() {
  const photos = ['📿','💍','⛓','👂'];
  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Photo Quality Scanner</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {photos.map((emoji, i) => (
          <div key={i} style={{ aspectRatio: '1', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1.5px solid ${i < 2 ? 'rgba(34,200,145,0.4)' : 'rgba(255,255,255,0.1)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 36 }}>{emoji}</div>
            <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', background: i < 2 ? 'rgba(34,200,145,0.85)' : 'rgba(255,255,255,0.12)', borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700, color: i < 2 ? '#0a0b0f' : 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
              {i < 2 ? '✓ Good light' : '+ Add photo'}
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(212,168,83,0.06)', border: '1px solid rgba(212,168,83,0.15)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>Include a <strong style={{ color: G }}>₹1 coin</strong> (22mm) in frame — boosts weight accuracy by 30%</span>
      </div>
    </div>
  );
}

function AudioVisual() {
  const heights = [12, 22, 36, 48, 40, 56, 44, 38, 28, 18, 32, 44, 52, 38, 26, 18, 14];
  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Audio Spectrogram</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 80 }}>
        {heights.map((h, i) => (
          <div key={i} style={{ width: 4, height: h, background: `linear-gradient(to top, ${G}, rgba(212,168,83,0.3))`, borderRadius: 3, opacity: 0.85, animation: `waveAnim ${0.4 + (i % 5) * 0.1}s ease-in-out infinite alternate`, animationDelay: `${i * 0.04}s` }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[['Fundamental Freq','847 Hz'],['Decay Class','Fast (<12ms)'],['Material Match','Solid Metal','#22C891'],['Confidence','76%',G]].map(([l,v,c]) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c || '#fff' }}>{v}</div>
          </div>
        ))}
      </div>
      <style>{`@keyframes waveAnim{from{height:attr(height px)}to{height:attr(height px)}} @keyframes waveAnim{0%{transform:scaleY(1)}100%{transform:scaleY(0.4)}}`}</style>
    </div>
  );
}

function DeclareVisual() {
  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Declare Details</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['Ring','Bangle','Chain','Earring','Pendant'].map((t, i) => (
          <div key={t} style={{ padding: '8px 16px', borderRadius: 99, border: `1.5px solid ${i === 2 ? G : 'rgba(255,255,255,0.1)'}`, background: i === 2 ? 'rgba(212,168,83,0.12)' : 'transparent', fontSize: 13, fontWeight: 600, color: i === 2 ? G : 'rgba(255,255,255,0.5)' }}>{t}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['24K','22K','18K','14K','Not sure'].map((k, i) => (
          <div key={k} style={{ padding: '6px 14px', borderRadius: 99, border: `1px solid ${i === 1 ? G : 'rgba(255,255,255,0.08)'}`, background: i === 1 ? G : 'transparent', fontSize: 12, fontWeight: 600, color: i === 1 ? '#000' : 'rgba(255,255,255,0.45)' }}>{k}</div>
        ))}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flex: 1 }}>Self-reported weight</span>
        <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#fff' }}>24.5 g</span>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {['🔒 Encrypted','🚫 Not stored'].map(t => (
          <span key={t} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function AnalysisVisual() {
  const models = [
    { name: 'Gemini Vision', pct: 94, status: 'Jewelry classified' },
    { name: 'EfficientNet', pct: 88, status: 'Purity markers read' },
    { name: 'YOLOv8n', pct: 71, status: 'Hallmark located' },
    { name: 'TrOCR', pct: 83, status: '916 stamp confirmed' },
  ];
  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>4 Models · Parallel Inference</div>
      {models.map(({ name, pct, status }) => (
        <div key={name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{name}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{status}</span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: pct > 85 ? `linear-gradient(90deg,${G},#F0C040)` : 'linear-gradient(90deg,rgba(212,168,83,0.5),rgba(212,168,83,0.8))' }} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(34,200,145,0.06)', border: '1px solid rgba(34,200,145,0.15)', fontSize: 12, color: '#22C891', fontWeight: 600 }}>✓ Analysis complete · 6.2s</div>
    </div>
  );
}

function FusionVisual() {
  const signals = [
    { label: 'Visual Signal', value: 87, color: G },
    { label: 'Hallmark OCR', value: 91, color: G },
    { label: 'Audio Envelope', value: 76, color: '#E8A020' },
    { label: 'Declared Data', value: 82, color: G },
    { label: 'Cross-Check', value: 94, color: G },
    { label: 'Fraud Score', value: 12, color: '#22C891', invert: true },
  ];
  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Signal Decomposition</div>
      {signals.map(({ label, value, color, invert }) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'monospace' }}>{invert ? `Low (${value}%)` : `${value}%`}</span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${invert ? 100 - value : value}%`, borderRadius: 99, background: color, opacity: 0.8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultVisual() {
  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'rgba(34,200,145,0.1)', border: '1px solid rgba(34,200,145,0.25)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>✓</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#22C891' }}>PRE-APPROVED</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Eligible for gold loan disbursement</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[['WEIGHT','9–12g','Est. range'],['PURITY','22 Karat','916 Hallmark'],['CONFIDENCE','87%','Overall']].map(([l,v,s]) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{v}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{ borderRadius: 10, border: `1px solid ${G}33`, background: 'rgba(212,168,83,0.06)', padding: '14px 18px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Estimated Loan Range</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: G, letterSpacing: '-0.5px' }}>₹28,000 – ₹36,000</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>At 75% LTV · MCX ₹6,180/g</div>
      </div>
    </div>
  );
}

const VISUAL_MAP = { upload: UploadVisual, audio: AudioVisual, declare: DeclareVisual, analysis: AnalysisVisual, fusion: FusionVisual, result: ResultVisual };

function ScrollytellerJourney() {
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Smooth spring — dampens jitter when scrolling fast
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 20,
    restDelta: 0.001,
  });

  // Active step index (0-5) derived from scroll
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    return smoothProgress.on('change', (v) => {
      const idx = Math.min(5, Math.floor(v * 6));
      setActiveStep(idx);
    });
  }, [smoothProgress]);

  // Step indicator dots scroll-based opacity
  const stepProgress = Array.from({ length: 6 }, (_, i) => {
    const start = i / 6;
    const end = (i + 1) / 6;
    return useTransform(smoothProgress, [start, (start + end) / 2, end], [0.25, 1, 0.25]);
  });

  const VisualComp = VISUAL_MAP[STEPS[activeStep].visual];

  return (
    <section id="how-it-works" ref={containerRef} style={{ height: '700vh', position: 'relative' }}>
      {/* Sticky viewport */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Section header */}
        <div style={{ padding: '80px 48px 40px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: 14 }}>The Journey</div>
            <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', margin: 0, lineHeight: 1.1 }}>
              Six steps. Three minutes.<br />
              <span style={{ color: G }}>No branch visit.</span>
            </h2>
          </motion.div>
        </div>

        {/* Main content — two columns */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, maxWidth: 1200, margin: '0 auto', width: '100%', padding: '0 48px 48px' }}>

          {/* LEFT — Animated visual panel */}
          <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', marginRight: 32 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.98 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
              >
                {/* Step tag */}
                <div style={{ padding: '20px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 99, border: `1px solid ${G}40`, background: `${G}0f` }}>
                    {STEPS[activeStep].tag}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 42, fontWeight: 900, color: 'rgba(255,255,255,0.05)', letterSpacing: '-2px' }}>
                    {STEPS[activeStep].num}
                  </div>
                </div>
                <VisualComp />
                {/* Stat pill */}
                <div style={{ position: 'absolute', bottom: 24, right: 24, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', borderRadius: 12, padding: '10px 16px', textAlign: 'right', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: G }}>{STEPS[activeStep].stat.value} <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>{STEPS[activeStep].stat.unit}</span></div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{STEPS[activeStep].stat.note}</div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT — Step content + step dots */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0, paddingLeft: 16 }}>
            {/* Step indicator dots row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
              {STEPS.map((_, i) => (
                <motion.div
                  key={i}
                  style={{ height: 3, borderRadius: 99, background: G, flex: i === activeStep ? 3 : 1, opacity: i < activeStep ? 0.6 : i === activeStep ? 1 : 0.2, transition: 'flex 500ms cubic-bezier(0.22,1,0.36,1), opacity 300ms ease' }}
                />
              ))}
            </div>

            {/* Step content — animated swap */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: 14 }}>
                  Step {STEPS[activeStep].num} · {STEPS[activeStep].label}
                </div>
                <h3 style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', margin: '0 0 20px', lineHeight: 1.15 }}>
                  {STEPS[activeStep].title}
                </h3>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, fontWeight: 400, maxWidth: 440 }}>
                  {STEPS[activeStep].body}
                </p>

                {/* Navigation hint */}
                <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
                  {activeStep > 0 && <span style={{ opacity: 0.6 }}>↑ Scroll up for previous</span>}
                  {activeStep < 5 && <span>Scroll down for next ↓</span>}
                  {activeStep === 5 && <Link to="/scan" style={{ color: G, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>Try it yourself →</Link>}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* CSS for waveform bars */}
      <style>{`
        @keyframes waveBar { 0%{transform:scaleY(1)} 50%{transform:scaleY(0.35)} 100%{transform:scaleY(1)} }
      `}</style>
    </section>
  );
}


/* ── Problem Statement Section ── */
function ProblemSection() {
  const pains = [
    { icon: '🚶', text: 'Average 47km traveled to reach the nearest gold loan branch' },
    { icon: '⏰', text: '3–5 days average processing time per application' },
    { icon: '💸', text: '₹800–₹1,200 acquisition cost per customer for NBFCs' },
  ];
  return (
    <section style={{ position: 'relative', zIndex: 1, padding: '80px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '56px', alignItems: 'center' }}>
        <div style={{ borderLeft: '3px solid #D4A017', paddingLeft: '28px' }}>
          <p style={{ fontSize: '22px', fontWeight: 400, color: '#F1E8D0', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
            "Every day, thousands of families in rural India cannot access gold loans because they live too far from a branch."
          </p>
          <p style={{ marginTop: '20px', fontSize: '11px', color: '#6B7280', letterSpacing: '1px', textTransform: 'uppercase', fontStyle: 'normal' }}>— RBI Annual Report 2024</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pains.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', background: '#111318', border: '1px solid #1E2130', borderRadius: '12px', padding: '16px 20px' }}>
              <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>{p.icon}</span>
              <span style={{ fontSize: '14px', color: '#A19B8D', lineHeight: 1.55 }}>{p.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', color: '#FFFFFF' }}>
      <Particles />

      <main style={{ position: 'relative', zIndex: 1 }}>
        {/* ── Hero ── */}
        <section style={{
          maxWidth: '1280px', margin: '0 auto',
          minHeight: 'calc(100vh - 60px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '120px 24px 80px', textAlign: 'center',
        }}>
          <div className="animate-fadeUp" style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.5px', color: '#C8922A', background: 'rgba(200, 146, 42, 0.1)', padding: '6px 14px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(200, 146, 42, 0.2)' }}>
            <Sparkles size={14} />
            TenzorX 2026 · National AI Hackathon
          </div>

          <h1
            className="animate-fadeUp"
            style={{
              maxWidth: '920px', marginTop: '24px',
              fontSize: 'clamp(2.4rem, 6vw, 4.6rem)',
              fontWeight: 800, letterSpacing: '-1.5px',
              lineHeight: 1.1, color: '#F1E8D0',
              animationDelay: '80ms',
            }}
          >
            Scan Gold at Home.
            <span style={{ display: 'block' }}>Get Pre-Approved in</span>
            <span style={{ color: '#C8922A' }}>3 Minutes.</span>
          </h1>

          <p
            className="animate-fadeUp"
            style={{
              marginTop: '24px', maxWidth: '600px',
              fontSize: '1.05rem', lineHeight: 1.65,
              fontWeight: 400, color: '#A19B8D',
              animationDelay: '160ms',
            }}
          >
            AI-powered jewelry assessment for instant gold loan pre-qualification.
            No branch visit. No XRF machine. Works on any smartphone.
          </p>

          <div
            className="animate-fadeUp"
            style={{
              marginTop: '36px', display: 'flex', flexWrap: 'wrap',
              gap: '16px', justifyContent: 'center',
              animationDelay: '240ms',
            }}
          >
            <Link to="/scan" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, background: '#C8922A', color: '#080808', padding: '12px 24px', borderRadius: '8px', letterSpacing: '-0.3px', transition: 'all 200ms ease' }}>
              Start Gold Scan <ArrowRight size={18} />
            </Link>
            <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: '#F1E8D0', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 24px', borderRadius: '8px', letterSpacing: '-0.3px', transition: 'all 200ms ease' }}>
              View NBFC Dashboard
            </Link>
          </div>

          {/* Social proof */}
          <div className="animate-fadeUp" style={{ marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', animationDelay: '320ms' }}>
            <div style={{ display: 'flex' }}>
              {[['SJ','#7B6CF6'],['RP','#22C891'],['MK','#E8A020']].map(([init, bg], idx) => (
                <div key={init} style={{ width: 30, height: 30, borderRadius: '50%', background: bg, border: '2px solid #0A0B0F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', marginLeft: idx === 0 ? 0 : -8 }}>{init}</div>
              ))}
            </div>
            <span style={{ fontSize: '13px', color: '#A19B8D' }}>Trusted by loan officers across <strong style={{ color: '#F1E8D0', fontWeight: 500 }}>Maharashtra, Gujarat &amp; Rajasthan</strong></span>
            <span style={{ fontSize: '13px', color: '#D4A017', fontWeight: 600 }}>4.8 ★</span>
          </div>

          {/* Trust bar */}
          <div className="animate-fadeUp" style={{ marginTop: '24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', animationDelay: '400ms' }}>
            {['🔒 256-bit encrypted', '📋 RBI compliant', '🤖 Gemini Vision AI', '⚡ Results in 3 minutes'].map((item, i, arr) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>{item}</span>
                {i < arr.length - 1 && <span style={{ fontSize: '13px', color: '#2A2D3A', margin: '0 10px' }}>·</span>}
              </span>
            ))}
          </div>
        </section>


        <ProblemSection />

        <StatsSection />

        <ScrollytellerJourney />

      </main>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '28px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#3D4050', margin: 0 }}>
          <span style={{ color: '#D4A017', marginRight: '8px' }}>◆</span>
          GoldScan AI&nbsp;·&nbsp;Built for TenzorX 2026 by&nbsp;<span style={{ color: '#6B7280' }}>Team ByteRave</span>
        </p>
      </footer>
    </div>
  );
}

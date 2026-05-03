import { useEffect, useRef } from 'react';

export default function ScanParticles() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('div');
      const size = Math.random() * 2 + 1.5;
      p.style.cssText = `
        position:absolute;
        width:${size}px;height:${size}px;
        background:#D4A017;border-radius:50%;
        left:${Math.random()*100}%;
        bottom:${Math.random()*100}%;
        opacity:0;
        animation:scanFloat ${8+Math.random()*7}s infinite linear ${Math.random()*8}s;
        pointer-events:none;
      `;
      el.appendChild(p);
    }
    return () => { el.innerHTML = ''; };
  }, []);
  return (
    <>
      <style>{`
        @keyframes scanFloat{
          0%{opacity:0;transform:translateY(80px)}
          20%{opacity:0.35}
          80%{opacity:0.15}
          100%{opacity:0;transform:translateY(-220px)}
        }
      `}</style>
      <div ref={ref} style={{position:'absolute',inset:0,zIndex:0,pointerEvents:'none',overflow:'hidden'}} aria-hidden />
    </>
  );
}

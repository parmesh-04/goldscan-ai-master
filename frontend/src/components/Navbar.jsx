import { Link, useLocation } from 'react-router-dom';

const G = '#D4A853';

export default function Navbar() {
  const location = useLocation();

  const handleHowItWorks = (e) => {
    e.preventDefault();
    if (location.pathname === '/') {
      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = '/#how-it-works';
    }
  };

  return (
    <>
      <style>{`
        .pill-nav {
          position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
          width: 92%; max-width: 1160px; z-index: 1000;
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 20px;
          background: rgba(14,14,14,0.82);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 100px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .pill-nav-logo { display:flex;align-items:center;gap:7px;text-decoration:none;flex:1; }
        .pill-nav-logo-gem { color:${G};font-size:14px; }
        .pill-nav-logo-text { font-size:15px;font-weight:700;color:#fff;letter-spacing:-0.4px; }
        .pill-nav-center { display:flex;align-items:center;gap:4px;flex:2;justify-content:center; }
        .pill-nav-link { font-size:13px;font-weight:500;color:rgba(255,255,255,0.55);
          text-decoration:none;padding:7px 16px;border-radius:100px;
          transition:color 180ms ease,background 180ms ease;white-space:nowrap;
          cursor:pointer;background:none;border:none;font-family:inherit;
        }
        .pill-nav-link:hover { color:#fff;background:rgba(255,255,255,0.06); }
        .pill-nav-link.active { color:#fff; }
        .pill-nav-right { display:flex;align-items:center;gap:14px;flex:1;justify-content:flex-end; }
        .pill-nav-dash { font-size:13px;font-weight:500;color:rgba(255,255,255,0.6);
          text-decoration:none;transition:color 150ms ease;white-space:nowrap; }
        .pill-nav-dash:hover { color:#fff; }
        .pill-nav-cta { display:inline-flex;align-items:center;gap:6px;
          background:${G};color:#000;font-size:13px;font-weight:600;
          padding:8px 20px;border-radius:100px;text-decoration:none;border:none;
          cursor:pointer;transition:all 220ms ease;letter-spacing:0.01em;
        }
        .pill-nav-cta:hover { background:#c49840;transform:translateY(-1px); }
        @media(max-width:768px){
          .pill-nav-center,.pill-nav-dash{display:none!important;}
          .pill-nav{width:94%;padding:8px 16px;}
        }
      `}</style>
      <nav className="pill-nav">
        {/* Left: Logo */}
        <Link to="/" className="pill-nav-logo">
          <span className="pill-nav-logo-gem">◆</span>
          <span className="pill-nav-logo-text">GoldScan AI</span>
        </Link>

        {/* Center: Links */}
        <div className="pill-nav-center">
          <button onClick={handleHowItWorks} className="pill-nav-link">How it Works</button>
          <Link to="/technology" className="pill-nav-link">Technology</Link>
          <Link to="/for-nbfcs" className="pill-nav-link">For NBFCs</Link>
        </div>

        {/* Right */}
        <div className="pill-nav-right">
          <Link to="/dashboard" className="pill-nav-dash">NBFC Dashboard</Link>
          <Link to="/scan" className="pill-nav-cta">Start Scan →</Link>
        </div>
      </nav>
    </>
  );
}

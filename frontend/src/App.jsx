import { AnimatePresence, motion } from 'framer-motion';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import NBFCPage from './pages/NBFCPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import ScanPage from './pages/ScanPage.jsx';
import TechStackPage from './pages/TechStackPage.jsx';

function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080A0F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, fontFamily: '"Inter", sans-serif', padding: 32, textAlign: 'center' }}>
      <span style={{ fontSize: 64 }}>◆</span>
      <h1 style={{ fontSize: 40, fontWeight: 800, color: '#F0F0F0', margin: 0 }}>404</h1>
      <p style={{ fontSize: 16, color: '#6B7280', margin: 0 }}>This page doesn’t exist.</p>
      <Link to="/" style={{ marginTop: 12, padding: '12px 28px', background: '#D4A017', color: '#0A0B0F', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 15 }}>Back to Home</Link>
    </div>
  );
}

const PAGE_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
};

// Pages that include their own full-screen layout (no top-navbar padding needed)
const NO_NAV_PAGES = ['/scan', '/dashboard'];

export default function App() {
  const location = useLocation();
  const showNav = !NO_NAV_PAGES.includes(location.pathname);

  return (
    <>
      {showNav && <Navbar />}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          variants={PAGE_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ minHeight: '100vh' }}
        >
          <Routes location={location}>
            <Route path="/"           element={<LandingPage />} />
            <Route path="/scan"       element={<ScanPage />} />
            <Route path="/result"     element={<ResultPage />} />
            <Route path="/dashboard"  element={<DashboardPage />} />
            <Route path="/technology" element={<TechStackPage />} />
            <Route path="/for-nbfcs"  element={<NBFCPage />} />
            <Route path="*"           element={<NotFoundPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

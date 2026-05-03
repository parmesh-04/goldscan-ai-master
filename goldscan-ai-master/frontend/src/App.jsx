import { AnimatePresence, motion } from 'framer-motion';
import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import NBFCPage from './pages/NBFCPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import ScanPage from './pages/ScanPage.jsx';
import TechStackPage from './pages/TechStackPage.jsx';

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
          </Routes>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

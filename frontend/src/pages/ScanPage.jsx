import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ScanParticles from './scan/ScanParticles.jsx';
import ScanRightPanel from './scan/ScanRightPanel.jsx';
import { Step1Upload, Step2Audio, Step3Declare, Step4Analysis } from './scan/ScanSteps.jsx';
import { recognizeBillText } from '../utils/geminiClient.js';

/*
  ScanPage — The 4-step gold assessment wizard.
  
  Step 1: Upload jewelry photos (min 1, up to 5)
  Step 2: Audio tap-test (optional but improves accuracy)
  Step 3: Customer declares karat, weight, and personal details
  Step 4: Backend analysis runs; results displayed on ResultPage

  Data flow:
    Photos → POST /analyze (FastAPI backend → Gemini 2.5 Flash → fusion engine)
    Bill image → Tesseract.js OCR (browser-local, no API key needed)
    Result → navigate to /result (passed via React Router state)
    "Share with NBFC" → POST /submissions (backend SQLite persistence)
*/

// Labels for the animated progress steps shown during analysis
const ANALYSIS_STEPS = [
  'Images received & quality verified',
  'Background removed & normalized',
  'Detecting hallmark stamp...',
  'Estimating volume from reference coin',
  'Running audio frequency analysis',
  'Bayesian fusion engine calibrating',
  'Generating confidence report',
];

// Framer Motion variants for smooth step transitions
const slideVariants = {
  enter:  { x: 0, opacity: 0, y: 30, filter: 'blur(8px)' },
  center: { x: 0, opacity: 1, y: 0,  filter: 'blur(0px)',
            transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
  exit:   { x: 0, opacity: 0, y: -20, filter: 'blur(6px)',
            transition: { duration: 0.25, ease: 'easeIn' } },
};

export default function ScanPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [images, setImages] = useState([]);
  const [audioResult, setAudioResult] = useState(null);
  const [details, setDetails] = useState({
    applicantName: '',
    location: '',
    jewelryType: '',
    selfReportedWeight: '',
    declaredKarat: '22K (916)',
    billFile: null,
    purchaseYear: '',
    notes: '',
  });
  const [analysisIndex, setAnalysisIndex] = useState(0);
  const [analysisError, setAnalysisError] = useState('');

  // ── Step 4: Run the full analysis pipeline ──────────────────────────
  useEffect(() => {
    if (step !== 4) return;

    // Guard: must have at least one image before analysis can run
    // (This check also runs in the UI before advancing to Step 4)
    if (images.length === 0) {
      setAnalysisError('No image selected. Please go back and upload a photo.');
      return;
    }

    let cancelled = false;

    async function run() {
      setAnalysisError('');
      setAnalysisIndex(0);

      // Animate through progress steps while backend is working
      for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
        if (cancelled) return;
        setAnalysisIndex(i);
        await new Promise(r => setTimeout(r, 700));
      }

      try {
        // Build the multipart form — backend expects image + metadata fields
        const formData = new FormData();
        formData.append('image', images[0].file);
        formData.append('jewelry_type', details.jewelryType || 'unknown');
        formData.append('declared_karat', details.declaredKarat || '');
        formData.append('self_reported_weight', details.selfReportedWeight || '');
        formData.append('audio_performed', audioResult ? 'true' : 'false');

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/analyze`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(60_000),  // 60s total request timeout
        });

        const data = await res.json();

        // Map specific backend error codes to user-friendly messages
        if (!res.ok) {
          const errorCode = data.detail?.error || data.error;
          const errorMessages = {
            INVALID_FILE_TYPE:    'Please upload a JPEG or PNG photo of the jewelry.',
            FILE_TOO_SMALL:       'Photo file is too small. Please take a clearer photo.',
            FILE_TOO_LARGE:       'Photo must be under 10 MB. Please compress and retry.',
            VISION_ANALYSIS_FAILED: 'AI analysis service is busy. Please try again in a moment.',
            FUSION_ENGINE_FAILED: 'Risk assessment failed internally. Please retry.',
            INTERNAL_ERROR:       'Something went wrong on our end. Please try again.',
          };
          throw new Error(errorMessages[errorCode] || 'Something went wrong. Please try again.');
        }

        if (cancelled) return;

        // Run Tesseract OCR on the bill image (browser-side, no API key needed)
        let billText = '';
        if (details.billFile) {
          billText = await recognizeBillText(details.billFile);
        }

        // Compose the result object to pass to ResultPage
        const result = {
          id: data.submissionId || `GS-${Date.now()}`,   // Backend assigns real ID after save
          appId: data.appId || `#GS-PENDING`,
          applicant: details.applicantName
            ? `${details.applicantName}${details.location ? `, ${details.location}` : ''}`
            : 'New Customer, Remote',
          createdAt: new Date().toISOString(),
          submittedAt: 'Just now',
          images: images.map(i => i.preview),
          declarations: { ...details, purchaseBillText: billText },
          audioResult,            // Pass audio result for display on ResultPage
          ...data,               // Spread the full backend response
        };

        // Navigate to the result page with the assessment data
        // State is the primary data source; localStorage is only a fallback for page refresh
        localStorage.setItem('goldscan_latest_result', JSON.stringify(result));
        navigate('/result', { state: { result } });

      } catch (err) {
        if (cancelled) return;

        // Distinguish timeout from other errors
        const msg = err.name === 'TimeoutError'
          ? 'Request timed out. Please check your connection and try again.'
          : (err.message || 'Unable to complete analysis. Please try again.');

        setAnalysisError(msg);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [step]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Advance to next wizard step — Step 1 validates at least 1 image exists
  const next = () => {
    if (step === 1 && images.length === 0) return;  // Prevent advancing without image
    setStep(s => s + 1);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#080A0F', position: 'relative', fontFamily: '"Inter", sans-serif' }}>
      {/* Subtle noise texture overlay for depth */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.4,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
      }} aria-hidden />
      <ScanParticles />

      {/* LEFT PANEL — wizard steps */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        background: 'radial-gradient(ellipse at 60% 40%, rgba(212,160,23,0.04) 0%, transparent 70%)',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ height: '100%', overflow: 'hidden auto' }}
          >
            {step === 1 && (
              <Step1Upload
                images={images} setImages={setImages}
                onContinue={next}
              />
            )}
            {step === 2 && (
              <Step2Audio
                audioResult={audioResult} setAudioResult={setAudioResult}
                onContinue={next} onSkip={next}
              />
            )}
            {step === 3 && (
              <Step3Declare
                details={details} setDetails={setDetails}
                onContinue={next}
              />
            )}
            {step === 4 && (
              <Step4Analysis
                analysisIndex={analysisIndex}
                analysisError={analysisError}
                onRetry={() => {
                  // Allow user to go back to Step 3 to retry the submission
                  setStep(3);
                  setAnalysisError('');
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Mobile progress dots (visible only on small screens) */}
        <div style={{ display: 'none' }} className="mobile-progress">
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{
              width: step >= n ? 20 : 8, height: 8, borderRadius: 4,
              background: step === n ? '#D4A017' : step > n ? '#22C891' : '#2A2D3A',
              transition: 'all 300ms ease',
            }} />
          ))}
        </div>
      </div>

      {/* RIGHT PANEL — contextual tips and progress */}
      <ScanRightPanel step={step} />

      <style>{`
        @media(max-width:768px){
          div[style*="width:40%"]{display:none!important}
          .mobile-progress{display:flex!important;justify-content:center;gap:6px;padding:16px;position:absolute;bottom:0;left:0;right:0;z-index:10}
        }
        *{box-sizing:border-box}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
      `}</style>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ScanParticles from './scan/ScanParticles.jsx';
import ScanRightPanel from './scan/ScanRightPanel.jsx';
import { Step1Upload, Step2Audio, Step3Declare, Step4Analysis } from './scan/ScanSteps.jsx';
import { recognizeBillText } from '../utils/geminiClient.js';

/* 
  ScanPage: The core "User Journey" for gold assessment.
  This component orchestrates a 4-step wizard:
  1. Camera: Capture jewelry from 5+ angles.
  2. Audio: Capture the "ping" resonance (TenzorX unique feature).
  3. Declare: Customer provides their identity, location, and asset details.
  4. Analysis: Real-time progress bar while backend AI does the heavy lifting.
*/

const ANALYSIS_STEPS = [
  'Images received & quality verified',
  'Background removed & normalized',
  'Detecting hallmark stamp...',
  'Estimating volume from reference coin',
  'Running audio frequency analysis',
  'Bayesian fusion engine calibrating',
  'Generating confidence report',
];

const slideVariants = {
  enter: {
    x: 0, opacity: 0, y: 30, filter: 'blur(8px)',
  },
  center: {
    x: 0, opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    x: 0, opacity: 0, y: -20, filter: 'blur(6px)',
    transition: { duration: 0.25, ease: 'easeIn' },
  },
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

  // Step 4: run analysis
  useEffect(() => {
    if (step !== 4) return;
    let cancelled = false;

    async function run() {
      setAnalysisError('');
      setAnalysisIndex(0);
      for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
        if (cancelled) return;
        setAnalysisIndex(i);
        await new Promise(r => setTimeout(r, 700));
      }
      try {
        const formData = new FormData();
        formData.append('image', images[0]?.file);
        formData.append('jewelry_type', details.jewelryType || 'unknown');
        formData.append('declared_karat', details.declaredKarat || '');
        formData.append('self_reported_weight', details.selfReportedWeight || '');
        formData.append('audio_performed', audioResult ? 'true' : 'false');

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/analyze`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          const errorCode = data.detail?.error || data.error;
          if (errorCode === 'INVALID_FILE_TYPE') {
            throw new Error('Please upload a JPEG or PNG photo');
          } else if (errorCode === 'FILE_TOO_SMALL') {
            throw new Error('Photo is too small. Take a clearer photo.');
          } else if (errorCode === 'FILE_TOO_LARGE') {
            throw new Error('Photo must be under 10MB.');
          } else if (errorCode === 'VISION_ANALYSIS_FAILED') {
            throw new Error('Analysis service busy. Please try again.');
          } else if (errorCode === 'INTERNAL_ERROR') {
            throw new Error('Something went wrong. Please try again.');
          } else {
            throw new Error('Something went wrong. Please try again.');
          }
        }

        if (cancelled) return;

        let billText = '';
        if (details.billFile) billText = await recognizeBillText(details.billFile);

        const appId = `#GS-${Math.floor(1000 + Math.random() * 9000)}`;
        const result = {
          id: `GS-${Date.now()}`, 
          appId,
          applicant: details.applicantName ? `${details.applicantName}${details.location ? `, ${details.location}` : ''}` : 'New Customer, Remote',
          createdAt: new Date().toISOString(),
          submittedAt: 'Just now',
          images: images.map(i => i.preview),
          declarations: { ...details, purchaseBillText: billText },
          // Store raw API response directly
          ...data
        };
        
        localStorage.setItem('goldscan_latest_result', JSON.stringify(result));
        navigate('/result', { state: { result } });
      } catch (err) {
        if (cancelled) return;
        setAnalysisError(err.message || 'Unable to display results. Please try again.');
      }
    }

    run();
    return () => { cancelled = true; };
  }, [step]);

  const next = () => setStep(s => s + 1);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#080A0F', position: 'relative', fontFamily: '"Inter", sans-serif' }}>
      {/* Noise texture overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.4,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
      }} aria-hidden />
      <ScanParticles />

      {/* LEFT PANEL */}
      <div style={{
        flex: 1, position: 'relative', zIndex: 1,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
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
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Mobile progress dots (hidden on desktop) */}
        <div style={{ display: 'none' }} className="mobile-progress">
          {[1,2,3,4].map(n => (
            <div key={n} style={{
              width: step >= n ? 20 : 8, height: 8, borderRadius: 4,
              background: step === n ? '#D4A017' : step > n ? '#22C891' : '#2A2D3A',
              transition: 'all 300ms ease',
            }} />
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <ScanRightPanel step={step} />

      <style>{`
        @media(max-width:768px){
          /* Hide right panel, show mobile dots */
          div[style*="width:40%"]{display:none!important}
          .mobile-progress{display:flex!important;justify-content:center;gap:6px;padding:16px;position:absolute;bottom:0;left:0;right:0;z-index:10}
        }
        *{box-sizing:border-box}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
      `}</style>
    </div>
  );
}

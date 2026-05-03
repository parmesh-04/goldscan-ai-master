import { Mic, RotateCcw, Waves } from 'lucide-react';
import { useState } from 'react';
import { demoAudioResult, recordAndAnalyze } from '../utils/audioAnalyzer.js';

export default function AudioCapture({ audioResult, setAudioResult }) {
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function handleRecord() {
    setRecording(true);
    setError('');
    setProgress(0);
    try {
      const result = await recordAndAnalyze(3000, setProgress);
      setAudioResult(result);
    } catch (err) {
      setError('Microphone unavailable. Demo signal loaded so you can continue.');
      setAudioResult(demoAudioResult());
    } finally {
      setRecording(false);
    }
  }

  return (
    <div className="card mx-auto max-w-2xl text-center">
      <div className={`mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-line bg-ink text-gold ${recording ? 'animate-pulse' : ''}`}>
        <Mic className="h-10 w-10" />
      </div>

      {recording ? (
        <div className="space-y-5">
          <div className="mx-auto flex h-20 items-center justify-center gap-2">
            {[0, 1, 2, 3, 4].map((index) => (
              <span
                key={index}
                className="w-3 rounded-full bg-gold"
                style={{
                  height: 18 + index * 7,
                  animation: `wave 700ms ease-in-out ${index * 90}ms infinite`
                }}
              />
            ))}
          </div>
          <p className="font-semibold text-gold">Recording tap test... {Math.round(progress * 100)}%</p>
        </div>
      ) : audioResult ? (
        <div className="space-y-5">
          <div className="flex items-center justify-center gap-2 text-tealLight">
            <Waves className="h-5 w-5" />
            <span className="font-bold">Audio captured</span>
          </div>
          <Waveform data={audioResult.waveformData} />
          <div className="grid gap-3 text-left sm:grid-cols-3">
            <Metric label="Fundamental Freq" value={`~${audioResult.fundamentalFreq || 820} Hz`} />
            <Metric label="Decay" value={audioResult.decayDescription || 'Fast (dense metal)'} />
            <Metric label="Material signal" value={audioResult.materialClass === 'plated' ? 'Possible plating' : 'Likely solid metal'} />
          </div>
          <button type="button" onClick={handleRecord} className="btn-secondary inline-flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Retake
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <button type="button" onClick={handleRecord} className="btn-primary inline-flex items-center gap-2 px-6">
            <Mic className="h-5 w-5" />
            Start Recording (3 seconds)
          </button>
          <p className="text-sm text-textSecondary">Skip this step if you prefer. Vision analysis will still work.</p>
        </div>
      )}

      {error && <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">{error}</p>}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-ink p-3">
      <p className="text-xs text-textSecondary">{label}</p>
      <p className="mt-1 text-sm font-semibold text-textPrimary">{value}</p>
    </div>
  );
}

function Waveform({ data = [] }) {
  const trimmed = data.slice(0, 48);
  return (
    <div className="flex h-16 items-center justify-center gap-1 rounded-lg border border-line bg-ink px-3">
      {trimmed.map((value, index) => (
        <span key={index} className="w-1 rounded-full bg-gold/80" style={{ height: `${Math.max(8, (value / 255) * 56)}px` }} />
      ))}
    </div>
  );
}

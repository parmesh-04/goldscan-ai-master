// Hard cap: never record more than 5 seconds regardless of what the caller requests.
// This prevents a crafted call from producing an arbitrarily large waveformData array
// or holding the microphone open indefinitely.
const MAX_RECORDING_MS = 5_000;

export async function recordAndAnalyze(durationMs = 3000, onTick = () => {}) {
  const safeDuration = Math.min(durationMs, MAX_RECORDING_MS);
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone capture is unavailable in this browser.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const startedAt = Date.now();
  const timer = setInterval(() => {
    onTick(Math.min(1, (Date.now() - startedAt) / durationMs));
  }, 120);

  await new Promise((resolve) => setTimeout(resolve, safeDuration));
  clearInterval(timer);
  onTick(1);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  let maxIndex = 0;
  let maxVal = 0;
  for (let i = 0; i < dataArray.length; i += 1) {
    if (dataArray[i] > maxVal) {
      maxVal = dataArray[i];
      maxIndex = i;
    }
  }

  const sampleRate = audioContext.sampleRate;
  const fundamentalFreq = (maxIndex * sampleRate) / analyser.fftSize;
  const highFreqEnergy = dataArray
    .slice(Math.floor(dataArray.length * 0.7))
    .reduce((sum, value) => sum + value, 0);
  const totalEnergy = dataArray.reduce((sum, value) => sum + value, 0);
  const qProxy = highFreqEnergy / (totalEnergy + 1);

  stream.getTracks().forEach((track) => track.stop());
  await audioContext.close();

  let materialClass;
  let confidence;
  if (qProxy < 0.15 && fundamentalFreq > 300 && fundamentalFreq < 1500) {
    materialClass = 'solid_gold';
    confidence = 0.72;
  } else if (qProxy > 0.25) {
    materialClass = 'plated';
    confidence = 0.66;
  } else {
    materialClass = 'uncertain';
    confidence = 0.45;
  }

  // Trim waveformData to 64 samples — enough for UI display, keeps JSON ≤ ~600 bytes.
  // Full 1024-bin data is never sent to the server; only the derived scalars are.
  const result = {
    fundamentalFreq: Math.max(1, Math.round(fundamentalFreq)),
    qProxy: Math.round(qProxy * 100) / 100,
    materialClass,
    confidence,
    decayDescription: qProxy < 0.15 ? 'Fast (dense metal)' : 'Slow (hollow or base metal)',
    waveformData: Array.from(dataArray.slice(0, 64)),
  };

  // Sanity check: if somehow the JSON is unexpectedly large, strip waveformData
  // before returning so the caller never sends a bloated payload to the backend.
  if (JSON.stringify(result).length > 4_096) {
    result.waveformData = [];
  }

  return result;
}

export function demoAudioResult() {
  return {
    fundamentalFreq: 820,
    qProxy: 0.12,
    materialClass: 'solid_gold',
    confidence: 0.61,
    decayDescription: 'Fast (dense metal)',
    waveformData: Array.from({ length: 60 }, (_, index) => Math.round(45 + Math.sin(index / 3) * 25 + (index % 5) * 4))
  };
}

export async function recordAndAnalyze(durationMs = 3000, onTick = () => {}) {
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

  await new Promise((resolve) => setTimeout(resolve, durationMs));
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

  return {
    fundamentalFreq: Math.max(1, Math.round(fundamentalFreq)),
    qProxy: Math.round(qProxy * 100) / 100,
    materialClass,
    confidence,
    decayDescription: qProxy < 0.15 ? 'Fast (dense metal)' : 'Slow (hollow or base metal)',
    waveformData: Array.from(dataArray.slice(0, 100))
  };
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

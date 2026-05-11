/**
 * Utilities for generating synthetic ECG-like signals for testing.
 */

export function generateSineWave(freq, sampleRate, duration) {
  const count = sampleRate * duration;
  const signal = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    signal[i] = Math.sin(2 * Math.PI * freq * (i / sampleRate));
  }
  return signal;
}

export function generateQrsPulse(sampleRate, duration) {
  const count = sampleRate * duration;
  const signal = new Float32Array(count).fill(0);
  
  // A simple QRS complex every 1 second
  for (let t = 0; t < duration; t++) {
    const baseIdx = t * sampleRate;
    
    // P wave
    if (baseIdx + 0.1 * sampleRate < count) {
      signal[Math.floor(baseIdx + 0.1 * sampleRate)] = 0.1;
    }
    
    // QRS
    if (baseIdx + 0.2 * sampleRate < count) {
      const qrsIdx = Math.floor(baseIdx + 0.2 * sampleRate);
      if (qrsIdx - 2 >= 0) signal[qrsIdx - 2] = -0.1; // Q
      signal[qrsIdx] = 1.0; // R
      if (qrsIdx + 2 < count) signal[qrsIdx + 2] = -0.2; // S
    }
    
    // T wave
    if (baseIdx + 0.4 * sampleRate < count) {
      signal[Math.floor(baseIdx + 0.4 * sampleRate)] = 0.2;
    }
  }
  
  return signal;
}

export function generateNoise(amplitude, count) {
  const signal = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    signal[i] = (Math.random() - 0.5) * 2 * amplitude;
  }
  return signal;
}

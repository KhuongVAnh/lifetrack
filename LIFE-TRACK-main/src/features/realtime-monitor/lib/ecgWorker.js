/**
 * Web Worker for processing ECG data.
 * Handles decimation (min/max) to preserve spikes while reducing points to draw.
 */

self.onmessage = (e) => {
  const { type, data } = e.data;

  if (type === 'PROCESS_DATA') {
    const { signal, pixelWidth, sampleRate, windowSeconds } = data;
    const processed = processEcgData(signal, pixelWidth, sampleRate, windowSeconds);
    self.postMessage({ type: 'DATA_PROCESSED', data: processed });
  }
};

/**
 * Decimates ECG data to match pixel width.
 * Uses min/max per pixel bucket to preserve QRS spikes.
 */
function processEcgData(signal, pixelWidth, sampleRate, windowSeconds) {
  const totalSamples = sampleRate * windowSeconds;
  const samplesPerPixel = totalSamples / pixelWidth;

  if (samplesPerPixel <= 1.2) {
    // Not enough samples to justify complex decimation, return as is
    return {
      points: signal, // Note: In a real worker, we'd use Transferable ArrayBuffer
      isDecimated: false
    };
  }

  // Decimation logic: for each pixel, find min and max values
  const decimatedPoints = new Float32Array(pixelWidth * 2);
  let writeIdx = 0;

  for (let i = 0; i < pixelWidth; i++) {
    const startSample = Math.floor(i * samplesPerPixel);
    const endSample = Math.floor((i + 1) * samplesPerPixel);
    
    let min = Infinity;
    let max = -Infinity;

    for (let j = startSample; j < endSample && j < signal.length; j++) {
      const val = signal[j];
      if (val < min) min = val;
      if (val > max) max = val;
    }

    if (min === Infinity) {
      decimatedPoints[writeIdx++] = 0;
      decimatedPoints[writeIdx++] = 0;
    } else {
      decimatedPoints[writeIdx++] = min;
      decimatedPoints[writeIdx++] = max;
    }
  }

  return {
    points: decimatedPoints.buffer,
    isDecimated: true,
    pixelWidth
  };
}

/**
 * High-performance ECG Canvas Renderer.
 * Implements delta redraw (bitmap shifting) and smooth scrolling.
 */
export class EcgCanvasRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.options = {
      strokeColor: '#e11d48', // Red color
      strokeWidth: 2,
      yMin: -1.5,
      yMax: 1.5,
      ...options
    };

    this.lastX = 0;
    this.lastY = null;
    this.pixelsPerSecond = 0;
    this.width = canvas.width;
    this.height = canvas.height;
    
    // Offscreen canvas for delta redraw
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    this.fullRedrawNeeded = true;
  }

  /**
   * Translates voltage to Y pixel coordinate.
   */
  voltageToY(v) {
    const { yMin, yMax } = this.options;
    const ratio = (v - yMin) / (yMax - yMin);
    return this.height - ratio * this.height;
  }

  /**
   * Delta redraw: Shifts existing content left and draws new points.
   */
  draw(newSamples, pixelsToShiftInput) {
    const pixelsToShift = Math.max(1, Math.round(pixelsToShiftInput));
    if (newSamples.length === 0) return;

    // 1. Shift existing content left on offscreen
    this.offscreenCtx.globalCompositeOperation = 'copy';
    this.offscreenCtx.drawImage(
      this.canvas,
      pixelsToShift, 0, this.width - pixelsToShift, this.height,
      0, 0, this.width - pixelsToShift, this.height
    );

    // 2. Reset composite and clear the right strip
    this.offscreenCtx.globalCompositeOperation = 'source-over';
    this.offscreenCtx.clearRect(this.width - pixelsToShift, 0, pixelsToShift, this.height);

    // 3. Draw new segments in the right strip
    this.offscreenCtx.beginPath();
    this.offscreenCtx.strokeStyle = this.options.strokeColor;
    this.offscreenCtx.lineWidth = this.options.strokeWidth;
    this.offscreenCtx.lineJoin = 'round';
    this.offscreenCtx.lineCap = 'round';

    const stepX = pixelsToShift / (newSamples.length - 1 || 1);
    let currentX = this.width - pixelsToShift;

    for (let i = 0; i < newSamples.length; i++) {
      const y = this.voltageToY(newSamples[i]);
      if (i === 0 && this.lastY !== null) {
        this.offscreenCtx.moveTo(currentX - stepX, this.lastY);
      }
      if (i === 0 && this.lastY === null) {
        this.offscreenCtx.moveTo(currentX, y);
      } else {
        this.offscreenCtx.lineTo(currentX, y);
      }
      currentX += stepX;
      this.lastY = y;
    }
    this.offscreenCtx.stroke();

    // 4. Copy back to main canvas using 'copy' to avoid blending artifacts
    this.ctx.globalCompositeOperation = 'copy';
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    this.ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Full redraw for resize or large gaps.
   */
  fullRedraw(samples, windowSeconds) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    if (samples.length < 2) return;

    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.strokeColor;
    this.ctx.lineWidth = this.options.strokeWidth;
    
    const stepX = this.width / (samples.length - 1);
    for (let i = 0; i < samples.length; i++) {
      const x = i * stepX;
      const y = this.voltageToY(samples[i]);
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
      this.lastY = y;
    }
    this.ctx.stroke();
  }

  handleGap() {
    this.lastY = null;
  }
}

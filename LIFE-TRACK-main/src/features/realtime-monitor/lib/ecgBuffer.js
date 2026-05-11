/**
 * Circular buffer for ECG signal data using Float32Array for performance.
 */
export class EcgBuffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.buffer = new Float32Array(capacity);
    this.head = 0; // Index for next write
    this.size = 0; // Current number of elements
  }

  /**
   * Appends new samples to the buffer.
   * @param {number[]|Float32Array} samples 
   */
  append(samples) {
    const len = samples.length;
    if (len === 0) return;

    if (len >= this.capacity) {
      // If chunk is larger than capacity, just take the last part
      const start = len - this.capacity;
      for (let i = 0; i < this.capacity; i++) {
        this.buffer[i] = samples[start + i];
      }
      this.head = 0;
      this.size = this.capacity;
      return;
    }

    for (let i = 0; i < len; i++) {
      this.buffer[this.head] = samples[i];
      this.head = (this.head + 1) % this.capacity;
    }

    this.size = Math.min(this.size + len, this.capacity);
  }

  /**
   * Retrieves the last N samples.
   * @param {number} n 
   * @returns {Float32Array}
   */
  getLatest(n) {
    const count = Math.min(n, this.size);
    const result = new Float32Array(count);
    
    let readIdx = (this.head - count + this.capacity) % this.capacity;
    for (let i = 0; i < count; i++) {
      result[i] = this.buffer[readIdx];
      readIdx = (readIdx + 1) % this.capacity;
    }
    
    return result;
  }

  /**
   * Clears the buffer.
   */
  clear() {
    this.head = 0;
    this.size = 0;
  }
}

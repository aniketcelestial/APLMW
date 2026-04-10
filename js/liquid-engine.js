/**
 * liquid-engine.js
 * Real-time canvas-based liquid background with metaballs,
 * gradient trails, and smooth interpolation.
 */

class LiquidEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.blobs = [];
    this.time = 0;
    this.animId = null;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this._resize = this._resize.bind(this);
    this._render = this._render.bind(this);

    this._init();
  }

  _init() {
    this._resize();
    window.addEventListener('resize', this._resize);
    this._createBlobs();
    this.animId = requestAnimationFrame(this._render);
  }

  _resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.scale(this.dpr, this.dpr);
  }

  _createBlobs() {
    const palette = [
      { r: 15,  g: 244, b: 198 },  // teal
      { r: 123, g: 47,  b: 247 },  // violet
      { r: 246, g: 79,  b: 89  },  // coral
      { r: 56,  g: 189, b: 248 },  // sky
      { r: 247, g: 201, b: 72  },  // amber
    ];

    for (let i = 0; i < 7; i++) {
      const color = palette[i % palette.length];
      this.blobs.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 180 + Math.random() * 200,
        color,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.4,
        pulseAmp: 20 + Math.random() * 40,
        pulseFreq: 0.4 + Math.random() * 0.6,
        // For shape interpolation
        noiseOffset: Math.random() * 1000,
        angleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  _noise(x) {
    // Simple pseudo-noise using sin harmonics
    return Math.sin(x) * 0.5 + Math.sin(x * 2.3 + 1.1) * 0.25 + Math.sin(x * 5.7 + 2.4) * 0.15;
  }

  _updateBlobs() {
    const W = this.width, H = this.height;
    for (const b of this.blobs) {
      // Noise-based velocity perturbation
      const nx = this._noise(b.noiseOffset + this.time * 0.0003);
      const ny = this._noise(b.noiseOffset + this.time * 0.0003 + 100);
      b.vx += nx * 0.015;
      b.vy += ny * 0.015;

      // Damping
      b.vx *= 0.992;
      b.vy *= 0.992;

      b.x += b.vx;
      b.y += b.vy;

      // Soft boundary bounce
      const margin = b.r * 0.3;
      if (b.x < -margin)    { b.vx += 0.15; }
      if (b.x > W + margin) { b.vx -= 0.15; }
      if (b.y < -margin)    { b.vy += 0.15; }
      if (b.y > H + margin) { b.vy -= 0.15; }

      b.noiseOffset += 0.001;
    }
  }

  _drawBlob(b) {
    const ctx = this.ctx;
    const t = this.time * 0.001;

    // Pulsing radius
    const pulseR = b.r + Math.sin(t * b.pulseFreq + b.phase) * b.pulseAmp;

    // Radial gradient (glow effect)
    const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, pulseR);
    grd.addColorStop(0,   `rgba(${b.color.r},${b.color.g},${b.color.b},0.18)`);
    grd.addColorStop(0.4, `rgba(${b.color.r},${b.color.g},${b.color.b},0.08)`);
    grd.addColorStop(1,   `rgba(${b.color.r},${b.color.g},${b.color.b},0)`);

    ctx.beginPath();
    ctx.arc(b.x, b.y, pulseR, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
  }

  _drawConnections() {
    const ctx = this.ctx;
    for (let i = 0; i < this.blobs.length; i++) {
      for (let j = i + 1; j < this.blobs.length; j++) {
        const a = this.blobs[i], bblob = this.blobs[j];
        const dx = bblob.x - a.x, dy = bblob.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 350;
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.04;
          const grd = ctx.createLinearGradient(a.x, a.y, bblob.x, bblob.y);
          grd.addColorStop(0, `rgba(${a.color.r},${a.color.g},${a.color.b},${alpha})`);
          grd.addColorStop(1, `rgba(${bblob.color.r},${bblob.color.g},${bblob.color.b},${alpha})`);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(bblob.x, bblob.y);
          ctx.strokeStyle = grd;
          ctx.lineWidth = (1 - dist / maxDist) * 1.5;
          ctx.stroke();
        }
      }
    }
  }

  _render(ts) {
    this.time = ts;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);

    this._updateBlobs();
    this._drawConnections();
    for (const b of this.blobs) this._drawBlob(b);

    this.animId = requestAnimationFrame(this._render);
  }

  destroy() {
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this._resize);
  }
}

window.LiquidEngine = LiquidEngine;

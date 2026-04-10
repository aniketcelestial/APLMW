/**
 * morphing.js
 * Real-time SVG shape interpolation for project card visuals.
 * Uses bezier curve morphing and canvas-based particle trails.
 */

class ShapeMorpher {
  constructor(svgEl, options = {}) {
    this.svg    = svgEl;
    this.width  = options.width  || 400;
    this.height = options.height || 200;
    this.color1 = options.color1 || '#0ff4c6';
    this.color2 = options.color2 || '#7b2ff7';
    this.seed   = options.seed   || 0;

    this.t      = 0;
    this.dir    = 1;
    this.speed  = options.speed || 0.004;
    this.raf    = null;
    this.paused = false;

    this._build();
    this._animate = this._animate.bind(this);
    this._animate();
  }

  _build() {
    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

    // Defs with gradient
    this.svg.innerHTML = `
      <defs>
        <linearGradient id="mg-${this.seed}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${this.color1}" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="${this.color2}" stop-opacity="0.5"/>
        </linearGradient>
        <filter id="mblur-${this.seed}">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
      </defs>
      <path id="mp-bg-${this.seed}" fill="url(#mg-${this.seed})" filter="url(#mblur-${this.seed})" opacity="0.6"/>
      <path id="mp-fg-${this.seed}" fill="${this.color1}" opacity="0.25"/>
      <path id="mp-line-${this.seed}" fill="none" stroke="${this.color1}" stroke-width="1.5" opacity="0.5"/>
      <circle id="mc-${this.seed}" r="4" fill="${this.color1}" opacity="0.8"/>
    `;

    this.bgPath   = this.svg.querySelector(`#mp-bg-${this.seed}`);
    this.fgPath   = this.svg.querySelector(`#mp-fg-${this.seed}`);
    this.linePath = this.svg.querySelector(`#mp-line-${this.seed}`);
    this.dot      = this.svg.querySelector(`#mc-${this.seed}`);
  }

  // Smooth interpolation between two values
  _lerp(a, b, t) { return a + (b - a) * t; }

  // Smooth easing
  _ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

  // Generate organic blob path via noise
  _blobPath(t, cx, cy, r, points = 8) {
    const pts = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const noise =
        Math.sin(angle * 2 + t * 1.2 + this.seed) * 0.18 +
        Math.sin(angle * 3 - t * 0.8 + this.seed * 2.3) * 0.12 +
        Math.sin(angle * 5 + t * 0.5 + this.seed * 4.1) * 0.06;
      const radius = r * (1 + noise);
      pts.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    }

    let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[(i+1) % pts.length];
      const cpX = (p0.x + p1.x) / 2;
      const cpY = (p0.y + p1.y) / 2;
      d += ` Q ${p0.x.toFixed(2)},${p0.y.toFixed(2)} ${cpX.toFixed(2)},${cpY.toFixed(2)}`;
    }
    d += ' Z';
    return d;
  }

  // Generate wave path along the bottom
  _wavePath(t, amplitude, frequency) {
    const W = this.width, H = this.height;
    const waveY = H * 0.6;
    let d = `M 0,${H}`;

    for (let x = 0; x <= W; x += 4) {
      const y = waveY +
        Math.sin((x / W) * frequency * Math.PI * 2 + t) * amplitude +
        Math.sin((x / W) * frequency * Math.PI + t * 0.7 + 1.2) * (amplitude * 0.4);
      d += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
    }
    d += ` L ${W},${H} Z`;
    return d;
  }

  // Parametric line path for the foreground accent
  _linePath(t) {
    const W = this.width, H = this.height;
    let d = '';
    const pts = 80;
    for (let i = 0; i < pts; i++) {
      const progress = i / (pts - 1);
      const x = progress * W;
      const y = H * 0.5 +
        Math.sin(progress * Math.PI * 4 + t) * H * 0.18 +
        Math.sin(progress * Math.PI * 7 - t * 1.3) * H * 0.08;
      d += i === 0 ? `M ${x.toFixed(1)},${y.toFixed(1)}` : ` L ${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return d;
  }

  _animate() {
    if (!this.paused) {
      this.t += this.speed;

      const W = this.width, H = this.height;
      const cx = W * 0.5 + Math.sin(this.t * 0.3) * W * 0.1;
      const cy = H * 0.5 + Math.cos(this.t * 0.4) * H * 0.12;
      const r  = Math.min(W, H) * (0.32 + Math.sin(this.t * 0.5) * 0.04);

      this.bgPath.setAttribute('d', this._blobPath(this.t, cx, cy, r));
      this.fgPath.setAttribute('d', this._wavePath(this.t, H * 0.1, 3));
      this.linePath.setAttribute('d', this._linePath(this.t));

      // Animate dot along line
      const lineT = (Math.sin(this.t * 0.6) + 1) / 2;
      const dotX = lineT * W;
      const dotY = H * 0.5 +
        Math.sin(lineT * Math.PI * 4 + this.t) * H * 0.18 +
        Math.sin(lineT * Math.PI * 7 - this.t * 1.3) * H * 0.08;
      this.dot.setAttribute('cx', dotX.toFixed(1));
      this.dot.setAttribute('cy', dotY.toFixed(1));
    }

    this.raf = requestAnimationFrame(this._animate);
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.svg.innerHTML = '';
  }
}


/**
 * SkillBar — animated liquid fill bar
 */
class LiquidSkillBar {
  constructor(container, label, pct, color) {
    this.pct = pct;
    this.container = container;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:1rem;';

    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:0.4rem;font-family:var(--f-mono);font-size:0.78rem;color:rgba(255,255,255,0.55);';
    head.innerHTML = `<span>${label}</span><span>${pct}%</span>`;

    const track = document.createElement('div');
    track.style.cssText = 'height:6px;background:rgba(255,255,255,0.06);border-radius:6px;overflow:hidden;';

    const fill = document.createElement('div');
    fill.style.cssText = `height:100%;width:0%;border-radius:6px;background:${color};transition:width 1.2s cubic-bezier(0.16,1,0.3,1);position:relative;overflow:hidden;`;

    // Shimmer overlay
    const shimmer = document.createElement('div');
    shimmer.style.cssText = `
      position:absolute;inset:0;
      background:linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
      transform:translateX(-100%);
      animation:barShimmer 2s ease-in-out infinite;
    `;
    fill.appendChild(shimmer);

    track.appendChild(fill);
    wrap.appendChild(head);
    wrap.appendChild(track);
    container.appendChild(wrap);

    this.fill = fill;
    this._triggered = false;
  }

  trigger() {
    if (!this._triggered) {
      this._triggered = true;
      requestAnimationFrame(() => {
        this.fill.style.width = this.pct + '%';
      });
    }
  }
}

// Inject shimmer keyframe
const shimmerStyle = document.createElement('style');
shimmerStyle.textContent = `
  @keyframes barShimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
`;
document.head.appendChild(shimmerStyle);


window.ShapeMorpher    = ShapeMorpher;
window.LiquidSkillBar  = LiquidSkillBar;

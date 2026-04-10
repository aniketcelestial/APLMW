/**
 * physics.js
 * Spring physics, magnetic hover, and ripple interactions.
 * Manages complex hover behavior for cards, buttons, and elements.
 */

class SpringPhysics {
  constructor(config = {}) {
    this.stiffness = config.stiffness || 180;
    this.damping   = config.damping   || 14;
    this.mass      = config.mass      || 1;

    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.tx = 0; this.ty = 0;

    this._last = performance.now();
    this._raf  = null;
    this._cb   = null;
  }

  setTarget(x, y) {
    this.tx = x;
    this.ty = y;
  }

  onUpdate(cb) {
    this._cb = cb;
    if (!this._raf) this._loop();
    return this;
  }

  _loop() {
    const now = performance.now();
    const dt  = Math.min((now - this._last) / 1000, 0.064); // cap at 64ms
    this._last = now;

    const ax = (-this.stiffness * (this.x - this.tx) - this.damping * this.vx) / this.mass;
    const ay = (-this.stiffness * (this.y - this.ty) - this.damping * this.vy) / this.mass;

    this.vx += ax * dt;
    this.vy += ay * dt;
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;

    if (this._cb) this._cb(this.x, this.y);

    const isResting =
      Math.abs(this.vx) < 0.001 && Math.abs(this.vy) < 0.001 &&
      Math.abs(this.x - this.tx) < 0.001 && Math.abs(this.y - this.ty) < 0.001;

    if (!isResting) {
      this._raf = requestAnimationFrame(() => this._loop());
    } else {
      this.x = this.tx; this.y = this.ty;
      if (this._cb) this._cb(this.x, this.y);
      this._raf = null;
    }
  }

  stop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }
}


class MagneticElement {
  constructor(el, options = {}) {
    this.el     = el;
    this.strength = options.strength || 0.4;
    this.radius   = options.radius   || 120;
    this.spring   = new SpringPhysics({ stiffness: 220, damping: 18 });

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseLeave = this._onMouseLeave.bind(this);

    this.spring.onUpdate((x, y) => {
      this.el.style.transform = `translate(${x}px, ${y}px)`;
    });

    this.el.addEventListener('mousemove', this._onMouseMove);
    this.el.addEventListener('mouseleave', this._onMouseLeave);
  }

  _onMouseMove(e) {
    const rect = this.el.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    const dx   = e.clientX - cx;
    const dy   = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.radius) {
      const factor = (1 - dist / this.radius) * this.strength;
      this.spring.setTarget(dx * factor, dy * factor);
      this.spring._raf || this.spring._loop();
    } else {
      this.spring.setTarget(0, 0);
      this.spring._raf || this.spring._loop();
    }
  }

  _onMouseLeave() {
    this.spring.setTarget(0, 0);
    this.spring._raf || this.spring._loop();
  }

  destroy() {
    this.el.removeEventListener('mousemove', this._onMouseMove);
    this.el.removeEventListener('mouseleave', this._onMouseLeave);
    this.spring.stop();
  }
}


class TiltCard {
  constructor(el, options = {}) {
    this.el       = el;
    this.maxTilt  = options.maxTilt  || 12;
    this.glare    = options.glare    !== false;
    this.spring   = new SpringPhysics({ stiffness: 160, damping: 20 });
    this.springRx = 0;
    this.springRy = 0;

    // Create glare element
    if (this.glare) {
      this.glareEl = document.createElement('div');
      this.glareEl.style.cssText = `
        position:absolute; inset:0; border-radius:inherit;
        background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12) 0%, transparent 60%);
        pointer-events:none; z-index:5; opacity:0; transition:opacity 0.3s ease;
        mix-blend-mode:overlay;
      `;
      this.el.style.position = 'relative';
      this.el.appendChild(this.glareEl);
    }

    this._onMove  = this._onMove.bind(this);
    this._onLeave = this._onLeave.bind(this);

    this.el.addEventListener('mousemove', this._onMove);
    this.el.addEventListener('mouseleave', this._onLeave);
  }

  _onMove(e) {
    const rect = this.el.getBoundingClientRect();
    const px   = (e.clientX - rect.left) / rect.width;
    const py   = (e.clientY - rect.top)  / rect.height;

    const rotX = (py - 0.5) * -this.maxTilt * 2;
    const rotY = (px - 0.5) *  this.maxTilt * 2;

    this.el.style.transform = `
      perspective(900px)
      rotateX(${rotX}deg)
      rotateY(${rotY}deg)
      translateZ(10px)
    `;
    this.el.style.transition = 'transform 0.1s ease';

    if (this.glare && this.glareEl) {
      this.glareEl.style.opacity = '1';
      this.glareEl.style.background = `radial-gradient(circle at ${px*100}% ${py*100}%, rgba(255,255,255,0.14) 0%, transparent 60%)`;
    }
  }

  _onLeave() {
    this.el.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateZ(0)';
    this.el.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
    if (this.glare && this.glareEl) this.glareEl.style.opacity = '0';
  }

  destroy() {
    this.el.removeEventListener('mousemove', this._onMove);
    this.el.removeEventListener('mouseleave', this._onLeave);
    if (this.glareEl) this.glareEl.remove();
  }
}


class RippleEffect {
  constructor(el, color = 'rgba(123,47,247,0.25)') {
    this.el    = el;
    this.color = color;
    this._onClick = this._onClick.bind(this);
    this.el.style.overflow = 'hidden';
    this.el.style.position = 'relative';
    this.el.addEventListener('click', this._onClick);
  }

  _onClick(e) {
    const rect = this.el.getBoundingClientRect();
    const x    = e.clientX - rect.left;
    const y    = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2.5;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position:absolute;
      left:${x}px; top:${y}px;
      width:${size}px; height:${size}px;
      transform:translate(-50%,-50%) scale(0);
      border-radius:50%;
      background:${this.color};
      pointer-events:none;
      animation: rippleAnim 0.7s cubic-bezier(0.16,1,0.3,1) forwards;
    `;

    this.el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 750);
  }

  destroy() { this.el.removeEventListener('click', this._onClick); }
}


// Global ripple CSS
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  @keyframes rippleAnim {
    to { transform: translate(-50%,-50%) scale(1); opacity: 0; }
  }
`;
document.head.appendChild(rippleStyle);


window.SpringPhysics  = SpringPhysics;
window.MagneticElement = MagneticElement;
window.TiltCard        = TiltCard;
window.RippleEffect    = RippleEffect;

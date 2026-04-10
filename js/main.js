/**
 * main.js
 * Orchestrates all modules: cursor, scroll reveal,
 * physics interactions, loading screen, and nav.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ─── LOADING SCREEN ─────────────────────── */
  const loading   = document.getElementById('loading');
  const loadFill  = document.querySelector('.load-bar-fill');
  let loadProgress = 0;

  const loadInterval = setInterval(() => {
    loadProgress += Math.random() * 18 + 4;
    if (loadProgress >= 100) {
      loadProgress = 100;
      clearInterval(loadInterval);
      setTimeout(() => {
        loading.classList.add('hidden');
        setTimeout(() => loading.remove(), 900);
        initApp();
      }, 400);
    }
    loadFill.style.width = loadProgress + '%';
  }, 80);


  /* ─── MAIN INIT ───────────────────────────── */
  function initApp() {

    // SVG Filters inline
    const filterSVG = document.createElement('div');
    filterSVG.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    filterSVG.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
      <defs>
        <filter id="liquid-blob" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.008" numOctaves="4" seed="2" result="noise">
            <animate attributeName="seed" values="2;8;15;3;2" dur="12s" repeatCount="indefinite"/>
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="28" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <filter id="gooey" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur"/>
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo"/>
          <feBlend in="SourceGraphic" in2="goo"/>
        </filter>
        <filter id="glass-refract" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="3" seed="5" result="turb">
            <animate attributeName="baseFrequency" values="0.04;0.06;0.035;0.04" dur="8s" repeatCount="indefinite"/>
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="turb" scale="6" xChannelSelector="R" yChannelSelector="B"/>
        </filter>
        <filter id="hero-morph" x="-60%" y="-60%" width="220%" height="220%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="5" seed="7" result="noise">
            <animate attributeName="seed" values="7;14;3;20;7" dur="20s" repeatCount="indefinite"/>
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="45" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
    </svg>`;
    document.body.prepend(filterSVG);

    initCursor();
    initNavbar();
    initLiquidCanvas();
    initScrollReveal();
    initPhysics();
    initProjectMorphers();
    initSkillBars();
    initTypewriter();
  }


  /* ─── CUSTOM CURSOR ───────────────────────── */
  function initCursor() {
    const cursor = document.getElementById('cursor');
    const trail  = document.getElementById('cursor-trail');
    if (!cursor || !trail) return;

    let mx = -100, my = -100;
    let tx = -100, ty = -100;
    let blobX = -100, blobY = -100;
    const blob = document.getElementById('cursor-blob');

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
    });

    // Smooth trail with lerp
    function renderCursor() {
      tx += (mx - tx) * 0.18;
      ty += (my - ty) * 0.18;
      blobX += (mx - blobX) * 0.06;
      blobY += (my - blobY) * 0.06;

      cursor.style.left = mx + 'px';
      cursor.style.top  = my + 'px';
      trail.style.left  = tx + 'px';
      trail.style.top   = ty + 'px';
      if (blob) {
        blob.style.left = blobX + 'px';
        blob.style.top  = blobY + 'px';
      }

      requestAnimationFrame(renderCursor);
    }
    renderCursor();

    // Hover state
    const hoverEls = document.querySelectorAll('a, button, .project-card, .skill-card, .contact-link-item, .stat-item');
    hoverEls.forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
    });
  }


  /* ─── NAVBAR ──────────────────────────────── */
  function initNavbar() {
    const nav = document.getElementById('navbar');
    if (!nav) return;

    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }


  /* ─── CANVAS BACKGROUND ───────────────────── */
  function initLiquidCanvas() {
    const canvas = document.getElementById('liquid-canvas');
    if (canvas && window.LiquidEngine) {
      new window.LiquidEngine(canvas);
    }
  }


  /* ─── SCROLL REVEAL ───────────────────────── */
  function initScrollReveal() {
    const els = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => obs.observe(el));
  }


  /* ─── PHYSICS INTERACTIONS ────────────────── */
  function initPhysics() {
    if (!window.TiltCard || !window.MagneticElement || !window.RippleEffect) return;

    // Tilt on project cards
    document.querySelectorAll('.project-card').forEach(el => {
      new TiltCard(el, { maxTilt: 8, glare: true });
      new RippleEffect(el, 'rgba(123,47,247,0.18)');
    });

    // Magnetic on buttons
    document.querySelectorAll('.btn-primary, .btn-secondary').forEach(el => {
      new MagneticElement(el, { strength: 0.35, radius: 100 });
    });

    // Soft tilt on skill cards
    document.querySelectorAll('.skill-card').forEach(el => {
      new TiltCard(el, { maxTilt: 6, glare: true });
    });

    // Ripple on contact links
    document.querySelectorAll('.contact-link-item').forEach(el => {
      new RippleEffect(el, 'rgba(15,244,198,0.12)');
    });
  }


  /* ─── PROJECT CARD MORPHERS ──────────────── */
  function initProjectMorphers() {
    if (!window.ShapeMorpher) return;

    const configs = [
      { color1: '#0ff4c6', color2: '#38bdf8', speed: 0.005 },
      { color1: '#7b2ff7', color2: '#f64f59', speed: 0.004 },
      { color1: '#f64f59', color2: '#f7c948', speed: 0.006 },
      { color1: '#38bdf8', color2: '#7b2ff7', speed: 0.004 },
    ];

    document.querySelectorAll('.morph-svg').forEach((svg, i) => {
      const cfg = configs[i % configs.length];
      const morpher = new ShapeMorpher(svg, {
        width: 400, height: 200,
        color1: cfg.color1,
        color2: cfg.color2,
        speed: cfg.speed,
        seed: i * 3.7 + 1,
      });

      // Pause when not visible
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) morpher.resume();
          else morpher.pause();
        });
      });
      obs.observe(svg);
    });
  }


  /* ─── SKILL BARS ──────────────────────────── */
  function initSkillBars() {
    if (!window.LiquidSkillBar) return;

    const skillsData = [
      { label: 'JavaScript / TypeScript', pct: 82, color: 'linear-gradient(90deg, #f7c948, #f64f59)' },
      { label: 'React & Next.js',         pct: 78, color: 'linear-gradient(90deg, #38bdf8, #7b2ff7)' },
      { label: 'Node.js & Express',       pct: 70, color: 'linear-gradient(90deg, #0ff4c6, #38bdf8)' },
      { label: 'Python & FastAPI',        pct: 65, color: 'linear-gradient(90deg, #7b2ff7, #f64f59)' },
      { label: 'UI/UX & Figma',           pct: 72, color: 'linear-gradient(90deg, #f64f59, #f7c948)' },
    ];

    const container = document.getElementById('skill-bars-container');
    if (!container) return;

    const bars = skillsData.map(s => new LiquidSkillBar(container, s.label, s.pct, s.color));

    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        bars.forEach((b, i) => setTimeout(() => b.trigger(), i * 150));
        obs.disconnect();
      }
    }, { threshold: 0.3 });

    obs.observe(container);
  }


  /* ─── TYPEWRITER ──────────────────────────── */
  function initTypewriter() {
    const el = document.getElementById('typewriter');
    if (!el) return;

    const words = ['Full-Stack Developer', 'UI/UX Enthusiast', 'Open Source Contributor', 'Problem Solver', 'CS Student @ DTU'];
    let wIdx = 0, cIdx = 0, deleting = false;

    function type() {
      const word = words[wIdx];
      if (!deleting) {
        el.textContent = word.slice(0, cIdx + 1);
        cIdx++;
        if (cIdx === word.length) {
          deleting = true;
          setTimeout(type, 1600);
          return;
        }
      } else {
        el.textContent = word.slice(0, cIdx - 1);
        cIdx--;
        if (cIdx === 0) {
          deleting = false;
          wIdx = (wIdx + 1) % words.length;
        }
      }
      setTimeout(type, deleting ? 45 : 80);
    }
    type();
  }

});

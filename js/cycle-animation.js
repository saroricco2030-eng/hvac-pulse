// ===================================================
// HVAC Pulse — Real-time Cycle Animation
// requestAnimationFrame-based particle system
// Fault-reactive visualization with FAULT_VISUAL_MAP
// Enhances existing CycleVisualization SVG
// ===================================================

const CycleAnimation = (() => {

  // --- State ---
  let animationId = null;
  let particles = [];
  let mode = 'normal';        // 'normal' | 'measurement' | 'diagnostic'
  let speed = 1;              // 0.5 | 1 | 2
  let activeFault = null;
  let activeSeverity = 2;
  let isFullscreen = false;
  let svgEl = null;
  let initialized = false;
  let particleGroup = null;
  let overlayGroup = null;
  let pathCache = {};         // { pathId: { el, totalLength } }
  let particleEls = [];       // Pre-created <circle> elements

  // --- Pipe Segment Definitions ---
  // Ordered to form a complete cycle: comp→cond→rcv→sg→txv→evap→accum→comp
  const PIPE_SEGMENTS = [
    { id: 'pipe-discharge', color: '#ef4444', baseSpeed: 0.008, radius: 4.0, state: 'gas',    section: 'discharge' },
    { id: 'pipe-liq1',      color: '#f59e0b', baseSpeed: 0.007, radius: 2.8, state: 'liquid',  section: 'liquid' },
    { id: 'pipe-liq2',      color: '#f59e0b', baseSpeed: 0.007, radius: 2.8, state: 'liquid',  section: 'liquid' },
    { id: 'pipe-liq3',      color: '#f59e0b', baseSpeed: 0.006, radius: 2.8, state: 'liquid',  section: 'liquid' },
    { id: 'pipe-expansion', color: '#8b5cf6', baseSpeed: 0.004, radius: 2.2, state: 'mixed',   section: 'expansion' },
    { id: 'pipe-suct1',     color: '#3b82f6', baseSpeed: 0.006, radius: 2.5, state: 'gas',     section: 'suction' },
    { id: 'pipe-suct2',     color: '#3b82f6', baseSpeed: 0.007, radius: 2.5, state: 'gas',     section: 'suction' }
  ];

  // --- FAULT_VISUAL_MAP ---
  const FAULT_VISUAL_MAP = {
    refrigerant_low: {
      affected_pipes: ['pipe-suct1', 'pipe-suct2'],
      affected_comps: ['evaporator'],
      particleCount: 5,
      pipePulse: { 'pipe-suct1': 'pulse-red', 'pipe-suct2': 'pulse-red' },
      compPulse: { evaporator: 'pulse-red' },
      overlay: null,
      label: '냉매가 부족합니다 — 입자가 줄어든 것을 확인하세요'
    },
    refrigerant_high: {
      affected_pipes: ['pipe-discharge'],
      affected_comps: ['condenser'],
      particleCount: 20,
      pipePulse: { 'pipe-discharge': 'pulse-red' },
      compPulse: { condenser: 'pulse-orange' },
      overlay: null,
      speedMod: { discharge: 0.5, liquid: 0.4 },
      label: '냉매가 과다합니다 — 응축기에 냉매가 정체됩니다'
    },
    condenser_fouling: {
      affected_pipes: ['pipe-discharge'],
      affected_comps: ['condenser'],
      particleCount: 12,
      pipePulse: { 'pipe-discharge': 'pulse-orange' },
      compPulse: { condenser: 'pulse-red' },
      overlay: 'dust',
      label: '응축기가 막혀 열을 제대로 방출하지 못합니다'
    },
    evaporator_fouling: {
      affected_pipes: ['pipe-suct1'],
      affected_comps: ['evaporator'],
      particleCount: 12,
      pipePulse: { 'pipe-suct1': 'pulse-blue-dark' },
      compPulse: { evaporator: 'pulse-red' },
      overlay: 'frost',
      label: '증발기 기류가 부족하여 결빙이 진행됩니다'
    },
    compressor_valve_leak: {
      affected_pipes: [],
      affected_comps: ['compressor'],
      particleCount: 12,
      pipePulse: {},
      compPulse: { compressor: 'pulse-red' },
      overlay: 'reverse-flow',
      label: '압축기 밸브에서 냉매가 역류합니다'
    },
    non_condensable: {
      affected_pipes: ['pipe-discharge'],
      affected_comps: ['condenser'],
      particleCount: 14,
      pipePulse: {},
      compPulse: { condenser: 'pulse-yellow' },
      overlay: 'air-bubbles',
      addAirParticles: 5,
      label: '비응축가스(공기)가 혼입되어 응축 효율이 저하됩니다'
    },
    txv_restricted: {
      affected_pipes: [],
      affected_comps: ['txv'],
      particleCount: 8,
      pipePulse: {},
      compPulse: { txv: 'pulse-red' },
      overlay: 'blocked',
      speedMod: { expansion: 0.1 },
      label: '팽창밸브가 막혀 냉매 흐름이 차단됩니다'
    },
    txv_stuck_open: {
      affected_pipes: ['pipe-suct1', 'pipe-suct2'],
      affected_comps: ['txv'],
      particleCount: 18,
      pipePulse: { 'pipe-suct1': 'pulse-red', 'pipe-suct2': 'pulse-red' },
      compPulse: { txv: 'pulse-red' },
      overlay: 'flood',
      speedMod: { expansion: 3.0 },
      suctionLiquid: true,
      label: '팽창밸브 열림 고착 — 액백 위험!'
    }
  };

  // --- Value Card Positions (% of SVG viewBox) ---
  const VALUE_POSITIONS = {
    compressor: { left: 84, top: 57, align: 'right' },
    condenser:  { left: 62, top: 33, align: 'left' },
    txv:        { left: 1,  top: 14, align: 'left' },
    evaporator: { left: 5,  top: 88, align: 'left' }
  };


  // ============================================================
  // INITIALIZATION
  // ============================================================
  function init() {
    svgEl = document.getElementById('cycle-svg');
    if (!svgEl || initialized) return;
    initialized = true;

    // Cache path data
    cachePaths();

    // Remove existing SVG <animateMotion> particles
    const staticParticles = svgEl.querySelector('.cycle-particles');
    if (staticParticles) staticParticles.remove();

    // Create SVG groups
    particleGroup = createSvgGroup('ca-particles');
    overlayGroup = createSvgGroup('ca-overlays');

    // Add SVG filter defs
    addAnimationDefs();

    // Add HTML controls
    addControls();

    // Add HTML value card overlay
    addValuesOverlay();

    // Initialize default particles
    initParticles(12);

    // Start the animation loop
    startLoop();
  }

  function createSvgGroup(id) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', id);
    svgEl.appendChild(g);
    return g;
  }

  function cachePaths() {
    PIPE_SEGMENTS.forEach(seg => {
      const el = svgEl.querySelector('#' + seg.id);
      if (el) {
        pathCache[seg.id] = {
          el: el,
          totalLength: el.getTotalLength()
        };
      }
    });
  }

  function addAnimationDefs() {
    const defs = svgEl.querySelector('defs');
    if (!defs) return;

    const extra = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    extra.innerHTML = `
      <filter id="ca-glow-particle">
        <feGaussianBlur stdDeviation="2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="ca-glow-fault">
        <feGaussianBlur stdDeviation="5" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    `;
    // Move filter children into defs
    while (extra.firstChild) {
      defs.appendChild(extra.firstChild);
    }
  }


  // ============================================================
  // CONTROLS UI
  // ============================================================
  function addControls() {
    const wrapper = document.querySelector('.cycle-diagram-wrapper');
    if (!wrapper || wrapper.querySelector('.ca-controls')) return;

    const div = document.createElement('div');
    div.className = 'ca-controls';
    div.innerHTML = `
      <div class="ca-speed-group">
        <span class="ca-speed-label">속도</span>
        <button class="ca-speed-btn" data-speed="0.5">0.5x</button>
        <button class="ca-speed-btn active" data-speed="1">1x</button>
        <button class="ca-speed-btn" data-speed="2">2x</button>
      </div>
      <button class="ca-fullscreen-btn" title="전체화면">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/>
        </svg>
      </button>
    `;
    wrapper.insertBefore(div, wrapper.firstChild);

    // Speed buttons
    div.querySelectorAll('.ca-speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        speed = parseFloat(btn.dataset.speed);
        div.querySelectorAll('.ca-speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Fullscreen
    div.querySelector('.ca-fullscreen-btn').addEventListener('click', toggleFullscreen);
  }

  function addValuesOverlay() {
    const container = document.getElementById('cycle-svg-container');
    if (!container || container.querySelector('.ca-values-overlay')) return;

    container.style.position = 'relative';
    const overlay = document.createElement('div');
    overlay.className = 'ca-values-overlay';
    overlay.id = 'ca-values-overlay';
    container.appendChild(overlay);
  }

  function toggleFullscreen() {
    const container = document.querySelector('.cycle-diagram-container');
    const btn = document.querySelector('.ca-fullscreen-btn');
    if (!container) return;

    isFullscreen = !isFullscreen;
    container.classList.toggle('ca-fullscreen', isFullscreen);
    document.body.classList.toggle('ca-body-lock', isFullscreen);

    if (btn) {
      btn.innerHTML = isFullscreen
        ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2v4H2M10 2v4h4M14 14h-4v-4M2 14h4v-4"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>`;
    }
  }


  // ============================================================
  // PARTICLE SYSTEM
  // ============================================================
  function initParticles(count) {
    particles = [];
    const totalSegs = PIPE_SEGMENTS.length;

    for (let i = 0; i < count; i++) {
      const globalPos = i / count;
      const segFloat = globalPos * totalSegs;
      const segIndex = Math.floor(segFloat) % totalSegs;
      const progress = segFloat - Math.floor(segFloat);

      particles.push({
        segIndex,
        progress,
        type: 'refrigerant'
      });
    }

    createParticleElements();
  }

  function createParticleElements() {
    if (!particleGroup) return;
    particleGroup.innerHTML = '';
    particleEls = [];

    particles.forEach(() => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', '3');
      circle.setAttribute('fill', '#fff');
      circle.setAttribute('opacity', '0.85');
      circle.setAttribute('filter', 'url(#ca-glow-particle)');
      particleGroup.appendChild(circle);
      particleEls.push(circle);
    });
  }

  function startLoop() {
    if (animationId) return;
    let lastTime = performance.now();

    function loop(now) {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      updateParticles(dt);
      renderParticles();
      animationId = requestAnimationFrame(loop);
    }
    animationId = requestAnimationFrame(loop);
  }

  function stopAnimation() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function startAnimation() {
    startLoop();
  }

  function updateParticles(dt) {
    const timeScale = (dt / 16.67) * speed;
    const faultDef = activeFault ? FAULT_VISUAL_MAP[activeFault] : null;

    particles.forEach(p => {
      const seg = PIPE_SEGMENTS[p.segIndex];
      let segSpeed = seg.baseSpeed * timeScale;

      // Apply fault speed modifications
      if (faultDef && faultDef.speedMod) {
        const mod = faultDef.speedMod[seg.section];
        if (mod != null) segSpeed *= mod;
      }

      p.progress += segSpeed;

      if (p.progress >= 1) {
        p.progress -= 1;
        p.segIndex = (p.segIndex + 1) % PIPE_SEGMENTS.length;
      }
    });
  }

  function renderParticles() {
    particles.forEach((p, i) => {
      const el = particleEls[i];
      if (!el) return;

      const seg = PIPE_SEGMENTS[p.segIndex];
      const cached = pathCache[seg.id];
      if (!cached) { el.setAttribute('opacity', '0'); return; }

      const point = cached.el.getPointAtLength(p.progress * cached.totalLength);
      let color = seg.color;
      let radius = seg.radius;
      let opacity = 0.85;

      // Air particles (non_condensable fault)
      if (p.type === 'air') {
        color = '#9ca3af';
        radius = 3;
        opacity = 0.6;
      }

      // Fault: txv_stuck_open — suction particles appear as liquid
      if (activeFault === 'txv_stuck_open' && seg.section === 'suction') {
        radius = 3.8;
        color = '#a78bfa'; // liquid-ish purple
      }

      // Fault: refrigerant_low — particles on suction side are dimmer
      if (activeFault === 'refrigerant_low' && seg.section === 'suction') {
        opacity = 0.5;
      }

      el.setAttribute('cx', point.x.toFixed(1));
      el.setAttribute('cy', point.y.toFixed(1));
      el.setAttribute('r', radius.toString());
      el.setAttribute('fill', color);
      el.setAttribute('opacity', opacity.toString());
    });

    // Hide unused elements
    for (let i = particles.length; i < particleEls.length; i++) {
      particleEls[i].setAttribute('opacity', '0');
    }
  }


  // ============================================================
  // VALUE CARDS (HTML overlay)
  // ============================================================
  function updateValueCards(measurements, computed) {
    const overlay = document.getElementById('ca-values-overlay');
    if (!overlay) return;

    // Only show in measurement/diagnostic mode
    if (mode === 'normal') {
      overlay.innerHTML = '';
      return;
    }

    const cards = [];

    // Compressor card
    const compItems = [];
    if (measurements.Ps != null) compItems.push(makeItem('흡입압', measurements.Ps, 'psig', statusOf('Ps', measurements.Ps, measurements, computed)));
    if (measurements.Pd != null) compItems.push(makeItem('토출압', measurements.Pd, 'psig', statusOf('Pd', measurements.Pd, measurements, computed)));
    if (computed?.compressionRatio != null) compItems.push(makeItem('압축비', computed.compressionRatio, ':1',
      computed.compressionRatio > 12 ? 'danger' : computed.compressionRatio > 10 ? 'caution' : 'normal'));
    if (compItems.length) cards.push({ anchor: 'compressor', items: compItems });

    // Condenser card
    const condItems = [];
    if (computed?.condensingSatTemp != null) condItems.push(makeItem('응축온도', Settings.displayTemp(computed.condensingSatTemp), '', 'info'));
    if (measurements.SC != null) condItems.push(makeItem('과냉도', Settings.displayDelta(measurements.SC), '', statusOf('SC', measurements.SC, measurements, computed)));
    if (measurements.DLT != null) condItems.push(makeItem('토출온도', Settings.displayTemp(measurements.DLT), '', statusOf('DLT', measurements.DLT, measurements, computed)));
    if (condItems.length) cards.push({ anchor: 'condenser', items: condItems });

    // TXV card
    if (measurements.Pd != null && measurements.Ps != null) {
      const diff = (measurements.Pd - measurements.Ps).toFixed(0);
      cards.push({ anchor: 'txv', items: [makeItem('압력차', diff, 'psi', 'info')] });
    }

    // Evaporator card
    const evapItems = [];
    if (computed?.suctionSatTemp != null) evapItems.push(makeItem('증발온도', Settings.displayTemp(computed.suctionSatTemp), '', 'info'));
    if (measurements.SH != null) evapItems.push(makeItem('과열도', Settings.displayDelta(measurements.SH), '', statusOf('SH', measurements.SH, measurements, computed)));
    if (measurements.DT != null) evapItems.push(makeItem('ΔT', Settings.displayDelta(measurements.DT), '', statusOf('DT', measurements.DT, measurements, computed)));
    if (evapItems.length) cards.push({ anchor: 'evaporator', items: evapItems });

    // Render cards
    let html = '';
    cards.forEach(card => {
      const pos = VALUE_POSITIONS[card.anchor];
      if (!pos) return;
      html += `<div class="ca-val-card" style="left:${pos.left}%;top:${pos.top}%">`;
      card.items.forEach(item => {
        const colorCls = item.status === 'normal' ? 'val-green' : item.status === 'caution' ? 'val-yellow' : item.status === 'danger' ? 'val-red' : 'val-blue';
        html += `<div class="ca-val-row">
          <span class="ca-val-label">${item.label}</span>
          <span class="ca-val-num ${colorCls}">${item.value}<small>${item.unit}</small></span>
        </div>`;
      });
      html += '</div>';
    });
    overlay.innerHTML = html;
  }

  function makeItem(label, value, unit, status) {
    return { label, value, unit, status: status || 'info' };
  }

  function statusOf(pointId, val, measurements, computed) {
    if (typeof CYCLE_MEASURE_POINTS === 'undefined') return 'info';
    const mp = CYCLE_MEASURE_POINTS[pointId];
    if (!mp || !mp.getStatus) return 'info';
    const ctx = { ...measurements };
    if (computed) {
      ctx.suctionSatTemp = computed.suctionSatTemp;
      ctx.condensingSatTemp = computed.condensingSatTemp;
    }
    return mp.getStatus(val, ctx);
  }


  // ============================================================
  // FAULT VISUALIZATION
  // ============================================================
  function applyFault(faultId, severityLevel) {
    clearFault();

    if (!faultId) {
      initParticles(12);
      return;
    }

    activeFault = faultId;
    activeSeverity = severityLevel || 2;
    setMode('diagnostic');

    const faultDef = FAULT_VISUAL_MAP[faultId];
    if (!faultDef) {
      initParticles(12);
      return;
    }

    // Adjust particle count
    initParticles(faultDef.particleCount || 12);

    // Add air particles for non_condensable
    if (faultDef.addAirParticles) {
      const airCount = faultDef.addAirParticles;
      for (let i = 0; i < airCount; i++) {
        particles.push({
          segIndex: Math.floor(Math.random() * PIPE_SEGMENTS.length),
          progress: Math.random(),
          type: 'air'
        });
      }
      createParticleElements();
    }

    // Apply CSS pulse effects to components
    if (faultDef.compPulse) {
      Object.entries(faultDef.compPulse).forEach(([compId, cls]) => {
        const el = document.getElementById('comp-' + compId);
        if (el) el.classList.add('ca-' + cls);
      });
    }

    // Apply CSS pulse effects to pipes
    if (faultDef.pipePulse) {
      Object.entries(faultDef.pipePulse).forEach(([pipeId, cls]) => {
        const el = document.getElementById(pipeId);
        if (el) el.classList.add('ca-' + cls);
      });
    }

    // Render SVG overlay (dust, frost, etc.)
    if (faultDef.overlay) {
      renderOverlay(faultDef.overlay);
    }

    // Show fault label
    showFaultLabel(faultDef.label, activeSeverity);
  }

  function clearFault() {
    activeFault = null;
    activeSeverity = 2;

    // Remove all ca-pulse-* classes from SVG elements
    if (svgEl) {
      svgEl.querySelectorAll('[class*="ca-pulse"]').forEach(el => {
        const toRemove = [];
        el.classList.forEach(cls => { if (cls.startsWith('ca-pulse')) toRemove.push(cls); });
        toRemove.forEach(cls => el.classList.remove(cls));
      });
    }

    // Clear SVG overlays
    if (overlayGroup) overlayGroup.innerHTML = '';

    // Remove fault label
    const label = document.querySelector('.ca-fault-label');
    if (label) label.remove();
  }

  function renderOverlay(type) {
    if (!overlayGroup) return;
    let html = '';

    switch (type) {

      case 'dust':
        // Dust/debris overlay on condenser (475-675, 48-166)
        html += '<g class="ca-overlay" opacity="0.7">';
        for (let i = 0; i < 10; i++) {
          const cx = 490 + Math.random() * 170;
          const cy = 55 + Math.random() * 100;
          const r = 2 + Math.random() * 5;
          const dur = (1.5 + Math.random()).toFixed(1);
          html += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(1)}" fill="#a8a29e" opacity="0.4">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="${dur}s" repeatCount="indefinite"/>
          </circle>`;
        }
        // Dust film rectangle
        html += `<rect x="478" y="52" width="194" height="110" rx="4" fill="rgba(168,162,158,0.08)" stroke="none"/>`;
        html += '</g>';
        break;

      case 'frost':
        // Ice/frost crystals on evaporator (45-270, 340-450)
        html += '<g class="ca-overlay">';
        const frostChars = ['*', '+', '*', '+', '*'];
        for (let i = 0; i < 12; i++) {
          const cx = 55 + Math.random() * 200;
          const cy = 345 + Math.random() * 95;
          const size = 6 + Math.random() * 8;
          const dur = (2 + Math.random() * 2).toFixed(1);
          const char = frostChars[i % frostChars.length];
          html += `<text x="${cx.toFixed(0)}" y="${cy.toFixed(0)}" fill="#93c5fd" font-size="${size.toFixed(0)}" text-anchor="middle" opacity="0.5" font-weight="bold">
            ${char}
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="${dur}s" repeatCount="indefinite"/>
          </text>`;
        }
        // Ice film
        html += `<rect x="48" y="343" width="220" height="104" rx="4" fill="rgba(147,197,253,0.06)" stroke="none"/>`;
        html += '</g>';
        break;

      case 'reverse-flow':
        // Reverse flow arrows inside compressor (535-630, 355-465)
        html += `<g class="ca-overlay">
          <g opacity="0.9">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="0.8s" repeatCount="indefinite"/>
            <path d="M572,400 C572,385 592,385 592,400" stroke="#ef4444" stroke-width="2" fill="none" marker-end="url(#arrow-red)"/>
            <path d="M592,430 C592,415 572,415 572,430" stroke="#ef4444" stroke-width="2" fill="none" marker-end="url(#arrow-red)"/>
          </g>
          <text x="582" y="450" text-anchor="middle" fill="#ef4444" font-size="7" font-weight="600" opacity="0.8">역류</text>
        </g>`;
        break;

      case 'air-bubbles':
        // Gray air bubbles floating in condenser area
        html += '<g class="ca-overlay">';
        for (let i = 0; i < 6; i++) {
          const cx = 500 + Math.random() * 140;
          const cy = 70 + Math.random() * 70;
          const r = 3 + Math.random() * 3;
          const dur = (2.5 + Math.random() * 1.5).toFixed(1);
          html += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(1)}" fill="none" stroke="#9ca3af" stroke-width="1" stroke-dasharray="2,2" opacity="0.5">
            <animate attributeName="cy" values="${cy.toFixed(0)};${(cy - 20).toFixed(0)};${cy.toFixed(0)}" dur="${dur}s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="${dur}s" repeatCount="indefinite"/>
          </circle>`;
        }
        html += '</g>';
        break;

      case 'blocked':
        // X mark on TXV (centered ~130, 108)
        html += `<g class="ca-overlay">
          <g opacity="0.9">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="0.8s" repeatCount="indefinite"/>
            <line x1="118" y1="96" x2="142" y2="120" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
            <line x1="142" y1="96" x2="118" y2="120" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
          </g>
        </g>`;
        break;

      case 'flood':
        // Liquid flood warning on suction line
        html += `<g class="ca-overlay">
          <g opacity="0.85">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite"/>
            <rect x="300" y="395" width="70" height="22" rx="4" fill="rgba(239,68,68,0.15)" stroke="#ef4444" stroke-width="1"/>
            <text x="335" y="410" text-anchor="middle" fill="#ef4444" font-size="8" font-weight="700">액백 위험</text>
          </g>
        </g>`;
        break;
    }

    overlayGroup.innerHTML = html;
  }

  function showFaultLabel(text, sl) {
    // Remove existing
    let label = document.querySelector('.ca-fault-label');
    if (label) label.remove();

    const wrapper = document.querySelector('.cycle-diagram-wrapper');
    if (!wrapper) return;

    const severity = sl || 2;
    const slClass = severity >= 4 ? 'ca-sl4' : severity >= 3 ? 'ca-sl3' : severity >= 2 ? 'ca-sl2' : 'ca-sl1';

    label = document.createElement('div');
    label.className = `ca-fault-label ${slClass}`;
    label.innerHTML = `<span class="ca-fault-text">${text}</span>`;
    wrapper.appendChild(label);
  }


  // ============================================================
  // MODE MANAGEMENT
  // ============================================================
  function setMode(newMode) {
    if (mode === newMode) return;
    mode = newMode;
    const wrapper = document.querySelector('.cycle-diagram-wrapper');
    if (wrapper) {
      wrapper.classList.remove('ca-mode-normal', 'ca-mode-measurement', 'ca-mode-diagnostic');
      wrapper.classList.add('ca-mode-' + newMode);
    }
  }


  // ============================================================
  // INTEGRATION: Respond to diagnosis results
  // ============================================================
  function onDiagnosisResult(diagResult) {
    if (!initialized) return;

    if (!diagResult || !diagResult.diagKey || diagResult.diagKey === 'normal') {
      clearFault();
      initParticles(12);
      setMode(mode === 'diagnostic' ? 'measurement' : mode);
      return;
    }

    // Map diagKey → faultId
    let faultId = null;
    if (typeof FaultSignatures !== 'undefined') {
      faultId = FaultSignatures.mapDiagKeyToFault(diagResult.diagKey);
    }
    if (!faultId) {
      // Fallback mapping
      const fallback = {
        lowCharge: 'refrigerant_low',
        overcharge: 'refrigerant_high',
        meteringRestriction: 'txv_restricted',
        compressorWeak: 'compressor_valve_leak',
        txvOverfeed: 'txv_stuck_open',
        lowAirflow: 'evaporator_fouling'
      };
      faultId = fallback[diagResult.diagKey];
    }

    const sl = diagResult.severity?.level || 2;
    applyFault(faultId, sl);
  }


  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    init,
    setMode,
    updateValueCards,
    applyFault,
    clearFault,
    onDiagnosisResult,
    startAnimation,
    stopAnimation,
    setSpeed: (s) => { speed = s; },
    getMode: () => mode,
    isInitialized: () => initialized
  };

})();

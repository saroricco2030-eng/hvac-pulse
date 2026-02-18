// ===================================================
// HVAC Pulse — Interactive Cycle Visualization
// Copyright (c) 2024-2026. All rights reserved.
// SVG-based refrigeration cycle diagram with touch interaction
// Particle flow animation, measurement points, diagnostic overlay
// ===================================================

const CycleVisualization = (() => {

  // --- State ---
  let measurements = {};
  let selectedRefrigerant = 'R-410A';
  let activeComponent = null;

  // Computed values from measurements
  let computed = {
    suctionSatTemp: null,
    condensingSatTemp: null,
    superheat: null,
    subcooling: null,
    deltaT: null,
    compressionRatio: null
  };

  // --- Status colors ---
  const STATUS_COLORS = {
    normal:  { fill: '#10b981', stroke: '#059669', get label() { return t('status.normal', '정상'); } },
    caution: { fill: '#f59e0b', stroke: '#d97706', get label() { return t('status.caution', '주의'); } },
    danger:  { fill: '#ef4444', stroke: '#dc2626', get label() { return t('status.danger', '위험'); } },
    info:    { fill: '#3b82f6', stroke: '#2563eb', label: '—' }
  };

  // ============================================================
  // INIT
  // ============================================================
  function initUI() {
    const container = document.getElementById('cycle-content');
    if (!container) return;
    container.innerHTML = renderMain();
    setupEventListeners();

    // Initialize cycle animation after SVG is in DOM
    if (typeof CycleAnimation !== 'undefined') {
      setTimeout(() => CycleAnimation.init(), 50);
    }

    // Initialize gauge dashboard
    if (typeof GaugeDashboard !== 'undefined') {
      setTimeout(() => GaugeDashboard.init(), 80);
    }
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================
  function renderMain() {
    return `
      <div class="cycle-header-bar">
        <div>
          <h1 class="cycle-page-title">🔄 ${t('cycle.title', '냉동 사이클')}</h1>
          <p class="cycle-page-sub">${t('cycle.subtitle', '부품 터치 → 정보 · 배지 터치 → 값 입력')}</p>
        </div>
        <select id="cycle-ref-select" class="form-select cycle-ref-sel" aria-label="Refrigerant">${getRefrigerantOptions()}</select>
      </div>

      <div class="cycle-flow-strip">
        <div class="cfs-step cfs-red"><span class="cfs-num">①</span>${t('cycle.compress', '압축')}</div>
        <span class="cfs-sep">→</span>
        <div class="cfs-step cfs-orange"><span class="cfs-num">②</span>${t('cycle.condense', '응축')}</div>
        <span class="cfs-sep">→</span>
        <div class="cfs-step cfs-purple"><span class="cfs-num">③</span>${t('cycle.expand', '팽창')}</div>
        <span class="cfs-sep">→</span>
        <div class="cfs-step cfs-blue"><span class="cfs-num">④</span>${t('cycle.evaporate', '증발')}</div>
        <span class="cfs-sep cfs-loop">↩</span>
      </div>

      <div class="cycle-diagram-wrapper">
        <div class="cycle-diagram-container" id="cycle-svg-container">
          ${generateSVG()}
        </div>
        <div class="cycle-legend">
          <span class="legend-item"><span class="legend-dot" style="background:#ef4444"></span>${t('cycle.high_gas', '고압가스')}</span>
          <span class="legend-item"><span class="legend-dot" style="background:#f59e0b"></span>${t('cycle.high_liquid', '고압액체')}</span>
          <span class="legend-item"><span class="legend-dot" style="background:#8b5cf6"></span>${t('cycle.mixed', '혼합')}</span>
          <span class="legend-item"><span class="legend-dot" style="background:#3b82f6"></span>${t('cycle.low_gas', '저압가스')}</span>
        </div>
      </div>

      <div class="glass-card" id="cycle-values-summary" style="display:none">
        <div class="section-title">${t('cycle.values_summary', '측정값 요약')}</div>
        <div id="cycle-values-grid" class="cycle-values-grid"></div>
      </div>

      <div style="padding:0 4px">
        <button class="btn btn-primary" id="cycle-diag-btn" style="width:100%;margin-top:12px;padding:14px;font-size:var(--text-base)" disabled>
          🔍 ${t('cycle.run_diag', '사이클 진단 실행')}
        </button>
      </div>

      <div id="cycle-diag-result"></div>

      <!-- Info Panel (bottom sheet) -->
      <div class="cycle-overlay" id="cycle-overlay" onclick="CycleVisualization.closePanel()"></div>
      <div class="cycle-info-panel" id="cycle-info-panel">
        <div class="cycle-panel-handle"></div>
        <div id="cycle-panel-content"></div>
      </div>

      <!-- Input Modal -->
      <div class="cycle-modal-overlay" id="cycle-modal" onclick="CycleVisualization.closeModal(event)">
        <div class="cycle-modal" onclick="event.stopPropagation()">
          <div class="cycle-modal-header">
            <span id="cycle-modal-title"></span>
            <button class="cycle-modal-close" onclick="CycleVisualization.closeModal()">&times;</button>
          </div>
          <div id="cycle-modal-body"></div>
        </div>
      </div>
    `;
  }

  function getRefrigerantOptions() {
    return getRefrigerantList().map(key => {
      const r = REFRIGERANT_DB[key];
      const sel = key === selectedRefrigerant ? ' selected' : '';
      return `<option value="${key}"${sel}>${key} (${r.safety})</option>`;
    }).join('');
  }

  // ============================================================
  // SVG GENERATION
  // ============================================================
  function generateSVG() {
    return `
    <svg viewBox="0 0 760 540" xmlns="http://www.w3.org/2000/svg" class="cycle-svg" id="cycle-svg">
      <defs>
        ${svgDefs()}
      </defs>

      <!-- Zone backgrounds & labels -->
      ${svgZones()}

      <!-- Piping (behind components) -->
      ${svgPiping()}

      <!-- Particles -->
      ${svgParticles()}

      <!-- Components -->
      ${svgCompressor()}
      ${svgCondenser()}
      ${svgTXV()}
      ${svgEvaporator()}
      ${svgReceiver()}
      ${svgSightGlass()}
      ${svgAccumulator()}

      <!-- Airflow arrows -->
      ${svgAirflow()}

      <!-- Measurement point badges -->
      ${svgMeasurePoints()}
    </svg>`;
  }

  // --- SVG Defs (gradients, filters, markers) ---
  function svgDefs() {
    return `
      <filter id="glow-sm">
        <feGaussianBlur stdDeviation="2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="glow-lg">
        <feGaussianBlur stdDeviation="4" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
      </filter>

      <linearGradient id="grad-comp" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="grad-expansion" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f59e0b"/>
        <stop offset="50%" stop-color="#8b5cf6"/>
        <stop offset="100%" stop-color="#3b82f6"/>
      </linearGradient>

      <marker id="arrow-red" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444"/>
      </marker>
      <marker id="arrow-blue" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#3b82f6"/>
      </marker>
      <marker id="arrow-orange" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/>
      </marker>

      <!-- Warning pulse animation -->
      <style>
        @keyframes cv-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes cv-badge-pulse { 0%,100%{r:16} 50%{r:19} }
        .cv-warning { animation: cv-pulse 1.2s ease-in-out infinite; }
        .cv-comp-hover:hover { cursor:pointer; filter:url(#glow-sm); }
        .cv-badge-hover:hover { cursor:pointer; }
        .cv-badge-hover:hover circle.badge-bg { filter:url(#glow-sm); }
      </style>
    `;
  }

  // --- Zone backgrounds & labels ---
  function svgZones() {
    return `
      <rect x="0" y="0" width="760" height="245" fill="rgba(239,68,68,0.015)"/>
      <rect x="0" y="275" width="760" height="265" fill="rgba(59,130,246,0.015)"/>
      <line x1="30" y1="260" x2="730" y2="260" stroke="rgba(255,255,255,0.04)" stroke-width="1" stroke-dasharray="8,5"/>
      <text x="735" y="35" text-anchor="end" fill="rgba(239,68,68,0.2)" font-size="9" font-weight="600" letter-spacing="1.5">HIGH SIDE</text>
      <text x="735" y="295" text-anchor="end" fill="rgba(59,130,246,0.2)" font-size="9" font-weight="600" letter-spacing="1.5">LOW SIDE</text>
      <text x="380" y="265" text-anchor="middle" fill="rgba(255,255,255,0.1)" font-size="8">● ${t('cycle.badge_hint', '배지를 터치하여 측정값을 입력하세요')}</text>
    `;
  }

  // --- Piping paths ---
  function svgPiping() {
    return `
      <!-- Discharge: Compressor top → Condenser bottom (RED hot gas) -->
      <path id="pipe-discharge" d="M582,350 L582,170"
            stroke="#ef4444" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.85"
            marker-end="url(#arrow-red)"/>

      <!-- Condenser out → Receiver (ORANGE liquid) -->
      <path id="pipe-liq1" d="M475,100 L385,92"
            stroke="#f59e0b" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.85"/>

      <!-- Receiver → Sight Glass → TXV (ORANGE liquid) -->
      <path id="pipe-liq2" d="M325,92 L270,92"
            stroke="#f59e0b" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.85"/>
      <path id="pipe-liq3" d="M230,92 L175,102"
            stroke="#f59e0b" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.85"
            marker-end="url(#arrow-orange)"/>

      <!-- TXV → Evaporator (GRADIENT expansion) -->
      <path id="pipe-expansion" d="M130,148 L130,285 Q130,340 155,340"
            stroke="url(#grad-expansion)" stroke-width="5" fill="none" stroke-linecap="round"/>

      <!-- Evaporator out → Accumulator (BLUE suction) -->
      <path id="pipe-suct1" d="M270,415 L383,425"
            stroke="#3b82f6" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.85"/>

      <!-- Accumulator → Compressor (BLUE suction) -->
      <path id="pipe-suct2" d="M427,425 L535,408"
            stroke="#3b82f6" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.85"
            marker-end="url(#arrow-blue)"/>
    `;
  }

  // --- Animated particles ---
  function svgParticles() {
    const particles = [];
    // Helper: create N particles on a path
    const add = (pathId, color, dur, n, r) => {
      for (let i = 0; i < n; i++) {
        const begin = ((dur / n) * i).toFixed(1);
        particles.push(`
          <circle r="${r}" fill="${color}" opacity="0.8" filter="url(#glow-sm)">
            <animateMotion dur="${dur}s" repeatCount="indefinite" begin="${begin}s">
              <mpath href="#${pathId}"/>
            </animateMotion>
          </circle>`);
      }
    };

    // High pressure side — faster, red/orange, larger
    add('pipe-discharge', '#ef4444', 2.0, 3, 3.5);
    add('pipe-liq1',      '#f59e0b', 1.5, 2, 3);
    add('pipe-liq2',      '#f59e0b', 1.0, 2, 3);
    add('pipe-liq3',      '#f59e0b', 1.0, 2, 3);

    // Expansion — color shift, slow
    add('pipe-expansion', '#8b5cf6', 2.5, 3, 2.5);

    // Low pressure side — slower, blue, smaller
    add('pipe-suct1', '#3b82f6', 2.0, 3, 2.5);
    add('pipe-suct2', '#3b82f6', 1.8, 3, 2.5);

    return `<g class="cycle-particles">${particles.join('')}</g>`;
  }

  // --- Component: Compressor ---
  function svgCompressor() {
    return `
    <g id="comp-compressor" class="cv-comp-hover" onclick="CycleVisualization.showComponent('compressor')">
      <rect x="535" y="355" width="95" height="110" rx="22" fill="url(#grad-comp)" stroke="#3b82f6" stroke-width="2" filter="url(#shadow)"/>
      <ellipse cx="582" cy="360" rx="40" ry="10" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5"/>
      <circle cx="582" cy="415" r="20" fill="none" stroke="#334155" stroke-width="1.5"/>
      <text x="582" y="420" text-anchor="middle" fill="#64748b" font-size="14" font-weight="bold">M</text>
      <rect x="622" y="385" width="7" height="18" rx="2" fill="#475569"/>
      <text x="582" y="485" text-anchor="middle" fill="#e8ecf4" font-size="11" font-weight="600"><tspan fill="#ef4444">① </tspan>${t('cycle.compressor', '컴프레서')}</text>
      <!-- Touch area -->
      <rect x="525" y="345" width="115" height="130" rx="22" fill="transparent"/>
    </g>`;
  }

  // --- Component: Condenser ---
  function svgCondenser() {
    // Coil zigzag lines
    let coils = '';
    for (let y = 72; y <= 140; y += 12) {
      coils += `<line x1="490" y1="${y}" x2="660" y2="${y}" stroke="#334155" stroke-width="1"/>`;
    }
    return `
    <g id="comp-condenser" class="cv-comp-hover" onclick="CycleVisualization.showComponent('condenser')">
      <rect x="475" y="48" width="200" height="118" rx="6" fill="url(#grad-comp)" stroke="#ef4444" stroke-width="2" filter="url(#shadow)"/>
      ${coils}
      <!-- Fan -->
      <circle cx="700" cy="107" r="22" fill="#0f172a" stroke="#475569" stroke-width="1.5"/>
      <line x1="700" y1="88" x2="700" y2="126" stroke="#64748b" stroke-width="1.5"/>
      <line x1="681" y1="107" x2="719" y2="107" stroke="#64748b" stroke-width="1.5"/>
      <line x1="686" y1="92" x2="714" y2="122" stroke="#64748b" stroke-width="1"/>
      <line x1="714" y1="92" x2="686" y2="122" stroke="#64748b" stroke-width="1"/>
      <text x="575" y="185" text-anchor="middle" fill="#e8ecf4" font-size="11" font-weight="600"><tspan fill="#f59e0b">② </tspan>${t('cycle.condenser', '응축기')}</text>
      <rect x="465" y="38" width="220" height="138" rx="6" fill="transparent"/>
    </g>`;
  }

  // --- Component: TXV ---
  function svgTXV() {
    return `
    <g id="comp-txv" class="cv-comp-hover" onclick="CycleVisualization.showComponent('txv')">
      <!-- Valve body (diamond) -->
      <path d="M130,80 L165,108 L130,136 L95,108 Z" fill="url(#grad-comp)" stroke="#f59e0b" stroke-width="2" filter="url(#shadow)"/>
      <text x="130" y="113" text-anchor="middle" fill="#f59e0b" font-size="10" font-weight="bold">TXV</text>
      <!-- Sensing bulb -->
      <circle cx="85" cy="155" r="7" fill="#1e293b" stroke="#06b6d4" stroke-width="1.5"/>
      <!-- Capillary -->
      <path d="M92,152 Q110,140 96,112" stroke="#06b6d4" stroke-width="1" fill="none" stroke-dasharray="3,2"/>
      <text x="130" y="185" text-anchor="middle" fill="#e8ecf4" font-size="10" font-weight="600"><tspan fill="#8b5cf6">③ </tspan>${t('cycle.expansion_valve', '팽창밸브')}</text>
      <rect x="80" y="70" width="100" height="108" rx="4" fill="transparent"/>
    </g>`;
  }

  // --- Component: Evaporator ---
  function svgEvaporator() {
    let coils = '';
    for (let y = 360; y <= 440; y += 12) {
      coils += `<line x1="60" y1="${y}" x2="255" y2="${y}" stroke="#334155" stroke-width="1"/>`;
    }
    return `
    <g id="comp-evaporator" class="cv-comp-hover" onclick="CycleVisualization.showComponent('evaporator')">
      <rect x="45" y="340" width="225" height="110" rx="6" fill="url(#grad-comp)" stroke="#3b82f6" stroke-width="2" filter="url(#shadow)"/>
      ${coils}
      <!-- Fan -->
      <circle cx="38" cy="395" r="20" fill="#0f172a" stroke="#475569" stroke-width="1.5"/>
      <line x1="38" y1="378" x2="38" y2="412" stroke="#64748b" stroke-width="1.5"/>
      <line x1="21" y1="395" x2="55" y2="395" stroke="#64748b" stroke-width="1.5"/>
      <text x="157" y="470" text-anchor="middle" fill="#e8ecf4" font-size="11" font-weight="600"><tspan fill="#3b82f6">④ </tspan>${t('cycle.evaporator', '증발기')}</text>
      <rect x="15" y="330" width="260" height="130" rx="6" fill="transparent"/>
    </g>`;
  }

  // --- Component: Receiver / Filter Drier ---
  function svgReceiver() {
    return `
    <g id="comp-receiver" class="cv-comp-hover" onclick="CycleVisualization.showComponent('receiver')">
      <rect x="330" y="55" width="50" height="78" rx="14" fill="url(#grad-comp)" stroke="#f59e0b" stroke-width="1.5" filter="url(#shadow)"/>
      <line x1="340" y1="75" x2="370" y2="75" stroke="#475569" stroke-width="1"/>
      <line x1="340" y1="113" x2="370" y2="113" stroke="#475569" stroke-width="1"/>
      <text x="355" y="152" text-anchor="middle" fill="#e8ecf4" font-size="9" font-weight="600">${t('cycle.receiver', '수액기')}</text>
      <rect x="320" y="45" width="70" height="100" rx="14" fill="transparent"/>
    </g>`;
  }

  // --- Component: Sight Glass ---
  function svgSightGlass() {
    return `
    <g id="comp-sightGlass" class="cv-comp-hover" onclick="CycleVisualization.showComponent('sightGlass')">
      <circle cx="250" cy="92" r="18" fill="url(#grad-comp)" stroke="#f59e0b" stroke-width="1.5" filter="url(#shadow)"/>
      <circle cx="250" cy="92" r="11" fill="#0a0e1a" stroke="#475569" stroke-width="1"/>
      <circle cx="250" cy="92" r="5" fill="#f59e0b" opacity="0.3"/>
      <text x="250" y="125" text-anchor="middle" fill="#e8ecf4" font-size="8">S/G</text>
      <circle cx="250" cy="92" r="25" fill="transparent"/>
    </g>`;
  }

  // --- Component: Accumulator ---
  function svgAccumulator() {
    return `
    <g id="comp-accumulator" class="cv-comp-hover" onclick="CycleVisualization.showComponent('accumulator')">
      <rect x="383" y="390" width="44" height="72" rx="12" fill="url(#grad-comp)" stroke="#3b82f6" stroke-width="1.5" filter="url(#shadow)"/>
      <line x1="393" y1="405" x2="417" y2="405" stroke="#475569" stroke-width="1"/>
      <text x="405" y="480" text-anchor="middle" fill="#e8ecf4" font-size="9" font-weight="600">${t('cycle.accumulator', '어큐뮬')}</text>
      <rect x="373" y="380" width="64" height="94" rx="12" fill="transparent"/>
    </g>`;
  }

  // --- Airflow arrows ---
  function svgAirflow() {
    return `
      <!-- Condenser outdoor air -->
      <g opacity="0.4">
        <text x="738" y="178" fill="#ef4444" font-size="8" text-anchor="middle">${t('cycle.outdoor_temp', '외기온도')}</text>
        <line x1="728" y1="70" x2="728" y2="130" stroke="#ef4444" stroke-width="1" stroke-dasharray="4,3"/>
      </g>

      <!-- Evaporator indoor air (top → bottom through coil) -->
      <g opacity="0.4">
        <text x="15" y="335" fill="#3b82f6" font-size="9">${t('cycle.return_air', '리턴')}↓</text>
        <text x="20" y="458" fill="#06b6d4" font-size="9">${t('cycle.supply_air', '공급')}↓</text>
      </g>
    `;
  }

  // --- Measurement point badges ---
  function svgMeasurePoints() {
    const points = [
      { id: 'Pd',   x: 608, y: 320, color: '#ef4444' },
      { id: 'Ps',   x: 508, y: 435, color: '#3b82f6' },
      { id: 'SH',   x: 295, y: 400, color: '#06b6d4' },
      { id: 'SC',   x: 450, y: 98,  color: '#f59e0b' },
      { id: 'DLT',  x: 608, y: 255, color: '#ef4444' },
      { id: 'Tret', x: 157, y: 315, color: '#10b981' },
      { id: 'Tsup', x: 157, y: 500, color: '#10b981' },
      { id: 'Tamb', x: 738, y: 148, color: '#f59e0b' },
      { id: 'DT',   x: 80,  y: 500, color: '#06b6d4' }
    ];

    return points.map(p => {
      const mp = CYCLE_MEASURE_POINTS[p.id];
      const clickable = mp.inputType !== 'auto';
      const onclick = clickable ? `onclick="CycleVisualization.showMeasureInput('${p.id}')"` : '';
      const cursor = clickable ? 'cv-badge-hover' : '';
      return `
      <g id="badge-${p.id}" class="${cursor}" ${onclick}>
        <circle cx="${p.x}" cy="${p.y}" r="16" class="badge-bg" fill="#0f172a" stroke="${p.color}" stroke-width="2" opacity="0.9"/>
        <text x="${p.x}" y="${p.y + 4}" text-anchor="middle" fill="${p.color}" font-size="8" font-weight="bold">${mp.abbr}</text>
      </g>`;
    }).join('');
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  function setupEventListeners() {
    // Refrigerant select
    const refSel = document.getElementById('cycle-ref-select');
    if (refSel) {
      refSel.addEventListener('change', () => {
        selectedRefrigerant = refSel.value;
        recalculate();
      });
    }

    // Diagnose button
    const diagBtn = document.getElementById('cycle-diag-btn');
    if (diagBtn) {
      diagBtn.addEventListener('click', runCycleDiagnosis);
    }
  }

  // ============================================================
  // COMPONENT INFO PANEL (Bottom Sheet)
  // ============================================================
  function showComponent(compId) {
    const data = CYCLE_COMPONENTS[compId];
    if (!data) return;

    activeComponent = compId;

    // Highlight component on SVG
    clearHighlights();
    const el = document.getElementById(`comp-${compId}`);
    if (el) el.classList.add('cv-active');

    const content = document.getElementById('cycle-panel-content');
    content.innerHTML = `
      <div style="margin-bottom:12px">
        <div style="font-size:var(--text-lg);font-weight:700;color:var(--text-primary)">${I18n.getLang() === 'ko' ? data.name_kr : data.name_en}</div>
        <div style="font-size:var(--text-sm);color:var(--text-secondary)">${I18n.getLang() === 'ko' ? data.name_en : data.name_kr}</div>
      </div>
      <div style="font-size:var(--text-sm);color:var(--text-primary);margin-bottom:14px;line-height:1.6">${data.role}</div>

      <div class="cycle-panel-section">
        <div class="cycle-panel-label">${t('cycle.normal_state', '정상 상태')}</div>
        <ul class="cycle-panel-list green">${data.normalConditions.map(c => `<li>${c}</li>`).join('')}</ul>
      </div>

      <div class="cycle-panel-section">
        <div class="cycle-panel-label">${t('cycle.failure_symptoms', '고장 시 증상')}</div>
        <ul class="cycle-panel-list red">${data.failureSymptoms.map(s => `<li>${s}</li>`).join('')}</ul>
      </div>

      <div class="cycle-panel-section">
        <div class="cycle-panel-label">${t('cycle.check_points', '점검 포인트')}</div>
        <ul class="cycle-panel-list blue">${data.checkPoints.map(c => `<li>${c}</li>`).join('')}</ul>
      </div>

      ${data.relatedErrors.length ? `
      <div class="cycle-panel-section">
        <div class="cycle-panel-label">${t('cycle.related_errors', '관련 에러코드')}</div>
        <ul class="cycle-panel-list orange">${data.relatedErrors.map(e => `<li>${e}</li>`).join('')}</ul>
      </div>` : ''}

      ${data.relatedLink ? `
      <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="CycleVisualization.closePanel();App.switchTab('${data.relatedLink.nav}');setTimeout(()=>App.showSub('${data.relatedLink.nav}','${data.relatedLink.sub}'),50)">
        🔧 ${data.relatedLink.text}
      </button>` : ''}
    `;

    document.getElementById('cycle-overlay').classList.add('show');
    document.getElementById('cycle-info-panel').classList.add('show');
  }

  function closePanel() {
    document.getElementById('cycle-overlay').classList.remove('show');
    document.getElementById('cycle-info-panel').classList.remove('show');
    clearHighlights();
    activeComponent = null;
  }

  // ============================================================
  // MEASUREMENT INPUT MODAL
  // ============================================================
  function showMeasureInput(pointId) {
    const mp = CYCLE_MEASURE_POINTS[pointId];
    if (!mp || mp.inputType === 'auto') return;

    const modal = document.getElementById('cycle-modal');
    const title = document.getElementById('cycle-modal-title');
    const body = document.getElementById('cycle-modal-body');

    title.textContent = `${mp.abbr} — ${(I18n.getLang() !== 'ko' && mp.name_en) ? mp.name_en : mp.name_kr}`;

    const currentVal = measurements[pointId];
    const mpName = (I18n.getLang() !== 'ko' && mp.name_en) ? mp.name_en : mp.name_kr;
    let inputLabel = `${mpName} (${mp.unit})`;
    let helpText = mp.description;
    let showCalcToggle = false;

    // For SH/SC, offer auto-calc if pressure is available
    if (pointId === 'SH' && measurements.Ps != null) {
      showCalcToggle = true;
      inputLabel = t('cycle.suction_line_temp', '석션라인 실측온도') + ' (°F)';
      helpText = `Ps=${measurements.Ps} psig → ${t('cycle.auto_calc_from_sat', '포화온도에서 자동 계산')}`;
    } else if (pointId === 'SC' && measurements.Pd != null) {
      showCalcToggle = true;
      inputLabel = t('cycle.liquid_line_temp', '리퀴드라인 실측온도') + ' (°F)';
      helpText = `Pd=${measurements.Pd} psig → ${t('cycle.auto_calc_from_sat', '포화온도에서 자동 계산')}`;
    } else if (pointId === 'SH' || pointId === 'SC') {
      inputLabel = `${mpName} ${t('cycle.direct_input', '직접 입력')} (${mp.unit})`;
      helpText = `${t('cycle.pressure_not_entered', '압력 미입력')} — ${pointId === 'SH' ? t('cycle.enter_ps_first', 'Ps 먼저 입력 시 자동 계산 가능') : t('cycle.enter_pd_first', 'Pd 먼저 입력 시 자동 계산 가능')}`;
    }

    body.innerHTML = `
      <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:12px">${helpText}</div>
      <div style="font-size:var(--text-xs);color:var(--accent-green);margin-bottom:12px">${t('cycle.normal_range', '정상 범위')}: ${mp.normalRange}</div>
      <div class="form-group">
        <label class="form-label">${inputLabel}</label>
        <input type="number" id="cycle-input-val" class="form-input" style="font-size:var(--text-xl);text-align:center"
               value="${currentVal != null ? currentVal : ''}" placeholder="${t('cycle.enter_value', '값 입력')}" step="0.1" inputmode="decimal"
               onkeydown="if(event.key==='Enter')CycleVisualization.submitMeasure('${pointId}')">
      </div>
      <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="CycleVisualization.submitMeasure('${pointId}')">
        ${t('common.confirm', '확인')}
      </button>
      ${currentVal != null ? `
      <button class="btn" style="width:100%;margin-top:6px;background:transparent;border:1px solid var(--border);color:var(--text-secondary)"
              onclick="CycleVisualization.clearMeasure('${pointId}')">
        ${t('cycle.clear_value', '값 초기화')}
      </button>` : ''}
    `;

    modal.classList.add('show');
    setTimeout(() => document.getElementById('cycle-input-val')?.focus(), 100);
  }

  function submitMeasure(pointId) {
    const input = document.getElementById('cycle-input-val');
    const val = parseFloat(input?.value);
    if (isNaN(val)) return;

    const mp = CYCLE_MEASURE_POINTS[pointId];

    // For SH with Ps available → input is suction line temp, calc SH
    if (pointId === 'SH' && measurements.Ps != null) {
      const result = PTCalculator.calcSuperheat(selectedRefrigerant, measurements.Ps, val);
      if (result) {
        measurements._suctionLineTemp = val;
        measurements.SH = result.superheat;
        computed.suctionSatTemp = result.satTemp;
        computed.superheat = result.superheat;
      } else {
        measurements.SH = val;
      }
    } else if (pointId === 'SC' && measurements.Pd != null) {
      const result = PTCalculator.calcSubcooling(selectedRefrigerant, measurements.Pd, val);
      if (result) {
        measurements._liquidLineTemp = val;
        measurements.SC = result.subcooling;
        computed.condensingSatTemp = result.satTemp;
        computed.subcooling = result.subcooling;
      } else {
        measurements.SC = val;
      }
    } else if (pointId === 'Pd') {
      measurements.Pd = val;
      // Calc condensing sat temp
      const satTemp = PTCalculator.getTempFromPressure(selectedRefrigerant, val, 'bubble');
      if (satTemp != null) computed.condensingSatTemp = parseFloat(satTemp.toFixed(1));
      // Recalc SC if liquid line temp exists
      if (measurements._liquidLineTemp != null) {
        const scResult = PTCalculator.calcSubcooling(selectedRefrigerant, val, measurements._liquidLineTemp);
        if (scResult) { measurements.SC = scResult.subcooling; computed.subcooling = scResult.subcooling; }
      }
    } else if (pointId === 'Ps') {
      measurements.Ps = val;
      const satTemp = PTCalculator.getTempFromPressure(selectedRefrigerant, val, 'dew');
      if (satTemp != null) computed.suctionSatTemp = parseFloat(satTemp.toFixed(1));
      // Recalc SH if suction line temp exists
      if (measurements._suctionLineTemp != null) {
        const shResult = PTCalculator.calcSuperheat(selectedRefrigerant, val, measurements._suctionLineTemp);
        if (shResult) { measurements.SH = shResult.superheat; computed.superheat = shResult.superheat; }
      }
    } else {
      measurements[pointId] = val;
    }

    // Auto-calc ΔT
    if (measurements.Tret != null && measurements.Tsup != null) {
      measurements.DT = parseFloat((measurements.Tret - measurements.Tsup).toFixed(1));
    }

    // Compression ratio
    if (measurements.Pd != null && measurements.Ps != null) {
      computed.compressionRatio = parseFloat(((measurements.Pd + 14.7) / (measurements.Ps + 14.7)).toFixed(1));
    }

    closeModal();
    updateAllBadges();
    updateValuesSummary();
    updateDiagButton();
  }

  function clearMeasure(pointId) {
    delete measurements[pointId];
    if (pointId === 'SH') { delete measurements._suctionLineTemp; computed.superheat = null; }
    if (pointId === 'SC') { delete measurements._liquidLineTemp; computed.subcooling = null; }
    if (pointId === 'Pd') computed.condensingSatTemp = null;
    if (pointId === 'Ps') computed.suctionSatTemp = null;
    if (pointId === 'Tret' || pointId === 'Tsup') delete measurements.DT;

    closeModal();
    updateAllBadges();
    updateValuesSummary();
    updateDiagButton();

    // Clear fault animation if SH/SC changed
    if ((pointId === 'SH' || pointId === 'SC') && typeof CycleAnimation !== 'undefined' && CycleAnimation.isInitialized()) {
      CycleAnimation.clearFault();
      const resultEl = document.getElementById('cycle-diag-result');
      if (resultEl) resultEl.innerHTML = '';
    }

    // Clear gauge highlights
    if (typeof GaugeDashboard !== 'undefined' && GaugeDashboard.isInitialized()) {
      GaugeDashboard.clearHighlights();
    }
  }

  function closeModal(event) {
    if (event && event.target !== document.getElementById('cycle-modal')) return;
    document.getElementById('cycle-modal').classList.remove('show');
  }

  // ============================================================
  // BADGE & UI UPDATES
  // ============================================================
  function updateAllBadges() {
    const allPoints = Object.keys(CYCLE_MEASURE_POINTS);
    allPoints.forEach(pid => {
      const badge = document.getElementById(`badge-${pid}`);
      if (!badge) return;

      const mp = CYCLE_MEASURE_POINTS[pid];
      const val = measurements[pid];
      const bg = badge.querySelector('circle.badge-bg');
      const txt = badge.querySelector('text');

      if (val != null) {
        const ctx = { ...measurements, suctionSatTemp: computed.suctionSatTemp, condensingSatTemp: computed.condensingSatTemp };
        const status = mp.getStatus(val, ctx);
        const sc = STATUS_COLORS[status];
        bg.setAttribute('fill', sc.fill);
        bg.setAttribute('stroke', sc.stroke);
        bg.setAttribute('opacity', '1');
        txt.setAttribute('fill', '#fff');

        // Show value
        let displayVal = val;
        if (Math.abs(val) >= 100) displayVal = Math.round(val);
        else displayVal = val.toFixed(0);
        txt.textContent = displayVal;
        txt.setAttribute('font-size', '9');
      } else {
        // Reset to default
        const defaultColors = {
          Pd: '#ef4444', Ps: '#3b82f6', SH: '#06b6d4', SC: '#f59e0b',
          DLT: '#ef4444', Tret: '#10b981', Tsup: '#10b981', Tamb: '#f59e0b', DT: '#06b6d4'
        };
        bg.setAttribute('fill', '#0f172a');
        bg.setAttribute('stroke', defaultColors[pid] || '#3b82f6');
        bg.setAttribute('opacity', '0.9');
        txt.setAttribute('fill', defaultColors[pid] || '#3b82f6');
        txt.textContent = mp.abbr;
        txt.setAttribute('font-size', '8');
      }
    });
  }

  function updateValuesSummary() {
    const grid = document.getElementById('cycle-values-grid');
    const card = document.getElementById('cycle-values-summary');
    const entries = Object.keys(CYCLE_MEASURE_POINTS).filter(k => measurements[k] != null);

    // Update animation value cards
    if (typeof CycleAnimation !== 'undefined' && CycleAnimation.isInitialized()) {
      if (entries.length > 0) {
        CycleAnimation.setMode('measurement');
        CycleAnimation.updateValueCards(measurements, computed);
      } else {
        CycleAnimation.setMode('normal');
        CycleAnimation.updateValueCards({}, {});
      }
    }

    // Update gauge dashboard
    if (typeof GaugeDashboard !== 'undefined' && GaugeDashboard.isInitialized()) {
      GaugeDashboard.updateGauges(measurements, computed, selectedRefrigerant);
    }

    if (entries.length === 0) {
      card.style.display = 'none';
      return;
    }

    card.style.display = '';
    let html = '';
    entries.forEach(pid => {
      const mp = CYCLE_MEASURE_POINTS[pid];
      const val = measurements[pid];
      const ctx = { ...measurements, suctionSatTemp: computed.suctionSatTemp, condensingSatTemp: computed.condensingSatTemp };
      const status = mp.getStatus(val, ctx);
      const sc = STATUS_COLORS[status];

      let extra = '';
      if (pid === 'Pd' && computed.condensingSatTemp != null) extra = `<div style="font-size:var(--text-xs);color:var(--text-secondary)">${t('cycle.saturation', '포화')} ${computed.condensingSatTemp}°F</div>`;
      if (pid === 'Ps' && computed.suctionSatTemp != null) extra = `<div style="font-size:var(--text-xs);color:var(--text-secondary)">${t('cycle.saturation', '포화')} ${computed.suctionSatTemp}°F</div>`;

      html += `
        <div class="cycle-val-item">
          <div class="cycle-val-label">${mp.abbr}</div>
          <div class="cycle-val-num" style="color:${sc.fill}">${typeof val === 'number' ? val.toFixed(1) : val}</div>
          <div class="cycle-val-unit">${mp.unit}</div>
          ${extra}
        </div>`;
    });

    if (computed.compressionRatio != null) {
      const crColor = computed.compressionRatio > 12 ? '#ef4444' : computed.compressionRatio > 10 ? '#f59e0b' : '#10b981';
      html += `
        <div class="cycle-val-item">
          <div class="cycle-val-label">${t('cycle.compression_ratio', '압축비')}</div>
          <div class="cycle-val-num" style="color:${crColor}">${computed.compressionRatio}</div>
          <div class="cycle-val-unit">:1</div>
        </div>`;
    }

    grid.innerHTML = html;
  }

  function updateDiagButton() {
    const btn = document.getElementById('cycle-diag-btn');
    if (!btn) return;
    // Need at least SH and SC (or enough data to compute them)
    const hasSH = measurements.SH != null;
    const hasSC = measurements.SC != null;
    btn.disabled = !(hasSH && hasSC);
  }

  // ============================================================
  // DIAGNOSIS
  // ============================================================
  function runCycleDiagnosis() {
    const sh = measurements.SH;
    const sc = measurements.SC;
    if (sh == null || sc == null) return;

    // Use diagnostic engine's classification
    const shClass = sh > 20 ? 'high' : sh < 5 ? 'low' : 'normal';
    const scClass = sc > 18 ? 'high' : sc < 5 ? 'low' : 'normal';

    let diagKey = 'normal';
    if (shClass === 'normal' && scClass === 'normal') diagKey = 'normal';
    else if (shClass === 'high' && scClass === 'low') diagKey = 'lowCharge';
    else if (shClass === 'high' && scClass === 'high') diagKey = 'meteringRestriction';
    else if (shClass === 'low' && scClass === 'high') diagKey = 'overcharge';
    else if (shClass === 'low' && scClass === 'low') diagKey = 'compressorWeak';
    else if (shClass === 'low' && scClass === 'normal') diagKey = 'txvOverfeed';
    else if (shClass === 'high' && scClass === 'normal') diagKey = 'lowAirflow';
    else if (shClass === 'normal' && scClass === 'high') diagKey = 'overcharge';
    else if (shClass === 'normal' && scClass === 'low') diagKey = 'lowCharge';

    // Highlight affected components
    clearHighlights();
    const affectedComps = DIAG_COMPONENT_MAP[diagKey] || [];
    affectedComps.forEach(cid => {
      const el = document.getElementById(`comp-${cid}`);
      if (el) el.classList.add('cv-warning');
    });

    // Build result
    const resultEl = document.getElementById('cycle-diag-result');
    const shIcon = shClass === 'normal' ? '✅' : shClass === 'high' ? '🔺' : '🔻';
    const scIcon = scClass === 'normal' ? '✅' : scClass === 'high' ? '🔺' : '🔻';

    // Extra warnings
    let warnings = '';
    if (measurements.DLT != null && measurements.DLT > 275) {
      warnings += `<div class="alert-box alert-danger"><span>🚨</span><span>DLT ${measurements.DLT}°F (>275°F) — ${t('cycle.warn_oil_breakdown', '오일 파괴 위험!')}</span></div>`;
    }
    if (computed.compressionRatio != null && computed.compressionRatio > 12) {
      warnings += `<div class="alert-box alert-danger"><span>🔴</span><span>${t('cycle.compression_ratio', '압축비')} ${computed.compressionRatio}:1 (>12:1) — ${t('cycle.warn_compressor_overload', '컴프레서 과부하!')}</span></div>`;
    }
    if (measurements.DT != null && (measurements.DT < 10 || measurements.DT > 28)) {
      const dtStatus = measurements.DT < 10 ? t('cycle.warn_dt_low', '과소 (결빙?)') : t('cycle.warn_dt_high', '과대 (에어플로우?)');
      warnings += `<div class="alert-box alert-warning"><span>⚠️</span><span>ΔT ${measurements.DT}°F — ${dtStatus}</span></div>`;
    }

    // Diagnosis icon/title from diagnostic engine mapping
    const DIAG_DISPLAY = {
      normal:              { icon: '✅', title: t('diag.normal.title', '시스템 정상'), level: 'normal' },
      lowCharge:           { icon: '🔴', title: t('diag.lowcharge.title', '냉매 부족 (누설 의심)'), level: 'danger' },
      meteringRestriction: { icon: '🟠', title: t('diag.metering.title', '계량장치 제한 (TXV/필터)'), level: 'caution' },
      overcharge:          { icon: '🔴', title: t('diag.overcharge.title', '냉매 과충전'), level: 'danger' },
      compressorWeak:      { icon: '🔴', title: t('diag.compressor.title', '컴프레서 불량'), level: 'danger' },
      txvOverfeed:         { icon: '🟡', title: t('diag.txvoverfeed.title', 'TXV 오버피딩'), level: 'caution' },
      lowAirflow:          { icon: '🟠', title: t('diag.lowairflow.title', '에어플로우 부족'), level: 'caution' }
    };

    const diag = DIAG_DISPLAY[diagKey];
    const affectedNames = affectedComps.map(cid => {
      const comp = CYCLE_COMPONENTS[cid];
      return comp ? ((I18n.getLang() !== 'ko' && comp.name_en) ? comp.name_en : comp.name_kr) : cid;
    }).join(', ');

    // --- Advanced Diagnostic enrichment ---
    let severityHtml = '';
    let signatureHtml = '';
    let fieldTipsHtml = '';
    let severity = null;

    if (typeof AdvancedDiagnostic !== 'undefined' && diagKey !== 'normal') {
      severity = AdvancedDiagnostic.determineSeverity(diagKey, sh, sc, computed.compressionRatio || 0);
      if (severity) {
        severityHtml = AdvancedDiagnostic.renderSeverityBadge(severity);
      }
      const sigDisplay = AdvancedDiagnostic.getSignatureDisplay(diagKey);
      if (sigDisplay && sigDisplay.signatures) {
        signatureHtml = AdvancedDiagnostic.renderSignatureArrows(sigDisplay.signatures);
      }
      if (sigDisplay && sigDisplay.fieldTips) {
        fieldTipsHtml = AdvancedDiagnostic.renderFieldTips(sigDisplay.fieldTips);
      }
    }

    const cycleDiagResult = {
      superheat: sh, subcooling: sc, shClass, scClass, diagKey,
      diagnosis: diag, compressionRatio: computed.compressionRatio,
      severity, source: 'CycleVisualization'
    };
    if (typeof DataBridge !== 'undefined') {
      DataBridge.setDiagResult(cycleDiagResult);
    }

    resultEl.innerHTML = `
      <div class="glass-card" style="margin-top:16px;border:1px solid ${diag.level === 'normal' ? 'rgba(16,185,129,0.3)' : diag.level === 'danger' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}">
        ${severityHtml}
        <div style="text-align:center;margin-bottom:12px">
          <div style="font-size:var(--text-3xl)">${diag.icon}</div>
          <div style="font-size:var(--text-lg);font-weight:700;color:var(--text-primary)">${diag.title}</div>
        </div>

        ${signatureHtml}

        <div class="computed-row" style="grid-template-columns:1fr 1fr;margin-bottom:12px">
          <div class="computed-item">
            <div class="comp-value" style="color:${shClass==='normal'?'var(--accent-green)':shClass==='high'?'var(--accent-red)':'var(--accent-cyan)'}">${sh.toFixed(1)}°F ${shIcon}</div>
            <div class="comp-label">${t('pt.superheat', '과열도')} (${shClass === 'normal' ? t('status.normal', '정상') : shClass === 'high' ? t('status.high', '높음') : t('status.low', '낮음')})</div>
          </div>
          <div class="computed-item">
            <div class="comp-value" style="color:${scClass==='normal'?'var(--accent-green)':scClass==='high'?'var(--accent-red)':'var(--accent-cyan)'}">${sc.toFixed(1)}°F ${scIcon}</div>
            <div class="comp-label">${t('pt.subcooling', '과냉도')} (${scClass === 'normal' ? t('status.normal', '정상') : scClass === 'high' ? t('status.high', '높음') : t('status.low', '낮음')})</div>
          </div>
        </div>

        ${affectedComps.length ? `
        <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:8px">
          <strong style="color:var(--accent-orange)">${t('cycle.check_target', '점검 대상')}:</strong> ${affectedNames}
          <div style="font-size:var(--text-xs);margin-top:4px">↑ ${t('cycle.touch_blinking_hint', '다이어그램에서 깜빡이는 부품을 터치하면 상세 정보를 볼 수 있습니다.')}</div>
        </div>` : ''}

        ${fieldTipsHtml}

        ${warnings}

        <button class="btn" style="width:100%;margin-top:8px;background:transparent;border:1px solid var(--border);color:var(--text-secondary)"
                onclick="App.switchTab('tools');setTimeout(()=>{App.showCategory('diag');setTimeout(()=>App.showSub('tools','cross'),50)},50)">
          📊 ${t('cycle.cross_diag_detail', '교차 진단 엔진에서 상세 분석')} →
        </button>

        <div id="cycle-diag-actions"></div>
      </div>
    `;

    // Render related tool actions via DataBridge
    if (typeof DataBridge !== 'undefined' && diagKey !== 'normal') {
      const actionsEl = document.getElementById('cycle-diag-actions');
      if (actionsEl) DataBridge.renderRelatedActions(diagKey, actionsEl, cycleDiagResult);
    }

    // Trigger fault animation
    if (typeof CycleAnimation !== 'undefined' && CycleAnimation.isInitialized()) {
      CycleAnimation.onDiagnosisResult(cycleDiagResult);
    }

    // Highlight affected gauge
    if (typeof GaugeDashboard !== 'undefined' && GaugeDashboard.isInitialized()) {
      GaugeDashboard.highlightFromDiagnosis(cycleDiagResult);
    }
  }

  // ============================================================
  // HIGHLIGHTS
  // ============================================================
  function clearHighlights() {
    document.querySelectorAll('.cv-active, .cv-warning').forEach(el => {
      el.classList.remove('cv-active', 'cv-warning');
    });
  }

  function recalculate() {
    // When refrigerant changes, recalculate sat temps and dependent values
    if (measurements.Pd != null) {
      const satTemp = PTCalculator.getTempFromPressure(selectedRefrigerant, measurements.Pd, 'bubble');
      if (satTemp != null) computed.condensingSatTemp = parseFloat(satTemp.toFixed(1));
      if (measurements._liquidLineTemp != null) {
        const scResult = PTCalculator.calcSubcooling(selectedRefrigerant, measurements.Pd, measurements._liquidLineTemp);
        if (scResult) { measurements.SC = scResult.subcooling; computed.subcooling = scResult.subcooling; }
      }
    }
    if (measurements.Ps != null) {
      const satTemp = PTCalculator.getTempFromPressure(selectedRefrigerant, measurements.Ps, 'dew');
      if (satTemp != null) computed.suctionSatTemp = parseFloat(satTemp.toFixed(1));
      if (measurements._suctionLineTemp != null) {
        const shResult = PTCalculator.calcSuperheat(selectedRefrigerant, measurements.Ps, measurements._suctionLineTemp);
        if (shResult) { measurements.SH = shResult.superheat; computed.superheat = shResult.superheat; }
      }
    }
    updateAllBadges();
    updateValuesSummary();
    updateDiagButton();
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    initUI,
    showComponent,
    closePanel,
    showMeasureInput,
    submitMeasure,
    clearMeasure,
    closeModal
  };
})();

// ===================================================
// HVAC Pulse — Gauge Dashboard
// Automotive-style analog gauges for key HVAC metrics
// Pure SVG + JS + CSS (no external libraries)
// ===================================================

const GaugeDashboard = (() => {

  let initialized = false;
  let currentRefrigerant = 'R-410A';
  let lastValues = { superheat: null, subcooling: null, dlt: null, cop: null };
  let prevValues = { superheat: null, subcooling: null, dlt: null, cop: null };

  // --- Gauge Configurations ---
  const GAUGE_CONFIGS = {
    superheat: {
      id: 'gauge-superheat',
      label: '과열도',
      labelEn: 'Superheat',
      get unit() { return Settings.tempLabel(); },
      min: 0,
      max: 50,
      isDelta: true,
      get normalText() { return Settings.isMetric() ? `정상: ${(8*5/9).toFixed(0)}~${(14*5/9).toFixed(0)}°C` : '정상: 8~14°F'; },
      zones: [
        { from: 0,  to: 5,  color: '#ef4444' },  // danger low
        { from: 5,  to: 8,  color: '#f59e0b' },  // caution low
        { from: 8,  to: 14, color: '#10b981' },  // normal
        { from: 14, to: 20, color: '#f59e0b' },  // caution high
        { from: 20, to: 50, color: '#ef4444' }   // danger high
      ],
      getStatus: (v) => {
        if (v >= 8 && v <= 14) return 'normal';
        if ((v >= 5 && v < 8) || (v > 14 && v <= 20)) return 'caution';
        return 'danger';
      },
      specialWarning: (v) => v != null && v < 2 ? '액백 위험' : null
    },

    subcooling: {
      id: 'gauge-subcooling',
      label: '과냉도',
      labelEn: 'Subcooling',
      get unit() { return Settings.tempLabel(); },
      min: 0,
      max: 30,
      isDelta: true,
      get normalText() { return Settings.isMetric() ? `정상: ${(8*5/9).toFixed(0)}~${(14*5/9).toFixed(0)}°C` : '정상: 8~14°F'; },
      zones: [
        { from: 0,  to: 3,  color: '#ef4444' },
        { from: 3,  to: 8,  color: '#f59e0b' },
        { from: 8,  to: 14, color: '#10b981' },
        { from: 14, to: 20, color: '#f59e0b' },
        { from: 20, to: 30, color: '#ef4444' }
      ],
      getStatus: (v) => {
        if (v >= 8 && v <= 14) return 'normal';
        if ((v >= 3 && v < 8) || (v > 14 && v <= 20)) return 'caution';
        return 'danger';
      },
      specialWarning: null
    },

    dlt: {
      id: 'gauge-dlt',
      label: '토출온도',
      labelEn: 'Discharge Temp',
      get unit() { return Settings.tempLabel(); },
      min: 100,
      max: 300,
      isDelta: false,
      get normalText() { return Settings.isMetric() ? `정상: ${((140-32)*5/9).toFixed(0)}~${((200-32)*5/9).toFixed(0)}°C` : '정상: 140~200°F'; },
      zones: [
        { from: 100, to: 140, color: '#3b82f6' },  // cool (info)
        { from: 140, to: 200, color: '#10b981' },   // normal
        { from: 200, to: 225, color: '#f59e0b' },   // caution
        { from: 225, to: 275, color: '#ef4444' },   // danger
        { from: 275, to: 300, color: '#991b1b' }    // critical
      ],
      getStatus: (v) => {
        if (v >= 140 && v <= 200) return 'normal';
        if (v > 200 && v <= 225) return 'caution';
        if (v > 225) return 'danger';
        return 'info';
      },
      specialWarning: (v) => v != null && v > 275 ? '오일 파괴 위험' : null
    },

    cop: {
      id: 'gauge-cop',
      label: 'COP',
      labelEn: 'Efficiency',
      unit: '',
      min: 0,
      max: 8,
      normalText: '양호: 3.0+',
      zones: [
        { from: 0, to: 2, color: '#ef4444' },
        { from: 2, to: 3, color: '#f59e0b' },
        { from: 3, to: 5, color: '#10b981' },
        { from: 5, to: 8, color: '#3b82f6' }   // excellent
      ],
      getStatus: (v) => {
        if (v >= 3) return 'normal';
        if (v >= 2) return 'caution';
        return 'danger';
      },
      specialWarning: null
    }
  };

  // Gauge SVG geometry constants
  const GAUGE = {
    cx: 100,          // center X
    cy: 100,          // center Y
    r: 80,            // radius of arc
    strokeWidth: 10,  // arc thickness
    startAngle: -225, // degrees (bottom-left)
    endAngle: 45,     // degrees (bottom-right)
    needleLen: 65,    // needle length
    viewBox: '0 0 200 160'
  };
  const ARC_SPAN = GAUGE.endAngle - GAUGE.startAngle; // 270°

  // Fault → gauge highlighting map
  const FAULT_GAUGE_MAP = {
    refrigerant_low: 'gauge-superheat',
    refrigerant_high: 'gauge-subcooling',
    condenser_fouling: 'gauge-dlt',
    evaporator_fouling: 'gauge-superheat',
    compressor_valve_leak: 'gauge-cop',
    non_condensable: 'gauge-dlt',
    txv_restricted: 'gauge-superheat',
    txv_stuck_open: 'gauge-subcooling'
  };


  // ============================================================
  // INITIALIZATION
  // ============================================================
  function init() {
    if (initialized) return;
    initialized = true;
    renderDashboard();
  }

  function renderDashboard() {
    // Find where to insert: after cycle values summary, before diag button
    const cycleContent = document.getElementById('cycle-content');
    if (!cycleContent) return;

    // Check if already exists
    if (document.getElementById('gauge-dashboard')) return;

    const dashboard = document.createElement('div');
    dashboard.id = 'gauge-dashboard';
    dashboard.className = 'gauge-dashboard glass-card';
    dashboard.innerHTML = `
      <div class="gauge-dashboard-header">
        <div class="section-title" style="margin-bottom:0">계기판</div>
        <span class="gauge-dashboard-sub">측정값 입력 시 실시간 업데이트</span>
      </div>
      <div class="gauge-grid">
        ${renderGaugeCard('superheat')}
        ${renderGaugeCard('subcooling')}
        ${renderGaugeCard('dlt')}
        ${renderGaugeCard('cop')}
      </div>
    `;

    // Insert before the diag button
    const diagBtn = cycleContent.querySelector('#cycle-diag-btn')?.parentElement;
    const valuesSummary = document.getElementById('cycle-values-summary');
    const insertBefore = diagBtn || valuesSummary?.nextSibling;
    if (insertBefore) {
      insertBefore.parentNode.insertBefore(dashboard, insertBefore);
    } else {
      cycleContent.appendChild(dashboard);
    }
  }

  function renderGaugeCard(key) {
    const cfg = GAUGE_CONFIGS[key];
    return `
      <div class="gauge-card" id="${cfg.id}">
        <div class="gauge-svg-wrap">
          ${renderGaugeSVG(key, null)}
        </div>
        <div class="gauge-info">
          <span class="gauge-normal-range">${cfg.normalText}</span>
          <span class="gauge-direction" id="${cfg.id}-dir"></span>
        </div>
        <div class="gauge-warning" id="${cfg.id}-warn"></div>
      </div>
    `;
  }


  // ============================================================
  // SVG GAUGE RENDERING
  // ============================================================
  function renderGaugeSVG(key, value) {
    const cfg = GAUGE_CONFIGS[key];
    const { cx, cy, r, strokeWidth, viewBox } = GAUGE;

    // Build zone arcs
    let zonesHtml = '';
    cfg.zones.forEach(zone => {
      zonesHtml += createArcPath(zone.from, zone.to, zone.color, cfg.min, cfg.max, 0.65);
    });

    // Tick marks
    let ticksHtml = '';
    const tickCount = 6;
    const range = cfg.max - cfg.min;
    for (let i = 0; i <= tickCount; i++) {
      const val = cfg.min + (range / tickCount) * i;
      const angle = valueToAngle(val, cfg.min, cfg.max);
      const rad = angle * Math.PI / 180;
      const outerR = r + 3;
      const innerR = r - 14;
      const x1 = cx + outerR * Math.cos(rad);
      const y1 = cy + outerR * Math.sin(rad);
      const x2 = cx + innerR * Math.cos(rad);
      const y2 = cy + innerR * Math.sin(rad);
      ticksHtml += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/>`;

      // Tick label
      const labelR = r - 24;
      const lx = cx + labelR * Math.cos(rad);
      const ly = cy + labelR * Math.sin(rad);
      let displayVal;
      if (key !== 'cop' && Settings.isMetric()) {
        const cVal = cfg.isDelta ? val * 5 / 9 : (val - 32) * 5 / 9;
        displayVal = Math.round(cVal);
      } else {
        displayVal = Number.isInteger(val) ? val : val.toFixed(1);
      }
      ticksHtml += `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle" fill="#64748b" font-size="7" font-family="'JetBrains Mono', monospace">${displayVal}</text>`;
    }

    // Needle
    const needleAngle = value != null ? valueToAngle(clamp(value, cfg.min, cfg.max), cfg.min, cfg.max) : valueToAngle(cfg.min, cfg.min, cfg.max);
    const needleOpacity = value != null ? 1 : 0.2;

    // Value display
    let displayValue = '—';
    if (value != null) {
      if (key === 'cop') {
        displayValue = value.toFixed(2);
      } else if (Settings.isMetric()) {
        displayValue = cfg.isDelta ? (value * 5 / 9).toFixed(1) : ((value - 32) * 5 / 9).toFixed(1);
      } else {
        displayValue = value.toFixed(1);
      }
    }
    const status = value != null ? cfg.getStatus(value) : 'info';
    const statusColor = status === 'normal' ? '#10b981' : status === 'caution' ? '#f59e0b' : status === 'danger' ? '#ef4444' : '#8896b3';

    return `
    <svg viewBox="${viewBox}" class="gauge-svg" id="${cfg.id}-svg">
      <defs>
        <filter id="glow-needle-${key}">
          <feGaussianBlur stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- Background arc -->
      ${createArcPath(cfg.min, cfg.max, '#1e293b', cfg.min, cfg.max, 1.0)}

      <!-- Zone arcs -->
      ${zonesHtml}

      <!-- Tick marks -->
      ${ticksHtml}

      <!-- Needle -->
      <g class="gauge-needle" style="transform-origin: ${cx}px ${cy}px; transform: rotate(${needleAngle}deg)" opacity="${needleOpacity}">
        <line x1="${cx}" y1="${cy}" x2="${cx + GAUGE.needleLen}" y2="${cy}" stroke="#e8ecf4" stroke-width="2.5" stroke-linecap="round" filter="url(#glow-needle-${key})"/>
        <circle cx="${cx}" cy="${cy}" r="5" fill="#1e293b" stroke="#e8ecf4" stroke-width="2"/>
      </g>

      <!-- Center value -->
      <text x="${cx}" y="${cy + 30}" text-anchor="middle" fill="${statusColor}" font-size="16" font-weight="700" font-family="'JetBrains Mono', monospace" class="gauge-value-text">${displayValue}</text>
      <text x="${cx}" y="${cy + 42}" text-anchor="middle" fill="#64748b" font-size="7">${cfg.unit}</text>

      <!-- Label -->
      <text x="${cx}" y="15" text-anchor="middle" fill="#8896b3" font-size="9" font-weight="600">${cfg.label}</text>
    </svg>`;
  }

  function createArcPath(fromVal, toVal, color, min, max, opacity) {
    const { cx, cy, r, strokeWidth } = GAUGE;
    const startA = valueToAngle(fromVal, min, max);
    const endA = valueToAngle(toVal, min, max);

    const startRad = startA * Math.PI / 180;
    const endRad = endA * Math.PI / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const angleDiff = endA - startA;
    const largeArc = angleDiff > 180 ? 1 : 0;

    return `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="${opacity}"/>`;
  }

  function valueToAngle(value, min, max) {
    const ratio = (value - min) / (max - min);
    return GAUGE.startAngle + ratio * ARC_SPAN;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }


  // ============================================================
  // GAUGE UPDATES
  // ============================================================
  function updateGauges(measurements, computed, refrigerant) {
    if (!initialized) return;
    if (refrigerant) currentRefrigerant = refrigerant;

    // Store previous values for direction indicators
    prevValues = { ...lastValues };

    const sh = measurements.SH != null ? measurements.SH : null;
    const sc = measurements.SC != null ? measurements.SC : null;
    const dlt = measurements.DLT != null ? measurements.DLT : null;

    // Calculate COP if possible
    let cop = null;
    if (typeof CoolPropEngine !== 'undefined' && CoolPropEngine.isReady() &&
        measurements.Ps != null && measurements.Pd != null && sh != null && sc != null) {
      const coolpropName = getCoolPropName(currentRefrigerant);
      if (coolpropName) {
        const cycle = CoolPropEngine.calculateCyclePoints(coolpropName, measurements.Ps, measurements.Pd, sh, sc);
        if (cycle && cycle.cop) cop = cycle.cop;
      }
    }

    lastValues = { superheat: sh, subcooling: sc, dlt, cop };

    // Update each gauge
    updateSingleGauge('superheat', sh);
    updateSingleGauge('subcooling', sc);
    updateSingleGauge('dlt', dlt);
    updateSingleGauge('cop', cop);

    // Update direction indicators
    updateDirection('superheat', sh, prevValues.superheat);
    updateDirection('subcooling', sc, prevValues.subcooling);
    updateDirection('dlt', dlt, prevValues.dlt);
    updateDirection('cop', cop, prevValues.cop);

    // Show dashboard if any value present
    const dashboard = document.getElementById('gauge-dashboard');
    if (dashboard) {
      const hasAny = sh != null || sc != null || dlt != null || cop != null;
      dashboard.style.display = hasAny ? '' : 'none';
    }
  }

  function updateSingleGauge(key, value) {
    const cfg = GAUGE_CONFIGS[key];
    const card = document.getElementById(cfg.id);
    if (!card) return;

    const svgWrap = card.querySelector('.gauge-svg-wrap');
    if (!svgWrap) return;

    // Re-render SVG with new value
    svgWrap.innerHTML = renderGaugeSVG(key, value);

    // Apply needle transition: update transform after a frame
    requestAnimationFrame(() => {
      const needle = svgWrap.querySelector('.gauge-needle');
      if (needle) needle.classList.add('gauge-needle-animated');
    });

    // Update status styling on card
    card.classList.remove('gauge-status-normal', 'gauge-status-caution', 'gauge-status-danger', 'gauge-status-info');
    if (value != null) {
      const status = cfg.getStatus(value);
      card.classList.add('gauge-status-' + status);
    }

    // Special warnings
    const warnEl = document.getElementById(cfg.id + '-warn');
    if (warnEl) {
      const warning = cfg.specialWarning ? cfg.specialWarning(value) : null;
      if (warning) {
        warnEl.textContent = warning;
        warnEl.classList.add('active');
      } else {
        warnEl.textContent = '';
        warnEl.classList.remove('active');
      }
    }
  }

  function updateDirection(key, current, prev) {
    const cfg = GAUGE_CONFIGS[key];
    const dirEl = document.getElementById(cfg.id + '-dir');
    if (!dirEl) return;

    if (current == null || prev == null) {
      dirEl.textContent = '';
      return;
    }

    const diff = current - prev;
    if (Math.abs(diff) < 0.1) {
      dirEl.textContent = '→';
      dirEl.className = 'gauge-direction dir-stable';
    } else if (diff > 0) {
      dirEl.textContent = '↑';
      dirEl.className = 'gauge-direction dir-up';
    } else {
      dirEl.textContent = '↓';
      dirEl.className = 'gauge-direction dir-down';
    }
  }

  function getCoolPropName(refId) {
    if (typeof RefrigerantCatalog !== 'undefined') {
      return RefrigerantCatalog.getCoolPropName(refId);
    }
    const map = {
      'R-22': 'R22', 'R-410A': 'R410A', 'R-32': 'R32', 'R-454B': 'R454B',
      'R-134a': 'R134a', 'R-404A': 'R404A', 'R-407C': 'R407C', 'R-290': 'Propane'
    };
    return map[refId] || refId;
  }


  // ============================================================
  // FAULT HIGHLIGHTING
  // ============================================================
  function highlightFromDiagnosis(diagResult) {
    if (!initialized) return;

    // Clear previous highlights
    clearHighlights();

    if (!diagResult || !diagResult.diagKey || diagResult.diagKey === 'normal') return;

    // Map diagKey → faultId
    let faultId = null;
    if (typeof FaultSignatures !== 'undefined') {
      faultId = FaultSignatures.mapDiagKeyToFault(diagResult.diagKey);
    }
    if (!faultId) {
      const fallback = {
        lowCharge: 'refrigerant_low', overcharge: 'refrigerant_high',
        meteringRestriction: 'txv_restricted', compressorWeak: 'compressor_valve_leak',
        txvOverfeed: 'txv_stuck_open', lowAirflow: 'evaporator_fouling'
      };
      faultId = fallback[diagResult.diagKey];
    }

    if (!faultId) return;

    const targetGaugeId = FAULT_GAUGE_MAP[faultId];
    if (targetGaugeId) {
      const el = document.getElementById(targetGaugeId);
      if (el) el.classList.add('gauge-alert-glow');
    }
  }

  function clearHighlights() {
    document.querySelectorAll('.gauge-alert-glow').forEach(el => {
      el.classList.remove('gauge-alert-glow');
    });
  }


  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    init,
    updateGauges,
    highlightFromDiagnosis,
    clearHighlights,
    isInitialized: () => initialized
  };

})();

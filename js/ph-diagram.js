// ===================================================
// HVAC Pulse — P-H Diagram (Mollier Diagram)
// SVG-based pressure-enthalpy diagram
// Saturation curves, cycle points, fault simulation
// ===================================================

const PHDiagram = (() => {

  // --- SVG dimensions and margins ---
  const WIDTH = 700;
  const HEIGHT = 450;
  const MARGIN = { top: 30, right: 30, bottom: 50, left: 65 };
  const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
  const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

  let currentRefrigerant = null;
  let currentCurve = null;
  let currentCycle = null;
  let faultOverlay = null;

  // --- Initialize UI ---
  function initUI() {
    const container = document.getElementById('ph-diagram-content');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header">
        <h1>📈 P-H 선도 (몰리에르)</h1>
        <p class="subtitle">압력-엔탈피 다이어그램 · 냉동사이클 시각화</p>
      </div>

      <div class="glass-card">
        <div class="ph-engine-badge" id="ph-engine-badge">
          <span class="badge-dot"></span>
          <span id="ph-engine-status">엔진 확인 중...</span>
        </div>

        <div class="form-group">
          <label class="form-label">냉매 선택</label>
          <select id="ph-ref-select" class="form-select" onchange="PHDiagram.onRefChange()"></select>
        </div>

        <div id="ph-svg-container" class="ph-svg-container">
          <div class="ph-placeholder">CoolProp 엔진이 필요합니다.<br>엔진 로딩 후 P-H 선도를 생성할 수 있습니다.</div>
        </div>
      </div>

      <!-- Cycle Input -->
      <div class="glass-card" id="ph-cycle-card" style="display:none">
        <div class="section-title">운전점 입력 (4점 사이클)</div>
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">흡입압력 (psig)</label>
            <input type="number" id="ph-suction-p" class="form-input" placeholder="저압" step="0.1">
          </div>
          <div class="form-group">
            <label class="form-label">토출압력 (psig)</label>
            <input type="number" id="ph-discharge-p" class="form-input" placeholder="고압" step="0.1">
          </div>
        </div>
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">과열도 (°F)</label>
            <input type="number" id="ph-superheat" class="form-input" placeholder="10" step="0.1" value="10">
          </div>
          <div class="form-group">
            <label class="form-label">과냉도 (°F)</label>
            <input type="number" id="ph-subcooling" class="form-input" placeholder="10" step="0.1" value="10">
          </div>
        </div>
        <button class="btn btn-primary" onclick="PHDiagram.drawCycle()" style="margin-top:8px">
          사이클 그리기
        </button>
        <div id="ph-cycle-info"></div>
      </div>

      <!-- Fault Simulation -->
      <div class="glass-card" id="ph-fault-card" style="display:none">
        <div class="section-title">고장 시뮬레이션 (P-H 선도)</div>
        <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:12px">
          고장을 선택하면 정상 사이클(실선) 위에 고장 사이클(점선)이 오버레이됩니다.
        </p>
        <select id="ph-fault-select" class="form-select" onchange="PHDiagram.drawFaultOverlay()">
          <option value="">고장 유형 선택...</option>
          <option value="refrigerant_low">냉매 부족</option>
          <option value="refrigerant_high">냉매 과충전</option>
          <option value="condenser_fouling">응축기 오염</option>
          <option value="evaporator_fouling">증발기 기류 부족</option>
          <option value="compressor_valve_leak">압축기 밸브 누설</option>
          <option value="non_condensable">비응축가스 혼입</option>
        </select>
        <div id="ph-fault-info"></div>
      </div>`;

    populateRefSelect();
    updateEngineBadge();
  }

  function populateRefSelect() {
    const sel = document.getElementById('ph-ref-select');
    if (!sel) return;

    sel.innerHTML = '';
    if (typeof RefrigerantCatalog !== 'undefined') {
      const grouped = RefrigerantCatalog.getGroupedByCategory();
      for (const [catKey, groupData] of Object.entries(grouped)) {
        const cat = groupData.category;
        const group = document.createElement('optgroup');
        group.label = `${cat.icon} ${cat.name_kr}`;
        groupData.refrigerants.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.id;
          opt.textContent = `${r.name_kr} (${r.safety})`;
          group.appendChild(opt);
        });
        sel.appendChild(group);
      }
    } else {
      // Fallback to legacy
      getRefrigerantList().forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = key;
        sel.appendChild(opt);
      });
    }
  }

  function updateEngineBadge() {
    const badge = document.getElementById('ph-engine-badge');
    const status = document.getElementById('ph-engine-status');
    if (!badge || !status) return;

    if (CoolPropEngine.isReady()) {
      badge.className = 'ph-engine-badge engine-ready';
      status.textContent = '🔬 NIST급 정밀 계산 (CoolProp)';
      document.getElementById('ph-cycle-card')?.style.setProperty('display', 'block');
    } else {
      badge.className = 'ph-engine-badge engine-fallback';
      status.textContent = '⏳ CoolProp 미로딩 — P-H 선도 사용 불가';
    }
  }

  // --- Refrigerant change ---
  function onRefChange() {
    const sel = document.getElementById('ph-ref-select');
    if (!sel) return;

    currentRefrigerant = sel.value;
    currentCycle = null;
    faultOverlay = null;

    if (CoolPropEngine.isReady()) {
      drawSaturationCurve();
    }
  }

  // --- Draw saturation curve ---
  function drawSaturationCurve() {
    if (!CoolPropEngine.isReady() || !currentRefrigerant) return;

    const coolpropName = getCoolPropName(currentRefrigerant);
    if (!coolpropName) return;

    currentCurve = CoolPropEngine.generatePHCurve(coolpropName, 80);
    if (!currentCurve) {
      showPlaceholder('이 냉매의 P-H 데이터를 생성할 수 없습니다.');
      return;
    }

    renderSVG();
  }

  // --- Draw cycle points ---
  function drawCycle() {
    if (!CoolPropEngine.isReady() || !currentRefrigerant) return;

    const sP = parseFloat(document.getElementById('ph-suction-p')?.value);
    const dP = parseFloat(document.getElementById('ph-discharge-p')?.value);
    const sh = parseFloat(document.getElementById('ph-superheat')?.value);
    const sc = parseFloat(document.getElementById('ph-subcooling')?.value);

    if ([sP, dP, sh, sc].some(isNaN)) {
      App.showToast('모든 값을 입력해주세요.', 'warning');
      return;
    }

    const coolpropName = getCoolPropName(currentRefrigerant);
    currentCycle = CoolPropEngine.calculateCyclePoints(coolpropName, sP, dP, sh, sc);

    if (!currentCycle) {
      App.showToast('사이클 계산 실패 — 입력값을 확인하세요.', 'error');
      return;
    }

    faultOverlay = null;
    document.getElementById('ph-fault-card')?.style.setProperty('display', 'block');
    document.getElementById('ph-fault-select').value = '';

    // Show cycle info
    const infoEl = document.getElementById('ph-cycle-info');
    if (infoEl) {
      infoEl.innerHTML = `
        <div class="computed-row" style="margin-top:12px;grid-template-columns:repeat(3,1fr)">
          <div class="computed-item">
            <div class="comp-value" style="color:var(--accent-green)">${currentCycle.cop}</div>
            <div class="comp-label">COP</div>
          </div>
          <div class="computed-item">
            <div class="comp-value" style="color:var(--accent-cyan)">${currentCycle.refrigEffect}</div>
            <div class="comp-label">냉동효과 (kJ/kg)</div>
          </div>
          <div class="computed-item">
            <div class="comp-value" style="color:var(--accent-orange)">${currentCycle.compWork}</div>
            <div class="comp-label">압축일 (kJ/kg)</div>
          </div>
        </div>`;
    }

    renderSVG();
  }

  // --- Draw fault overlay ---
  function drawFaultOverlay() {
    const faultId = document.getElementById('ph-fault-select')?.value;
    const infoEl = document.getElementById('ph-fault-info');

    if (!faultId || !currentCycle) {
      faultOverlay = null;
      if (infoEl) infoEl.innerHTML = '';
      renderSVG();
      return;
    }

    if (typeof FaultSignatures !== 'undefined') {
      const fault = FaultSignatures.getFault(faultId);
      if (fault && fault.ph_effect) {
        faultOverlay = CoolPropEngine.simulateFaultCycle(currentCycle, fault.ph_effect);

        if (infoEl) {
          infoEl.innerHTML = `
            <div class="alert-box alert-warning" style="margin-top:12px">
              <span>📊</span>
              <span><strong>${fault.name_kr}:</strong> ${fault.ph_effect.desc_kr}</span>
            </div>`;
        }
      }
    }

    renderSVG();
  }

  // --- Helper: get CoolProp name ---
  function getCoolPropName(refId) {
    if (typeof RefrigerantCatalog !== 'undefined') {
      return RefrigerantCatalog.getCoolPropName(refId);
    }
    // Fallback mapping for legacy refrigerants
    const map = {
      'R-22': 'R22', 'R-410A': 'R410A', 'R-32': 'R32', 'R-454B': 'R454B',
      'R-134a': 'R134a', 'R-404A': 'R404A', 'R-407C': 'R407C', 'R-290': 'Propane'
    };
    return map[refId] || refId;
  }

  // --- Show placeholder ---
  function showPlaceholder(msg) {
    const container = document.getElementById('ph-svg-container');
    if (container) {
      container.innerHTML = `<div class="ph-placeholder">${msg}</div>`;
    }
  }

  // =============================================
  // SVG Rendering
  // =============================================

  function renderSVG() {
    const container = document.getElementById('ph-svg-container');
    if (!container || !currentCurve) return;

    // Compute data bounds
    const allH = [
      ...currentCurve.saturatedLiquid.map(p => p.h),
      ...currentCurve.saturatedVapor.map(p => p.h)
    ];
    const allP = [
      ...currentCurve.saturatedLiquid.map(p => p.p),
      ...currentCurve.saturatedVapor.map(p => p.p)
    ];

    if (currentCycle) {
      [currentCycle.point1, currentCycle.point2, currentCycle.point3, currentCycle.point4].forEach(pt => {
        allH.push(pt.h);
        allP.push(pt.p);
      });
    }

    const hMin = Math.min(...allH) * 0.92;
    const hMax = Math.max(...allH) * 1.08;
    const pMin = Math.min(...allP) * 0.7;
    const pMax = Math.max(...allP) * 1.3;

    // Log scale for pressure
    const logPMin = Math.log10(pMin);
    const logPMax = Math.log10(pMax);

    function scaleH(h) { return MARGIN.left + (h - hMin) / (hMax - hMin) * PLOT_W; }
    function scaleP(p) { return MARGIN.top + PLOT_H - (Math.log10(p) - logPMin) / (logPMax - logPMin) * PLOT_H; }

    // Build SVG
    let svg = `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" class="ph-svg">`;

    // Background
    svg += `<rect width="${WIDTH}" height="${HEIGHT}" fill="var(--bg-deep)" rx="8"/>`;

    // Grid lines
    svg += renderGrid(hMin, hMax, pMin, pMax, logPMin, logPMax, scaleH, scaleP);

    // Saturation curves
    svg += renderSatCurves(scaleH, scaleP);

    // Normal cycle
    if (currentCycle) {
      svg += renderCyclePoints(currentCycle, scaleH, scaleP, '#3b82f6', false);
    }

    // Fault overlay
    if (faultOverlay) {
      svg += renderCyclePoints(faultOverlay, scaleH, scaleP, '#ef4444', true);
    }

    // Axis labels
    svg += `<text x="${WIDTH / 2}" y="${HEIGHT - 8}" text-anchor="middle" fill="var(--text-secondary)" font-size="12" font-family="system-ui">엔탈피 h (kJ/kg)</text>`;
    svg += `<text x="14" y="${HEIGHT / 2}" text-anchor="middle" fill="var(--text-secondary)" font-size="12" font-family="system-ui" transform="rotate(-90,14,${HEIGHT / 2})">압력 P (kPa)</text>`;

    // Title
    svg += `<text x="${WIDTH / 2}" y="18" text-anchor="middle" fill="var(--text-primary)" font-size="13" font-weight="600" font-family="system-ui">${currentRefrigerant} P-H 선도</text>`;

    // Legend
    if (currentCycle && faultOverlay) {
      svg += `<line x1="${MARGIN.left + 10}" y1="14" x2="${MARGIN.left + 30}" y2="14" stroke="#3b82f6" stroke-width="2"/>`;
      svg += `<text x="${MARGIN.left + 34}" y="18" fill="var(--text-secondary)" font-size="10">정상</text>`;
      svg += `<line x1="${MARGIN.left + 60}" y1="14" x2="${MARGIN.left + 80}" y2="14" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,3"/>`;
      svg += `<text x="${MARGIN.left + 84}" y="18" fill="var(--text-secondary)" font-size="10">고장</text>`;
    }

    svg += '</svg>';
    container.innerHTML = svg;
  }

  function renderGrid(hMin, hMax, pMin, pMax, logPMin, logPMax, scaleH, scaleP) {
    let g = '<g class="ph-grid">';

    // Horizontal grid (pressure)
    const pDecades = [];
    const pStart = Math.floor(logPMin);
    const pEnd = Math.ceil(logPMax);
    for (let d = pStart; d <= pEnd; d++) {
      for (let m = 1; m < 10; m++) {
        const val = Math.pow(10, d) * m;
        if (val >= pMin && val <= pMax) pDecades.push(val);
      }
    }

    pDecades.forEach(p => {
      const y = scaleP(p);
      const isMain = Math.log10(p) % 1 < 0.01;
      g += `<line x1="${MARGIN.left}" y1="${y}" x2="${WIDTH - MARGIN.right}" y2="${y}" stroke="var(--border)" stroke-width="${isMain ? 0.8 : 0.3}" opacity="${isMain ? 0.6 : 0.2}"/>`;
      if (isMain || p === pDecades[0] || p === pDecades[pDecades.length - 1]) {
        g += `<text x="${MARGIN.left - 5}" y="${y + 3}" text-anchor="end" fill="var(--text-muted)" font-size="9" font-family="var(--font-mono)">${Math.round(p)}</text>`;
      }
    });

    // Vertical grid (enthalpy)
    const hStep = Math.ceil((hMax - hMin) / 8 / 10) * 10;
    for (let h = Math.ceil(hMin / hStep) * hStep; h <= hMax; h += hStep) {
      const x = scaleH(h);
      g += `<line x1="${x}" y1="${MARGIN.top}" x2="${x}" y2="${MARGIN.top + PLOT_H}" stroke="var(--border)" stroke-width="0.5" opacity="0.3"/>`;
      g += `<text x="${x}" y="${MARGIN.top + PLOT_H + 14}" text-anchor="middle" fill="var(--text-muted)" font-size="9" font-family="var(--font-mono)">${Math.round(h)}</text>`;
    }

    g += '</g>';
    return g;
  }

  function renderSatCurves(scaleH, scaleP) {
    let g = '<g class="ph-sat-curves">';

    // Saturated liquid line
    if (currentCurve.saturatedLiquid.length > 1) {
      const points = currentCurve.saturatedLiquid.map(p => `${scaleH(p.h).toFixed(1)},${scaleP(p.p).toFixed(1)}`).join(' ');
      g += `<polyline points="${points}" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.8"/>`;
    }

    // Saturated vapor line
    if (currentCurve.saturatedVapor.length > 1) {
      const points = currentCurve.saturatedVapor.map(p => `${scaleH(p.h).toFixed(1)},${scaleP(p.p).toFixed(1)}`).join(' ');
      g += `<polyline points="${points}" fill="none" stroke="#06b6d4" stroke-width="2" opacity="0.8"/>`;
    }

    // Labels
    if (currentCurve.saturatedLiquid.length > 5) {
      const midIdx = Math.floor(currentCurve.saturatedLiquid.length / 2);
      const pt = currentCurve.saturatedLiquid[midIdx];
      g += `<text x="${scaleH(pt.h).toFixed(1)}" y="${scaleP(pt.p).toFixed(1) - 6}" fill="#f59e0b" font-size="9" text-anchor="end" opacity="0.8">포화액</text>`;
    }
    if (currentCurve.saturatedVapor.length > 5) {
      const midIdx = Math.floor(currentCurve.saturatedVapor.length / 2);
      const pt = currentCurve.saturatedVapor[midIdx];
      g += `<text x="${scaleH(pt.h).toFixed(1)}" y="${scaleP(pt.p).toFixed(1) - 6}" fill="#06b6d4" font-size="9" text-anchor="start" opacity="0.8">포화증기</text>`;
    }

    // Critical point
    if (currentCurve.critical) {
      const cp = currentCurve.critical;
      const hCrit = currentCurve.saturatedLiquid[currentCurve.saturatedLiquid.length - 1]?.h;
      const pCrit = currentCurve.saturatedLiquid[currentCurve.saturatedLiquid.length - 1]?.p;
      if (hCrit && pCrit) {
        g += `<circle cx="${scaleH(hCrit).toFixed(1)}" cy="${scaleP(pCrit).toFixed(1)}" r="4" fill="#ef4444" stroke="#fff" stroke-width="1"/>`;
        g += `<text x="${scaleH(hCrit).toFixed(1)}" y="${scaleP(pCrit).toFixed(1) - 8}" fill="#ef4444" font-size="9" text-anchor="middle">임계점</text>`;
      }
    }

    g += '</g>';
    return g;
  }

  function renderCyclePoints(cycle, scaleH, scaleP, color, isDashed) {
    let g = `<g class="ph-cycle">`;
    const dash = isDashed ? ' stroke-dasharray="6,4"' : '';
    const pts = [cycle.point1, cycle.point2, cycle.point3, cycle.point4];

    // Draw cycle lines: 1→2 (compression), 2→3 (condensation), 3→4 (expansion), 4→1 (evaporation)
    for (let i = 0; i < 4; i++) {
      const from = pts[i];
      const to = pts[(i + 1) % 4];
      g += `<line x1="${scaleH(from.h).toFixed(1)}" y1="${scaleP(from.p).toFixed(1)}" x2="${scaleH(to.h).toFixed(1)}" y2="${scaleP(to.p).toFixed(1)}" stroke="${color}" stroke-width="2"${dash}/>`;
    }

    // Draw points
    if (!isDashed) {
      const labels = ['1', '2', '3', '4'];
      pts.forEach((pt, i) => {
        const cx = scaleH(pt.h).toFixed(1);
        const cy = scaleP(pt.p).toFixed(1);
        g += `<circle cx="${cx}" cy="${cy}" r="5" fill="${color}" stroke="#fff" stroke-width="1.5"/>`;
        g += `<text x="${cx}" y="${parseFloat(cy) - 9}" text-anchor="middle" fill="${color}" font-size="10" font-weight="600">${labels[i]}</text>`;
      });
    }

    g += '</g>';
    return g;
  }

  // --- Notify when CoolProp loads ---
  function onEngineReady() {
    updateEngineBadge();
    // Auto-select current dropdown value if not yet set
    if (!currentRefrigerant) {
      const sel = document.getElementById('ph-ref-select');
      if (sel && sel.value) currentRefrigerant = sel.value;
    }
    if (currentRefrigerant) {
      drawSaturationCurve();
    }
  }

  // --- Public API ---
  return {
    initUI,
    onRefChange,
    drawCycle,
    drawFaultOverlay,
    onEngineReady
  };
})();

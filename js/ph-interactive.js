// ===================================================
// HVAC Pulse — Interactive P-H Diagram
// Educational touch-interactive pressure-enthalpy diagram
// Canvas rendering + DOM popovers + fault simulation
// ===================================================

const PHInteractive = (() => {

  // --- Layout ---
  const MARGIN = { top: 36, right: 24, bottom: 48, left: 60 };
  let canvasW = 0, canvasH = 0, plotW = 0, plotH = 0;
  let dpr = 1; // device pixel ratio

  // --- State ---
  let canvas = null, ctx = null, container = null;
  let curveData = null, cycleData = null, faultCycle = null;
  let currentRef = 'R-410A';
  let activeFault = '';
  let severityLevel = 2; // 0=SL1..3=SL4
  let initialized = false;

  // Scale functions (set during render)
  let hMin = 0, hMax = 0, pMin = 0, pMax = 0, logPMin = 0, logPMax = 0;
  function scaleH(h) { return MARGIN.left + (h - hMin) / (hMax - hMin) * plotW; }
  function scaleP(p) { return MARGIN.top + plotH - (Math.log10(p) - logPMin) / (logPMax - logPMin) * plotH; }
  function unscaleH(x) { return hMin + (x - MARGIN.left) / plotW * (hMax - hMin); }
  function unscaleP(y) { const logP = logPMin + (MARGIN.top + plotH - y) / plotH * (logPMax - logPMin); return Math.pow(10, logP); }

  // Pinch/pan state
  let transform = { x: 0, y: 0, scale: 1 };
  let pinchDist = 0, isPanning = false, lastPan = { x: 0, y: 0 };

  // --- Demo fallback data (R-410A approximate) ---
  const DEMO_CURVE = {
    saturatedLiquid: [
      {h:170,p:300,t:-40},{h:195,p:500,t:-20},{h:220,p:800,t:0},{h:245,p:1200,t:20},
      {h:260,p:1600,t:35},{h:275,p:2000,t:45},{h:295,p:2700,t:55},{h:320,p:3500,t:65},
      {h:355,p:4200,t:72},{h:390,p:4700,t:78}
    ],
    saturatedVapor: [
      {h:420,p:300,t:-40},{h:425,p:500,t:-20},{h:428,p:800,t:0},{h:430,p:1200,t:20},
      {h:429,p:1600,t:35},{h:426,p:2000,t:45},{h:420,p:2700,t:55},{h:410,p:3500,t:65},
      {h:400,p:4200,t:72},{h:390,p:4700,t:78}
    ],
    critical: { temp_f: 162, pressure_psig: 680 }
  };
  const DEMO_CYCLE = {
    point1: { h: 435, p: 1000, t: 50, label: '흡입' },
    point2: { h: 470, p: 2800, t: 180, label: '토출' },
    point3: { h: 260, p: 2800, t: 95, label: '응축기출구' },
    point4: { h: 260, p: 1000, t: 10, label: '증발기입구' },
    cop: 5.0, refrigEffect: 175, compWork: 35
  };


  // ============================================================
  // EDUCATIONAL CONTENT
  // ============================================================
  const EDUCATIONAL_CONTENT = {
    point1: {
      title: '① 흡입 (과열 증기)',
      icon: '💨',
      description: '증발기를 나온 냉매가 압축기로 들어가는 지점입니다.',
      details: [
        '이 지점의 온도와 압력으로 <b>과열도</b>를 계산합니다.',
        '과열도 = 흡입온도 − 포화온도(Dew)',
        '과열도가 높으면 → 냉매 부족 의심',
        '과열도가 0이면 → <b>액백 위험!</b> 압축기 손상 가능'
      ],
      valueKey: 'superheat', valueLabel: '과열도', valueUnit: '°F',
      normalRange: '정상: 8~14°F'
    },
    point2: {
      title: '② 토출 (고온고압 가스)',
      icon: '🔥',
      description: '압축기가 냉매를 압축한 직후의 지점입니다.',
      details: [
        '시스템에서 <b>가장 온도가 높은</b> 지점 (150~220°F)',
        '225°F 이상이면 압축기 과열 위험',
        '토출온도가 비정상이면 여러 고장의 지표가 됩니다'
      ],
      valueKey: 'dischargeTemp', valueLabel: '토출온도', valueUnit: '°F',
      normalRange: '정상: 150~220°F'
    },
    point3: {
      title: '③ 응축기 출구 (과냉 액체)',
      icon: '💧',
      description: '응축기에서 열을 방출하고 액체가 된 냉매입니다.',
      details: [
        '이 지점의 온도와 압력으로 <b>과냉도</b>를 계산합니다.',
        '과냉도 = 포화온도(Bubble) − 액관온도',
        '과냉도가 높으면 → 냉매 과충전 의심',
        '과냉도가 낮으면 → 냉매 부족 또는 응축기 문제'
      ],
      valueKey: 'subcooling', valueLabel: '과냉도', valueUnit: '°F',
      normalRange: '정상: 8~14°F'
    },
    point4: {
      title: '④ 증발기 입구 (저압 혼합)',
      icon: '❄️',
      description: '팽창밸브를 통과하여 압력이 떨어진 냉매입니다.',
      details: [
        '액체+가스 혼합 상태 (<b>2상</b>)',
        '이 과정은 등엔탈피 (엔탈피 변화 없음)',
        '압력만 떨어지고 온도도 함께 하락',
        '이후 증발기에서 주변 열을 흡수하여 냉방'
      ],
      valueKey: null, valueLabel: '', valueUnit: '',
      normalRange: ''
    },
    process_12: {
      title: '🔄 압축 과정 (1→2)',
      icon: '⚡',
      description: '압축기가 저압 가스를 고압 가스로 압축합니다.',
      details: [
        '에너지를 투입하는 과정 (전기 소비)',
        '이상적으로는 <b>등엔트로피</b> 과정',
        '실제로는 비가역 손실 → 효율 70~80%',
        '압축일 = Point2 엔탈피 − Point1 엔탈피'
      ],
      valueKey: 'compWork', valueLabel: '압축일', valueUnit: 'kJ/kg'
    },
    process_23: {
      title: '🌡️ 응축 과정 (2→3)',
      icon: '🏔️',
      description: '고온 냉매가 실외에서 열을 방출하며 액체로 변합니다.',
      details: [
        '① 과열 제거 (가스 냉각)',
        '② 상변화 (가스→액체, <b>등온 과정</b>)',
        '③ 과냉 (액체를 더 냉각)',
        '응축기 오염 시 이 과정이 비효율적 → 토출압↑'
      ]
    },
    process_34: {
      title: '📉 팽창 과정 (3→4)',
      icon: '🔽',
      description: '팽창밸브에서 압력이 급격히 떨어집니다.',
      details: [
        '<b>등엔탈피</b> 과정 (엔탈피 변화 없음)',
        'P-H 선도에서 수직 아래로 이동',
        'TXV가 이 과정을 제어 — 과열도를 조절',
        'TXV 막힘 → 압력 강하 과다 → 과열도↑↑'
      ]
    },
    process_41: {
      title: '❄️ 증발 과정 (4→1)',
      icon: '🧊',
      description: '냉매가 주변 열을 흡수하며 기화 → <b>이것이 냉방!</b>',
      details: [
        '주변에서 열을 빼앗아 냉방 효과 발생',
        '등온/등압 과정 (상변화)',
        '냉동효과 = Point1 엔탈피 − Point4 엔탈피',
        '이 값이 클수록 냉방 능력이 좋음'
      ],
      valueKey: 'refrigEffect', valueLabel: '냉동효과', valueUnit: 'kJ/kg'
    },
    region_subcooled: {
      title: '🧊 과냉 액체 영역',
      icon: '💧',
      description: '응축기를 나온 냉매가 이 영역에 있습니다.',
      details: [
        '포화 온도보다 더 냉각된 액체 상태',
        '과냉도가 클수록 이 영역이 넓어집니다',
        '배관의 플래시 가스 방지에 유리'
      ]
    },
    region_twophase: {
      title: '🌊 2상 혼합 영역',
      icon: '🔄',
      description: '액체와 가스가 공존하는 상태입니다.',
      details: [
        '증발기 내부와 팽창밸브 출구가 이 영역',
        '건도(quality) 0=순수 액체, 1=순수 가스',
        '돔 내부에서 <b>온도와 압력이 고정</b> (등온/등압)'
      ]
    },
    region_superheated: {
      title: '💨 과열 증기 영역',
      icon: '🔥',
      description: '증발기를 나온 냉매가 이 영역에 있습니다.',
      details: [
        '포화 온도보다 더 가열된 기체 상태',
        '과열도 = 실제 온도 − 포화 온도',
        '압축기 흡입 냉매는 이 영역이어야 안전'
      ]
    }
  };

  // Fault-specific educational overlay
  const FAULT_EDUCATION = {
    refrigerant_low: {
      name: '냉매 부족',
      point1: '냉매 부족 시 증발기에서 냉매가 일찍 증발 완료 → 과열도가 비정상적으로 높아집니다. 선도에서 이 점이 오른쪽으로 이동합니다.',
      point2: '흡입 가스 온도 상승으로 토출 온도도 상승합니다.',
      point3: '응축기 내 냉매 부족 → 과냉도 감소. 선도에서 이 점이 오른쪽으로 이동합니다.',
      point4: '증발 압력 하락으로 이 점이 아래로 이동합니다.'
    },
    refrigerant_high: {
      name: '냉매 과충전',
      point1: '과잉 냉매가 증발기를 완전히 채워 과열도 감소. 액백 위험!',
      point2: '응축 압력 상승으로 압축일 증가. 토출 압력이 높아집니다.',
      point3: '응축기에 액냉매가 축적 → 과냉도 증가. 선도에서 이 점이 왼쪽으로 이동.',
      point4: '증발 압력 상승으로 이 점이 위로 이동합니다.'
    },
    condenser_fouling: {
      name: '응축기 오염',
      point1: '응축 압력 상승 → 증발에 간접 영향.',
      point2: '토출 압력과 온도가 함께 상승합니다.',
      point3: '열 교환 저하로 과냉도 감소.',
      point4: '변화 미미 (주로 고압측 영향).'
    },
    evaporator_fouling: {
      name: '증발기 기류 부족',
      point1: '열부하 감소 → 과열도 상승. 선도에서 오른쪽 이동.',
      point2: '흡입 온도 변화에 따른 토출 온도 변동.',
      point3: '응축기에는 상대적 영향 적음.',
      point4: '증발 압력 하락으로 이 점이 아래로 이동.'
    },
    compressor_valve_leak: {
      name: '압축기 밸브 누설',
      point1: '밸브 누설로 실질 압축 불완전. 흡입 압력 상승.',
      point2: '토출 압력 미달. 이 점이 왼쪽 아래로 이동.',
      point3: '토출 압력 미달로 응축 불완전.',
      point4: '전체적으로 사이클이 수축합니다.'
    },
    non_condensable: {
      name: '비응축가스 혼입',
      point1: '전체 압력이 상승하여 간접 영향.',
      point2: '토출 압력과 온도가 크게 상승합니다.',
      point3: '응축 효율 저하 → 과냉도 변동.',
      point4: '전체 사이클이 위로 이동합니다.'
    }
  };

  // --- Fault cycle shift factors (per severity) ---
  const FAULT_SHIFTS = {
    refrigerant_low: {
      // severity multipliers: [SL1, SL2, SL3, SL4]
      point1: { h: [5,10,18,25],   p: [0,-50,-120,-200] },
      point2: { h: [5,12,20,30],   p: [0,-20,-60,-100] },
      point3: { h: [3,8,15,22],    p: [0,-20,-60,-100] },
      point4: { h: [0,0,0,0],      p: [0,-50,-120,-200] }
    },
    refrigerant_high: {
      point1: { h: [-3,-6,-10,-15], p: [0,40,90,150] },
      point2: { h: [-2,-4,-6,-10],  p: [0,60,150,250] },
      point3: { h: [-5,-12,-20,-30],p: [0,60,150,250] },
      point4: { h: [0,0,0,0],       p: [0,40,90,150] }
    },
    condenser_fouling: {
      point1: { h: [2,4,8,12],     p: [0,-20,-40,-70] },
      point2: { h: [3,8,15,25],    p: [0,50,120,200] },
      point3: { h: [3,8,14,22],    p: [0,50,120,200] },
      point4: { h: [0,0,0,0],      p: [0,-20,-40,-70] }
    },
    evaporator_fouling: {
      point1: { h: [4,10,18,28],   p: [0,-40,-90,-150] },
      point2: { h: [3,8,14,22],    p: [0,-10,-30,-50] },
      point3: { h: [0,0,0,0],      p: [0,-10,-30,-50] },
      point4: { h: [0,0,0,0],      p: [0,-40,-90,-150] }
    },
    compressor_valve_leak: {
      point1: { h: [-2,-5,-8,-12], p: [0,30,60,100] },
      point2: { h: [-5,-12,-20,-30],p:[0,-40,-100,-180] },
      point3: { h: [0,0,0,0],      p: [0,-40,-100,-180] },
      point4: { h: [0,0,0,0],      p: [0,30,60,100] }
    },
    non_condensable: {
      point1: { h: [0,2,4,6],      p: [0,20,50,80] },
      point2: { h: [4,10,18,28],   p: [0,60,150,260] },
      point3: { h: [2,5,10,16],    p: [0,60,150,260] },
      point4: { h: [0,0,0,0],      p: [0,20,50,80] }
    }
  };


  // ============================================================
  // TRANSLATION HELPERS
  // ============================================================
  function getTranslatedContent(key) {
    const base = EDUCATIONAL_CONTENT[key];
    if (!base) return null;
    const tl = typeof Settings !== 'undefined' ? Settings.tempLabel() : '°F';
    return {
      ...base,
      title: t('phi.' + key + '.title', base.title),
      description: t('phi.' + key + '.desc', base.description),
      details: base.details.map((d, i) => t('phi.' + key + '.d' + (i + 1), d)),
      valueLabel: base.valueLabel ? t('phi.' + key + '.vlabel', base.valueLabel) : '',
      valueUnit: base.valueUnit === '°F' ? tl : base.valueUnit,
      normalRange: base.normalRange ? t('phi.' + key + '.range', base.normalRange) : ''
    };
  }

  function getTranslatedFault(faultKey) {
    const base = FAULT_EDUCATION[faultKey];
    if (!base) return null;
    return {
      name: t('phi.fault_ed.' + faultKey + '.name', base.name),
      point1: t('phi.fault_ed.' + faultKey + '.p1', base.point1),
      point2: t('phi.fault_ed.' + faultKey + '.p2', base.point2),
      point3: t('phi.fault_ed.' + faultKey + '.p3', base.point3),
      point4: t('phi.fault_ed.' + faultKey + '.p4', base.point4)
    };
  }


  // ============================================================
  // INITIALIZATION
  // ============================================================
  function initUI() {
    container = document.getElementById('ph-interactive-content');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header">
        <h1>${t('phi.title', '📈 P-H 학습 도구')}</h1>
        <p class="subtitle">${t('phi.subtitle', '터치하여 각 포인트/프로세스의 교육 설명 확인')}</p>
      </div>

      <div class="glass-card phi-main-card">
        <div class="phi-toolbar">
          <select id="phi-ref-select" class="form-select phi-ref-sel" onchange="PHInteractive.onRefChange()"></select>
          <button class="phi-btn phi-fullscreen-btn" onclick="PHInteractive.toggleFullscreen()" title="${t('phi.fullscreen', '전체화면')}">⛶</button>
          <button class="phi-btn phi-reset-btn" onclick="PHInteractive.resetZoom()" title="${t('phi.reset_zoom', '줌 리셋')}">⟲</button>
        </div>

        <div class="phi-canvas-wrap" id="phi-canvas-wrap">
          <canvas id="phi-canvas"></canvas>
          <div class="phi-popover" id="phi-popover"></div>
        </div>

        <div class="phi-engine-badge" id="phi-engine-badge">
          <span class="phi-badge-dot"></span>
          <span id="phi-engine-status">${t('phi.checking', '확인 중...')}</span>
        </div>
      </div>

      <!-- Fault Simulation Controls -->
      <div class="glass-card phi-fault-card">
        <div class="section-title" style="margin-bottom:8px">${t('phi.fault_sim', '고장 시뮬레이션')}</div>
        <p class="phi-fault-desc">${t('phi.fault_desc', '고장을 선택하면 정상(실선) 위에 고장(점선)이 겹쳐집니다.')}</p>
        <select id="phi-fault-select" class="form-select" onchange="PHInteractive.onFaultChange()">
          <option value="">${t('phi.fault_none', '없음 (정상)')}</option>
          <option value="refrigerant_low">${t('phi.fault.low', '냉매 부족')}</option>
          <option value="refrigerant_high">${t('phi.fault.high', '냉매 과충전')}</option>
          <option value="condenser_fouling">${t('phi.fault.cond', '응축기 오염')}</option>
          <option value="evaporator_fouling">${t('phi.fault.evap', '증발기 기류 부족')}</option>
          <option value="compressor_valve_leak">${t('phi.fault.comp', '압축기 밸브 누설')}</option>
          <option value="non_condensable">${t('phi.fault.ncg', '비응축가스 혼입')}</option>
        </select>
        <div class="phi-severity-wrap" id="phi-severity-wrap" style="display:none">
          <label class="phi-severity-label">${t('phi.severity', '심각도:')} <span id="phi-severity-text">SL3</span></label>
          <input type="range" id="phi-severity-slider" class="phi-slider" min="0" max="3" step="1" value="2" oninput="PHInteractive.onSeverityChange()">
          <div class="phi-severity-ticks"><span>SL1</span><span>SL2</span><span>SL3</span><span>SL4</span></div>
        </div>
        <div id="phi-cop-compare" class="phi-cop-compare"></div>
      </div>

      <div class="glass-card phi-legend-card">
        <div class="phi-legend-title">${t('phi.usage', '사용법')}</div>
        <div class="phi-legend-items">
          <div class="phi-legend-item"><span class="phi-legend-dot phi-dot-blue"></span>${t('phi.usage1', '포인트/라인 터치 → 교육 설명')}</div>
          <div class="phi-legend-item"><span class="phi-legend-dot phi-dot-red"></span>${t('phi.usage2', '영역 터치 → 영역 설명')}</div>
          <div class="phi-legend-item"><span class="phi-legend-dot phi-dot-gray"></span>${t('phi.usage3', '핀치 줌 · 더블탭 리셋')}</div>
        </div>
      </div>
    `;

    setupCanvas();
    populateRefSelect();
    updateEngineBadge();
    loadData();
    initialized = true;
  }

  function setupCanvas() {
    canvas = document.getElementById('phi-canvas');
    if (!canvas) return;

    dpr = window.devicePixelRatio || 1;
    const wrap = document.getElementById('phi-canvas-wrap');
    const w = wrap.clientWidth || 360;
    const h = Math.round(w * 0.65);

    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvasW = w;
    canvasH = h;
    plotW = canvasW - MARGIN.left - MARGIN.right;
    plotH = canvasH - MARGIN.top - MARGIN.bottom;

    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Events
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('dblclick', resetZoom);

    // Resize observer
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => {
        const newW = wrap.clientWidth || 360;
        if (Math.abs(newW - canvasW) > 5) {
          setupCanvas();
          render();
        }
      }).observe(wrap);
    }
  }

  function populateRefSelect() {
    const sel = document.getElementById('phi-ref-select');
    if (!sel) return;
    if (typeof PTCalculator !== 'undefined') {
      PTCalculator.populateRefDropdown(sel, currentRef);
    }
  }

  function updateEngineBadge() {
    const badge = document.getElementById('phi-engine-badge');
    const status = document.getElementById('phi-engine-status');
    if (!badge || !status) return;

    const ready = typeof CoolPropEngine !== 'undefined' && CoolPropEngine.isReady();
    if (ready) {
      badge.className = 'phi-engine-badge phi-engine-ready';
      status.textContent = t('phi.engine_nist', '🔬 NIST급 정밀 계산 (CoolProp)');
    } else {
      badge.className = 'phi-engine-badge phi-engine-demo';
      status.textContent = t('phi.engine_demo', '📐 데모 모드 — CoolProp 로딩 시 정밀 선도로 전환');
    }
  }


  // ============================================================
  // DATA LOADING
  // ============================================================
  function loadData() {
    const ready = typeof CoolPropEngine !== 'undefined' && CoolPropEngine.isReady();

    if (ready) {
      loadCoolPropData();
    } else {
      // Demo mode
      curveData = DEMO_CURVE;
      cycleData = DEMO_CYCLE;
      computeBounds();
      render();
    }
  }

  function loadCoolPropData() {
    const coolpropName = getCoolPropName(currentRef);
    if (!coolpropName) return;

    curveData = CoolPropEngine.generatePHCurve(coolpropName, 80);
    if (!curveData) {
      curveData = DEMO_CURVE;
    }

    // Default cycle: typical operating conditions
    const defaults = {
      'R-410A': { sP: 118, dP: 380, sh: 10, sc: 10 },
      'R-22':   { sP: 57,  dP: 211, sh: 10, sc: 10 },
      'R-32':   { sP: 114, dP: 390, sh: 10, sc: 10 },
      'R-134a': { sP: 20,  dP: 130, sh: 10, sc: 10 },
      'R-404A': { sP: 55,  dP: 260, sh: 10, sc: 10 },
      'R-407C': { sP: 57,  dP: 250, sh: 10, sc: 10 },
      'R-290':  { sP: 57,  dP: 200, sh: 10, sc: 10 }
    };
    const d = defaults[currentRef] || { sP: 100, dP: 300, sh: 10, sc: 10 };
    cycleData = CoolPropEngine.calculateCyclePoints(coolpropName, d.sP, d.dP, d.sh, d.sc);

    if (!cycleData) cycleData = DEMO_CYCLE;

    computeBounds();
    updateFaultCycle();
    render();
  }

  function getCoolPropName(refId) {
    if (typeof RefrigerantCatalog !== 'undefined') return RefrigerantCatalog.getCoolPropName(refId);
    const map = { 'R-22':'R22','R-410A':'R410A','R-32':'R32','R-454B':'R454B','R-134a':'R134a','R-404A':'R404A','R-407C':'R407C','R-290':'Propane' };
    return map[refId] || refId;
  }

  function computeBounds() {
    if (!curveData) return;

    const allH = [...curveData.saturatedLiquid.map(p => p.h), ...curveData.saturatedVapor.map(p => p.h)];
    const allP = [...curveData.saturatedLiquid.map(p => p.p), ...curveData.saturatedVapor.map(p => p.p)];

    if (cycleData) {
      [cycleData.point1, cycleData.point2, cycleData.point3, cycleData.point4].forEach(pt => {
        allH.push(pt.h); allP.push(pt.p);
      });
    }

    hMin = Math.min(...allH) * 0.90;
    hMax = Math.max(...allH) * 1.10;
    pMin = Math.min(...allP) * 0.65;
    pMax = Math.max(...allP) * 1.35;
    logPMin = Math.log10(pMin);
    logPMax = Math.log10(pMax);
  }


  // ============================================================
  // FAULT SIMULATION
  // ============================================================
  function updateFaultCycle() {
    if (!activeFault || !cycleData || !FAULT_SHIFTS[activeFault]) {
      faultCycle = null;
      return;
    }

    const shifts = FAULT_SHIFTS[activeFault];
    const sl = severityLevel; // 0-3

    faultCycle = {};
    ['point1','point2','point3','point4'].forEach(key => {
      const orig = cycleData[key];
      const s = shifts[key];
      faultCycle[key] = {
        ...orig,
        h: orig.h + (s.h[sl] || 0),
        p: Math.max(50, orig.p + (s.p[sl] || 0))
      };
    });

    // Calculate fault COP
    if (faultCycle.point1 && faultCycle.point2 && faultCycle.point4) {
      const re = faultCycle.point1.h - faultCycle.point4.h;
      const w = faultCycle.point2.h - faultCycle.point1.h;
      faultCycle.cop = w > 0 ? re / w : 0;
      faultCycle.refrigEffect = re;
      faultCycle.compWork = w;
    }
  }

  function onFaultChange() {
    activeFault = document.getElementById('phi-fault-select')?.value || '';
    const sevWrap = document.getElementById('phi-severity-wrap');
    if (sevWrap) sevWrap.style.display = activeFault ? '' : 'none';

    // Reset severity to SL3 (index 2) on fault change
    severityLevel = 2;
    const slider = document.getElementById('phi-severity-slider');
    const txt = document.getElementById('phi-severity-text');
    if (slider) slider.value = '2';
    if (txt) txt.textContent = 'SL3';

    updateFaultCycle();
    updateCOPCompare();
    render();
  }

  function onSeverityChange() {
    severityLevel = parseInt(document.getElementById('phi-severity-slider')?.value || '2');
    const txt = document.getElementById('phi-severity-text');
    if (txt) txt.textContent = `SL${severityLevel + 1}`;

    updateFaultCycle();
    updateCOPCompare();
    render();
  }

  function updateCOPCompare() {
    const el = document.getElementById('phi-cop-compare');
    if (!el) return;

    if (!activeFault || !cycleData || !faultCycle) {
      el.innerHTML = '';
      return;
    }

    const normalCOP = cycleData.cop || 0;
    const faultCOP = faultCycle.cop || 0;
    const pct = normalCOP > 0 ? ((1 - faultCOP / normalCOP) * 100).toFixed(0) : 0;

    el.innerHTML = `
      <div class="phi-cop-row">
        <span class="phi-cop-normal">${t('phi.cop_normal', '정상 COP')} <b>${normalCOP.toFixed(2)}</b></span>
        <span class="phi-cop-arrow">→</span>
        <span class="phi-cop-fault">${t('phi.cop_fault', '고장 COP')} <b>${faultCOP.toFixed(2)}</b></span>
        <span class="phi-cop-drop">(▼${pct}%)</span>
      </div>`;
  }


  // ============================================================
  // CANVAS RENDERING
  // ============================================================
  function render() {
    if (!ctx || !curveData) return;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Apply zoom/pan transform
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Clear
    ctx.fillStyle = '#0d1120';
    ctx.fillRect(-transform.x / transform.scale, -transform.y / transform.scale, canvasW / transform.scale, canvasH / transform.scale);

    // Grid
    drawGrid();

    // Dome fill (2-phase region)
    drawDomeFill();

    // Saturation curves
    drawSatCurves();

    // Region labels
    drawRegionLabels();

    // Normal cycle
    if (cycleData) drawCycle(cycleData, 'rgba(59,130,246,0.9)', false);

    // Fault cycle overlay
    if (faultCycle) drawCycle(faultCycle, 'rgba(239,68,68,0.85)', true);

    // Cycle point markers (on top)
    if (cycleData) drawPointMarkers(cycleData, '#3b82f6');
    if (faultCycle) drawPointMarkers(faultCycle, '#ef4444');

    // Axis labels
    drawAxisLabels();

    // Legend
    if (faultCycle) drawLegend();

    ctx.restore();
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(42,54,84,0.4)';
    ctx.lineWidth = 0.5;
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillStyle = '#5a6a8a';
    ctx.textAlign = 'end';

    // Pressure grid (log scale)
    const pStart = Math.floor(logPMin);
    const pEnd = Math.ceil(logPMax);
    for (let d = pStart; d <= pEnd; d++) {
      for (let m = 1; m < 10; m++) {
        const val = Math.pow(10, d) * m;
        if (val < pMin || val > pMax) continue;
        const y = scaleP(val);
        const isMain = (m === 1);
        ctx.globalAlpha = isMain ? 0.5 : 0.15;
        ctx.lineWidth = isMain ? 0.7 : 0.3;
        ctx.beginPath(); ctx.moveTo(MARGIN.left, y); ctx.lineTo(MARGIN.left + plotW, y); ctx.stroke();
        if (isMain) {
          ctx.globalAlpha = 0.7;
          ctx.fillText(Math.round(val), MARGIN.left - 6, y + 3);
        }
      }
    }

    // Enthalpy grid
    ctx.textAlign = 'center';
    const hStep = Math.ceil((hMax - hMin) / 8 / 10) * 10;
    for (let h = Math.ceil(hMin / hStep) * hStep; h <= hMax; h += hStep) {
      const x = scaleH(h);
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.moveTo(x, MARGIN.top); ctx.lineTo(x, MARGIN.top + plotH); ctx.stroke();
      ctx.globalAlpha = 0.7;
      ctx.fillText(Math.round(h), x, MARGIN.top + plotH + 14);
    }
    ctx.globalAlpha = 1;
  }

  function drawDomeFill() {
    if (!curveData.saturatedLiquid.length || !curveData.saturatedVapor.length) return;

    ctx.beginPath();
    // Left side (liquid line, bottom to top)
    curveData.saturatedLiquid.forEach((p, i) => {
      const x = scaleH(p.h), y = scaleP(p.p);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    // Right side (vapor line, top to bottom — reversed)
    for (let i = curveData.saturatedVapor.length - 1; i >= 0; i--) {
      const p = curveData.saturatedVapor[i];
      ctx.lineTo(scaleH(p.h), scaleP(p.p));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(6,182,212,0.06)';
    ctx.fill();
  }

  function drawSatCurves() {
    // Liquid line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    curveData.saturatedLiquid.forEach((p, i) => {
      const x = scaleH(p.h), y = scaleP(p.p);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Vapor line
    ctx.strokeStyle = '#06b6d4';
    ctx.beginPath();
    curveData.saturatedVapor.forEach((p, i) => {
      const x = scaleH(p.h), y = scaleP(p.p);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Critical point
    const lastLiq = curveData.saturatedLiquid[curveData.saturatedLiquid.length - 1];
    if (lastLiq) {
      const cx = scaleH(lastLiq.h), cy = scaleP(lastLiq.p);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.font = '9px system-ui'; ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center';
      ctx.fillText(t('phi.critical', '임계점'), cx, cy - 8);
    }
  }

  function drawRegionLabels() {
    ctx.font = '10px system-ui';
    ctx.globalAlpha = 0.35;
    ctx.textAlign = 'center';

    // Subcooled region (left of dome)
    const liqMid = curveData.saturatedLiquid[Math.floor(curveData.saturatedLiquid.length / 3)];
    if (liqMid) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(t('phi.subcooled', '과냉 액체'), scaleH(liqMid.h) - 30, scaleP(liqMid.p));
    }

    // Two-phase (inside dome)
    const midIdx = Math.floor(curveData.saturatedLiquid.length / 2);
    const liq = curveData.saturatedLiquid[midIdx];
    const vap = curveData.saturatedVapor[midIdx];
    if (liq && vap) {
      ctx.fillStyle = '#06b6d4';
      ctx.fillText(t('phi.twophase', '2상 혼합'), scaleH((liq.h + vap.h) / 2), scaleP(liq.p) + 5);
    }

    // Superheated (right of dome)
    const vapMid = curveData.saturatedVapor[Math.floor(curveData.saturatedVapor.length / 3)];
    if (vapMid) {
      ctx.fillStyle = '#8b5cf6';
      ctx.fillText(t('phi.superheated', '과열 증기'), scaleH(vapMid.h) + 35, scaleP(vapMid.p));
    }
    ctx.globalAlpha = 1;
  }

  function drawCycle(cycle, color, isDashed) {
    const pts = [cycle.point1, cycle.point2, cycle.point3, cycle.point4];

    ctx.strokeStyle = color;
    ctx.lineWidth = isDashed ? 2 : 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = isDashed ? 0 : 6;

    if (isDashed) ctx.setLineDash([6, 4]);
    else ctx.setLineDash([]);

    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const from = pts[i], to = pts[(i + 1) % 4];
      ctx.moveTo(scaleH(from.h), scaleP(from.p));
      ctx.lineTo(scaleH(to.h), scaleP(to.p));
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
  }

  function drawPointMarkers(cycle, color) {
    const pts = [cycle.point1, cycle.point2, cycle.point3, cycle.point4];
    const icons = ['💨', '🔥', '💧', '❄️'];
    const labels = ['1', '2', '3', '4'];

    pts.forEach((pt, i) => {
      const cx = scaleH(pt.h), cy = scaleP(pt.p);

      // Outer glow
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();

      // Inner circle
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0d1120';
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.stroke();

      // Label number
      ctx.fillStyle = color;
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], cx, cy + 4);
    });
  }

  function drawAxisLabels() {
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#8896b3';
    ctx.textAlign = 'center';
    ctx.fillText(t('phi.axis_h', '엔탈피 h (kJ/kg)'), canvasW / 2, canvasH - 6);

    ctx.save();
    ctx.translate(12, canvasH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(t('phi.axis_p', '압력 P (kPa)'), 0, 0);
    ctx.restore();

    // Title
    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = '#e8ecf4';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentRef} ${t('phi.chart_title', 'P-H 선도')}`, canvasW / 2, 18);
  }

  function drawLegend() {
    const x = MARGIN.left + 8, y = 28;
    ctx.font = '9px system-ui';

    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20, y); ctx.stroke();
    ctx.fillStyle = '#8896b3'; ctx.textAlign = 'left';
    ctx.fillText(t('phi.legend_normal', '정상'), x + 24, y + 3);

    ctx.strokeStyle = '#ef4444'; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x + 50, y); ctx.lineTo(x + 70, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText(t('phi.legend_fault', '고장'), x + 74, y + 3);
  }


  // ============================================================
  // TOUCH / CLICK INTERACTION
  // ============================================================
  function onCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - transform.x) / transform.scale;
    const y = (e.clientY - rect.top - transform.y) / transform.scale;
    handleHit(x, y);
  }

  function handleHit(x, y) {
    const HIT_R = 22; // pixel hit radius
    const HIT_LINE = 14;

    // Close existing popover first
    closePopover();

    // 1. Check cycle points
    if (cycleData) {
      const pts = { point1: cycleData.point1, point2: cycleData.point2, point3: cycleData.point3, point4: cycleData.point4 };
      for (const [key, pt] of Object.entries(pts)) {
        const px = scaleH(pt.h), py = scaleP(pt.p);
        if (dist(x, y, px, py) < HIT_R) {
          showPopover(key, px, py);
          return;
        }
      }
    }

    // 2. Check fault cycle points
    if (faultCycle) {
      const pts = { point1: faultCycle.point1, point2: faultCycle.point2, point3: faultCycle.point3, point4: faultCycle.point4 };
      for (const [key, pt] of Object.entries(pts)) {
        const px = scaleH(pt.h), py = scaleP(pt.p);
        if (dist(x, y, px, py) < HIT_R) {
          showPopover(key, px, py, true);
          return;
        }
      }
    }

    // 3. Check process lines
    if (cycleData) {
      const lines = [
        { key: 'process_12', from: cycleData.point1, to: cycleData.point2 },
        { key: 'process_23', from: cycleData.point2, to: cycleData.point3 },
        { key: 'process_34', from: cycleData.point3, to: cycleData.point4 },
        { key: 'process_41', from: cycleData.point4, to: cycleData.point1 }
      ];
      for (const line of lines) {
        const x1 = scaleH(line.from.h), y1 = scaleP(line.from.p);
        const x2 = scaleH(line.to.h), y2 = scaleP(line.to.p);
        if (distToSegment(x, y, x1, y1, x2, y2) < HIT_LINE) {
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          showPopover(line.key, mx, my);
          return;
        }
      }
    }

    // 4. Check regions
    const phH = unscaleH(x), phP = unscaleP(y);
    if (phH && phP && x > MARGIN.left && x < MARGIN.left + plotW && y > MARGIN.top && y < MARGIN.top + plotH) {
      const region = detectRegion(phH, phP);
      if (region) {
        showPopover('region_' + region, x, y);
        return;
      }
    }
  }

  function detectRegion(h, p) {
    if (!curveData) return 'superheated';

    // Find closest pressure level in saturation data
    let liqH = null, vapH = null;
    let bestDist = Infinity;
    for (let i = 0; i < curveData.saturatedLiquid.length; i++) {
      const lp = curveData.saturatedLiquid[i];
      const vp = curveData.saturatedVapor[i];
      if (!vp) continue;
      const d = Math.abs(Math.log10(lp.p) - Math.log10(p));
      if (d < bestDist) {
        bestDist = d;
        liqH = lp.h;
        vapH = vp.h;
      }
    }

    if (liqH == null || vapH == null) return 'superheated';
    if (h < liqH) return 'subcooled';
    if (h > vapH) return 'superheated';
    return 'twophase';
  }

  function dist(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return dist(px, py, x1, y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return dist(px, py, x1 + t * dx, y1 + t * dy);
  }


  // ============================================================
  // POPOVER
  // ============================================================
  function showPopover(key, canvasX, canvasY, isFaultPoint) {
    const popover = document.getElementById('phi-popover');
    if (!popover) return;

    let content = getTranslatedContent(key);
    if (!content) return;

    // If fault is active and this is a cycle point, add fault-specific info
    let faultNote = '';
    if (activeFault && isFaultPoint && FAULT_EDUCATION[activeFault]) {
      const fe = getTranslatedFault(activeFault);
      const pointKey = key; // 'point1'..'point4'
      if (fe[pointKey]) {
        faultNote = `
          <div class="phi-pop-fault">
            <div class="phi-pop-fault-title">${App.statusSvg('warning')} ${t('phi.fault_when', '{name} 시').replace('{name}', fe.name)}</div>
            <div class="phi-pop-fault-text">${fe[pointKey]}</div>
          </div>`;
      }
    }

    // Build current value if available
    let valueHtml = '';
    if (content.valueKey && cycleData) {
      const val = cycleData[content.valueKey];
      if (val != null) {
        valueHtml = `<div class="phi-pop-value">📏 ${content.valueLabel}: <b>${typeof val === 'number' ? val.toFixed(1) : val}${content.valueUnit}</b></div>`;
      }
    }
    if (content.normalRange) {
      valueHtml += `<div class="phi-pop-normal">${App.statusSvg('normal')} ${content.normalRange}</div>`;
    }

    popover.innerHTML = `
      <div class="phi-pop-header">
        <span class="phi-pop-icon">${content.icon}</span>
        <span class="phi-pop-title">${content.title}</span>
      </div>
      <div class="phi-pop-desc">${content.description}</div>
      <ul class="phi-pop-details">
        ${content.details.map(d => `<li>${d}</li>`).join('')}
      </ul>
      ${valueHtml}
      ${faultNote}
      <button class="phi-pop-close" onclick="PHInteractive.closePopover()">${t('common.close', '닫기')}</button>
    `;

    // Position — relative to canvas-wrap
    const wrap = document.getElementById('phi-canvas-wrap');
    const wrapRect = wrap.getBoundingClientRect();

    let left = canvasX * transform.scale + transform.x;
    let top = canvasY * transform.scale + transform.y;

    // Adjust to not go off-screen
    const popW = 280;
    if (left + popW > wrapRect.width) left = wrapRect.width - popW - 8;
    if (left < 8) left = 8;
    if (top > wrapRect.height - 100) top -= 180;
    if (top < 8) top = 8;

    popover.style.left = left + 'px';
    popover.style.top = top + 'px';
    popover.classList.add('show');
  }

  function closePopover() {
    const popover = document.getElementById('phi-popover');
    if (popover) popover.classList.remove('show');
  }


  // ============================================================
  // TOUCH GESTURES (pinch zoom + pan)
  // ============================================================
  let touchStartCount = 0;

  function onTouchStart(e) {
    closePopover();
    touchStartCount = e.touches.length;

    if (e.touches.length === 2) {
      e.preventDefault();
      pinchDist = dist(
        e.touches[0].clientX, e.touches[0].clientY,
        e.touches[1].clientX, e.touches[1].clientY
      );
    } else if (e.touches.length === 1 && transform.scale > 1.05) {
      isPanning = true;
      lastPan = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  function onTouchMove(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const newDist = dist(
        e.touches[0].clientX, e.touches[0].clientY,
        e.touches[1].clientX, e.touches[1].clientY
      );
      if (pinchDist < 1) { pinchDist = newDist; return; }
      const ratio = newDist / pinchDist;
      transform.scale = Math.max(1, Math.min(5, transform.scale * ratio));
      pinchDist = newDist;
      render();
    } else if (isPanning && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - lastPan.x;
      const dy = e.touches[0].clientY - lastPan.y;
      transform.x += dx;
      transform.y += dy;
      lastPan = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      render();
    }
  }

  function onTouchEnd(e) {
    if (e.touches.length === 0) {
      // If it was a single tap (not pan), treat as click
      if (touchStartCount === 1 && !isPanning) {
        // handled by click event
      }
      isPanning = false;
    }
    touchStartCount = e.touches.length;
  }

  function resetZoom() {
    transform = { x: 0, y: 0, scale: 1 };
    render();
  }


  // ============================================================
  // FULLSCREEN
  // ============================================================
  function toggleFullscreen() {
    const card = container?.querySelector('.phi-main-card');
    if (!card) return;
    card.classList.toggle('phi-fullscreen');

    setTimeout(() => {
      setupCanvas();
      render();
    }, 100);
  }


  // ============================================================
  // EVENT HANDLERS
  // ============================================================
  function onRefChange() {
    currentRef = document.getElementById('phi-ref-select')?.value || 'R-410A';
    activeFault = '';
    faultCycle = null;
    transform = { x: 0, y: 0, scale: 1 };
    document.getElementById('phi-fault-select').value = '';
    document.getElementById('phi-severity-wrap').style.display = 'none';
    document.getElementById('phi-cop-compare').innerHTML = '';

    loadData();
    updateEngineBadge();
  }

  function onEngineReady() {
    updateEngineBadge();
    loadData();
  }


  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    initUI,
    onRefChange,
    onFaultChange,
    onSeverityChange,
    toggleFullscreen,
    resetZoom,
    closePopover,
    onEngineReady,
    isInitialized: () => initialized
  };

})();

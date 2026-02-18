// ===================================================
// HVAC Pulse — Cross Diagnostic Engine
// Copyright (c) 2024-2026. All rights reserved.
// Superheat × Subcooling matrix + additional warnings
// Based on AC Service Tech / HVAC School / Trane data
// Severity levels + AdvancedDiagnostic integration
// ===================================================

const DiagnosticEngine = (() => {

  // --- Diagnostic matrix definitions ---
  const DIAGNOSIS_MAP = {
    normal: {
      title: '시스템 정상',
      level: 'normal',
      cause: '과열도와 과냉도가 모두 정상 범위 내에 있습니다.',
      actions: [
        '정기 유지보수 일정 확인',
        '에어필터 교체 주기 확인',
        '응축기 코일 청결 상태 점검'
      ],
      detail: '냉매가 증발기와 응축기에서 적절히 열교환하고 있으며, TXV/계량장치가 정상 작동 중입니다.'
    },

    lowCharge: {
      title: '냉매 부족 (누설 의심)',
      level: 'danger',
      cause: '과열도 높음 + 과냉도 낮음 → 시스템 전체적으로 냉매가 부족합니다.',
      actions: [
        '누설 탐지 실시 (접합부, 밸브 스템, 용접부)',
        '사이트글라스 확인 (기포 = 부족)',
        '누설 수리 후 진공 → 재충전',
        '충전량은 반드시 무게 기반으로'
      ],
      detail: '냉매가 부족하면 증발기에서 너무 일찍 기화가 완료되어 과열도가 높아지고, 응축기에도 액냉매가 부족하여 과냉도가 낮아집니다. "Gas-n-Go" 금지 — 반드시 누설을 먼저 찾아 수리하세요.'
    },

    meteringRestriction: {
      title: '계량장치 제한 (TXV/필터 막힘)',
      level: 'caution',
      cause: '과열도 높음 + 과냉도 높음 → 고압측에 냉매가 갇혀 있습니다.',
      actions: [
        '필터 드라이어 전후 온도차 확인 (>3°F = 막힘)',
        'TXV 반응 테스트 (센싱벌브에 열 가하기)',
        'TXV 스트레이너 점검/청소',
        '사이트글라스 설치 및 확인'
      ],
      detail: '냉매는 충분하지만 계량장치(TXV/필터/드라이어)가 막혀 증발기로 공급이 제한됩니다. 응축기에 냉매가 과다 체류하여 과냉도가 높아집니다. 압력만 보면 냉매 부족으로 오진할 수 있으니 주의하세요.'
    },

    overcharge: {
      title: '냉매 과충전',
      level: 'danger',
      cause: '과열도 낮음 + 과냉도 높음 → 시스템에 냉매가 너무 많습니다.',
      actions: [
        '충전량 확인 (명판 vs 실제)',
        '과잉 냉매 회수',
        '무게 기반 재충전',
        '리퀴드백 위험 — 컴프레서 손상 주의'
      ],
      detail: '과충전 시 액냉매가 컴프레서로 돌아와 리퀴드 슬러깅을 유발할 수 있습니다. 컴프레서 내부 부품 파손 위험이 높습니다.'
    },

    compressorWeak: {
      title: '컴프레서 불량 (효율 저하)',
      level: 'danger',
      cause: '과열도 낮음 + 과냉도 낮음 → 컴프레서가 냉매를 충분히 압축하지 못합니다.',
      actions: [
        '컴프레서 전류 측정 (정격 대비)',
        '압축비 확인',
        '흡입/토출 밸브 누설 점검',
        '모터 권선 저항 확인'
      ],
      detail: '컴프레서 밸브 누설이나 효율 저하로 흡입측과 토출측 모두 정상 압력을 유지하지 못합니다. 컴프레서 교체 전 반드시 시스템 근본 원인을 확인하세요 — "컴프레서는 죽지 않는다, 죽임당한다".'
    },

    txvOverfeed: {
      title: 'TXV 오버피딩',
      level: 'caution',
      cause: '과열도 낮음 + 과냉도 정상 → TXV가 냉매를 과다 공급합니다.',
      actions: [
        'TXV 과열도 조정 (시계방향으로 조임)',
        '센싱벌브 위치 확인 (바닥 6시 금지)',
        '센싱벌브 단열 상태 확인',
        '에어플로우 정상 확인 (ABC 원칙)'
      ],
      detail: 'TXV가 과잉 개방되어 증발기에 액냉매가 넘치고 있습니다. 리퀴드백 위험이 있으므로 즉시 조정이 필요합니다.'
    },

    lowAirflow: {
      title: '에어플로우 부족',
      level: 'caution',
      cause: '과열도 높음 + 과냉도 정상 → 증발기에 열부하가 부족합니다.',
      actions: [
        '에어필터 상태 확인 (교체 필요?)',
        '증발기 코일 청결도 점검',
        '블로워 모터/팬 작동 확인',
        '덕트 연결/누설 점검',
        '정압(TESP) 측정 — 0.3~0.7 inWC 정상'
      ],
      detail: '에어플로우가 부족하면 증발기에서 열교환이 저하되어 흡입압력이 낮아지고 과열도가 높아집니다. 냉매 부족과 비슷한 증상이지만 과냉도가 정상인 것이 구별 포인트입니다.'
    }
  };

  // --- Main Diagnosis ---
  function diagnose(params) {
    const { refName, suctionPressure, dischargePressure, suctionLineTemp, liquidLineTemp, outdoorTemp, returnAirTemp } = params;

    const shResult = PTCalculator.calcSuperheat(refName, suctionPressure, suctionLineTemp);
    const scResult = PTCalculator.calcSubcooling(refName, dischargePressure, liquidLineTemp);

    if (!shResult || !scResult) return null;

    const superheat = shResult.superheat;
    const subcooling = scResult.subcooling;

    const suctionSatTemp = shResult.satTemp;
    const dtd = returnAirTemp - suctionSatTemp;

    const condensingSatTemp = scResult.satTemp;
    const ctoa = condensingSatTemp - outdoorTemp;

    const suctionAbsolute = suctionPressure + 14.7;
    const compressionRatio = suctionAbsolute > 0 ? (dischargePressure + 14.7) / suctionAbsolute : 99;
    const dlt = condensingSatTemp + superheat + (compressionRatio * 8);

    // --- Classify ---
    const shClass = superheat > 20 ? 'high' : superheat < 5 ? 'low' : 'normal';
    const scClass = subcooling > 18 ? 'high' : subcooling < 5 ? 'low' : 'normal';

    // --- Diagnosis matrix ---
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

    const diagnosis = { ...DIAGNOSIS_MAP[diagKey] };

    // --- Additional warnings ---
    const warnings = [];
    if (dtd > 40) {
      warnings.push({
        type: 'warning',
        text: `DTD ${dtd.toFixed(1)}°F (>40°F) — 에어플로우 심각 부족 또는 증발기 결빙 의심`
      });
    }
    if (compressionRatio > 12) {
      warnings.push({
        type: 'danger',
        text: `압축비 ${compressionRatio.toFixed(1)}:1 (>12:1) — 컴프레서 과부하 위험! 즉시 원인 파악 필요`
      });
    }
    if (dlt > 275) {
      warnings.push({
        type: 'danger',
        text: `추정 DLT ${dlt.toFixed(0)}°F (>275°F) — 오일 파괴 위험! 즉시 시스템 정지`
      });
    }
    if (suctionSatTemp < 32) {
      warnings.push({
        type: 'warning',
        text: `흡입 포화온도 ${suctionSatTemp.toFixed(1)}°F (<32°F) — 증발기 결빙 위험`
      });
    }

    return {
      superheat,
      subcooling,
      suctionSatTemp: shResult.satTemp,
      condensingSatTemp: scResult.satTemp,
      dtd,
      ctoa,
      compressionRatio,
      dlt,
      shClass,
      scClass,
      diagKey,
      diagnosis,
      warnings
    };
  }

  // =============================================
  // UI Logic
  // =============================================
  function initUI() {
    const calcBtn = document.getElementById('diag-calc-btn');
    if (calcBtn) {
      calcBtn.addEventListener('click', runDiagnostic);
    }

    // Populate refrigerant dropdown (category-based)
    const refSelect = document.getElementById('diag-ref-select');
    if (refSelect) {
      if (typeof PTCalculator !== 'undefined' && PTCalculator.populateRefDropdown) {
        PTCalculator.populateRefDropdown(refSelect);
      } else {
        getRefrigerantList().forEach(key => {
          const ref = REFRIGERANT_DB[key];
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = `${key} (${ref.safety})`;
          refSelect.appendChild(opt);
        });
      }
    }
  }

  function runDiagnostic() {
    const refName = document.getElementById('diag-ref-select')?.value;

    // Inline validation for required fields
    const fields = [
      { id: 'diag-suction-p', msg: t('validation.suction_p', '흡입압력을 입력하세요') },
      { id: 'diag-discharge-p', msg: t('validation.discharge_p', '토출압력을 입력하세요') },
      { id: 'diag-suction-t', msg: t('validation.suction_t', '석션라인 온도를 입력하세요') },
      { id: 'diag-liquid-t', msg: t('validation.liquid_t', '리퀴드라인 온도를 입력하세요') }
    ];
    const optionalFields = [
      { id: 'diag-outdoor-t' },
      { id: 'diag-return-t' }
    ];

    let hasError = false;
    fields.forEach(f => {
      const el = document.getElementById(f.id);
      if (!App.validateField(el, f.msg)) hasError = true;
    });
    // Optional fields: just clear errors, use defaults if empty
    optionalFields.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) App.clearValidation(el);
    });

    if (hasError) return;

    const suctionPressure = parseFloat(document.getElementById('diag-suction-p')?.value);
    const dischargePressure = parseFloat(document.getElementById('diag-discharge-p')?.value);
    const suctionLineTemp = parseFloat(document.getElementById('diag-suction-t')?.value);
    const liquidLineTemp = parseFloat(document.getElementById('diag-liquid-t')?.value);
    const outdoorRaw = parseFloat(document.getElementById('diag-outdoor-t')?.value);
    const returnRaw = parseFloat(document.getElementById('diag-return-t')?.value);
    const outdoorTemp = isNaN(outdoorRaw) ? 95 : outdoorRaw;
    const returnAirTemp = isNaN(returnRaw) ? 75 : returnRaw;

    // Safety: prevent NaN propagation from required fields
    if ([suctionPressure, dischargePressure, suctionLineTemp, liquidLineTemp].some(isNaN)) return;

    // Range validation: physically reasonable HVAC values
    if (suctionPressure < -14.6 || suctionPressure > 800) {
      const el = document.getElementById('diag-suction-p');
      if (el) App.validateField(el, t('validation.pressure_range', '압력 범위를 확인하세요 (0~800 psig)'));
      return;
    }

    // Cross-validate: discharge must be higher than suction
    if (dischargePressure <= suctionPressure) {
      const dpEl = document.getElementById('diag-discharge-p');
      if (dpEl) App.validateField(dpEl, t('validation.pressure_compare', '토출압력은 흡입압력보다 높아야 합니다'));
      return;
    }

    const resultEl = document.getElementById('diag-result-area');
    if (!resultEl) return;

    const result = diagnose({
      refName, suctionPressure, dischargePressure,
      suctionLineTemp, liquidLineTemp, outdoorTemp, returnAirTemp
    });

    if (!result) {
      resultEl.innerHTML = `<div class="alert-box alert-danger"><span class="diag-icon-svg icon-danger">${App.SVG_ICONS.xCircle}</span><span>${t('error.calc_error', '계산 오류가 발생했습니다.')}</span></div>`;
      return;
    }

    // Store result in DataBridge for cross-module access
    if (typeof DataBridge !== 'undefined') {
      // Enrich with severity before storing
      let severity = null;
      if (typeof AdvancedDiagnostic !== 'undefined' && result.diagKey !== 'normal') {
        severity = AdvancedDiagnostic.determineSeverity(result.diagKey, result.superheat, result.subcooling, result.compressionRatio);
      }
      DataBridge.setDiagResult({ ...result, severity });
    }

    renderResult(result, resultEl);
  }

  // Map diagKey to i18n translation key prefixes
  const DIAG_KEY_MAP = {
    normal: 'diag.normal',
    lowCharge: 'diag.lowcharge',
    meteringRestriction: 'diag.metering',
    overcharge: 'diag.overcharge',
    compressorWeak: 'diag.compressor',
    txvOverfeed: 'diag.txvoverfeed',
    lowAirflow: 'diag.lowairflow'
  };

  function getDiagText(diagKey, field, fallback) {
    const prefix = DIAG_KEY_MAP[diagKey];
    if (!prefix) return fallback;
    return t(`${prefix}.${field}`, fallback);
  }

  function getDiagActions(diagKey, fallbackActions) {
    const prefix = DIAG_KEY_MAP[diagKey];
    if (!prefix) return fallbackActions;
    return fallbackActions.map((a, i) => t(`${prefix}.action${i + 1}`, a));
  }

  function renderResult(r, el) {
    const shStatus = PTCalculator.getSuperheatStatus(r.superheat);
    const scStatus = PTCalculator.getSubcoolingStatus(r.subcooling);

    // --- Advanced Diagnostic enrichment ---
    let severityHtml = '';
    let signatureHtml = '';
    let differentialHtml = '';
    let fieldTipsHtml = '';

    if (typeof AdvancedDiagnostic !== 'undefined' && r.diagKey && r.diagKey !== 'normal') {
      // Severity badge
      const severity = AdvancedDiagnostic.determineSeverity(r.diagKey, r.superheat, r.subcooling, r.compressionRatio);
      if (severity) {
        severityHtml = AdvancedDiagnostic.renderSeverityBadge(severity);
      }

      // Fault signature arrows
      const sigDisplay = AdvancedDiagnostic.getSignatureDisplay(r.diagKey);
      if (sigDisplay && sigDisplay.signatures) {
        signatureHtml = AdvancedDiagnostic.renderSignatureArrows(sigDisplay.signatures);
      }

      // Differential diagnosis
      const diffHints = AdvancedDiagnostic.getDifferentialHints(r.shClass, r.scClass, r.superheat, r.subcooling);
      if (diffHints) {
        differentialHtml = AdvancedDiagnostic.renderDifferentialHints(diffHints);
      }

      // Field tips
      if (sigDisplay && sigDisplay.fieldTips) {
        fieldTipsHtml = AdvancedDiagnostic.renderFieldTips(sigDisplay.fieldTips);
      }
    }

    // Translate diagnosis content
    const diagTitle = getDiagText(r.diagKey, 'title', r.diagnosis.title);
    const diagCause = getDiagText(r.diagKey, 'cause', r.diagnosis.cause);
    const diagDetail = getDiagText(r.diagKey, 'detail', r.diagnosis.detail);
    const diagActions = getDiagActions(r.diagKey, r.diagnosis.actions);

    let html = `
      <!-- Computed Values -->
      <div class="computed-row" style="grid-template-columns:repeat(3,1fr)">
        <div class="computed-item">
          <div class="comp-value ${shStatus}">${r.superheat.toFixed(1)}°F</div>
          <div class="comp-label">${t('settings.matrix.col1', '과열도')}</div>
        </div>
        <div class="computed-item">
          <div class="comp-value ${scStatus}">${r.subcooling.toFixed(1)}°F</div>
          <div class="comp-label">${t('settings.matrix.col2', '과냉도')}</div>
        </div>
        <div class="computed-item">
          <div class="comp-value" style="color:var(--text-primary)">${r.compressionRatio.toFixed(1)}</div>
          <div class="comp-label">CR</div>
        </div>
      </div>

      <div class="computed-row">
        <div class="computed-item">
          <div class="comp-value" style="font-size:var(--text-xl);color:var(--text-primary)">${r.dtd.toFixed(1)}°F</div>
          <div class="comp-label">DTD</div>
        </div>
        <div class="computed-item">
          <div class="comp-value" style="font-size:var(--text-xl);color:var(--text-primary)">${r.ctoa.toFixed(1)}°F</div>
          <div class="comp-label">CTOA</div>
        </div>
      </div>

      <!-- Diagnosis -->
      <div class="diag-result result-${r.diagnosis.level} animate-slide-up">
        ${severityHtml}
        ${App.diagIcon(r.diagnosis.level)}
        <div class="diag-title">${diagTitle}</div>
        ${signatureHtml}
        <div class="diag-detail">
          <strong>${t('result.cause', '원인:')}</strong> ${diagCause}<br><br>
          <strong>${t('result.actions', '조치사항:')}</strong>
          <ul style="margin:8px 0 8px 16px">${diagActions.map(a => `<li>${a}</li>`).join('')}</ul>
          <strong>${t('result.detail', '상세:')}</strong> ${diagDetail}
        </div>
        ${fieldTipsHtml}
      </div>`;

    // Differential diagnosis section
    if (differentialHtml) {
      html += differentialHtml;
    }

    // Warnings
    if (r.warnings.length > 0) {
      const warnIconMap = { warning: App.SVG_ICONS.alertTriangle, danger: App.SVG_ICONS.xCircle };
      const warnClsMap = { warning: 'icon-caution', danger: 'icon-danger' };
      html += `<div class="mt-12">`;
      r.warnings.forEach(w => {
        html += `<div class="alert-box alert-${w.type}"><span class="diag-icon-svg ${warnClsMap[w.type] || ''}">${warnIconMap[w.type] || ''}</span><span>${w.text}</span></div>`;
      });
      html += `</div>`;
    }

    // Copy / Export button row
    const diagText = `[${r.diagnosis.title}] 과열도:${r.superheat.toFixed(1)}°F 과냉도:${r.subcooling.toFixed(1)}°F 압축비:${r.compressionRatio.toFixed(1)} DTD:${r.dtd.toFixed(1)}°F CTOA:${r.ctoa.toFixed(1)}°F — ${r.diagnosis.cause}`;
    const copyLabel = t('copy.cross_diag', '교차 진단 결과').replace(/'/g, '&#39;');
    const safeDiagText = diagText.replace(/`/g, "'").replace(/'/g, '&#39;');
    html += `
      <div class="diag-actions-row">
        <button class="diag-action-btn btn-copy" onclick="App.copyDiagText(this,'${copyLabel}',\`${safeDiagText}\`)">
          <span class="diag-icon-svg">${App.SVG_ICONS.copy}</span> ${t('diag.copy_result', '결과 복사')}
        </button>
        ${typeof DataBridge !== 'undefined' ? `<button class="diag-action-btn" onclick="DataBridge.saveDiagToServiceRecord(DataBridge.getDiagResult())">
          <span class="diag-icon-svg">${App.SVG_ICONS.save}</span> ${t('diag.save_record', '수리기록 저장')}
        </button>` : ''}
      </div>`;

    el.innerHTML = html;

    // DataBridge: Render related tool navigation buttons
    if (typeof DataBridge !== 'undefined' && r.diagKey && r.diagKey !== 'normal') {
      const actionsContainer = document.createElement('div');
      actionsContainer.id = 'diag-related-actions';
      el.appendChild(actionsContainer);
      DataBridge.renderRelatedActions(r.diagKey, actionsContainer, r);
    }
  }

  // --- Quick diagnose (SH/SC only, for home screen) ---
  function quickDiagnose(sh, sc) {
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

    const d = DIAGNOSIS_MAP[diagKey];
    return {
      title: d.title,
      summary: diagKey === 'normal'
        ? '측정값이 정상 범위입니다'
        : `과열도 ${sh}°F (${shClass === 'high' ? '↑' : shClass === 'low' ? '↓' : '→'}) · 과냉도 ${sc}°F (${scClass === 'high' ? '↑' : scClass === 'low' ? '↓' : '→'})`,
      level: d.level,
      diagKey
    };
  }

  return { diagnose, quickDiagnose, initUI };
})();

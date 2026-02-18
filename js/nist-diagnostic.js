// ===================================================
// HVAC Pulse — NIST Non-Invasive Diagnostic
// Copyright (c) 2024-2026. All rights reserved.
// Diagnose without gauges — temperature only
// Based on HVAC Know It All (Gary McCreadie) methodology
// ===================================================

const NISTDiagnostic = (() => {

  // CTOA by SEER rating (Condensing Temp Over Ambient)
  const CTOA_BY_SEER = {
    'low':    30,  // 6-10 SEER (~1991 이전)
    'medium': 25,  // 10-12 SEER (1992~2005)
    'high':   20,  // 13-15 SEER (2006~)
    'ultra':  15   // 16+ SEER (고효율)
  };

  const SEER_LABELS = {
    'low':    '6-10 SEER',
    'medium': '10-12 SEER',
    'high':   '13-15 SEER',
    'ultra':  '16+ SEER'
  };

  const DTD = 35; // Design Temperature Difference (400 CFM/ton standard)
  const NORMAL_SUPERHEAT = 10; // Expected superheat
  const NORMAL_SUBCOOLING = 10; // Expected subcooling

  // --- Core calculation ---
  function calculate(params) {
    const { returnAirTemp, suctionLineTemp, liquidLineTemp, outdoorTemp, seerClass } = params;
    const ctoa = CTOA_BY_SEER[seerClass] || 20;

    // Expected suction line temperature
    // Expected coil temp = Return Air - DTD
    // Expected suction line = coil temp + superheat
    const expectedCoilTemp = returnAirTemp - DTD;
    const expectedSuctionLine = expectedCoilTemp + NORMAL_SUPERHEAT;

    // Expected liquid line temperature
    // Expected condensing temp = Outdoor + CTOA
    // Expected liquid line = condensing temp - subcooling
    const expectedCondensingTemp = outdoorTemp + ctoa;
    const expectedLiquidLine = expectedCondensingTemp - NORMAL_SUBCOOLING;

    // Delta T (supply air temp difference)
    const expectedSupplyAir = returnAirTemp - 20; // Rough estimate

    // Differences
    const suctionDiff = suctionLineTemp - expectedSuctionLine;
    const liquidDiff = liquidLineTemp - expectedLiquidLine;
    const suctionAbsDiff = Math.abs(suctionDiff);
    const liquidAbsDiff = Math.abs(liquidDiff);

    // Status assessment
    const suctionStatus = getStatus(suctionAbsDiff);
    const liquidStatus = getStatus(liquidAbsDiff);

    // Overall assessment
    const overallStatus = getOverallStatus(suctionStatus, liquidStatus);

    // Diagnosis based on direction of deviation
    const diagnosis = getDiagnosis(suctionDiff, liquidDiff, suctionAbsDiff, liquidAbsDiff);

    return {
      // Input echoes
      returnAirTemp,
      suctionLineTemp,
      liquidLineTemp,
      outdoorTemp,
      seerClass,
      ctoa,

      // Expected values
      expectedCoilTemp,
      expectedSuctionLine,
      expectedCondensingTemp,
      expectedLiquidLine,

      // Differences
      suctionDiff,
      liquidDiff,
      suctionAbsDiff,
      liquidAbsDiff,

      // Status
      suctionStatus,
      liquidStatus,
      overallStatus,
      diagnosis
    };
  }

  function getStatus(absDiff) {
    if (absDiff <= 5) return 'normal';
    if (absDiff <= 10) return 'caution';
    return 'danger';
  }

  function getOverallStatus(s1, s2) {
    if (s1 === 'danger' || s2 === 'danger') return 'danger';
    if (s1 === 'caution' || s2 === 'caution') return 'caution';
    return 'normal';
  }

  function getDiagnosis(suctionDiff, liquidDiff, suctionAbs, liquidAbs) {
    // Both within tolerance
    if (suctionAbs <= 5 && liquidAbs <= 5) {
      return {
        title: '시스템 정상',
        level: 'normal',
        i18nKey: 'nist.normal',
        detail: '석션라인과 리퀴드라인 온도가 모두 예상 범위 이내입니다. 냉매 회로가 정상 작동 중입니다.',
        suggestions: ['정기 유지보수 계속', '에어필터 교체 주기 관리']
      };
    }

    // Suction high + Liquid high = Airflow issue
    if (suctionDiff > 5 && liquidDiff > 5) {
      return {
        title: '에어플로우 부족 의심',
        level: 'caution',
        i18nKey: 'nist.airflow',
        detail: '석션라인 온도와 리퀴드라인 온도가 모두 예상보다 높습니다. 증발기/응축기 열교환 효율이 저하되어 있습니다.',
        suggestions: [
          '에어필터 상태 확인',
          '증발기 코일 청결도 점검',
          '응축기 코일 청결도 점검',
          '팬 모터 작동 확인',
          '덕트 누설/연결 상태 확인'
        ]
      };
    }

    // Suction high + Liquid low/normal = Low charge
    if (suctionDiff > 5 && liquidDiff <= 5) {
      return {
        title: '냉매 부족 의심',
        level: 'danger',
        i18nKey: 'nist.lowcharge',
        detail: '석션라인 온도가 예상보다 높습니다 (과열도 과다). 증발기에서 냉매가 너무 일찍 기화되고 있습니다.',
        suggestions: [
          '게이지 연결하여 정확한 측정 필요',
          '누설 탐지 실시',
          '사이트글라스 확인'
        ]
      };
    }

    // Suction low + Liquid high = Overcharge
    if (suctionDiff < -5 && liquidDiff > 5) {
      return {
        title: '냉매 과충전 의심',
        level: 'danger',
        i18nKey: 'nist.overcharge',
        detail: '석션라인 온도가 예상보다 낮고 (과열도 부족) 리퀴드라인 온도가 높습니다. 시스템에 냉매가 과다할 수 있습니다.',
        suggestions: [
          '게이지 연결하여 정확한 충전량 확인',
          '리퀴드백 위험 — 컴프레서 주의'
        ]
      };
    }

    // Suction low = TXV overfeeding or overcharge
    if (suctionDiff < -5) {
      return {
        title: 'TXV 오버피딩 또는 과충전',
        level: 'caution',
        i18nKey: 'nist.txvoverfeed',
        detail: '석션라인 온도가 예상보다 낮습니다 (과열도 부족). 증발기에 냉매가 과다 공급되고 있을 수 있습니다.',
        suggestions: [
          'TXV 조정 상태 확인',
          '게이지 연결하여 정밀 진단 권장'
        ]
      };
    }

    // Liquid high = Condenser issue or restriction
    if (liquidDiff > 5) {
      return {
        title: '응축기 문제 또는 배관 제한',
        level: 'caution',
        i18nKey: 'nist.condenser',
        detail: '리퀴드라인 온도가 예상보다 높습니다. 응축기 성능 저하 또는 고압측 문제가 있을 수 있습니다.',
        suggestions: [
          '응축기 코일 청소',
          '응축기 팬 작동 확인',
          '주변 공기 순환 방해 요소 확인'
        ]
      };
    }

    // Liquid low = Possible restriction or very efficient system
    if (liquidDiff < -5) {
      return {
        title: '리퀴드라인 온도 이상 (낮음)',
        level: 'caution',
        i18nKey: 'nist.liquid_low',
        detail: '리퀴드라인 온도가 예상보다 낮습니다. 과냉도가 높거나 외기 온도에 비해 응축기가 과효율 상태일 수 있습니다.',
        suggestions: [
          '계량장치 제한 가능성 확인',
          '게이지 연결하여 정밀 진단 권장'
        ]
      };
    }

    // Default
    return {
      title: '추가 진단 필요',
      level: 'caution',
      i18nKey: 'nist.additional',
      detail: '온도 패턴이 명확한 단일 원인으로 특정되지 않습니다. 게이지를 연결하여 정밀 진단을 권장합니다.',
      suggestions: ['게이지 연결 후 교차 진단 실시']
    };
  }

  // =============================================
  // UI Logic
  // =============================================
  function initUI() {
    const calcBtn = document.getElementById('nist-calc-btn');
    if (calcBtn) {
      calcBtn.addEventListener('click', runNIST);
    }
  }

  function runNIST() {
    const resultEl = document.getElementById('nist-result-area');
    if (!resultEl) return;

    // Inline validation
    const fields = [
      { id: 'nist-return-t', msg: t('validation.return_t', '리턴공기 온도를 입력하세요') },
      { id: 'nist-suction-t', msg: t('validation.suction_t', '석션라인 온도를 입력하세요') },
      { id: 'nist-liquid-t', msg: t('validation.liquid_t', '리퀴드라인 온도를 입력하세요') },
      { id: 'nist-outdoor-t', msg: t('validation.outdoor_t', '외기 온도를 입력하세요') }
    ];
    let hasError = false;
    fields.forEach(f => {
      const el = document.getElementById(f.id);
      if (!App.validateField(el, f.msg)) hasError = true;
    });
    if (hasError) return;

    const returnAirTemp = parseFloat(document.getElementById('nist-return-t').value);
    const suctionLineTemp = parseFloat(document.getElementById('nist-suction-t').value);
    const liquidLineTemp = parseFloat(document.getElementById('nist-liquid-t').value);
    const outdoorTemp = parseFloat(document.getElementById('nist-outdoor-t').value);
    const seerClass = document.getElementById('nist-seer')?.value || 'high';

    // NaN safety check (validateField covers most cases, but guard against edge scenarios)
    if ([returnAirTemp, suctionLineTemp, liquidLineTemp, outdoorTemp].some(isNaN)) return;

    // Physical range validation: -50°F ~ 200°F for standard HVAC
    const tempRange = { min: -50, max: 200 };
    const temps = [
      { val: returnAirTemp, id: 'nist-return-t' },
      { val: suctionLineTemp, id: 'nist-suction-t' },
      { val: liquidLineTemp, id: 'nist-liquid-t' },
      { val: outdoorTemp, id: 'nist-outdoor-t' }
    ];
    for (const tp of temps) {
      if (tp.val < tempRange.min || tp.val > tempRange.max) {
        const el = document.getElementById(tp.id);
        if (el) App.validateField(el, t('validation.temp_range', '온도 범위를 확인하세요 (-50~200°F)'));
        return;
      }
    }

    const result = calculate({ returnAirTemp, suctionLineTemp, liquidLineTemp, outdoorTemp, seerClass });
    renderResult(result, resultEl);
  }

  function renderResult(r, el) {
    const statusLabel = { normal: t('status.normal', '정상'), caution: t('status.caution', '주의'), danger: t('status.danger', '이상') };

    // SVG badge icon helper
    function statusBadge(status) {
      const iconMap = { normal: App.SVG_ICONS.checkCircle, caution: App.SVG_ICONS.alertTriangle, danger: App.SVG_ICONS.xCircle };
      const clsMap = { normal: 'icon-normal', caution: 'icon-caution', danger: 'icon-danger' };
      return `<span class="diag-icon-svg ${clsMap[status]}" style="width:14px;height:14px;display:inline-flex;vertical-align:middle;margin-right:2px">${iconMap[status]}</span>`;
    }

    el.innerHTML = `
      <!-- Calculation breakdown -->
      <div class="glass-card" style="margin-top:0">
        <div class="section-title">${t('nist.calc.title', '계산 과정')}</div>

        <div class="nist-calc-grid">
          <div class="nist-calc-box">
            <div class="nist-calc-label">${t('nist.expected_suction', '예상 석션라인')}</div>
            <div class="nist-calc-value">${r.expectedSuctionLine.toFixed(1)}°F</div>
            <div class="nist-calc-formula">${r.returnAirTemp}°F - ${DTD}°F + ${NORMAL_SUPERHEAT}°F</div>
          </div>
          <div class="nist-calc-box">
            <div class="nist-calc-label">${t('nist.expected_liquid', '예상 리퀴드라인')}</div>
            <div class="nist-calc-value" style="color:var(--accent-orange)">${r.expectedLiquidLine.toFixed(1)}°F</div>
            <div class="nist-calc-formula">${r.outdoorTemp}°F + ${r.ctoa}°F - ${NORMAL_SUBCOOLING}°F</div>
          </div>
        </div>

        <!-- Actual vs Expected comparison -->
        <div class="nist-comparison-grid">
          <div class="nist-comparison-box status-${r.suctionStatus}">
            <div class="nist-calc-label">${t('nist.suction_diff', '석션라인 차이')}</div>
            <div class="nist-diff-value color-${r.suctionStatus}">
              ${r.suctionDiff > 0 ? '+' : ''}${r.suctionDiff.toFixed(1)}°F
            </div>
            <div class="badge badge-${r.suctionStatus}" style="margin-top:4px">
              ${statusBadge(r.suctionStatus)} ${statusLabel[r.suctionStatus]}
            </div>
          </div>
          <div class="nist-comparison-box status-${r.liquidStatus}">
            <div class="nist-calc-label">${t('nist.liquid_diff', '리퀴드라인 차이')}</div>
            <div class="nist-diff-value color-${r.liquidStatus}">
              ${r.liquidDiff > 0 ? '+' : ''}${r.liquidDiff.toFixed(1)}°F
            </div>
            <div class="badge badge-${r.liquidStatus}" style="margin-top:4px">
              ${statusBadge(r.liquidStatus)} ${statusLabel[r.liquidStatus]}
            </div>
          </div>
        </div>
      </div>

      <!-- Diagnosis -->
      <div class="diag-result result-${r.diagnosis.level} animate-slide-up">
        ${App.diagIcon(r.diagnosis.level)}
        <div class="diag-title">${r.diagnosis.i18nKey ? t(r.diagnosis.i18nKey + '.title', r.diagnosis.title) : r.diagnosis.title}</div>
        <div class="diag-detail">
          ${r.diagnosis.i18nKey ? t(r.diagnosis.i18nKey + '.detail', r.diagnosis.detail) : r.diagnosis.detail}
          ${r.diagnosis.suggestions.length > 0 ? `
            <br><br><strong>${t('result.actions', '조치사항:')}</strong>
            <ul style="margin:8px 0 0 16px">${r.diagnosis.suggestions.map((s, i) => `<li>${r.diagnosis.i18nKey ? t(r.diagnosis.i18nKey + '.action' + (i+1), s) : s}</li>`).join('')}</ul>
          ` : ''}
        </div>
      </div>

      <!-- Copy / Export -->
      <div class="diag-actions-row">
        <button class="diag-action-btn btn-copy" onclick="App.copyDiagText(this,'${t('nist.title', 'NIST 비침습 진단').replace(/'/g,'&#39;')}','[${(r.diagnosis.i18nKey ? t(r.diagnosis.i18nKey + '.title', r.diagnosis.title) : r.diagnosis.title).replace(/'/g,'&#39;')}] ${t('nist.suction_diff','석션라인 차이')}:${r.suctionDiff > 0 ? '+' : ''}${r.suctionDiff.toFixed(1)}°F ${t('nist.liquid_diff','리퀴드라인 차이')}:${r.liquidDiff > 0 ? '+' : ''}${r.liquidDiff.toFixed(1)}°F')">
          <span class="diag-icon-svg">${App.SVG_ICONS.copy}</span> ${t('diag.copy_result', '결과 복사')}
        </button>
      </div>

      <div class="alert-box alert-info mt-12">
        <span class="diag-icon-svg icon-info" style="width:16px;height:16px;flex-shrink:0">${App.SVG_ICONS.alertCircle}</span>
        <span>${t('nist.screening_note', 'NIST 진단은 선별 검사입니다. 이상 발견 시 게이지 연결하여 정밀 진단하세요. 판정 기준: ±5°F 이내 정상, ±5~10°F 주의, ±10°F 초과 이상.')}</span>
      </div>

      <div id="nist-advanced-info"></div>
      <div id="nist-related-actions"></div>`;

    // --- FaultSignatures integration via DataBridge ---
    const diagKey = (typeof DataBridge !== 'undefined') ? DataBridge.mapNISTToDiagKey(r) : _localMapDiagKey(r);

    if (diagKey && diagKey !== 'normal') {
      const advEl = document.getElementById('nist-advanced-info');
      if (advEl) {
        let advHtml = '';

        // Severity badge (use overall status for NIST since values are temp diffs, not SH/SC)
        if (typeof AdvancedDiagnostic !== 'undefined') {
          const nistSeverityMap = { normal: null, caution: 'SL2', danger: 'SL3' };
          const mappedLevel = nistSeverityMap[r.overallStatus];
          const severity = mappedLevel ? { level: mappedLevel, info: { desc_kr: r.diagnosis.detail }, fault: null } : null;
          if (severity) advHtml += AdvancedDiagnostic.renderSeverityBadge(severity);

          const sigDisplay = AdvancedDiagnostic.getSignatureDisplay(diagKey);
          if (sigDisplay && sigDisplay.fieldTips) {
            advHtml += AdvancedDiagnostic.renderFieldTips(sigDisplay.fieldTips);
          }
        }

        // "게이지 연결 후 정밀 진단" button
        advHtml += `
          <button class="btn btn-primary" style="width:100%;margin-top:12px"
            onclick="App.switchTab('tools');setTimeout(()=>{App.showCategory('diag');setTimeout(()=>App.showSub('tools','cross'),50)},50)">
            <span class="diag-icon-svg" style="width:16px;height:16px;display:inline-flex;vertical-align:middle;margin-right:4px">${App.SVG_ICONS.arrowRight}</span>
            ${t('nist.additional.action', '게이지 연결 후 교차 진단 실시')}
          </button>`;

        advEl.innerHTML = advHtml;
      }

      // Store result in DataBridge and render related actions
      if (typeof DataBridge !== 'undefined') {
        const nistDiagResult = {
          diagKey, diagnosis: r.diagnosis, source: 'NIST',
          suctionDiff: r.suctionDiff, liquidDiff: r.liquidDiff,
          returnAirTemp: r.returnAirTemp, outdoorTemp: r.outdoorTemp,
          suctionLineTemp: r.suctionLineTemp, liquidLineTemp: r.liquidLineTemp,
          expectedSuctionLine: r.expectedSuctionLine, expectedLiquidLine: r.expectedLiquidLine
        };
        DataBridge.setDiagResult(nistDiagResult);

        const actionsEl = document.getElementById('nist-related-actions');
        if (actionsEl) DataBridge.renderRelatedActions(diagKey, actionsEl, nistDiagResult);
      }
    }
  }

  // Local fallback for diagKey mapping (when DataBridge not loaded yet)
  function _localMapDiagKey(r) {
    if (!r || !r.diagnosis) return null;
    // Use i18nKey directly if available
    const keyMap = {
      'nist.normal': 'normal',
      'nist.lowcharge': 'lowCharge',
      'nist.overcharge': 'overcharge',
      'nist.airflow': 'lowAirflow',
      'nist.txvoverfeed': 'txvOverfeed',
      'nist.condenser': 'meteringRestriction',
      'nist.liquid_low': 'meteringRestriction',
      'nist.additional': null
    };
    if (r.diagnosis.i18nKey) return keyMap[r.diagnosis.i18nKey] || null;
    return null;
  }

  return { calculate, initUI };
})();

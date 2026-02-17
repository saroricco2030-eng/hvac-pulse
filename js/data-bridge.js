// ===================================================
// HVAC Pulse — Data Bridge
// Copyright (c) 2024-2026. All rights reserved.
// Cross-module integration layer
// Connects diagnostic results, error codes, cycle data,
// refrigerant catalog, and service records
// ===================================================

const DataBridge = (() => {

  // --- Shared diagnostic result ---
  let _lastDiagResult = null;

  function setDiagResult(result) {
    _lastDiagResult = result;
  }

  function getDiagResult() {
    return _lastDiagResult;
  }

  // =============================================
  // Refrigerant Warnings & Replacement
  // =============================================

  /**
   * Get warnings for a selected refrigerant based on its
   * regulatory status, safety class, and field notes.
   * Uses RefrigerantCatalog data.
   */
  function getRefrigerantWarnings(refId) {
    if (typeof RefrigerantCatalog === 'undefined') return { warnings: [], replacements: [], notes: null };

    const ref = RefrigerantCatalog.getById(refId);
    if (!ref) return { warnings: [], replacements: [], notes: null };

    const warnings = [];
    const replacements = RefrigerantCatalog.getReplacements(refId);

    // Status warnings
    if (ref.status === 'banned') {
      warnings.push({
        type: 'danger',
        icon: '⛔',
        text: `${ref.name_kr}은 생산 금지 냉매입니다. 사용/충전이 법적으로 불가합니다.`
      });
    } else if (ref.status === 'phase-out') {
      warnings.push({
        type: 'warning',
        icon: '⚠️',
        text: `${ref.name_kr}은 단계적 퇴출 중입니다. 서비스용 재생 냉매만 사용 가능합니다.`
      });
    } else if (ref.status === 'phase-down') {
      warnings.push({
        type: 'info',
        icon: 'ℹ️',
        text: `${ref.name_kr}은 단계적 감축 대상입니다 (GWP ${ref.gwp}). 신규 설비 사용 제한 중.`
      });
    }

    // Safety warnings
    if (ref.safety === 'A2L') {
      warnings.push({
        type: 'caution',
        icon: '🔥',
        text: '미약 가연성 냉매 (A2L) — 점화원 관리 및 환기 필수. 누설 탐지기 준비.'
      });
    } else if (ref.safety === 'A3') {
      warnings.push({
        type: 'danger',
        icon: '🔥',
        text: '고가연성 냉매 (A3) — 충전량 제한 준수 필수. 점화원 절대 금지. 전용 장비 사용.'
      });
    } else if (ref.safety && ref.safety.startsWith('B')) {
      warnings.push({
        type: 'warning',
        icon: '☠️',
        text: `독성 냉매 (${ref.safety}) — 환기 장치 필수. 가스 감지기 설치 확인. 개인보호장비 착용.`
      });
    }

    // High GWP warning
    if (ref.gwp > 2500) {
      warnings.push({
        type: 'info',
        icon: '🌍',
        text: `높은 GWP (${ref.gwp}) — 누설 방지 철저히. EU F-Gas/AIM Act 규제 대상.`
      });
    }

    // Zeotropic glide warning
    if (ref.isZeotropic && ref.glide_f > 5) {
      warnings.push({
        type: 'info',
        icon: '📐',
        text: `큰 온도 글라이드 (${ref.glide_f}°F) — Bubble/Dew 구분 필수. 누설 시 전량 교체 필요.`
      });
    }

    return {
      warnings,
      replacements,
      notes: ref.notes_kr || null,
      status: ref.status,
      use: ref.use_kr || null
    };
  }

  /**
   * Render refrigerant warnings into a container element.
   */
  function renderRefrigerantWarnings(refId, containerEl) {
    if (!containerEl) return;
    const data = getRefrigerantWarnings(refId);

    if (data.warnings.length === 0 && !data.notes) {
      containerEl.innerHTML = '';
      return;
    }

    let html = '';

    // Warnings
    data.warnings.forEach(w => {
      const alertClass = w.type === 'danger' ? 'alert-danger' :
                         w.type === 'warning' ? 'alert-warning' :
                         w.type === 'caution' ? 'alert-warning' : 'alert-info';
      html += `<div class="alert-box ${alertClass}" style="margin-top:8px"><span>${w.icon}</span><span>${w.text}</span></div>`;
    });

    // Replacement recommendations
    if (data.replacements.length > 0) {
      html += `<div class="info-box-accent green" style="padding:10px">`;
      html += `<div class="section-label-sm green">${t('bridge.replacement_ref', '대체 냉매 추천')}</div>`;
      html += `<div class="flex-wrap-gap-6">`;
      data.replacements.forEach(rep => {
        const safetyColor = rep.safety === 'A1' ? 'var(--accent-green)' : rep.safety === 'A2L' ? 'var(--accent-orange)' : 'var(--accent-red)';
        html += `<button class="ref-replace-btn" onclick="DataBridge.switchRefrigerant('${rep.id}')">
          ${rep.name_kr} <span style="color:${safetyColor};font-size:0.65rem">(${rep.safety}·GWP ${rep.gwp})</span>
        </button>`;
      });
      html += `</div></div>`;
    }

    // Field notes
    if (data.notes) {
      html += `<div class="info-box-accent cyan">
        <div class="section-label-sm cyan" style="font-size:0.7rem">${t('bridge.field_notes', '현장 노트')}</div>
        <div class="field-notes-text">${data.notes}</div>
      </div>`;
    }

    containerEl.innerHTML = html;
  }

  /**
   * Switch refrigerant in the currently active P-T calculator dropdown.
   */
  function switchRefrigerant(refId) {
    const selectors = ['pt-ref-select', 'diag-ref-select', 'cycle-ref-select'];
    selectors.forEach(id => {
      const sel = document.getElementById(id);
      if (sel) {
        sel.value = refId;
        sel.dispatchEvent(new Event('change'));
      }
    });
  }

  // =============================================
  // Diagnosis → Related Actions
  // =============================================

  /**
   * Get related actions/tools for a given diagnosis key.
   * Returns navigation buttons that connect diagnosis results
   * to other tools in the app.
   */
  function getRelatedActions(diagKey, diagResult) {
    if (!diagKey || diagKey === 'normal') return [];

    const actions = [];
    const source = (diagResult && diagResult.source) || '';

    // TXV-related → TXV Wizard
    if (diagKey === 'meteringRestriction' || diagKey === 'txvOverfeed') {
      actions.push({
        icon: '🔧',
        label: t('bridge.go_txv', 'TXV 마법사로 이동'),
        desc: diagKey === 'meteringRestriction' ? 'Sporlan #1~#7 (Starving)' : 'Sporlan #8~#12 (Flooding)',
        action: () => { App.switchTab('tools'); setTimeout(() => { App.showCategory('diag'); setTimeout(() => App.showSub('tools', 'txv'), 50); }, 50); }
      });
    }

    // Cycle Visualization (skip if already on cycle page)
    if (source !== 'CycleVisualization') {
      actions.push({
        icon: '🔄',
        label: t('bridge.view_cycle', '사이클 다이어그램에서 보기'),
        desc: t('bridge.highlight_parts', '영향받는 부품 하이라이트'),
        action: () => { App.switchTab('tools'); setTimeout(() => { App.showCategory('visual'); setTimeout(() => App.showSub('tools', 'cycle'), 50); }, 50); }
      });
    }

    // Error code search by symptom
    const errorKeywords = _getErrorSearchKeyword(diagKey);
    if (errorKeywords) {
      actions.push({
        icon: '🚨',
        label: t('bridge.search_error', '관련 에러코드 검색'),
        desc: `"${errorKeywords}" ${t('bridge.auto_search', '키워드 자동 검색')}`,
        action: () => {
          App.switchTab('tools');
          setTimeout(() => {
            App.showCategory('diag');
            setTimeout(() => App.showSub('tools', 'errorcode'), 50);
            setTimeout(() => {
              if (typeof ErrorCodeSearch !== 'undefined' && ErrorCodeSearch.quickSearch) {
                ErrorCodeSearch.quickSearch(errorKeywords);
              }
            }, 100);
          }, 50);
        }
      });
    }

    // P-H Diagram (if CoolProp available)
    if (typeof CoolPropEngine !== 'undefined' && CoolPropEngine.isReady && CoolPropEngine.isReady()) {
      actions.push({
        icon: '📈',
        label: t('bridge.ph_analysis', 'P-H 다이어그램에서 분석'),
        desc: t('bridge.ph_desc', '고장 시 사이클 변화 시각화'),
        action: () => { App.switchTab('tools'); setTimeout(() => { App.showCategory('visual'); setTimeout(() => App.showSub('tools', 'ph'), 50); }, 50); }
      });
    }

    // Diagnostic Report
    if (typeof DiagnosticReport !== 'undefined') {
      actions.push({
        icon: '📋',
        label: t('bridge.ai_report', 'AI 진단서 생성'),
        desc: t('bridge.ai_report_desc', '병원 진단서 스타일 리포트'),
        action: () => {
          const ref = diagResult?.refrigerant || (document.getElementById('diag-ref-select')?.value) || (document.getElementById('cycle-ref-select')?.value) || 'R-410A';
          DiagnosticReport.openReportModal(diagResult || _lastDiagResult, ref, diagResult);
        }
      });
    }

    // Save to service record
    actions.push({
      icon: '💾',
      label: t('bridge.save_record', '수리기록에 저장'),
      desc: t('bridge.save_record_desc', '진단 결과를 기록에 보존'),
      action: () => { saveDiagToServiceRecord(diagResult || _lastDiagResult); }
    });

    return actions;
  }

  /**
   * Map diagKey to error code search keywords
   */
  function _getErrorSearchKeyword(diagKey) {
    const map = {
      lowCharge: '냉매 부족',
      overcharge: '고압',
      meteringRestriction: '필터',
      compressorWeak: '컴프레서',
      txvOverfeed: 'TXV',
      lowAirflow: '에어플로우'
    };
    return map[diagKey] || null;
  }

  /**
   * Render related actions as buttons
   */
  function renderRelatedActions(diagKey, containerEl, diagResult) {
    if (!containerEl) return;
    const actions = getRelatedActions(diagKey, diagResult);
    if (actions.length === 0) { containerEl.innerHTML = ''; return; }

    let html = `<div class="related-actions-section">
      <div class="related-actions-title">${t('bridge.related_tools', '관련 도구')}</div>
      <div class="related-actions-list">`;

    actions.forEach(a => {
      html += `<button class="related-action-btn" onclick="this.blur()">
        <span class="action-icon">${a.icon}</span>
        <div class="action-body">
          <div class="action-label">${a.label}</div>
          ${a.desc ? `<div class="action-desc">${a.desc}</div>` : ''}
        </div>
        <span class="action-chevron">›</span>
      </button>`;
    });

    html += `</div></div>`;
    containerEl.innerHTML = html;

    // Attach click handlers
    const btns = containerEl.querySelectorAll('.related-action-btn');
    btns.forEach((btn, i) => {
      if (actions[i] && actions[i].action) {
        btn.addEventListener('click', actions[i].action);
      }
    });
  }

  // =============================================
  // Error Code ↔ Diagnosis Mapping
  // =============================================

  /**
   * Get cycle components related to an error code.
   * Matches error code manufacturer/text against CYCLE_COMPONENTS.relatedErrors.
   */
  function getRelatedCycleComponents(errorCode) {
    if (typeof CYCLE_COMPONENTS === 'undefined' || !errorCode) return [];

    const results = [];
    const ecText = `${errorCode.manufacturer || ''}: ${errorCode.code || ''} ${errorCode.description_kr || ''}`.toLowerCase();

    for (const [compId, comp] of Object.entries(CYCLE_COMPONENTS)) {
      if (!comp.relatedErrors) continue;
      const hasMatch = comp.relatedErrors.some(re => {
        return ecText.includes(re.toLowerCase()) || re.toLowerCase().split(/[,:]/).some(part => ecText.includes(part.trim().toLowerCase()));
      });
      if (hasMatch) {
        results.push({ compId, component: comp });
      }
    }

    // Also match by fault diagnosis keywords in causes
    if (errorCode.causes) {
      const causeText = errorCode.causes.join(' ').toLowerCase();
      for (const [compId, comp] of Object.entries(CYCLE_COMPONENTS)) {
        if (results.some(r => r.compId === compId)) continue;
        if (comp.diagHighlight) {
          // Check if any diagnostic keyword matches the causes
          const matched = comp.diagHighlight.some(dh => {
            const dhKeywords = {
              compressorWeak: ['컴프레서', '압축기', 'compressor'],
              lowCharge: ['냉매', '누설', 'leak', 'charge'],
              overcharge: ['과충전', '고압'],
              meteringRestriction: ['필터', '막힘', '드라이어'],
              txvOverfeed: ['팽창밸브', 'txv'],
              lowAirflow: ['에어플로우', '팬', 'fan', '필터']
            };
            return (dhKeywords[dh] || []).some(kw => causeText.includes(kw.toLowerCase()));
          });
          if (matched) results.push({ compId, component: comp });
        }
      }
    }

    return results;
  }

  // =============================================
  // Diagnosis → NIST diagKey mapping
  // =============================================

  /**
   * Map NIST diagnosis result to a diagKey for FaultSignatures integration.
   */
  function mapNISTToDiagKey(nistResult) {
    if (!nistResult || !nistResult.diagnosis) return null;

    const title = nistResult.diagnosis.title || '';
    if (title.includes('정상')) return 'normal';
    if (title.includes('냉매 부족')) return 'lowCharge';
    if (title.includes('냉매 과충전')) return 'overcharge';
    if (title.includes('에어플로우')) return 'lowAirflow';
    if (title.includes('TXV') || title.includes('오버피딩')) return 'txvOverfeed';
    if (title.includes('응축기')) return null; // condenser_fouling — no direct diagKey
    if (title.includes('리퀴드라인')) return 'meteringRestriction';

    return null;
  }

  // =============================================
  // Save Diagnostic Result to Service Record
  // =============================================

  /**
   * Navigate to service history form with pre-filled diagnostic data.
   */
  function saveDiagToServiceRecord(diagResult) {
    if (!diagResult) {
      if (typeof App !== 'undefined') App.showToast(t('bridge.no_result', '저장할 진단 결과가 없습니다.'), 'warning');
      return;
    }

    // Store the diagnostic data for the form to pick up
    _lastDiagResult = diagResult;

    // Build pre-fill data
    const prefill = {};
    prefill.date = new Date().toISOString().split('T')[0];

    // Diagnosis name
    if (diagResult.diagnosis) {
      prefill.diagnosis = diagResult.diagnosis.title || '';
    } else if (diagResult.diagKey) {
      prefill.diagnosis = diagResult.diagKey;
    }

    // Symptom details (handles cross-diag, NIST, cycle sources)
    const parts = [];
    if (diagResult.superheat != null) parts.push(`SH: ${diagResult.superheat.toFixed(1)}°F`);
    if (diagResult.subcooling != null) parts.push(`SC: ${diagResult.subcooling.toFixed(1)}°F`);
    if (diagResult.compressionRatio != null) parts.push(`CR: ${diagResult.compressionRatio.toFixed(1)}:1`);
    if (diagResult.dtd != null) parts.push(`DTD: ${diagResult.dtd.toFixed(1)}°F`);
    if (diagResult.ctoa != null) parts.push(`CTOA: ${diagResult.ctoa.toFixed(1)}°F`);
    // NIST-specific temperature data
    if (diagResult.source === 'NIST') {
      if (diagResult.returnAirTemp != null) parts.push(`리턴공기: ${diagResult.returnAirTemp}°F`);
      if (diagResult.suctionLineTemp != null) parts.push(`석션라인: ${diagResult.suctionLineTemp}°F`);
      if (diagResult.liquidLineTemp != null) parts.push(`리퀴드라인: ${diagResult.liquidLineTemp}°F`);
      if (diagResult.suctionDiff != null) parts.push(`석션편차: ${diagResult.suctionDiff.toFixed(1)}°F`);
      if (diagResult.liquidDiff != null) parts.push(`리퀴드편차: ${diagResult.liquidDiff.toFixed(1)}°F`);
    }
    prefill.symptom = parts.join(' · ');

    // Tech memo with severity and tips
    const memoLines = [];
    if (diagResult.severity) {
      const sl = diagResult.severity;
      memoLines.push(`[심각도: ${sl.level}] ${sl.info?.desc_kr || ''}`);
    }
    if (diagResult.diagnosis && diagResult.diagnosis.detail) {
      memoLines.push(diagResult.diagnosis.detail);
    }
    prefill.techMemo = memoLines.join('\n');

    // Store for form pickup
    window._diagPrefillData = prefill;

    // Navigate to service record form
    if (typeof App === 'undefined') return;
    App.switchTab('records');
    setTimeout(() => {
      App.showSub('records', 'service');
      setTimeout(() => {
        if (typeof ServiceHistory !== 'undefined' && ServiceHistory.showForm) {
          ServiceHistory.showForm();
        }
      }, 100);
    }, 50);

    if (typeof App !== 'undefined') App.showToast(t('bridge.navigate_record', '수리기록 작성 화면으로 이동합니다.'), 'info');
  }

  // =============================================
  // Public API
  // =============================================
  return {
    // Diagnostic result sharing
    setDiagResult,
    getDiagResult,

    // Refrigerant warnings
    getRefrigerantWarnings,
    renderRefrigerantWarnings,
    switchRefrigerant,

    // Related actions
    getRelatedActions,
    renderRelatedActions,

    // Error code ↔ diagnosis
    getRelatedCycleComponents,

    // NIST mapping
    mapNISTToDiagKey,

    // Service record
    saveDiagToServiceRecord
  };

})();

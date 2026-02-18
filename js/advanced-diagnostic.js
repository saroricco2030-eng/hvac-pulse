// ===================================================
// HVAC Pulse — Advanced Diagnostic Module
// Severity levels, differential diagnosis,
// fault signature visualization, academic data integration
// ===================================================

const AdvancedDiagnostic = (() => {

  // --- Determine severity level from fault signatures ---
  // Delegates to FaultSignatures.getSeverity which handles:
  //   - txv_stuck_open inverted thresholds
  //   - compression_ratio_deficit as extras param
  //   - proper min/max range checking
  //   - all metric types (discharge_pressure_pct, condenser_approach, etc.)
  function determineSeverity(diagKey, superheat, subcooling, compressionRatio) {
    if (!diagKey || diagKey === 'normal') return null;
    if (typeof FaultSignatures === 'undefined') return null;

    const faultId = FaultSignatures.mapDiagKeyToFault(diagKey);
    if (!faultId) return null;

    const fault = FaultSignatures.getFault(faultId);
    if (!fault) return null;

    // Build extras for metrics beyond SH/SC
    const extras = {};
    if (compressionRatio != null) extras.compression_ratio_deficit = compressionRatio;

    const result = FaultSignatures.getSeverity(faultId, superheat, subcooling, extras);
    if (!result) return null;

    // Return in the format expected by renderSeverityBadge and callers:
    // { level: 'SL1'~'SL4', info: threshold object with desc_kr, fault: full fault object }
    return { level: result.level, info: result.threshold, fault };
  }

  // --- Get differential diagnosis hints ---
  function getDifferentialHints(shClass, scClass, superheat, subcooling) {
    if (typeof FaultSignatures === 'undefined') return [];

    const hints = [];

    if (shClass === 'high') {
      const diff = FaultSignatures.getDifferential('high_superheat');
      if (diff) hints.push(diff);
    }
    if (shClass === 'low') {
      const diff = FaultSignatures.getDifferential('low_superheat');
      if (diff) hints.push(diff);
    }

    return hints;
  }

  // --- Get fault signatures for display ---
  function getSignatureDisplay(diagKey) {
    if (typeof FaultSignatures === 'undefined') return null;

    const faultId = FaultSignatures.mapDiagKeyToFault(diagKey);
    if (!faultId) return null;

    const fault = FaultSignatures.getFault(faultId);
    if (!fault) return null;

    return {
      faultId,
      name_kr: fault.name_kr,
      name_en: fault.name_en,
      signatures: fault.signatures,
      fieldTips: (I18n.getLang() !== 'ko' && fault.field_tips_en) ? fault.field_tips_en : (fault.field_tips_kr || []),
      ph_effect: fault.ph_effect || null
    };
  }

  // --- Render severity badge HTML ---
  function renderSeverityBadge(severity) {
    if (!severity) return '';

    const levels = (typeof FaultSignatures !== 'undefined') ?
      FaultSignatures.SEVERITY_LEVELS : {
        SL1: { icon: '🟡', label_kr: '경미', label_en: 'Minor', color: '#FFD700' },
        SL2: { icon: '🟠', label_kr: '주의', label_en: 'Caution', color: '#FFA500' },
        SL3: { icon: '🔴', label_kr: '심각', label_en: 'Severe', color: '#FF4500' },
        SL4: { icon: '⛔', label_kr: '위험', label_en: 'Critical', color: '#FF0000' }
      };

    const sl = levels[severity.level];
    if (!sl) return '';

    const lang = (typeof I18n !== 'undefined') ? I18n.getLang() : 'ko';
    const slLabel = (lang !== 'ko' && sl.label_en) ? sl.label_en : sl.label_kr;
    const descText = (lang !== 'ko' && (severity.info?.desc_en || sl.desc_en))
      ? (severity.info?.desc_en || sl.desc_en)
      : severity.info?.desc_kr;

    return `
      <div class="severity-badge severity-${severity.level.toLowerCase()}" style="border-color:${sl.color}">
        <span class="severity-icon">${sl.icon}</span>
        <span class="severity-label">${slLabel} (${severity.level})</span>
        ${descText ? `<span class="severity-desc">${descText}</span>` : ''}
      </div>`;
  }

  // --- Render signature arrows HTML ---
  function renderSignatureArrows(signatures) {
    if (!signatures) return '';

    const arrowMap = { up: '↑', down: '↓', same: '→' };
    const colorMap = { up: 'var(--accent-red)', down: 'var(--accent-cyan)', same: 'var(--text-secondary)' };

    const lang = (typeof I18n !== 'undefined') ? I18n.getLang() : 'ko';
    const labels = lang !== 'ko' ? {
      suction_superheat: 'Superheat',
      suction_pressure: 'Suct. Press.',
      discharge_pressure: 'Disch. Press.',
      subcooling: 'Subcooling',
      discharge_temp: 'Disch. Temp',
      compressor_current: 'Current',
      cop: 'COP',
      evaporator_temp: 'Evap. Temp',
      condenser_temp: 'Cond. Temp'
    } : {
      suction_superheat: '과열도',
      suction_pressure: '흡입압',
      discharge_pressure: '토출압',
      subcooling: '과냉도',
      discharge_temp: '토출온도',
      compressor_current: '전류',
      cop: 'COP',
      evaporator_temp: '증발온도',
      condenser_temp: '응축온도'
    };

    let html = '<div class="signature-arrows">';
    for (const [key, sig] of Object.entries(signatures)) {
      const label = labels[key] || key;
      const arrow = arrowMap[sig.direction] || '?';
      const color = colorMap[sig.direction] || 'var(--text-secondary)';
      html += `
        <div class="sig-item">
          <span class="sig-arrow" style="color:${color}">${arrow}</span>
          <span class="sig-label">${label}</span>
        </div>`;
    }
    html += '</div>';
    return html;
  }

  // --- Render differential diagnosis HTML ---
  function renderDifferentialHints(hints) {
    if (!hints || hints.length === 0) return '';

    const lang = (typeof I18n !== 'undefined') ? I18n.getLang() : 'ko';
    let html = '<div class="differential-hints">';
    html += `<div class="diff-title">${lang !== 'ko' ? 'Differential Diagnosis Hints' : '감별 진단 힌트'}</div>`;

    hints.forEach(hint => {
      const symptom = (lang !== 'ko' && hint.symptom_en) ? hint.symptom_en : hint.symptom_kr;
      html += `<div class="diff-symptom">${symptom}</div>`;
      html += '<div class="diff-faults">';
      hint.faults.forEach(f => {
        const fKey = (lang !== 'ko' && f.key_en) ? f.key_en : f.key_kr;
        html += `<div class="diff-fault-item">${fKey}</div>`;
      });
      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  // --- Render field tips HTML ---
  function renderFieldTips(tips) {
    if (!tips || tips.length === 0) return '';

    const lang = (typeof I18n !== 'undefined') ? I18n.getLang() : 'ko';
    let html = `
      <div class="field-tips-section">
        <div class="field-tips-title">${lang !== 'ko' ? 'Field Inspection Procedure' : '현장 점검 절차'}</div>
        <ol class="field-tips-list">`;
    tips.forEach(tip => {
      html += `<li>${tip}</li>`;
    });
    html += '</ol></div>';
    return html;
  }

  // --- Map diagnosis result to diagKey ---
  const VALID_DIAG_KEYS = new Set([
    'normal', 'lowCharge', 'meteringRestriction', 'overcharge',
    'compressorWeak', 'txvOverfeed', 'lowAirflow'
  ]);

  function getDiagKey(diagResult) {
    // Prefer diagKey already set by DiagnosticEngine
    if (diagResult.diagKey && VALID_DIAG_KEYS.has(diagResult.diagKey)) {
      return diagResult.diagKey;
    }

    // Fallback: infer from SH/SC classification
    const sh = diagResult.shClass;
    const sc = diagResult.scClass;
    if (sh && sc) {
      if (sh === 'normal' && sc === 'normal') return 'normal';
      if (sh === 'high' && sc === 'low') return 'lowCharge';
      if (sh === 'high' && sc === 'high') return 'meteringRestriction';
      if (sh === 'low' && sc === 'high') return 'overcharge';
      if (sh === 'low' && sc === 'low') return 'compressorWeak';
      if (sh === 'low' && sc === 'normal') return 'txvOverfeed';
      if (sh === 'high' && sc === 'normal') return 'lowAirflow';
      if (sh === 'normal' && sc === 'high') return 'overcharge';
      if (sh === 'normal' && sc === 'low') return 'lowCharge';
    }

    return null;
  }

  // --- Public API ---
  return {
    determineSeverity,
    getDifferentialHints,
    getSignatureDisplay,
    getDiagKey,
    renderSeverityBadge,
    renderSignatureArrows,
    renderDifferentialHints,
    renderFieldTips
  };
})();

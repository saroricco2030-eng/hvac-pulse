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
      signatures: fault.signatures,
      fieldTips: fault.field_tips_kr || [],
      ph_effect: fault.ph_effect || null
    };
  }

  // --- Render severity badge HTML ---
  function renderSeverityBadge(severity) {
    if (!severity) return '';

    const levels = (typeof FaultSignatures !== 'undefined') ?
      FaultSignatures.SEVERITY_LEVELS : {
        SL1: { icon: '🟡', label_kr: '경미', color: '#FFD700' },
        SL2: { icon: '🟠', label_kr: '주의', color: '#FFA500' },
        SL3: { icon: '🔴', label_kr: '심각', color: '#FF4500' },
        SL4: { icon: '⛔', label_kr: '위험', color: '#FF0000' }
      };

    const sl = levels[severity.level];
    if (!sl) return '';

    return `
      <div class="severity-badge severity-${severity.level.toLowerCase()}" style="border-color:${sl.color}">
        <span class="severity-icon">${sl.icon}</span>
        <span class="severity-label">${sl.label_kr} (${severity.level})</span>
        ${severity.info?.desc_kr ? `<span class="severity-desc">${severity.info.desc_kr}</span>` : ''}
      </div>`;
  }

  // --- Render signature arrows HTML ---
  function renderSignatureArrows(signatures) {
    if (!signatures) return '';

    const arrowMap = { up: '↑', down: '↓', same: '→' };
    const colorMap = { up: 'var(--accent-red)', down: 'var(--accent-cyan)', same: 'var(--text-secondary)' };

    const labels = {
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

    let html = '<div class="differential-hints">';
    html += '<div class="diff-title">감별 진단 힌트</div>';

    hints.forEach(hint => {
      html += `<div class="diff-symptom">${hint.symptom_kr}</div>`;
      html += '<div class="diff-faults">';
      hint.faults.forEach(f => {
        html += `<div class="diff-fault-item">${f.key_kr}</div>`;
      });
      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  // --- Render field tips HTML ---
  function renderFieldTips(tips) {
    if (!tips || tips.length === 0) return '';

    let html = `
      <div class="field-tips-section">
        <div class="field-tips-title">현장 점검 절차</div>
        <ol class="field-tips-list">`;
    tips.forEach(tip => {
      html += `<li>${tip}</li>`;
    });
    html += '</ol></div>';
    return html;
  }

  // --- Map diagnosis result to diagKey ---
  function getDiagKey(diagResult) {
    const d = diagResult.diagnosis;
    if (!d) return null;

    // Match by title to known keys
    if (d.title === '시스템 정상') return 'normal';
    if (d.title.includes('냉매 부족')) return 'lowCharge';
    if (d.title.includes('계량장치 제한')) return 'meteringRestriction';
    if (d.title.includes('냉매 과충전')) return 'overcharge';
    if (d.title.includes('컴프레서 불량')) return 'compressorWeak';
    if (d.title.includes('TXV 오버피딩')) return 'txvOverfeed';
    if (d.title.includes('에어플로우 부족')) return 'lowAirflow';

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

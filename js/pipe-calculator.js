// ===================================================
// HVAC Pulse — Pipe / Refrigerant Charge Calculator
// Additional charge based on pipe size and length
// ===================================================

const PipeCalculator = (() => {

  // Liquid line charge per meter (g/m) by pipe OD and refrigerant
  // Values are for liquid line (high density). Suction line is much lower.
  const CHARGE_PER_METER = {
    'R-22': {
      '1/4': 13, '3/8': 30, '1/2': 54, '5/8': 85, '3/4': 122, '7/8': 167, '1-1/8': 275
    },
    'R-410A': {
      '1/4': 17, '3/8': 38, '1/2': 68, '5/8': 106, '3/4': 153, '7/8': 210, '1-1/8': 346
    },
    'R-32': {
      '1/4': 15, '3/8': 34, '1/2': 61, '5/8': 95, '3/4': 137, '7/8': 188, '1-1/8': 310
    },
    'R-454B': {
      '1/4': 16, '3/8': 36, '1/2': 64, '5/8': 100, '3/4': 144, '7/8': 197, '1-1/8': 325
    },
    'R-134a': {
      '1/4': 19, '3/8': 43, '1/2': 77, '5/8': 120, '3/4': 173, '7/8': 237, '1-1/8': 391
    },
    'R-404A': {
      '1/4': 16, '3/8': 36, '1/2': 64, '5/8': 100, '3/4': 144, '7/8': 197, '1-1/8': 325
    },
    'R-407C': {
      '1/4': 17, '3/8': 38, '1/2': 67, '5/8': 105, '3/4': 151, '7/8': 207, '1-1/8': 341
    },
    'R-290': {
      '1/4': 8, '3/8': 18, '1/2': 32, '5/8': 50, '3/4': 72, '7/8': 99, '1-1/8': 163
    }
  };

  const PIPE_SIZES = [
    { id: '1/4', label: '1/4" (6.35mm)', od_mm: 6.35, id_mm: 4.83 },
    { id: '3/8', label: '3/8" (9.52mm)', od_mm: 9.52, id_mm: 7.94 },
    { id: '1/2', label: '1/2" (12.7mm)', od_mm: 12.70, id_mm: 11.10 },
    { id: '5/8', label: '5/8" (15.88mm)', od_mm: 15.88, id_mm: 14.27 },
    { id: '3/4', label: '3/4" (19.05mm)', od_mm: 19.05, id_mm: 17.45 },
    { id: '7/8', label: '7/8" (22.22mm)', od_mm: 22.22, id_mm: 20.60 },
    { id: '1-1/8', label: '1-1/8" (28.58mm)', od_mm: 28.58, id_mm: 26.97 }
  ];

  // Recommended pipe sizes by capacity (rough guide)
  const PIPE_GUIDE = [
    { capacity: '1.5~2.5 kW (0.5~0.7 RT)', liquid: '1/4"', suction: '3/8"' },
    { capacity: '2.5~5 kW (0.7~1.5 RT)', liquid: '3/8"', suction: '5/8"' },
    { capacity: '5~9 kW (1.5~2.5 RT)', liquid: '3/8"', suction: '3/4"' },
    { capacity: '9~14 kW (2.5~4 RT)', liquid: '3/8"', suction: '7/8"' },
    { capacity: '14~21 kW (4~6 RT)', liquid: '1/2"', suction: '7/8"' },
    { capacity: '21~35 kW (6~10 RT)', liquid: '1/2"', suction: '1-1/8"' },
    { capacity: '35~52 kW (10~15 RT)', liquid: '5/8"', suction: '1-1/8"' }
  ];

  function initUI() {
    render();
  }

  function render() {
    const container = document.getElementById('pipe-content');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header">
        <h1>${t('pipe.title', '📐 배관/냉매 계산기')}</h1>
        <p class="subtitle">${t('pipe.subtitle', '추가 충전량 계산 · 배관 사이즈 가이드')}</p>
      </div>

      <!-- Charge Calculator -->
      <div class="glass-card">
        <div class="section-title">${t('pipe.charge_title', '추가 냉매 충전량 계산')}</div>
        <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:12px">
          ${t('pipe.charge_desc', '배관 연장 시 추가로 필요한 냉매량을 계산합니다. (리퀴드라인 기준)')}
        </p>

        <div class="form-group">
          <label class="form-label" for="pipe-ref">${t('ph.ref_select', '냉매 선택')}</label>
          <select id="pipe-ref" class="form-select" onchange="PipeCalculator.calculate()">
            ${Object.keys(CHARGE_PER_METER).map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="pipe-size">${t('pipe.size_label', '배관 사이즈 (OD)')}</label>
          <select id="pipe-size" class="form-select" onchange="PipeCalculator.calculate()">
            ${PIPE_SIZES.map(p => `<option value="${p.id}">${p.label}</option>`).join('')}
          </select>
        </div>

        <div class="input-row">
          <div class="form-group">
            <label class="form-label" for="pipe-length">${t('pipe.length_label', '배관 길이')}</label>
            <input type="number" id="pipe-length" class="form-input" placeholder="${t('pipe.length_ph', '길이')}" step="0.1" min="0" oninput="PipeCalculator.calculate()">
          </div>
          <div class="form-group">
            <label class="form-label" for="pipe-unit">${t('pipe.unit_label', '단위')}</label>
            <select id="pipe-unit" class="form-select" onchange="PipeCalculator.calculate()">
              <option value="m">${t('pipe.unit_m', '미터 (m)')}</option>
              <option value="ft">${t('pipe.unit_ft', '피트 (ft)')}</option>
            </select>
          </div>
        </div>

        <div id="pipe-result"></div>
      </div>

      <!-- Pipe Size Guide -->
      <div class="glass-card">
        <div class="section-title">${t('pipe.guide_title', '배관 사이즈 가이드')}</div>
        <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:12px">
          ${t('pipe.guide_desc', '냉동 능력별 추천 배관 사이즈 (R-410A 기준, 15m 이내)')}
        </p>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:var(--text-sm)">
            <thead>
              <tr style="border-bottom:1px solid var(--border)">
                <th style="text-align:left;padding:8px 4px;color:var(--text-secondary)">${t('pipe.col_capacity', '냉동 능력')}</th>
                <th style="text-align:center;padding:8px 4px;color:var(--accent-orange)">${t('pipe.col_liquid', '리퀴드')}</th>
                <th style="text-align:center;padding:8px 4px;color:var(--accent-cyan)">${t('pipe.col_suction', '석션')}</th>
              </tr>
            </thead>
            <tbody>
              ${PIPE_GUIDE.map(g => `
                <tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:8px 4px;font-size:var(--text-xs)">${g.capacity}</td>
                  <td style="padding:8px 4px;text-align:center;font-family:var(--font-mono);color:var(--accent-orange)">${g.liquid}</td>
                  <td style="padding:8px 4px;text-align:center;font-family:var(--font-mono);color:var(--accent-cyan)">${g.suction}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="alert-box alert-info" style="margin-top:12px">
          ${App.statusSvg('info')}
          <span>${t('pipe.guide_note', '이 값은 일반 참고용입니다. 정확한 사이즈는 제조사 사양을 따르세요. 배관 길이 15m 초과 시 한 사이즈 업 고려.')}</span>
        </div>
      </div>`;
  }

  function calculate() {
    const ref = document.getElementById('pipe-ref')?.value;
    const size = document.getElementById('pipe-size')?.value;
    const lengthVal = parseFloat(document.getElementById('pipe-length')?.value);
    const unit = document.getElementById('pipe-unit')?.value;
    const resultEl = document.getElementById('pipe-result');
    if (!resultEl) return;

    if (!ref || !size || isNaN(lengthVal) || lengthVal <= 0) {
      resultEl.innerHTML = '';
      return;
    }

    const chargePerM = CHARGE_PER_METER[ref]?.[size];
    if (!chargePerM) {
      resultEl.innerHTML = `<div class="alert-box alert-warning">${App.statusSvg('warning')}<span>${t('pipe.no_data', '해당 냉매·배관 조합의 데이터가 없습니다. 다른 냉매나 배관 사이즈를 선택해보세요.')}</span></div>`;
      return;
    }

    // Convert ft to m if needed
    const lengthM = unit === 'ft' ? lengthVal * 0.3048 : lengthVal;
    const chargeG = chargePerM * lengthM;
    const chargeOz = chargeG / 28.3495;
    const chargeLb = chargeOz / 16;

    resultEl.innerHTML = `
      <div class="result-grid" style="margin-top:16px">
        <div class="result-box" style="text-align:center">
          <div class="result-value" style="color:var(--accent-blue);font-size:1.8rem">${chargeG.toFixed(0)}</div>
          <div class="result-label">${t('pipe.grams', '그램')} (g)</div>
        </div>
        <div class="result-box" style="text-align:center">
          <div class="result-value" style="color:var(--accent-cyan);font-size:1.8rem">${chargeOz.toFixed(1)}</div>
          <div class="result-label">${t('pipe.ounces', '온스')} (oz)</div>
        </div>
      </div>
      ${chargeLb >= 1 ? `
        <div style="text-align:center;margin-top:8px;font-family:var(--font-mono);font-size:var(--text-sm);color:var(--text-secondary)">
          = ${chargeLb.toFixed(2)} lb
        </div>` : ''}
      <div class="alert-box alert-info" style="margin-top:12px">
        ${App.statusSvg('info')}
        <span>${t('pipe.result_note', '리퀴드라인 기준 값입니다. 석션라인은 가스 밀도가 낮아 충전량이 훨씬 적습니다.')} (${ref}@${size}" = ${chargePerM}g/m)</span>
      </div>`;
  }

  return { initUI, calculate };
})();

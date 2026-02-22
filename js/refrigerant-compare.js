// ===================================================
// HVAC Pulse — Refrigerant Comparison Tool
// Compare 2-3 refrigerants side-by-side
// ===================================================

const RefrigerantCompare = (() => {

  const MAX_COMPARE = 3;
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

  // --- Initialize UI ---
  function initUI() {
    const container = document.getElementById('ref-compare-content');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header">
        <h1>${t('compare.title', '⚖️ 냉매 비교 도구')}</h1>
        <p class="subtitle">${t('compare.subtitle', '동일 조건에서 냉매 특성 비교')}</p>
      </div>

      <div class="glass-card">
        <div class="section-title">${t('compare.select_ref', '비교할 냉매 선택 (최대 {n}종)').replace('{n}', MAX_COMPARE)}</div>
        <div id="compare-selectors"></div>
        <button class="btn" onclick="RefrigerantCompare.addSelector()" id="compare-add-btn"
          style="margin-top:8px;font-size:var(--text-sm);padding:8px 16px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary)">
          ${t('compare.add_ref', '+ 냉매 추가')}
        </button>
      </div>

      <div class="glass-card" id="compare-condition-card" style="display:none">
        <div class="section-title">${t('compare.condition', '비교 조건')}</div>
        <div class="input-row">
          <div class="form-group">
            <label class="form-label" for="compare-evap-t">${t('compare.evap_temp', `증발온도 (${Settings.tempLabel()})`)}</label>
            <input type="number" id="compare-evap-t" class="form-input" value="40" step="1">
          </div>
          <div class="form-group">
            <label class="form-label" for="compare-cond-t">${t('compare.cond_temp', `응축온도 (${Settings.tempLabel()})`)}</label>
            <input type="number" id="compare-cond-t" class="form-input" value="110" step="1">
          </div>
        </div>
        <button class="btn btn-primary" onclick="RefrigerantCompare.runCompare()" style="margin-top:8px">
          ${t('compare.run', '비교 실행')}
        </button>
      </div>

      <div id="compare-result-area"></div>`;

    // Add initial 2 selectors
    addSelector('R-410A');
    addSelector('R-32');
  }

  let selectorCount = 0;

  function addSelector(defaultValue) {
    const container = document.getElementById('compare-selectors');
    if (!container) return;

    const count = container.querySelectorAll('.compare-selector').length;
    if (count >= MAX_COMPARE) {
      App.showToast(t('compare.max_reached', '최대 {n}종까지 비교 가능합니다.').replace('{n}', MAX_COMPARE), 'warning');
      return;
    }

    selectorCount++;
    const idx = selectorCount;
    const color = COLORS[(count) % COLORS.length];

    const div = document.createElement('div');
    div.className = 'compare-selector';
    div.id = `compare-sel-${idx}`;
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
        <span style="width:12px;height:12px;border-radius:50%;background:${color};flex-shrink:0"></span>
        <select name="compare-ref-${idx}" class="form-select compare-ref-select" data-idx="${idx}" aria-label="Refrigerant ${idx}" style="flex:1">
          ${buildRefOptions(defaultValue)}
        </select>
        <button onclick="RefrigerantCompare.removeSelector(${idx})" style="background:none;border:none;color:var(--accent-red);font-size:var(--text-xl);cursor:pointer;padding:4px">×</button>
      </div>`;

    container.appendChild(div);
    updateAddButton();

    // Show condition card when 2+ selected
    if (container.querySelectorAll('.compare-selector').length >= 2) {
      document.getElementById('compare-condition-card')?.style.setProperty('display', 'block');
    }
  }

  function removeSelector(idx) {
    const el = document.getElementById(`compare-sel-${idx}`);
    if (el) el.remove();
    updateAddButton();

    const container = document.getElementById('compare-selectors');
    if (container && container.querySelectorAll('.compare-selector').length < 2) {
      document.getElementById('compare-condition-card')?.style.setProperty('display', 'none');
      document.getElementById('compare-result-area').innerHTML = '';
    }
  }

  function updateAddButton() {
    const container = document.getElementById('compare-selectors');
    const btn = document.getElementById('compare-add-btn');
    if (container && btn) {
      const count = container.querySelectorAll('.compare-selector').length;
      btn.style.display = count >= MAX_COMPARE ? 'none' : 'inline-block';
    }
  }

  function buildRefOptions(selected) {
    const lang = typeof I18n !== 'undefined' ? I18n.getLang() : 'ko';
    let html = '';
    if (typeof RefrigerantCatalog !== 'undefined') {
      const grouped = RefrigerantCatalog.getGroupedByCategory();
      for (const [catKey, groupData] of Object.entries(grouped)) {
        const cat = groupData.category;
        const catName = (lang !== 'ko' && cat.name_en) ? cat.name_en : cat.name_kr;
        html += `<optgroup label="${cat.icon} ${catName}">`;
        groupData.refrigerants.forEach(r => {
          const sel = r.id === selected ? ' selected' : '';
          const rName = (lang !== 'ko' && r.name_en) ? r.name_en : r.name_kr;
          html += `<option value="${r.id}"${sel}>${rName} (${r.safety})</option>`;
        });
        html += '</optgroup>';
      }
    } else {
      getRefrigerantList().forEach(key => {
        const sel = key === selected ? ' selected' : '';
        html += `<option value="${key}"${sel}>${key}</option>`;
      });
    }
    return html;
  }

  // --- Run comparison ---
  function runCompare() {
    const selects = document.querySelectorAll('.compare-ref-select');
    const refs = [];
    selects.forEach(sel => {
      if (sel.value) refs.push(sel.value);
    });

    if (refs.length < 2) {
      App.showToast(t('compare.need_two', '2개 이상의 냉매를 선택하세요.'), 'warning');
      return;
    }

    const evapRaw = parseFloat(document.getElementById('compare-evap-t')?.value) || (Settings.isMetric() ? 4 : 40);
    const condRaw = parseFloat(document.getElementById('compare-cond-t')?.value) || (Settings.isMetric() ? 43 : 110);
    const evapT = Settings.userTempToF(evapRaw);
    const condT = Settings.userTempToF(condRaw);

    const results = refs.map((refId, i) => calculateRefData(refId, evapT, condT, COLORS[i]));
    renderComparison(results, evapRaw, condRaw);
  }

  function calculateRefData(refId, evapT_f, condT_f, color) {
    const data = { id: refId, color, evapP: null, condP: null, gwp: null, safety: null, type: null };

    // Get metadata
    if (typeof RefrigerantCatalog !== 'undefined') {
      const info = RefrigerantCatalog.getById(refId);
      if (info) {
        data.gwp = info.gwp;
        data.safety = info.safety;
        data.type = info.type;
        data.isZeotropic = info.isZeotropic;
        data.glide_f = info.glide_f || 0;
      }
    } else {
      const info = REFRIGERANT_DB[refId];
      if (info) {
        data.gwp = info.gwp;
        data.safety = info.safety;
        data.type = info.type;
        data.isZeotropic = info.isZeotropic;
        data.glide_f = info.glide || 0;
      }
    }

    // Try CoolProp first
    if (typeof CoolPropEngine !== 'undefined' && CoolPropEngine.isReady()) {
      const coolpropName = getCoolPropNameFor(refId);
      if (coolpropName) {
        try {
          const ep = CoolPropEngine.getSatPressureBubble(coolpropName, evapT_f);
          const cp = CoolPropEngine.getSatPressureBubble(coolpropName, condT_f);
          if (ep != null && cp != null) {
            data.evapP = ep;
            data.condP = cp;
            data.source = 'CoolProp';
          }
        } catch (e) {
          console.warn('CoolProp error for', refId, e);
        }
      }
    }

    // Fallback to legacy
    if (data.evapP === null && typeof REFRIGERANT_DB !== 'undefined' && REFRIGERANT_DB[refId]) {
      const evapResult = PTCalculator.getPressureFromTemp(refId, evapT_f);
      const condResult = PTCalculator.getPressureFromTemp(refId, condT_f);
      if (evapResult) data.evapP = evapResult.bubble || evapResult.pressure;
      if (condResult) data.condP = condResult.bubble || condResult.pressure;
      data.source = 'Legacy';
    }

    // Compression ratio
    if (data.evapP !== null && data.condP !== null) {
      data.compressionRatio = ((data.condP + 14.696) / (data.evapP + 14.696)).toFixed(1);
    }

    return data;
  }

  function getCoolPropNameFor(refId) {
    if (typeof RefrigerantCatalog !== 'undefined') {
      return RefrigerantCatalog.getCoolPropName(refId);
    }
    const map = {
      'R-22': 'R22', 'R-410A': 'R410A', 'R-32': 'R32', 'R-454B': 'R454B',
      'R-134a': 'R134a', 'R-404A': 'R404A', 'R-407C': 'R407C', 'R-290': 'Propane'
    };
    return map[refId] || null;
  }

  // --- Render comparison results ---
  function renderComparison(results, evapT, condT) {
    const el = document.getElementById('compare-result-area');
    if (!el) return;

    let html = `
      <div class="glass-card">
        <div class="section-title">${t('compare.result_title', `비교 결과 ({evap}${Settings.tempLabel()} 증발 / {cond}${Settings.tempLabel()} 응축)`).replace('{evap}', evapT).replace('{cond}', condT)}</div>

        <!-- Comparison Table -->
        <div style="overflow-x:auto">
          <table class="compare-table">
            <thead>
              <tr>
                <th>${t('compare.col_item', '항목')}</th>
                ${results.map(r => `<th style="color:${r.color}">${r.id}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${t('compare.type', '유형')}</td>
                ${results.map(r => `<td>${r.type || '—'}</td>`).join('')}
              </tr>
              <tr>
                <td>${t('compare.safety', '안전등급')}</td>
                ${results.map(r => {
                  const c = r.safety === 'A1' ? 'var(--accent-green)' : r.safety === 'A2L' ? 'var(--accent-orange)' : 'var(--accent-red)';
                  return `<td style="color:${c};font-weight:600">${r.safety || '—'}</td>`;
                }).join('')}
              </tr>
              <tr>
                <td>GWP</td>
                ${results.map(r => `<td class="mono">${r.gwp !== null ? r.gwp : '—'}</td>`).join('')}
              </tr>
              <tr>
                <td>${t('compare.evap_p', '증발압력 (psig)')}</td>
                ${results.map(r => `<td class="mono">${r.evapP !== null ? r.evapP.toFixed(1) : '—'}</td>`).join('')}
              </tr>
              <tr>
                <td>${t('compare.cond_p', '응축압력 (psig)')}</td>
                ${results.map(r => `<td class="mono">${r.condP !== null ? r.condP.toFixed(1) : '—'}</td>`).join('')}
              </tr>
              <tr>
                <td>${t('compare.comp_ratio', '압축비')}</td>
                ${results.map(r => `<td class="mono">${r.compressionRatio || '—'}</td>`).join('')}
              </tr>
              <tr>
                <td>${t('compare.glide', '글라이드')}</td>
                ${results.map(r => `<td class="mono">${r.isZeotropic ? `~${Settings.displayDelta(r.glide_f)}` : '—'}</td>`).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- GWP Bar Chart -->
      <div class="glass-card">
        <div class="section-title">${t('compare.gwp_compare', 'GWP 비교')}</div>
        ${renderGWPChart(results)}
      </div>

      <!-- Pressure Bar Chart -->
      <div class="glass-card">
        <div class="section-title">${t('compare.pressure_compare', '운전 압력 비교')}</div>
        ${renderPressureChart(results)}
      </div>`;

    el.innerHTML = html;
  }

  function renderGWPChart(results) {
    const maxGWP = Math.max(...results.map(r => r.gwp || 0), 1);

    let html = '<div class="bar-chart">';
    results.forEach(r => {
      const pct = ((r.gwp || 0) / maxGWP * 100).toFixed(0);
      html += `
        <div class="bar-row">
          <div class="bar-label" style="color:${r.color}">${r.id}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${r.color}">${r.gwp || '—'}</div>
          </div>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  function renderPressureChart(results) {
    const allP = results.flatMap(r => [r.evapP || 0, r.condP || 0]);
    const maxP = Math.max(...allP, 1);

    let html = '<div class="pressure-compare-chart">';
    results.forEach(r => {
      const evapPct = ((r.evapP || 0) / maxP * 100).toFixed(0);
      const condPct = ((r.condP || 0) / maxP * 100).toFixed(0);
      html += `
        <div class="pcc-row">
          <div class="pcc-label" style="color:${r.color}">${r.id}</div>
          <div class="pcc-bars">
            <div class="pcc-bar">
              <div class="bar-track">
                <div class="bar-fill" style="width:${evapPct}%;background:${r.color};opacity:0.6">${r.evapP !== null ? r.evapP.toFixed(0) : '—'}</div>
              </div>
              <span class="pcc-bar-label">${t('compare.evap', '증발')}</span>
            </div>
            <div class="pcc-bar">
              <div class="bar-track">
                <div class="bar-fill" style="width:${condPct}%;background:${r.color}">${r.condP !== null ? r.condP.toFixed(0) : '—'}</div>
              </div>
              <span class="pcc-bar-label">${t('compare.condense', '응축')}</span>
            </div>
          </div>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  // --- Public API ---
  return {
    initUI,
    addSelector,
    removeSelector,
    runCompare
  };
})();

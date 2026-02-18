// ===================================================
// HVAC Pulse — P-T Calculator Engine + UI
// Copyright (c) 2024-2026. All rights reserved.
// Pressure ↔ Temperature conversion with interpolation
// Superheat / Subcooling calculation
// CoolProp WASM integration + category UI
// ===================================================

const PTCalculator = (() => {

  // --- Linear interpolation helper ---
  function lerp(x, x0, x1, y0, y1) {
    if (x1 === x0) return y0;
    return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
  }

  // --- Get pressure from temperature (psig) ---
  // CoolProp first, legacy fallback
  // For zeotropic: returns { bubble, dew }
  // For azeotropic: returns { pressure }
  function getPressureFromTemp(refName, temp_f) {
    // Try CoolProp first
    if (typeof CoolPropEngine !== 'undefined' && CoolPropEngine.isReady()) {
      const coolpropName = getCoolPropName(refName);
      if (coolpropName) {
        const bubble = CoolPropEngine.getSatPressureBubble(coolpropName, temp_f);
        if (bubble !== null) {
          const info = getRefInfo(refName);
          if (info && info.isZeotropic) {
            const dew = CoolPropEngine.getSatPressureDew(coolpropName, temp_f);
            return { bubble, dew: dew !== null ? dew : bubble, source: 'CoolProp' };
          }
          return { pressure: bubble, source: 'CoolProp' };
        }
      }
    }

    // Legacy fallback
    if (typeof REFRIGERANT_DB === 'undefined') return null;
    const ref = REFRIGERANT_DB[refName];
    if (!ref) return null;
    const data = ref.ptData;

    const minT = data[0].temp_f;
    const maxT = data[data.length - 1].temp_f;
    const t = Math.max(minT, Math.min(maxT, temp_f));

    for (let i = 0; i < data.length - 1; i++) {
      if (t >= data[i].temp_f && t <= data[i + 1].temp_f) {
        if (ref.isZeotropic) {
          return {
            bubble: lerp(t, data[i].temp_f, data[i + 1].temp_f, data[i].bubble_psig, data[i + 1].bubble_psig),
            dew: lerp(t, data[i].temp_f, data[i + 1].temp_f, data[i].dew_psig, data[i + 1].dew_psig),
            source: 'Legacy'
          };
        } else {
          return {
            pressure: lerp(t, data[i].temp_f, data[i + 1].temp_f, data[i].pressure_psig, data[i + 1].pressure_psig),
            source: 'Legacy'
          };
        }
      }
    }

    const last = data[data.length - 1];
    if (ref.isZeotropic) {
      return { bubble: last.bubble_psig, dew: last.dew_psig, source: 'Legacy' };
    }
    return { pressure: last.pressure_psig, source: 'Legacy' };
  }

  // --- Get temperature from pressure (reverse interpolation) ---
  function getTempFromPressure(refName, psig, pressureType) {
    // Try CoolProp first
    if (typeof CoolPropEngine !== 'undefined' && CoolPropEngine.isReady()) {
      const coolpropName = getCoolPropName(refName);
      if (coolpropName) {
        let satTemp;
        if (pressureType === 'dew') {
          satTemp = CoolPropEngine.getSatTempDew(coolpropName, psig);
        } else {
          satTemp = CoolPropEngine.getSatTempBubble(coolpropName, psig);
        }
        if (satTemp !== null) return satTemp;
      }
    }

    // Legacy fallback
    if (typeof REFRIGERANT_DB === 'undefined') return null;
    const ref = REFRIGERANT_DB[refName];
    if (!ref) return null;
    const data = ref.ptData;

    let pKey;
    if (ref.isZeotropic) {
      pKey = pressureType === 'dew' ? 'dew_psig' : 'bubble_psig';
    } else {
      pKey = 'pressure_psig';
    }

    const minP = data[0][pKey];
    const maxP = data[data.length - 1][pKey];
    const p = Math.max(minP, Math.min(maxP, psig));

    for (let i = 0; i < data.length - 1; i++) {
      const p0 = data[i][pKey];
      const p1 = data[i + 1][pKey];
      if ((p >= p0 && p <= p1) || (p >= p1 && p <= p0)) {
        return lerp(p, p0, p1, data[i].temp_f, data[i + 1].temp_f);
      }
    }
    return data[data.length - 1].temp_f;
  }

  // --- Get CoolProp fluid name ---
  function getCoolPropName(refId) {
    if (typeof RefrigerantCatalog !== 'undefined') {
      return RefrigerantCatalog.getCoolPropName(refId);
    }
    return null;
  }

  // --- Get refrigerant info ---
  function getRefInfo(refId) {
    if (typeof RefrigerantCatalog !== 'undefined') {
      return RefrigerantCatalog.getById(refId);
    }
    if (typeof REFRIGERANT_DB !== 'undefined' && REFRIGERANT_DB[refId]) {
      return REFRIGERANT_DB[refId];
    }
    return null;
  }

  // --- Calculate Superheat ---
  function calcSuperheat(refName, suctionPressure_psig, suctionLineTemp_f) {
    const satTemp = getTempFromPressure(refName, suctionPressure_psig, 'dew');
    if (satTemp === null) return null;
    return {
      superheat: parseFloat((suctionLineTemp_f - satTemp).toFixed(1)),
      satTemp: parseFloat(satTemp.toFixed(1))
    };
  }

  // --- Calculate Subcooling ---
  function calcSubcooling(refName, dischargePressure_psig, liquidLineTemp_f) {
    const satTemp = getTempFromPressure(refName, dischargePressure_psig, 'bubble');
    if (satTemp === null) return null;
    return {
      subcooling: parseFloat((satTemp - liquidLineTemp_f).toFixed(1)),
      satTemp: parseFloat(satTemp.toFixed(1))
    };
  }

  // --- Get status color class ---
  function getSuperheatStatus(sh) {
    if (sh >= 5 && sh <= 15) return 'normal';
    if ((sh >= 0 && sh < 5) || (sh > 15 && sh <= 25)) return 'caution';
    return 'danger';
  }

  function getSubcoolingStatus(sc) {
    if (sc >= 5 && sc <= 18) return 'normal';
    if ((sc >= 0 && sc < 5) || (sc > 18 && sc <= 25)) return 'caution';
    return 'danger';
  }

  // --- F ↔ C conversion ---
  function fToC(f) { return ((f - 32) * 5 / 9); }
  function cToF(c) { return (c * 9 / 5 + 32); }

  // =============================================
  // UI Logic
  // =============================================
  function initUI() {
    const section = document.getElementById('tools-sub-pt');
    if (!section) return;

    // Populate refrigerant dropdown (category-based if catalog available)
    const refSelect = document.getElementById('pt-ref-select');
    if (refSelect) {
      populateRefDropdown(refSelect);
      refSelect.addEventListener('change', updateRefInfo);
      updateRefInfo();
    }

    // P-T Conversion listeners
    const tempInput = document.getElementById('pt-temp-input');
    const pressInput = document.getElementById('pt-press-input');
    if (tempInput) tempInput.addEventListener('input', () => calcFromTemp());
    if (pressInput) pressInput.addEventListener('input', () => calcFromPressure());

    // Superheat / Subcooling listeners
    const shBtn = document.getElementById('pt-calc-sh-btn');
    const scBtn = document.getElementById('pt-calc-sc-btn');
    if (shBtn) shBtn.addEventListener('click', calcSH);
    if (scBtn) scBtn.addEventListener('click', calcSC);
  }

  // --- Build category-based dropdown ---
  function populateRefDropdown(selectEl) {
    selectEl.innerHTML = '';

    if (typeof RefrigerantCatalog !== 'undefined') {
      const grouped = RefrigerantCatalog.getGroupedByCategory();
      for (const [catKey, groupData] of Object.entries(grouped)) {
        const cat = groupData.category;
        const optgroup = document.createElement('optgroup');
        optgroup.label = `${cat.icon} ${cat.name_kr}`;
        groupData.refrigerants.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.id;
          opt.textContent = `${r.name_kr} (${r.safety})`;
          // Indicate CoolProp vs Legacy
          if (!r.hasLegacyData && !(typeof CoolPropEngine !== 'undefined' && CoolPropEngine.isReady())) {
            opt.textContent += ' *';
          }
          optgroup.appendChild(opt);
        });
        selectEl.appendChild(optgroup);
      }
    } else {
      // Legacy fallback
      getRefrigerantList().forEach(key => {
        const ref = REFRIGERANT_DB[key];
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `${key} (${ref.safety})`;
        selectEl.appendChild(opt);
      });
    }
  }

  function updateRefInfo() {
    const refSelect = document.getElementById('pt-ref-select');
    const infoEl = document.getElementById('pt-ref-info');
    if (!refSelect || !infoEl) return;

    const refId = refSelect.value;
    const info = getRefInfo(refId);
    if (!info) return;

    // Determine data source
    const hasCoolProp = typeof CoolPropEngine !== 'undefined' && CoolPropEngine.isReady() && getCoolPropName(refId);
    const hasLegacy = typeof REFRIGERANT_DB !== 'undefined' && REFRIGERANT_DB[refId];
    const sourceLabel = hasCoolProp ? 'CoolProp' : hasLegacy ? 'Legacy' : 'N/A';
    const sourceColor = hasCoolProp ? 'var(--accent-green)' : hasLegacy ? 'var(--accent-blue)' : 'var(--accent-red)';

    const safety = info.safety || '';
    const gwp = info.gwp || '—';
    const type = info.type || '';
    const name = info.name_kr || info.name || refId;
    const isZeo = info.isZeotropic;
    const glide = info.glide_f || info.glide || 0;

    let html = `<span class="ref-badge"><span class="safety-dot ${safety.toLowerCase()}"></span>${name}</span>`;
    html += ` <span style="font-size:var(--text-xs);color:var(--text-secondary)">${type} · GWP ${gwp} · ${safety}</span>`;
    html += ` <span class="engine-badge" style="font-size:var(--text-xs);padding:2px 6px;border-radius:4px;background:rgba(0,0,0,0.3);color:${sourceColor};border:1px solid ${sourceColor};margin-left:4px">${sourceLabel}</span>`;
    if (isZeo) {
      html += ` <span class="zeotropic-indicator">비공비 (글라이드 ~${glide}°F)</span>`;
    }
    infoEl.innerHTML = html;

    // DataBridge: Show refrigerant warnings (phase-out, safety, replacements)
    if (typeof DataBridge !== 'undefined') {
      const warningsEl = document.getElementById('pt-ref-warnings');
      if (warningsEl) DataBridge.renderRefrigerantWarnings(refId, warningsEl);
    }

    clearPTResults();
  }

  function clearPTResults() {
    const el = document.getElementById('pt-result-area');
    if (el) el.innerHTML = '';
  }

  function getSelectedRef() {
    return document.getElementById('pt-ref-select')?.value || 'R-410A';
  }

  function calcFromTemp() {
    const tempVal = parseFloat(document.getElementById('pt-temp-input')?.value);
    if (isNaN(tempVal)) { clearPTResults(); return; }

    const refName = getSelectedRef();
    const info = getRefInfo(refName);
    const result = getPressureFromTemp(refName, tempVal);
    if (!result) {
      const el = document.getElementById('pt-result-area');
      if (el) el.innerHTML = `<div class="alert-box alert-warning"><span>⚠️</span><span>${t('pt.no_data', '이 냉매의 P-T 데이터가 없습니다. CoolProp 엔진이 필요합니다.')}</span></div>`;
      return;
    }

    const el = document.getElementById('pt-result-area');
    if (!el) return;

    const tempC = fToC(tempVal).toFixed(1);
    const isZeo = info && info.isZeotropic;

    if (isZeo && result.bubble !== undefined && result.dew !== undefined) {
      el.innerHTML = `
        <div class="result-grid">
          <div class="result-box">
            <div class="result-value" style="color:var(--accent-orange)">${result.bubble.toFixed(1)}</div>
            <div class="result-label">Bubble 압력 (psig)</div>
          </div>
          <div class="result-box">
            <div class="result-value" style="color:var(--accent-cyan)">${result.dew.toFixed(1)}</div>
            <div class="result-label">Dew 압력 (psig)</div>
          </div>
        </div>
        <div class="alert-box alert-info" style="margin-top:12px">
          <span>ℹ️</span>
          <span>${tempVal}°F (${tempC}°C) 에서의 포화압력. 과열도는 Dew, 과냉도는 Bubble 사용.${result.source ? ' [' + result.source + ']' : ''}</span>
        </div>`;
    } else {
      const pVal = result.pressure !== undefined ? result.pressure : result.bubble;
      el.innerHTML = `
        <div class="result-box" style="text-align:center">
          <div class="result-value" style="color:var(--accent-blue)">${pVal.toFixed(1)}</div>
          <div class="result-label">포화압력 (psig) @ ${tempVal}°F (${tempC}°C)${result.source ? ' [' + result.source + ']' : ''}</div>
        </div>`;
    }
  }

  function calcFromPressure() {
    const pressVal = parseFloat(document.getElementById('pt-press-input')?.value);
    if (isNaN(pressVal)) { clearPTResults(); return; }

    const refName = getSelectedRef();
    const info = getRefInfo(refName);
    const isZeo = info && info.isZeotropic;

    const el = document.getElementById('pt-result-area');
    if (!el) return;

    if (isZeo) {
      const bubbleTemp = getTempFromPressure(refName, pressVal, 'bubble');
      const dewTemp = getTempFromPressure(refName, pressVal, 'dew');
      if (bubbleTemp === null || dewTemp === null) {
        el.innerHTML = `<div class="alert-box alert-warning"><span>⚠️</span><span>이 냉매의 P-T 데이터가 없습니다.</span></div>`;
        return;
      }
      el.innerHTML = `
        <div class="result-grid">
          <div class="result-box">
            <div class="result-value" style="color:var(--accent-orange)">${bubbleTemp.toFixed(1)}°F</div>
            <div class="result-label">Bubble 온도 (${fToC(bubbleTemp).toFixed(1)}°C)</div>
          </div>
          <div class="result-box">
            <div class="result-value" style="color:var(--accent-cyan)">${dewTemp.toFixed(1)}°F</div>
            <div class="result-label">Dew 온도 (${fToC(dewTemp).toFixed(1)}°C)</div>
          </div>
        </div>
        <div class="alert-box alert-info" style="margin-top:12px">
          <span>ℹ️</span>
          <span>${pressVal} psig 에서의 포화온도. 비공비혼합물은 Bubble/Dew가 다릅니다.</span>
        </div>`;
    } else {
      const satTemp = getTempFromPressure(refName, pressVal, 'pressure');
      if (satTemp === null) {
        el.innerHTML = `<div class="alert-box alert-warning"><span>⚠️</span><span>이 냉매의 P-T 데이터가 없습니다.</span></div>`;
        return;
      }
      el.innerHTML = `
        <div class="result-box" style="text-align:center">
          <div class="result-value" style="color:var(--accent-blue)">${satTemp.toFixed(1)}°F</div>
          <div class="result-label">포화온도 @ ${pressVal} psig (${fToC(satTemp).toFixed(1)}°C)</div>
        </div>`;
    }
  }

  function calcSH() {
    const refName = getSelectedRef();
    const suctionP = parseFloat(document.getElementById('pt-sh-pressure')?.value);
    const suctionT = parseFloat(document.getElementById('pt-sh-temp')?.value);
    const el = document.getElementById('pt-sh-result');
    if (!el || isNaN(suctionP) || isNaN(suctionT)) return;

    const result = calcSuperheat(refName, suctionP, suctionT);
    if (!result) {
      el.innerHTML = `<div class="alert-box alert-warning"><span>⚠️</span><span>${t('pt.calc_fail', '계산 불가 — 냉매 데이터를 확인하세요.')}</span></div>`;
      return;
    }

    const status = getSuperheatStatus(result.superheat);
    const statusText = status === 'normal' ? t('status.normal', '정상') : status === 'caution' ? t('status.caution', '주의') : t('status.danger', '위험');
    const statusIcon = status === 'normal' ? '✅' : status === 'caution' ? '⚠️' : '🔴';

    el.innerHTML = `
      <div class="result-box" style="text-align:center">
        <div class="result-value ${status}">${result.superheat.toFixed(1)}°F</div>
        <div class="result-label">${t('pt.superheat', '과열도')} (Superheat) ${statusIcon} ${statusText}</div>
        <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:8px">
          ${t('pt.sat_temp', '포화온도')} (Dew): ${result.satTemp}°F (${fToC(result.satTemp).toFixed(1)}°C)<br>
          ${t('pt.suction_actual', '석션라인 실측')}: ${suctionT}°F
        </div>
      </div>`;

    // Update accordion preview
    const shPreview = document.getElementById('sh-preview');
    if (shPreview) shPreview.textContent = `${result.superheat.toFixed(1)}°F ${statusIcon}`;
  }

  function calcSC() {
    const refName = getSelectedRef();
    const dischargeP = parseFloat(document.getElementById('pt-sc-pressure')?.value);
    const liquidT = parseFloat(document.getElementById('pt-sc-temp')?.value);
    const el = document.getElementById('pt-sc-result');
    if (!el || isNaN(dischargeP) || isNaN(liquidT)) return;

    const result = calcSubcooling(refName, dischargeP, liquidT);
    if (!result) {
      el.innerHTML = `<div class="alert-box alert-warning"><span>⚠️</span><span>${t('pt.calc_fail', '계산 불가 — 냉매 데이터를 확인하세요.')}</span></div>`;
      return;
    }

    const status = getSubcoolingStatus(result.subcooling);
    const statusText = status === 'normal' ? t('status.normal', '정상') : status === 'caution' ? t('status.caution', '주의') : t('status.danger', '위험');
    const statusIcon = status === 'normal' ? '✅' : status === 'caution' ? '⚠️' : '🔴';

    el.innerHTML = `
      <div class="result-box" style="text-align:center">
        <div class="result-value ${status}">${result.subcooling.toFixed(1)}°F</div>
        <div class="result-label">${t('pt.subcooling', '과냉도')} (Subcooling) ${statusIcon} ${statusText}</div>
        <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:8px">
          ${t('pt.sat_temp', '포화온도')} (Bubble): ${result.satTemp}°F (${fToC(result.satTemp).toFixed(1)}°C)<br>
          ${t('pt.liquid_actual', '리퀴드라인 실측')}: ${liquidT}°F
        </div>
      </div>`;

    // Update accordion preview
    const scPreview = document.getElementById('sc-preview');
    if (scPreview) scPreview.textContent = `${result.subcooling.toFixed(1)}°F ${statusIcon}`;
  }

  // --- Refresh dropdown when CoolProp becomes available ---
  function onEngineReady() {
    const refSelect = document.getElementById('pt-ref-select');
    if (refSelect) {
      const prev = refSelect.value;
      populateRefDropdown(refSelect);
      if (prev) refSelect.value = prev;
      updateRefInfo();
    }
  }

  return {
    getPressureFromTemp,
    getTempFromPressure,
    calcSuperheat,
    calcSubcooling,
    getSuperheatStatus,
    getSubcoolingStatus,
    fToC,
    cToF,
    initUI,
    onEngineReady,
    populateRefDropdown
  };
})();

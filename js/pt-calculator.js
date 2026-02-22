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
        try {
          const bubble = CoolPropEngine.getSatPressureBubble(coolpropName, temp_f);
          if (bubble !== null) {
            const info = getRefInfo(refName);
            if (info && info.isZeotropic) {
              const dew = CoolPropEngine.getSatPressureDew(coolpropName, temp_f);
              return { bubble, dew: dew !== null ? dew : bubble, source: 'CoolProp' };
            }
            return { pressure: bubble, source: 'CoolProp' };
          }
        } catch (e) {
          console.warn('CoolProp getPressure error:', refName, e);
        }
      }
    }

    // Legacy fallback — binary search for sorted P-T table
    if (typeof REFRIGERANT_DB === 'undefined') return null;
    const ref = REFRIGERANT_DB[refName];
    if (!ref) return null;
    const data = ref.ptData;

    const minT = data[0].temp_f;
    const maxT = data[data.length - 1].temp_f;
    const t = Math.max(minT, Math.min(maxT, temp_f));

    let lo = 0, hi = data.length - 2;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (t < data[mid].temp_f) hi = mid - 1;
      else if (t > data[mid + 1].temp_f) lo = mid + 1;
      else {
        if (ref.isZeotropic) {
          return {
            bubble: lerp(t, data[mid].temp_f, data[mid + 1].temp_f, data[mid].bubble_psig, data[mid + 1].bubble_psig),
            dew: lerp(t, data[mid].temp_f, data[mid + 1].temp_f, data[mid].dew_psig, data[mid + 1].dew_psig),
            source: 'Legacy'
          };
        }
        return {
          pressure: lerp(t, data[mid].temp_f, data[mid + 1].temp_f, data[mid].pressure_psig, data[mid + 1].pressure_psig),
          source: 'Legacy'
        };
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

  // --- Target Superheat (Fixed Orifice / ACCA) ---
  // Formula: (3 × IWB − OAT − 80) / 2  (all °F)
  // Valid: IWB 50-76°F, OAT 55-115°F, result ≥ 5°F
  function calcTargetSuperheat(iwb_f, oat_f) {
    if (iwb_f < 50 || iwb_f > 76) {
      return { targetSH: null, isValid: false, message: t('pt.targetsh.invalid_iwb', 'Indoor Wet Bulb must be 50–76°F (10–24.4°C)') };
    }
    if (oat_f < 55 || oat_f > 115) {
      return { targetSH: null, isValid: false, message: t('pt.targetsh.invalid_oat', 'Outdoor temp must be 55–115°F (12.8–46.1°C)') };
    }
    const target = (3 * iwb_f - oat_f - 80) / 2;
    if (target < 5) {
      return { targetSH: parseFloat(target.toFixed(1)), isValid: false, message: t('pt.targetsh.too_low', 'Target < 5°F — conditions not suitable for charging test') };
    }
    return { targetSH: parseFloat(target.toFixed(1)), isValid: true, message: null };
  }

  // Compare actual vs target (±5°F tolerance per ACCA/Title 24)
  function evaluateSuperheat(actualSH_f, targetSH_f) {
    const diff = actualSH_f - targetSH_f;
    if (Math.abs(diff) <= 5) return { verdict: 'pass', diff: parseFloat(diff.toFixed(1)) };
    if (diff > 5) return { verdict: 'fail_high', diff: parseFloat(diff.toFixed(1)) };
    return { verdict: 'fail_low', diff: parseFloat(diff.toFixed(1)) };
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

    // Target Superheat listener
    const tshBtn = document.getElementById('pt-calc-tsh-btn');
    if (tshBtn) tshBtn.addEventListener('click', calcTargetSH);
  }

  // --- Build category-based dropdown ---
  function populateRefDropdown(selectEl) {
    selectEl.innerHTML = '';

    if (typeof RefrigerantCatalog !== 'undefined') {
      const grouped = RefrigerantCatalog.getGroupedByCategory();
      for (const [catKey, groupData] of Object.entries(grouped)) {
        const cat = groupData.category;
        const optgroup = document.createElement('optgroup');
        const lang = typeof I18n !== 'undefined' ? I18n.getLang() : 'ko';
        optgroup.label = `${cat.icon} ${(lang !== 'ko' && cat.name_en) ? cat.name_en : cat.name_kr}`;
        groupData.refrigerants.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.id;
          const rName = (lang !== 'ko' && r.name_en) ? r.name_en : r.name_kr;
          opt.textContent = `${rName} (${r.safety})`;
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
    const lang = typeof I18n !== 'undefined' ? I18n.getLang() : 'ko';
    const name = (lang !== 'ko' && info.name_en) ? info.name_en : (info.name_kr || info.name || refId);
    const isZeo = info.isZeotropic;
    const glide = info.glide_f || info.glide || 0;

    let html = `<span class="ref-badge"><span class="safety-dot ${safety.toLowerCase()}"></span>${name}</span>`;
    html += ` <span style="font-size:var(--text-xs);color:var(--text-secondary)">${type} · GWP ${gwp} · ${safety}</span>`;
    html += ` <span class="engine-badge" style="font-size:var(--text-xs);padding:2px 6px;border-radius:4px;background:rgba(0,0,0,0.3);color:${sourceColor};border:1px solid ${sourceColor};margin-left:4px">${sourceLabel}</span>`;
    if (isZeo) {
      html += ` <span class="zeotropic-indicator">${t('pt.zeotropic.indicator', '비공비 (글라이드)')} ~${Settings.displayDelta(glide)}</span>`;
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
    const tempVal_f = Settings.userTempToF(tempVal);

    const refName = getSelectedRef();
    const info = getRefInfo(refName);
    const result = getPressureFromTemp(refName, tempVal_f);
    if (!result) {
      const el = document.getElementById('pt-result-area');
      if (el) el.innerHTML = `<div class="alert-box alert-warning">${App.statusSvg('warning')}<span>${t('pt.no_data', '이 냉매의 P-T 데이터가 없습니다. CoolProp 엔진 로딩 중이면 잠시 후 다시 시도하거나, 기본 냉매(R-410A 등)를 선택하세요.')}</span></div>`;
      return;
    }

    const el = document.getElementById('pt-result-area');
    if (!el) return;

    const secondaryTemp = Settings.isMetric() ? `${tempVal_f.toFixed(1)}°F` : `${fToC(tempVal_f).toFixed(1)}°C`;
    const isZeo = info && info.isZeotropic;

    if (isZeo && result.bubble !== undefined && result.dew !== undefined) {
      el.innerHTML = `
        <div class="result-grid">
          <div class="result-box">
            <div class="result-value" style="color:var(--accent-orange)">${result.bubble.toFixed(1)}</div>
            <div class="result-label">${t('pt.result.bubble', 'Bubble 압력 (psig)')}</div>
          </div>
          <div class="result-box">
            <div class="result-value" style="color:var(--accent-cyan)">${result.dew.toFixed(1)}</div>
            <div class="result-label">${t('pt.result.dew', 'Dew 압력 (psig)')}</div>
          </div>
        </div>
        <div class="alert-box alert-info" style="margin-top:12px">
          ${App.statusSvg('info')}
          <span>${t('pt.result.note', `${tempVal}${Settings.tempLabel()} (${secondaryTemp}) 에서의 포화압력. 과열도는 Dew, 과냉도는 Bubble 사용.`)}${result.source ? ' [' + result.source + ']' : ''}</span>
        </div>`;
    } else {
      const pVal = result.pressure !== undefined ? result.pressure : result.bubble;
      el.innerHTML = `
        <div class="result-box" style="text-align:center">
          <div class="result-value" style="color:var(--accent-blue)">${pVal.toFixed(1)}</div>
          <div class="result-label">${t('pt.result.pressure', '포화압력')} (psig) @ ${tempVal}${Settings.tempLabel()} (${secondaryTemp})${result.source ? ' [' + result.source + ']' : ''}</div>
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
        el.innerHTML = `<div class="alert-box alert-warning">${App.statusSvg('warning')}<span>${t('pt.no_data', '이 냉매의 P-T 데이터가 없습니다. CoolProp 엔진 로딩 중이면 잠시 후 다시 시도하거나, 기본 냉매(R-410A 등)를 선택하세요.')}</span></div>`;
        return;
      }
      el.innerHTML = `
        <div class="result-grid">
          <div class="result-box">
            <div class="result-value" style="color:var(--accent-orange)">${Settings.displayTemp(bubbleTemp)}</div>
            <div class="result-label">${t('pt.result.bubble_temp', 'Bubble 온도')} (${Settings.isMetric() ? bubbleTemp.toFixed(1) + '°F' : fToC(bubbleTemp).toFixed(1) + '°C'})</div>
          </div>
          <div class="result-box">
            <div class="result-value" style="color:var(--accent-cyan)">${Settings.displayTemp(dewTemp)}</div>
            <div class="result-label">${t('pt.result.dew_temp', 'Dew 온도')} (${Settings.isMetric() ? dewTemp.toFixed(1) + '°F' : fToC(dewTemp).toFixed(1) + '°C'})</div>
          </div>
        </div>
        <div class="alert-box alert-info" style="margin-top:12px">
          ${App.statusSvg('info')}
          <span>${t('pt.result.zeotropic_note', `${pressVal} psig 에서의 포화온도. 비공비혼합물은 Bubble/Dew가 다릅니다.`)}</span>
        </div>`;
    } else {
      const satTemp = getTempFromPressure(refName, pressVal, 'pressure');
      if (satTemp === null) {
        el.innerHTML = `<div class="alert-box alert-warning">${App.statusSvg('warning')}<span>${t('pt.no_data', '이 냉매의 P-T 데이터가 없습니다. CoolProp 엔진 로딩 중이면 잠시 후 다시 시도하거나, 기본 냉매(R-410A 등)를 선택하세요.')}</span></div>`;
        return;
      }
      el.innerHTML = `
        <div class="result-box" style="text-align:center">
          <div class="result-value" style="color:var(--accent-blue)">${Settings.displayTemp(satTemp)}</div>
          <div class="result-label">${t('pt.sat_temp', '포화온도')} @ ${pressVal} psig (${Settings.isMetric() ? satTemp.toFixed(1) + '°F' : fToC(satTemp).toFixed(1) + '°C'})</div>
        </div>`;
    }
  }

  function calcSH() {
    const refName = getSelectedRef();
    const suctionP = parseFloat(document.getElementById('pt-sh-pressure')?.value);
    const suctionT = parseFloat(document.getElementById('pt-sh-temp')?.value);
    const el = document.getElementById('pt-sh-result');
    if (!el || isNaN(suctionP) || isNaN(suctionT)) return;
    const suctionT_f = Settings.userTempToF(suctionT);

    const result = calcSuperheat(refName, suctionP, suctionT_f);
    if (!result) {
      el.innerHTML = `<div class="alert-box alert-warning">${App.statusSvg('warning')}<span>${t('pt.calc_fail', '계산 불가 — 압력과 온도 값을 모두 입력했는지 확인하세요. 다른 냉매를 선택해도 됩니다.')}</span></div>`;
      return;
    }

    const status = getSuperheatStatus(result.superheat);
    const statusText = status === 'normal' ? t('status.normal', '정상') : status === 'caution' ? t('status.caution', '주의') : t('status.danger', '위험');

    el.innerHTML = `
      <div class="result-box" style="text-align:center">
        <div class="result-value ${status}">${Settings.displayDelta(result.superheat)}</div>
        <div class="result-label">${t('pt.superheat', '과열도')} (Superheat) ${App.statusSvg(status)} ${statusText}</div>
        <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:8px">
          ${t('pt.sat_temp', '포화온도')} (Dew): ${Settings.displayTemp(result.satTemp)}<br>
          ${t('pt.suction_actual', '석션라인 실측')}: ${suctionT}${Settings.tempLabel()}
        </div>
      </div>`;

    // Update accordion preview
    const shPreview = document.getElementById('sh-preview');
    if (shPreview) shPreview.innerHTML = `${Settings.displayDelta(result.superheat)} ${App.statusSvg(status)}`;
  }

  function calcSC() {
    const refName = getSelectedRef();
    const dischargeP = parseFloat(document.getElementById('pt-sc-pressure')?.value);
    const liquidT = parseFloat(document.getElementById('pt-sc-temp')?.value);
    const el = document.getElementById('pt-sc-result');
    if (!el || isNaN(dischargeP) || isNaN(liquidT)) return;
    const liquidT_f = Settings.userTempToF(liquidT);

    const result = calcSubcooling(refName, dischargeP, liquidT_f);
    if (!result) {
      el.innerHTML = `<div class="alert-box alert-warning">${App.statusSvg('warning')}<span>${t('pt.calc_fail', '계산 불가 — 압력과 온도 값을 모두 입력했는지 확인하세요. 다른 냉매를 선택해도 됩니다.')}</span></div>`;
      return;
    }

    const status = getSubcoolingStatus(result.subcooling);
    const statusText = status === 'normal' ? t('status.normal', '정상') : status === 'caution' ? t('status.caution', '주의') : t('status.danger', '위험');

    el.innerHTML = `
      <div class="result-box" style="text-align:center">
        <div class="result-value ${status}">${Settings.displayDelta(result.subcooling)}</div>
        <div class="result-label">${t('pt.subcooling', '과냉도')} (Subcooling) ${App.statusSvg(status)} ${statusText}</div>
        <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:8px">
          ${t('pt.sat_temp', '포화온도')} (Bubble): ${Settings.displayTemp(result.satTemp)}<br>
          ${t('pt.liquid_actual', '리퀴드라인 실측')}: ${liquidT}${Settings.tempLabel()}
        </div>
      </div>`;

    // Update accordion preview
    const scPreview = document.getElementById('sc-preview');
    if (scPreview) scPreview.innerHTML = `${Settings.displayDelta(result.subcooling)} ${App.statusSvg(status)}`;
  }

  // --- Target Superheat UI handler ---
  function calcTargetSH() {
    const iwbRaw = parseFloat(document.getElementById('pt-tsh-iwb')?.value);
    const oatRaw = parseFloat(document.getElementById('pt-tsh-oat')?.value);
    const actualRaw = document.getElementById('pt-tsh-actual')?.value;
    const el = document.getElementById('pt-targetsh-result');
    if (!el) return;

    if (isNaN(iwbRaw) || isNaN(oatRaw)) {
      el.innerHTML = `<div class="alert-box alert-warning">${App.statusSvg('warning')}<span>${t('pt.targetsh.missing_input', 'Enter both Indoor Wet Bulb and Outdoor Dry Bulb temperatures.')}</span></div>`;
      return;
    }

    const iwb_f = Settings.userTempToF(iwbRaw);
    const oat_f = Settings.userTempToF(oatRaw);
    const result = calcTargetSuperheat(iwb_f, oat_f);

    if (!result.isValid) {
      const showVal = result.targetSH !== null ? ` (${Settings.displayDelta(result.targetSH)})` : '';
      el.innerHTML = `<div class="alert-box alert-warning">${App.statusSvg('warning')}<span>${result.message}${showVal}</span></div>`;
      // Update preview
      const prev = document.getElementById('targetsh-preview');
      if (prev) prev.innerHTML = `— ${App.statusSvg('warning')}`;
      return;
    }

    // Build result HTML
    let html = '<div class="result-grid">';
    html += `<div class="result-box"><div class="result-value" style="color:var(--accent-blue)">${Settings.displayDelta(result.targetSH)}</div><div class="result-label">${t('pt.targetsh.result_target', 'Target Superheat')}</div></div>`;

    const hasActual = actualRaw !== '' && actualRaw !== undefined && !isNaN(parseFloat(actualRaw));
    if (hasActual) {
      const actualSH_f = Settings.userDeltaToF(parseFloat(actualRaw));
      html += `<div class="result-box"><div class="result-value">${Settings.displayDelta(actualSH_f)}</div><div class="result-label">${t('pt.targetsh.result_actual', 'Actual Superheat')}</div></div>`;
    }
    html += '</div>';

    // Verdict (only when actual provided)
    if (hasActual) {
      const actualSH_f = Settings.userDeltaToF(parseFloat(actualRaw));
      const ev = evaluateSuperheat(actualSH_f, result.targetSH);
      const sign = ev.diff >= 0 ? '+' : '';
      let cls, icon, label, desc;
      if (ev.verdict === 'pass') {
        cls = 'normal'; icon = App.statusSvg('normal');
        label = t('pt.targetsh.pass', 'PASS');
        desc = t('pt.targetsh.pass_desc', 'Within ±5°F tolerance');
      } else if (ev.verdict === 'fail_high') {
        cls = 'danger'; icon = App.statusSvg('danger');
        label = t('pt.targetsh.fail_high', 'HIGH — Possible undercharge');
        desc = t('pt.targetsh.fail_high_desc', 'Actual superheat is too high. Check refrigerant charge, airflow, or metering device.');
      } else {
        cls = 'danger'; icon = App.statusSvg('danger');
        label = t('pt.targetsh.fail_low', 'LOW — Possible overcharge');
        desc = t('pt.targetsh.fail_low_desc', 'Actual superheat is too low. Check for overcharge or restricted airflow.');
      }
      html += `<div class="result-box ${cls}" style="margin-top:12px;text-align:center">`;
      html += `<div style="font-size:var(--text-lg);font-weight:700">${icon} ${label}</div>`;
      html += `<div style="font-size:var(--text-sm);margin-top:4px">${t('pt.targetsh.diff', 'Difference')}: ${sign}${Settings.displayDelta(ev.diff)}</div>`;
      html += `<div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:4px">${desc}</div>`;
      html += '</div>';

      // Preview
      const prev = document.getElementById('targetsh-preview');
      if (prev) prev.innerHTML = `${Settings.displayDelta(result.targetSH)} ${icon}`;
    } else {
      // No actual — just show target
      const prev = document.getElementById('targetsh-preview');
      if (prev) prev.innerHTML = `${Settings.displayDelta(result.targetSH)}`;
    }

    // Reference note
    html += `<div class="alert-box alert-info" style="margin-top:12px">${App.statusSvg('info')}<span>${t('pt.targetsh.formula_note', 'ACCA formula: (3×IWB − OAT − 80) / 2. Valid: IWB 50–76°F, OAT 55–115°F. Tolerance ±5°F.')}</span></div>`;

    el.innerHTML = html;
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
    calcTargetSuperheat,
    evaluateSuperheat,
    getSuperheatStatus,
    getSubcoolingStatus,
    fToC,
    cToF,
    initUI,
    onEngineReady,
    populateRefDropdown
  };
})();

// ===================================================
// HVAC Pulse — CoolProp WASM Engine Wrapper
// NIST-grade thermodynamic calculations
// Fallback to legacy hardcoded data when unavailable
// ===================================================

const CoolPropEngine = (() => {

  let ready = false;
  let initPromise = null;
  let cpInstance = null; // Emscripten module instance

  // --- Initialization ---
  // coolprop.js is loaded as ES Module via <script type="module"> in index.html.
  // It sets window.CoolPropModuleFactory and fires 'coolprop-factory-ready'.
  // We wait for the factory, then call it to get the WASM instance.
  function init() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        // Wait for the ES module loader to set window.CoolPropModuleFactory
        const factory = await waitForFactory(20000);
        if (!factory) {
          console.warn('CoolProp: Factory not available (module failed to load)');
          return false;
        }

        console.log('CoolProp: Factory loaded, initializing WASM...');

        // Call the Emscripten factory function to get module instance
        cpInstance = await factory();

        // Verify PropsSI is available (embind-registered)
        if (typeof cpInstance.PropsSI === 'function') {
          ready = true;
          console.log('CoolProp: WASM engine initialized (PropsSI ready)');
          return true;
        }

        // Some builds expose via cwrap
        if (typeof cpInstance.cwrap === 'function') {
          try {
            cpInstance.PropsSI = cpInstance.cwrap('PropsSI', 'number',
              ['string', 'string', 'number', 'string', 'number', 'string']);
            ready = true;
            console.log('CoolProp: WASM engine initialized (cwrap)');
            return true;
          } catch (e) {
            console.warn('CoolProp: cwrap failed', e);
          }
        }

        // List available functions for debugging
        const fns = Object.keys(cpInstance).filter(k => typeof cpInstance[k] === 'function').slice(0, 20);
        console.warn('CoolProp: PropsSI not found. Available:', fns.join(', '));
        return false;
      } catch (e) {
        console.warn('CoolProp: Init failed —', e.message || e);
        return false;
      }
    })();

    return initPromise;
  }

  // Wait for window.CoolPropModuleFactory to be set by the ES module loader
  function waitForFactory(timeout) {
    return new Promise((resolve) => {
      if (typeof window.CoolPropModuleFactory === 'function') {
        resolve(window.CoolPropModuleFactory);
        return;
      }

      let resolved = false;

      function onReady() {
        if (resolved) return;
        resolved = true;
        window.removeEventListener('coolprop-factory-ready', onReady);
        resolve(window.CoolPropModuleFactory || null);
      }

      window.addEventListener('coolprop-factory-ready', onReady);

      // Also poll in case the event already fired
      const timer = setInterval(() => {
        if (typeof window.CoolPropModuleFactory === 'function') {
          clearInterval(timer);
          onReady();
        }
      }, 500);

      setTimeout(() => {
        clearInterval(timer);
        if (!resolved) {
          resolved = true;
          window.removeEventListener('coolprop-factory-ready', onReady);
          resolve(null);
        }
      }, timeout);
    });
  }

  function isReady() { return ready; }

  // --- Safe PropsSI wrapper ---
  function propsSI(output, name1, val1, name2, val2, fluid) {
    if (!ready || !cpInstance) return null;
    try {
      const result = cpInstance.PropsSI(output, name1, val1, name2, val2, fluid);
      if (!isFinite(result) || isNaN(result)) return null;
      return result;
    } catch (e) {
      console.warn(`CoolProp error: PropsSI('${output}','${name1}',${val1},'${name2}',${val2},'${fluid}')`, e);
      return null;
    }
  }

  // =============================================
  // Unit Conversion Utilities
  // =============================================
  function psigToPa(psig) { return (psig + 14.696) * 6894.757; }
  function paToPsig(pa) { return (pa / 6894.757) - 14.696; }
  function fahrenheitToK(f) { return (f - 32) * 5 / 9 + 273.15; }
  function kelvinToF(k) { return (k - 273.15) * 9 / 5 + 32; }
  function fahrenheitToC(f) { return (f - 32) * 5 / 9; }
  function celsiusToF(c) { return c * 9 / 5 + 32; }

  // =============================================
  // Core Thermodynamic Functions
  // =============================================

  // Saturation temperature from pressure (Bubble Point, Q=0)
  function getSatTempBubble(coolpropName, pressure_psig) {
    const p_pa = psigToPa(pressure_psig);
    const t_k = propsSI('T', 'P', p_pa, 'Q', 0, coolpropName);
    return t_k !== null ? kelvinToF(t_k) : null;
  }

  // Saturation temperature from pressure (Dew Point, Q=1)
  function getSatTempDew(coolpropName, pressure_psig) {
    const p_pa = psigToPa(pressure_psig);
    const t_k = propsSI('T', 'P', p_pa, 'Q', 1, coolpropName);
    return t_k !== null ? kelvinToF(t_k) : null;
  }

  // Saturation pressure from temperature (Bubble Point)
  function getSatPressureBubble(coolpropName, temp_f) {
    const t_k = fahrenheitToK(temp_f);
    const p_pa = propsSI('P', 'T', t_k, 'Q', 0, coolpropName);
    return p_pa !== null ? paToPsig(p_pa) : null;
  }

  // Saturation pressure from temperature (Dew Point)
  function getSatPressureDew(coolpropName, temp_f) {
    const t_k = fahrenheitToK(temp_f);
    const p_pa = propsSI('P', 'T', t_k, 'Q', 1, coolpropName);
    return p_pa !== null ? paToPsig(p_pa) : null;
  }

  // Superheat calculation
  function calcSuperheat(coolpropName, suctionPressure_psig, suctionLineTemp_f) {
    const satTemp = getSatTempDew(coolpropName, suctionPressure_psig);
    if (satTemp === null) return null;
    return {
      superheat: parseFloat((suctionLineTemp_f - satTemp).toFixed(1)),
      satTemp: parseFloat(satTemp.toFixed(1))
    };
  }

  // Subcooling calculation
  function calcSubcooling(coolpropName, dischargePressure_psig, liquidLineTemp_f) {
    const satTemp = getSatTempBubble(coolpropName, dischargePressure_psig);
    if (satTemp === null) return null;
    return {
      subcooling: parseFloat((satTemp - liquidLineTemp_f).toFixed(1)),
      satTemp: parseFloat(satTemp.toFixed(1))
    };
  }

  // =============================================
  // Additional Properties
  // =============================================

  // Enthalpy (kJ/kg) at given T and P
  function getEnthalpy(coolpropName, temp_f, pressure_psig) {
    const t_k = fahrenheitToK(temp_f);
    const p_pa = psigToPa(pressure_psig);
    const h = propsSI('H', 'T', t_k, 'P', p_pa, coolpropName);
    return h !== null ? h / 1000 : null; // J/kg → kJ/kg
  }

  // Entropy (kJ/kg·K) at given T and P
  function getEntropy(coolpropName, temp_f, pressure_psig) {
    const t_k = fahrenheitToK(temp_f);
    const p_pa = psigToPa(pressure_psig);
    const s = propsSI('S', 'T', t_k, 'P', p_pa, coolpropName);
    return s !== null ? s / 1000 : null;
  }

  // Critical point info
  function getCriticalPoint(coolpropName) {
    const tc = propsSI('Tcrit', '', 0, '', 0, coolpropName);
    const pc = propsSI('Pcrit', '', 0, '', 0, coolpropName);
    const dc = propsSI('rhocrit', '', 0, '', 0, coolpropName);
    if (tc === null || pc === null) return null;
    return {
      temp_f: kelvinToF(tc),
      pressure_psig: paToPsig(pc),
      density: dc
    };
  }

  // Normal boiling point (at 1 atm)
  function getBoilingPoint(coolpropName) {
    const t_k = propsSI('T', 'P', 101325, 'Q', 0, coolpropName);
    return t_k !== null ? kelvinToF(t_k) : null;
  }

  // =============================================
  // P-H Diagram Data Generation
  // =============================================

  // Generate saturation curve data for P-H diagram
  function generatePHCurve(coolpropName, numPoints) {
    if (!ready) return null;
    numPoints = numPoints || 80;

    const critical = getCriticalPoint(coolpropName);
    if (!critical) return null;

    const bp = getBoilingPoint(coolpropName);
    if (bp === null) return null;

    const tMin_f = bp - 60;
    const tMax_f = critical.temp_f - 2;
    const step = (tMax_f - tMin_f) / numPoints;

    const saturatedLiquid = [];
    const saturatedVapor = [];

    for (let t = tMin_f; t <= tMax_f; t += step) {
      const t_k = fahrenheitToK(t);
      try {
        // Saturated liquid (Q=0)
        const pLiq = propsSI('P', 'T', t_k, 'Q', 0, coolpropName);
        const hLiq = propsSI('H', 'T', t_k, 'Q', 0, coolpropName);
        if (pLiq !== null && hLiq !== null) {
          saturatedLiquid.push({ h: hLiq / 1000, p: pLiq / 1000, t: t });
        }

        // Saturated vapor (Q=1)
        const pVap = propsSI('P', 'T', t_k, 'Q', 1, coolpropName);
        const hVap = propsSI('H', 'T', t_k, 'Q', 1, coolpropName);
        if (pVap !== null && hVap !== null) {
          saturatedVapor.push({ h: hVap / 1000, p: pVap / 1000, t: t });
        }
      } catch (e) { continue; }
    }

    return { saturatedLiquid, saturatedVapor, critical };
  }

  // Calculate 4-point refrigeration cycle on P-H diagram
  function calculateCyclePoints(coolpropName, suctionP_psig, dischargeP_psig, superheat_f, subcooling_f) {
    if (!ready) return null;

    try {
      const sP = psigToPa(suctionP_psig);
      const dP = psigToPa(dischargeP_psig);
      const etaComp = 0.70; // Assumed compressor isentropic efficiency

      // Point 1: Evaporator outlet (superheated vapor) — suction
      const tEvapDew_k = propsSI('T', 'P', sP, 'Q', 1, coolpropName);
      if (tEvapDew_k === null) return null;
      const t1_k = tEvapDew_k + (superheat_f * 5 / 9);
      const h1 = propsSI('H', 'T', t1_k, 'P', sP, coolpropName);
      const s1 = propsSI('S', 'T', t1_k, 'P', sP, coolpropName);
      if (h1 === null || s1 === null) return null;

      // Point 2: Compressor discharge (isentropic + efficiency)
      const h2s = propsSI('H', 'S', s1, 'P', dP, coolpropName);
      if (h2s === null) return null;
      const h2 = h1 + (h2s - h1) / etaComp;
      const t2_k = propsSI('T', 'H', h2, 'P', dP, coolpropName);

      // Point 3: Condenser outlet (subcooled liquid)
      const tCondBubble_k = propsSI('T', 'P', dP, 'Q', 0, coolpropName);
      if (tCondBubble_k === null) return null;
      const t3_k = tCondBubble_k - (subcooling_f * 5 / 9);
      const h3 = propsSI('H', 'T', t3_k, 'P', dP, coolpropName);
      if (h3 === null) return null;

      // Point 4: Expansion valve outlet (isenthalpic)
      const h4 = h3;
      const t4_k = propsSI('T', 'H', h4, 'P', sP, coolpropName);

      const refrigEffect = (h1 - h4) / 1000;
      const compWork = (h2 - h1) / 1000;
      const cop = refrigEffect / compWork;

      return {
        point1: { h: h1 / 1000, p: sP / 1000, t: kelvinToF(t1_k), label: '흡입 (과열증기)' },
        point2: { h: h2 / 1000, p: dP / 1000, t: t2_k !== null ? kelvinToF(t2_k) : null, label: '토출 (고온고압)' },
        point3: { h: h3 / 1000, p: dP / 1000, t: kelvinToF(t3_k), label: '응축기출구 (과냉액)' },
        point4: { h: h4 / 1000, p: sP / 1000, t: t4_k !== null ? kelvinToF(t4_k) : null, label: '증발기입구 (혼합)' },
        cop: parseFloat(cop.toFixed(2)),
        refrigEffect: parseFloat(refrigEffect.toFixed(1)),
        compWork: parseFloat(compWork.toFixed(1))
      };
    } catch (e) {
      console.warn('CoolProp cycle calc error:', e);
      return null;
    }
  }

  // =============================================
  // Simulated fault cycle shift for P-H overlay
  // Uses fault signature ph_effect data
  // =============================================
  function simulateFaultCycle(normalCycle, faultPhEffect) {
    if (!normalCycle || !faultPhEffect) return null;

    // Shift factors (approximate visual offset in kJ/kg and kPa)
    const H_SHIFT = 15;  // kJ/kg
    const P_SHIFT_UP = 1.15;   // 15% pressure increase
    const P_SHIFT_DOWN = 0.85; // 15% pressure decrease

    function shiftPoint(point, shifts) {
      const newH = shifts.h === 'increase' ? point.h + H_SHIFT :
                   shifts.h === 'decrease' ? point.h - H_SHIFT : point.h;
      const newP = shifts.p === 'increase' ? point.p * P_SHIFT_UP :
                   shifts.p === 'decrease' ? point.p * P_SHIFT_DOWN :
                   shifts.p === 'increase_slight' ? point.p * 1.07 :
                   shifts.p === 'decrease_slight' ? point.p * 0.93 : point.p;
      return { ...point, h: newH, p: newP };
    }

    return {
      point1: shiftPoint(normalCycle.point1, faultPhEffect.point1),
      point2: shiftPoint(normalCycle.point2, faultPhEffect.point2),
      point3: shiftPoint(normalCycle.point3, faultPhEffect.point3),
      point4: shiftPoint(normalCycle.point4, faultPhEffect.point4)
    };
  }

  // =============================================
  // Public API
  // =============================================
  return {
    init,
    isReady,

    // Core calculations
    getSatTempBubble,
    getSatTempDew,
    getSatPressureBubble,
    getSatPressureDew,
    calcSuperheat,
    calcSubcooling,

    // Additional properties
    getEnthalpy,
    getEntropy,
    getCriticalPoint,
    getBoilingPoint,

    // P-H diagram
    generatePHCurve,
    calculateCyclePoints,
    simulateFaultCycle,

    // Unit conversions
    psigToPa,
    paToPsig,
    fahrenheitToK,
    kelvinToF,
    fahrenheitToC,
    celsiusToF
  };
})();

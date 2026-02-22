// ===================================================
// HVAC Pulse — Diagnostic Report
// Hospital-style diagnostic report generation
// Academic data integration + Share/Print/Save
// ===================================================

const DiagnosticReport = (() => {

  // --- Equipment types ---
  const EQUIPMENT_TYPES = {
    split_ac:  { name_kr: '스플릿 에어컨', name_en: 'Split Air Conditioner', icon: '🏠' },
    package:   { name_kr: '패키지 유닛', name_en: 'Packaged Unit', icon: '📦' },
    vrf:       { name_kr: 'VRF / 멀티 시스템', name_en: 'VRF / Multi System', icon: '🏢' },
    chiller:   { name_kr: '칠러', name_en: 'Chiller', icon: '🏗️' },
    ptac:      { name_kr: 'PTAC / 윈도우형', name_en: 'PTAC / Window Unit', icon: '🪟' },
    walk_in:   { name_kr: '워크인 쿨러/프리저', name_en: 'Walk-in Cooler/Freezer', icon: '❄️' },
    reach_in:  { name_kr: '리치인 냉장고', name_en: 'Reach-in Refrigerator', icon: '🧊' },
    rooftop:   { name_kr: '루프탑 유닛 (RTU)', name_en: 'Rooftop Unit', icon: '🏭' },
    other:     { name_kr: '기타', name_en: 'Other', icon: '🔧' }
  };

  // --- Prescription (repair steps) mapping ---
  const PRESCRIPTIONS = {
    lowCharge: [
      '흡입관 서리 라인 위치 확인 — 서리가 정상보다 뒤로 후퇴',
      '사이트글라스 기포 확인 — 다수 기포 = 부족 확인',
      '전자식/비눗물 누설 탐지 — 모든 접합부(플레어, 밸브, 용접부)',
      '누설 부위 수리 (플레어 재작업 또는 브레이징)',
      '진공 작업 (500미크론 이하 확인)',
      '정량 충전 후 과열도/과냉도 재확인'
    ],
    overcharge: [
      '명판 충전량 확인 — 실제 충전량과 비교',
      '과잉 냉매를 회수 탱크로 회수',
      '리퀴드백 징후 확인 — 흡입관/컴프레서 결로',
      '무게 기반 재충전 (절대 압력만으로 판단 금지)',
      '오일 레벨 확인 (냉매 과잉 시 오일 희석 위험)',
      '과열도/과냉도 정상 범위 확인 후 완료'
    ],
    meteringRestriction: [
      '필터 드라이어 전후 온도차 확인: >3°F → 막힘',
      'TXV 입구 스트레이너 점검/청소',
      'TXV 반응 테스트 — 센싱벌브에 손으로 열 가하기',
      '외부 이퀄라이저 라인 막힘/꺾임 점검',
      '사이트글라스로 전후 기포 비교',
      'TXV 교체 시 동일 톤수/냉매타입 확인'
    ],
    compressorWeak: [
      '컴프레서 운전 전류 측정 (RLA 대비 %)',
      '흡입/토출 압력 비교 — 압축비 확인',
      '밸브 플레이트 누설 테스트 (펌프 다운 후 압력 유지)',
      '모터 권선 저항 측정 (3상: 균등, 단상: C=R+S)',
      '절연 저항 메거 테스트 (>1MΩ)',
      '오일 분석 — 산도/금속 입자 확인'
    ],
    txvOverfeed: [
      'TXV 과열도 조정 (시계방향 = 닫힘)',
      '센싱벌브 위치 확인 — 12시~4시 위치 정상 (6시 금지)',
      '센싱벌브 단열 상태 확인 — 외기 영향 차단',
      '에어플로우 정상 확인 (ABC 원칙)',
      '액백 징후 점검 — 흡입관 결로/결빙',
      '조정 후 과열도 안정 확인 (5~15°F)'
    ],
    lowAirflow: [
      '에어필터 상태 확인 — 교체 또는 청소',
      '증발기 코일 청결도 점검 — 코일 세정 필요 여부',
      '블로워 모터/팬 작동 확인 — 전류, 회전 방향',
      '덕트 연결부 이탈/누설 점검',
      '정압(TESP) 측정 — 0.3~0.7 inWC 정상',
      '리턴/서플라이 그릴 장애물 제거'
    ],
    normal: [
      '정기 유지보수 일정 확인',
      '에어필터 교체 주기 확인',
      '응축기 코일 청결 상태 점검',
      '배수 드레인 라인 확인'
    ]
  };

  // --- Academic references by diagKey ---
  const ACADEMIC_REFS = {
    lowCharge: 'Bulgurcu (2014) IJR, ASHRAE RP-1043, Cheung & Braun (2012) Purdue',
    overcharge: 'Bulgurcu (2014) IJR, ASHRAE RP-1043, LBNL FDD Framework',
    meteringRestriction: 'Sporlan/Parker TXV Guide, Bulgurcu (2014), LBNL DOE',
    compressorWeak: 'ASHRAE RP-1043, Copeland DLT Curves, LBNL FDD',
    txvOverfeed: 'Sporlan 12 Solutions, Bulgurcu (2014), AC Service Tech',
    lowAirflow: 'HVAC School (Bryan Orr), ASHRAE 62.1, LBNL FDD',
    normal: 'ASHRAE Handbook — HVAC Applications'
  };

  // Checklist localStorage key prefix
  const CHECKLIST_KEY = 'hvacr_report_checklist_';

  // Last generated report for sharing
  let _lastReport = null;


  // ============================================================
  // REPORT GENERATION
  // ============================================================

  /**
   * Generate a diagnostic report from any diagnosis result.
   * Compatible with DiagnosticEngine, CycleVisualization, NIST results.
   *
   * @param {object} opts
   * @param {string} opts.equipType - Equipment type key
   * @param {string} opts.refrigerant - Refrigerant ID (e.g. 'R-410A')
   * @param {object} opts.diagResult - Diagnosis result from any engine
   * @param {object} [opts.measurements] - Raw measurement inputs
   */
  function generateReport(opts) {
    const { equipType, refrigerant, diagResult, measurements } = opts;
    if (!diagResult) return null;

    const now = new Date();
    const lang = (typeof I18n !== 'undefined' && I18n.getLang) ? I18n.getLang() : 'ko';
    const localeMap = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', pt: 'pt-BR', ar: 'ar-SA', hi: 'hi-IN' };
    const timestamp = now.toLocaleString(localeMap[lang] || 'ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    // Equipment info
    const equip = EQUIPMENT_TYPES[equipType] || EQUIPMENT_TYPES.other;

    // Refrigerant info from catalog
    let refInfo = null;
    if (typeof RefrigerantCatalog !== 'undefined') {
      refInfo = RefrigerantCatalog.getById(refrigerant);
    }
    const refDisplay = refInfo
      ? `${refrigerant} (${refInfo.type || ''}, ${refInfo.safety || ''})`
      : refrigerant || t('report.ref_unspecified', '미지정');

    // Determine diagKey
    const diagKey = diagResult.diagKey ||
      (typeof AdvancedDiagnostic !== 'undefined' ? AdvancedDiagnostic.getDiagKey(diagResult) : null) ||
      'normal';

    // Build measurement rows
    const measureRows = buildMeasurementTable(diagResult, measurements);

    // Primary diagnosis
    const primary = buildPrimaryDiagnosis(diagKey, diagResult);

    // Secondary candidates (differential)
    const secondaryCandidates = buildSecondaryCandidates(diagKey, diagResult);

    // Prescription (field tips)
    const prescription = buildPrescription(diagKey);

    // Efficiency (CoolProp)
    const efficiency = buildEfficiency(refrigerant, diagResult, measurements);

    // Build report object
    const report = {
      id: `RPT-${now.getTime()}`,
      timestamp,
      dateObj: now,
      equip,
      equipType,
      refrigerant,
      refDisplay,
      measureRows,
      diagKey,
      primary,
      secondaryCandidates,
      prescription,
      efficiency,
      academicRef: ACADEMIC_REFS[diagKey] || '',
      rawDiagResult: diagResult
    };

    _lastReport = report;
    return report;
  }


  // ============================================================
  // HVAC Normal Range Constants (°F-based)
  // ============================================================
  const NORMAL_RANGES = {
    SH:   { type: 'range', lo: 8, hi: 14, get display() { return Settings.isMetric() ? `${(8*5/9).toFixed(0)}~${(14*5/9).toFixed(0)}°C` : '8~14°F'; } },
    SC:   { type: 'range', lo: 8, hi: 14, get display() { return Settings.isMetric() ? `${(8*5/9).toFixed(0)}~${(14*5/9).toFixed(0)}°C` : '8~14°F'; } },
    DLT:  { type: 'max', val: 225, get display() { return Settings.isMetric() ? `<${((225-32)*5/9).toFixed(0)}°C` : '<225°F'; } },
    DT:   { type: 'range', lo: 15, hi: 22, get display() { return Settings.isMetric() ? `${(15*5/9).toFixed(0)}~${(22*5/9).toFixed(0)}°C` : '15~22°F'; } },
    DTD:  { type: 'range', lo: 30, hi: 40, get display() { return Settings.isMetric() ? `${(30*5/9).toFixed(0)}~${(40*5/9).toFixed(0)}°C` : '30~40°F'; } },
    CTOA: { type: 'range', lo: 15, hi: 30, get display() { return Settings.isMetric() ? `${(15*5/9).toFixed(0)}~${(30*5/9).toFixed(0)}°C` : '15~30°F'; } },
    CR:   { type: 'max', val: 12, display: '<12:1' }
  };

  // ============================================================
  // MEASUREMENT TABLE BUILDER
  // ============================================================
  function buildMeasurementTable(diagResult, measurements) {
    const rows = [];
    const m = measurements || {};
    const d = diagResult || {};

    // Helper
    function addRow(label, value, unit, normalRange, key) {
      if (value == null) return;
      let status = null;
      // Status check uses raw °F values against °F thresholds
      if (normalRange) {
        if (normalRange.type === 'range') {
          if (value >= normalRange.lo && value <= normalRange.hi) status = 'normal';
          else if (value < normalRange.lo) status = 'low';
          else status = 'high';
        } else if (normalRange.type === 'max') {
          status = value > normalRange.val ? 'high' : 'normal';
        }
      }
      // Convert temp values for display
      const isDelta = ['SH', 'SC', 'DT', 'DTD', 'CTOA'].includes(key);
      const isTemp = isDelta || ['DLT', 'SLT', 'LLT', 'Tret', 'Tsup', 'Tamb'].includes(key);
      let dv = value, du = unit;
      if (isTemp && Settings.isMetric()) {
        dv = isDelta ? value * 5 / 9 : (value - 32) * 5 / 9;
        du = '°C';
      }
      rows.push({ label, value: dv, unit: du, normalRange: normalRange ? normalRange.display : null, status, key });
    }

    // Pressures
    const Ps = m.Ps ?? m.suctionPressure ?? d.suctionPressure ?? null;
    const Pd = m.Pd ?? m.dischargePressure ?? d.dischargePressure ?? null;
    addRow(t('report.m.suction_p', '흡입압력 (Ps)'), Ps, 'psig', null, 'Ps');
    addRow(t('report.m.discharge_p', '토출압력 (Pd)'), Pd, 'psig', null, 'Pd');

    // Superheat
    const sh = d.superheat ?? m.SH ?? null;
    addRow(t('report.m.superheat', '과열도 (SH)'), sh, Settings.tempLabel(), NORMAL_RANGES.SH, 'SH');

    // Subcooling
    const sc = d.subcooling ?? m.SC ?? null;
    addRow(t('report.m.subcooling', '과냉도 (SC)'), sc, Settings.tempLabel(), NORMAL_RANGES.SC, 'SC');

    // DLT
    const dlt = m.DLT ?? d.dlt ?? d.dischargeTemp ?? null;
    addRow(t('report.m.dlt', '토출온도 (DLT)'), dlt, Settings.tempLabel(), NORMAL_RANGES.DLT, 'DLT');

    // Suction line temp
    const slt = m.suctionLineTemp ?? d.suctionLineTemp ?? null;
    addRow(t('report.m.slt', '석션라인 온도'), slt, Settings.tempLabel(), null, 'SLT');

    // Liquid line temp
    const llt = m.liquidLineTemp ?? d.liquidLineTemp ?? null;
    addRow(t('report.m.llt', '리퀴드라인 온도'), llt, Settings.tempLabel(), null, 'LLT');

    // Return air
    const tret = m.Tret ?? d.returnAirTemp ?? null;
    addRow(t('report.m.return_air', '리턴공기 온도'), tret, Settings.tempLabel(), null, 'Tret');

    // Supply air
    const tsup = m.Tsup ?? null;
    addRow(t('report.m.supply_air', '공급공기 온도'), tsup, Settings.tempLabel(), null, 'Tsup');

    // Outdoor
    const tamb = m.Tamb ?? d.outdoorTemp ?? null;
    addRow(t('report.m.outdoor', '외기온도'), tamb, Settings.tempLabel(), null, 'Tamb');

    // Delta T
    const dt = m.DT ?? (tret != null && tsup != null ? tret - tsup : null);
    addRow(t('report.m.delta_t', 'ΔT (공기온도차)'), dt, Settings.tempLabel(), NORMAL_RANGES.DT, 'DT');

    // DTD
    if (d.dtd != null) addRow('DTD', d.dtd, Settings.tempLabel(), NORMAL_RANGES.DTD, 'DTD');

    // CTOA
    if (d.ctoa != null) addRow('CTOA', d.ctoa, Settings.tempLabel(), NORMAL_RANGES.CTOA, 'CTOA');

    // Compression ratio
    if (d.compressionRatio != null) addRow(t('report.m.comp_ratio', '압축비'), d.compressionRatio, ':1', NORMAL_RANGES.CR, 'CR');

    // Glide compensation note
    if (d.glideInfo) {
      const g = d.glideInfo;
      const shH = 20 + g.adjustment, scH = 18 + g.adjustment;
      const note = t('diag.glide.report_note', 'Zeotropic glide {glide} — thresholds adjusted by +{adj} (SH>{shHigh}, SC>{scHigh}).')
        .replace('{glide}', Settings.displayDelta(g.glide))
        .replace('{adj}', Settings.displayDelta(g.adjustment))
        .replace('{shHigh}', Settings.displayDelta(shH))
        .replace('{scHigh}', Settings.displayDelta(scH));
      rows.push({ label: t('diag.glide.medium', '비공비 냉매 글라이드'), value: note, unit: '', status: 'info', key: 'GLIDE' });
    }

    return rows.filter(r => r.value != null);
  }


  // ============================================================
  // PRIMARY DIAGNOSIS BUILDER
  // ============================================================
  function buildPrimaryDiagnosis(diagKey, diagResult) {
    // Severity
    let severity = diagResult.severity || null;
    if (!severity && typeof AdvancedDiagnostic !== 'undefined' && diagKey !== 'normal') {
      severity = AdvancedDiagnostic.determineSeverity(
        diagKey,
        diagResult.superheat,
        diagResult.subcooling,
        diagResult.compressionRatio
      );
    }

    // Fault info from FaultSignatures
    let faultInfo = null;
    let faultId = null;
    if (typeof FaultSignatures !== 'undefined') {
      faultId = FaultSignatures.mapDiagKeyToFault(diagKey);
      if (faultId) faultInfo = FaultSignatures.getFault(faultId);
    }

    // Evidence list
    const evidence = buildEvidence(diagKey, diagResult, faultInfo);

    // Confidence score (heuristic based on how far from threshold)
    const confidence = calcConfidence(diagKey, diagResult);

    // Signature arrows
    let signatures = null;
    if (faultInfo && faultInfo.signatures) {
      signatures = faultInfo.signatures;
    }

    // Differential hint
    let differentialHint = null;
    if (typeof AdvancedDiagnostic !== 'undefined') {
      const hints = AdvancedDiagnostic.getDifferentialHints(
        diagResult.shClass, diagResult.scClass,
        diagResult.superheat, diagResult.subcooling
      );
      if (hints && hints.length > 0) {
        differentialHint = hints;
      }
    }

    // Diagnosis display
    const DIAG_NAMES = {
      normal:              { title: t('report.diag.normal', '시스템 정상'), level: 'normal' },
      lowCharge:           { title: t('report.diag.lowCharge', '냉매 부족 (누설 의심)'), level: 'danger' },
      overcharge:          { title: t('report.diag.overcharge', '냉매 과충전'), level: 'danger' },
      meteringRestriction: { title: t('report.diag.meteringRestriction', '계량장치 제한 (TXV/필터)'), level: 'caution' },
      compressorWeak:      { title: t('report.diag.compressorWeak', '컴프레서 불량 (효율 저하)'), level: 'danger' },
      txvOverfeed:         { title: t('report.diag.txvOverfeed', 'TXV 오버피딩'), level: 'caution' },
      lowAirflow:          { title: t('report.diag.lowAirflow', '에어플로우 부족'), level: 'caution' }
    };

    const diagDisplay = DIAG_NAMES[diagKey] || DIAG_NAMES.normal;

    return {
      diagKey,
      title: diagDisplay.title,
      level: diagDisplay.level,
      severity,
      confidence,
      evidence,
      signatures,
      differentialHint,
      faultInfo,
      faultId
    };
  }


  // ============================================================
  // EVIDENCE BUILDER
  // ============================================================
  function buildEvidence(diagKey, d, faultInfo) {
    const items = [];

    if (diagKey === 'normal') {
      items.push(t('report.ev.sh_sc_normal', '과열도와 과냉도가 모두 정상 범위 내'));
      return items;
    }

    // SH evidence
    if (d.superheat != null) {
      const shClass = d.shClass || (d.superheat > 20 ? 'high' : d.superheat < 5 ? 'low' : 'normal');
      const shVal = Settings.displayDelta(d.superheat);
      if (shClass === 'high') {
        items.push(t('report.ev.sh_high', `과열도 {val} — 정상(${NORMAL_RANGES.SH.display}) 대비 현저히 높음`).replace('{val}', shVal));
      } else if (shClass === 'low') {
        items.push(t('report.ev.sh_low', '과열도 {val} — 정상 대비 낮음 (액냉매 과다)').replace('{val}', shVal));
      } else {
        items.push(t('report.ev.sh_normal', '과열도 {val} — 정상 범위').replace('{val}', shVal));
      }
    }

    // SC evidence
    if (d.subcooling != null) {
      const scClass = d.scClass || (d.subcooling > 18 ? 'high' : d.subcooling < 5 ? 'low' : 'normal');
      const scVal = Settings.displayDelta(d.subcooling);
      if (scClass === 'high') {
        items.push(t('report.ev.sc_high', `과냉도 {val} — 정상(${NORMAL_RANGES.SC.display}) 대비 높음 (고압측 냉매 과다)`).replace('{val}', scVal));
      } else if (scClass === 'low') {
        items.push(t('report.ev.sc_low', '과냉도 {val} — 정상 대비 현저히 낮음').replace('{val}', scVal));
      } else {
        items.push(t('report.ev.sc_normal', '과냉도 {val} — 정상 범위').replace('{val}', scVal));
      }
    }

    // DLT evidence
    const dlt = d.dlt || d.dischargeTemp;
    if (dlt != null && dlt > 225) {
      const dltVal = typeof dlt === 'number' ? dlt.toFixed(0) : dlt;
      items.push(t('report.ev.dlt_high', '토출온도 {val} — 압축기 과열 징후').replace('{val}', Settings.displayTemp(dlt)));
    }

    // Compression ratio
    if (d.compressionRatio != null && d.compressionRatio > 12) {
      items.push(t('report.ev.cr_high', '압축비 {val}:1 — 과부하 (>12:1)').replace('{val}', d.compressionRatio.toFixed(1)));
    }

    // P-H effect from academic data
    if (faultInfo && faultInfo.ph_effect) {
      items.push(`${t('report.ev.ph_effect', 'P-H 효과')}: ${(I18n.getLang() !== 'ko' && faultInfo.ph_effect.desc_en) ? faultInfo.ph_effect.desc_en : faultInfo.ph_effect.desc_kr}`);
    }

    return items;
  }


  // ============================================================
  // CONFIDENCE CALCULATION (heuristic)
  // ============================================================
  function calcConfidence(diagKey, d) {
    if (diagKey === 'normal') return 95;
    if (d.superheat == null || d.subcooling == null) return 60;

    const sh = d.superheat;
    const sc = d.subcooling;
    let base = 70;

    // How strongly the pattern matches
    const patterns = {
      lowCharge:           { sh: 'high', sc: 'low' },
      overcharge:          { sh: 'low',  sc: 'high' },
      meteringRestriction: { sh: 'high', sc: 'high' },
      compressorWeak:      { sh: 'low',  sc: 'low' },
      txvOverfeed:         { sh: 'low',  sc: 'normal' },
      lowAirflow:          { sh: 'high', sc: 'normal' }
    };

    const pattern = patterns[diagKey];
    if (!pattern) return 65;

    // SH deviation strength
    if (pattern.sh === 'high' && sh > 25) base += 8;
    else if (pattern.sh === 'high' && sh > 20) base += 4;
    else if (pattern.sh === 'low' && sh < 2) base += 8;
    else if (pattern.sh === 'low' && sh < 5) base += 4;

    // SC deviation strength
    if (pattern.sc === 'high' && sc > 22) base += 8;
    else if (pattern.sc === 'high' && sc > 18) base += 4;
    else if (pattern.sc === 'low' && sc < 3) base += 8;
    else if (pattern.sc === 'low' && sc < 5) base += 4;
    else if (pattern.sc === 'normal' && sc >= 8 && sc <= 14) base += 6;

    // Zeotropic glide penalty
    if (d.glideInfo) {
      if (d.glideInfo.level === 'high') base -= 10;
      else if (d.glideInfo.level === 'medium') base -= 5;
    }

    return Math.min(Math.max(base, 50), 95);
  }


  // ============================================================
  // SECONDARY CANDIDATES
  // ============================================================
  function buildSecondaryCandidates(diagKey, d) {
    if (diagKey === 'normal') return [];

    // Generate plausible secondary diagnoses based on proximity
    const candidates = [];
    const sh = d.superheat;
    const sc = d.subcooling;
    if (sh == null || sc == null) return [];

    const allDiags = {
      lowCharge:           { title: t('report.diag2.lowCharge', '냉매 부족'), shExpect: 'high', scExpect: 'low' },
      overcharge:          { title: t('report.diag2.overcharge', '냉매 과충전'), shExpect: 'low', scExpect: 'high' },
      meteringRestriction: { title: t('report.diag2.meteringRestriction', 'TXV/필터 막힘'), shExpect: 'high', scExpect: 'high' },
      compressorWeak:      { title: t('report.diag2.compressorWeak', '컴프레서 불량'), shExpect: 'low', scExpect: 'low' },
      txvOverfeed:         { title: t('report.diag2.txvOverfeed', 'TXV 오버피딩'), shExpect: 'low', scExpect: 'normal' },
      lowAirflow:          { title: t('report.diag2.lowAirflow', '에어플로우 부족'), shExpect: 'high', scExpect: 'normal' }
    };

    // Remove primary
    delete allDiags[diagKey];

    // Score each secondary based on proximity
    for (const [key, diag] of Object.entries(allDiags)) {
      let score = 0;
      const shClass = sh > 20 ? 'high' : sh < 5 ? 'low' : 'normal';
      const scClass = sc > 18 ? 'high' : sc < 5 ? 'low' : 'normal';

      if (diag.shExpect === shClass) score += 40;
      else if ((diag.shExpect === 'high' && shClass === 'normal' && sh > 12) ||
               (diag.shExpect === 'low' && shClass === 'normal' && sh < 8) ||
               (diag.shExpect === 'normal' && (shClass === 'high' && sh < 25 || shClass === 'low' && sh > 3))) {
        score += 20;
      }

      if (diag.scExpect === scClass) score += 40;
      else if ((diag.scExpect === 'high' && scClass === 'normal' && sc > 12) ||
               (diag.scExpect === 'low' && scClass === 'normal' && sc < 8) ||
               (diag.scExpect === 'normal' && (scClass === 'high' && sc < 22 || scClass === 'low' && sc > 3))) {
        score += 20;
      }

      if (score >= 30) {
        candidates.push({ key, title: diag.title, score });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 2);
  }


  // ============================================================
  // PRESCRIPTION BUILDER
  // ============================================================
  function buildPrescription(diagKey) {
    const steps = PRESCRIPTIONS[diagKey] || PRESCRIPTIONS.normal;
    // Load checked state from localStorage
    const storageKey = CHECKLIST_KEY + diagKey;
    let checked = {};
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) checked = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    return steps.map((step, i) => ({
      index: i,
      text: t(`report.rx.${diagKey}_${i}`, step),
      checked: !!checked[i]
    }));
  }


  // ============================================================
  // EFFICIENCY BUILDER (CoolProp)
  // ============================================================
  function buildEfficiency(refrigerant, diagResult, measurements) {
    if (typeof CoolPropEngine === 'undefined' || !CoolPropEngine.isReady()) return null;

    const m = measurements || {};
    const d = diagResult || {};
    const Ps = m.Ps ?? m.suctionPressure ?? d.suctionPressure ?? null;
    const Pd = m.Pd ?? m.dischargePressure ?? d.dischargePressure ?? null;
    const sh = d.superheat ?? m.SH ?? null;
    const sc = d.subcooling ?? m.SC ?? null;

    if (Ps == null || Pd == null || sh == null || sc == null) return null;

    let coolpropName = null;
    if (typeof RefrigerantCatalog !== 'undefined') {
      coolpropName = RefrigerantCatalog.getCoolPropName(refrigerant);
    }
    if (!coolpropName) {
      const map = {
        'R-22': 'R22', 'R-410A': 'R410A', 'R-32': 'R32', 'R-454B': 'R454B',
        'R-134a': 'R134a', 'R-404A': 'R404A', 'R-407C': 'R407C', 'R-290': 'Propane'
      };
      coolpropName = map[refrigerant] || refrigerant;
    }

    const cycle = CoolPropEngine.calculateCyclePoints(coolpropName, Ps, Pd, sh, sc);
    if (!cycle) return null;

    // Estimate normal COP for comparison
    const normalCOP = 3.5; // Typical residential AC COP
    const copPct = ((cycle.cop / normalCOP) * 100).toFixed(0);
    const copDrop = cycle.cop < normalCOP
      ? t('report.eff.cop_drop', '정상 대비 약 {pct}% 저하').replace('{pct}', (100 - parseFloat(copPct)).toFixed(0))
      : t('report.eff.cop_ok', '양호');

    return {
      cop: cycle.cop,
      refrigEffect: cycle.refrigEffect,
      compWork: cycle.compWork,
      copPct: parseFloat(copPct),
      copNote: copDrop
    };
  }


  // ============================================================
  // REPORT RENDERING (HTML)
  // ============================================================
  function renderReport(report) {
    if (!report) return '';

    const severityDisplay = getSeverityDisplay(report.primary.severity);

    return `
    <div class="diag-report" id="diag-report-${report.id}">

      <!-- HEADER -->
      <div class="dr-header">
        <div class="dr-logo">🔬</div>
        <div class="dr-title">${t('report.title', 'HVAC Pulse 시스템 진단서')}</div>
        <div class="dr-subtitle">AI-Assisted Diagnostic Report</div>
      </div>

      <div class="dr-divider"></div>

      <!-- META INFO -->
      <div class="dr-meta">
        <div class="dr-meta-row"><span class="dr-meta-label">${t('report.date', '진단일시')}</span><span class="dr-meta-value">${report.timestamp}</span></div>
        <div class="dr-meta-row"><span class="dr-meta-label">${t('report.equip_type', '장비유형')}</span><span class="dr-meta-value">${report.equip.icon} ${(I18n.getLang() !== 'ko' && report.equip.name_en) ? report.equip.name_en : report.equip.name_kr}</span></div>
        <div class="dr-meta-row"><span class="dr-meta-label">${t('report.refrigerant', '냉매')}</span><span class="dr-meta-value">${report.refDisplay}</span></div>
      </div>

      <!-- MEASUREMENTS TABLE -->
      <div class="dr-section">
        <div class="dr-section-title">${t('report.sec.measurements', '측정 결과')}</div>
        <table class="dr-table">
          <thead>
            <tr><th>${t('report.th.item', '항목')}</th><th>${t('report.th.measured', '측정값')}</th><th>${t('report.th.normal_range', '정상범위')}</th><th>${t('report.th.verdict', '판정')}</th></tr>
          </thead>
          <tbody>
            ${report.measureRows.map(r => `
              <tr class="${r.status === 'high' || r.status === 'low' ? 'dr-row-abnormal' : ''}">
                <td>${r.label}</td>
                <td class="dr-mono">${typeof r.value === 'number' ? r.value.toFixed(1) : r.value} ${r.unit}</td>
                <td class="dr-mono dr-muted">${r.normalRange || '─'}</td>
                <td>${renderStatus(r.status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- DIAGNOSIS -->
      <div class="dr-section">
        <div class="dr-section-title">${t('report.sec.diagnosis', '진단 소견')}</div>

        ${severityDisplay}

        <div class="dr-diagnosis-main">
          <div class="dr-diag-icon">${App.diagIcon(report.primary.level)}</div>
          <div class="dr-diag-body">
            <div class="dr-diag-label">${t('report.primary_label', '1차 소견')}</div>
            <div class="dr-diag-title">${report.primary.title}</div>
            <div class="dr-diag-confidence">${t('report.confidence', '신뢰도')}: ${report.primary.confidence}%</div>
          </div>
        </div>

        <!-- Evidence -->
        <div class="dr-evidence">
          <div class="dr-evidence-label">${t('report.evidence_label', '근거:')}</div>
          <ul class="dr-evidence-list">
            ${report.primary.evidence.map(e => `<li>${e}</li>`).join('')}
          </ul>
          ${report.academicRef ? `<div class="dr-academic-ref">📚 ${report.academicRef}</div>` : ''}
        </div>

        ${renderSignatureArrows(report.primary.signatures)}

        ${renderDifferentialHint(report.primary.differentialHint)}

        <!-- Secondary candidates -->
        ${report.secondaryCandidates.length > 0 ? `
          <div class="dr-secondary">
            ${report.secondaryCandidates.map((c, i) => `
              <div class="dr-secondary-item">
                <span class="dr-secondary-rank">${t('report.secondary_label', '{n}차 소견').replace('{n}', i + 2)}</span>
                <span class="dr-secondary-title">${c.title}</span>
                <span class="dr-secondary-score">(${c.score}%)</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- PRESCRIPTION -->
      <div class="dr-section">
        <div class="dr-section-title">${t('report.sec.prescription', '처방 (수리 절차)')}</div>
        <div class="dr-checklist" data-diagkey="${report.diagKey}">
          ${report.prescription.map((step, i) => `
            <label class="dr-check-item ${step.checked ? 'checked' : ''}">
              <input type="checkbox" name="dr-step-${i}" ${step.checked ? 'checked' : ''} data-step="${i}" onchange="DiagnosticReport.toggleCheck('${report.diagKey}', ${i}, this.checked)">
              <span class="dr-check-box">${step.checked ? App.statusSvg('normal') : '☐'}</span>
              <span class="dr-check-text">${i + 1}. ${step.text}</span>
            </label>
          `).join('')}
        </div>
        <div class="dr-check-status" id="dr-check-status-${report.id}"></div>
      </div>

      <!-- EFFICIENCY -->
      ${report.efficiency ? `
        <div class="dr-section">
          <div class="dr-section-title">${t('report.sec.efficiency', '시스템 효율')}</div>
          <div class="dr-efficiency-grid">
            <div class="dr-eff-item">
              <div class="dr-eff-value dr-mono">${report.efficiency.cop.toFixed(2)}</div>
              <div class="dr-eff-label">COP</div>
              <div class="dr-eff-note">${report.efficiency.copNote}</div>
            </div>
            <div class="dr-eff-item">
              <div class="dr-eff-value dr-mono">${report.efficiency.refrigEffect.toFixed(1)}</div>
              <div class="dr-eff-label">${t('report.eff.refrig_effect', '냉동효과 (kJ/kg)')}</div>
            </div>
            <div class="dr-eff-item">
              <div class="dr-eff-value dr-mono">${report.efficiency.compWork.toFixed(1)}</div>
              <div class="dr-eff-label">${t('report.eff.comp_work', '압축일 (kJ/kg)')}</div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- FOOTER -->
      <div class="dr-footer">
        <div class="dr-disclaimer">
          ⚖️ ${t('report.disclaimer', '본 진단은 참고용이며 최종 판단은 현장 기술자의 전문적 판단에 따릅니다.')}
        </div>
        <div class="dr-credits">
          <span>📊 ${t('report.credit_coolprop', '물성계산: CoolProp (MIT License) NIST급 정밀도')}</span>
          <span>📚 ${t('report.credit_academic', '진단근거: ASHRAE RP-1043, Bulgurcu(2014) IJR, Purdue, LBNL FDD')}</span>
        </div>
      </div>

      <!-- ACTION BUTTONS -->
      <div class="dr-actions">
        <button class="dr-action-btn" onclick="DiagnosticReport.shareReport()">
          <span>📤</span><span>${t('report.share_btn', '공유')}</span>
        </button>
        <button class="dr-action-btn" onclick="DiagnosticReport.printReport()">
          <span>🖨️</span><span>${t('report.print', 'PDF / 인쇄')}</span>
        </button>
        <button class="dr-action-btn" onclick="DiagnosticReport.saveToHistory()">
          <span>💾</span><span>${t('report.save_btn', '기록 저장')}</span>
        </button>
      </div>
    </div>`;
  }


  // ============================================================
  // RENDER HELPERS
  // ============================================================

  function renderStatus(status) {
    if (!status) return '<span class="dr-status-none">─</span>';
    if (status === 'normal') return `<span class="dr-status-normal">${App.statusSvg('normal')} ${t('report.status.normal', '정상')}</span>`;
    if (status === 'high') return `<span class="dr-status-high">⬆ ${t('report.status.high', '비정상 ↑')}</span>`;
    if (status === 'low') return `<span class="dr-status-low">⬇ ${t('report.status.low', '비정상 ↓')}</span>`;
    return '<span class="dr-status-none">─</span>';
  }

  function getSeverityDisplay(severity) {
    if (!severity) return '';

    const levels = (typeof FaultSignatures !== 'undefined') ?
      FaultSignatures.SEVERITY_LEVELS : {
        SL1: { label_kr: t('report.sev.SL1', '경미'), color: '#FFD700', svgStatus: 'caution' },
        SL2: { label_kr: t('report.sev.SL2', '주의'), color: '#FFA500', svgStatus: 'warning' },
        SL3: { label_kr: t('report.sev.SL3', '심각'), color: '#FF4500', svgStatus: 'danger' },
        SL4: { label_kr: t('report.sev.SL4', '위험'), color: '#FF0000', svgStatus: 'danger' }
      };

    const sl = levels[severity.level];
    if (!sl) return '';

    return `
      <div class="dr-severity dr-severity-${severity.level.toLowerCase()}">
        <span class="dr-severity-icon">${App.statusSvg(sl.svgStatus || (severity.level === 'SL1' ? 'caution' : severity.level === 'SL2' ? 'warning' : 'danger'))}</span>
        <span class="dr-severity-level">${severity.level} — ${sl.label_kr}</span>
        ${severity.info?.desc_kr ? `<span class="dr-severity-desc">${(I18n.getLang() !== 'ko' && severity.info.desc_en) ? severity.info.desc_en : severity.info.desc_kr}</span>` : ''}
      </div>`;
  }

  function renderSignatureArrows(signatures) {
    if (!signatures) return '';

    const arrowMap = { up: '↑', down: '↓', same: '→' };
    const colorClass = { up: 'dr-sig-up', down: 'dr-sig-down', same: 'dr-sig-same' };
    const labels = {
      suction_superheat: t('report.sig.suction_superheat', '과열도'),
      suction_pressure: t('report.sig.suction_pressure', '흡입압'),
      discharge_pressure: t('report.sig.discharge_pressure', '토출압'),
      subcooling: t('report.sig.subcooling', '과냉도'),
      discharge_temp: t('report.sig.discharge_temp', '토출온도'),
      compressor_current: t('report.sig.compressor_current', '전류'),
      cop: 'COP'
    };

    let html = `<div class="dr-signatures"><div class="dr-sig-label">${t('report.sig.title', '시그니처 패턴:')}</div><div class="dr-sig-grid">`;
    for (const [key, sig] of Object.entries(signatures)) {
      const label = labels[key] || key;
      const arrow = arrowMap[sig.direction] || '?';
      const cls = colorClass[sig.direction] || '';
      html += `<div class="dr-sig-item ${cls}"><span class="dr-sig-arrow">${arrow}</span><span>${label}</span></div>`;
    }
    html += '</div></div>';
    return html;
  }

  function renderDifferentialHint(hints) {
    if (!hints || hints.length === 0) return '';

    let html = `<div class="dr-differential"><div class="dr-diff-label">📋 ${t('report.diff.title', '감별진단:')}</div>`;
    hints.forEach(hint => {
      html += `<div class="dr-diff-text">${hint.symptom_kr || ''}</div>`;
      if (hint.faults) {
        hint.faults.forEach(f => {
          html += `<div class="dr-diff-item">${f.key_kr || ''}</div>`;
        });
      }
    });
    html += '</div>';
    return html;
  }


  // ============================================================
  // CHECKLIST MANAGEMENT
  // ============================================================
  function toggleCheck(diagKey, stepIndex, checked) {
    const storageKey = CHECKLIST_KEY + diagKey;
    let state = {};
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) state = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    state[stepIndex] = checked;
    localStorage.setItem(storageKey, JSON.stringify(state));

    // Update visual
    const checkItem = document.querySelector(`.dr-check-item input[data-step="${stepIndex}"]`);
    if (checkItem) {
      const label = checkItem.closest('.dr-check-item');
      const box = label.querySelector('.dr-check-box');
      if (checked) {
        label.classList.add('checked');
        box.innerHTML = App.statusSvg('normal');
      } else {
        label.classList.remove('checked');
        box.textContent = '☐';
      }
    }

    // Check if all done
    const steps = PRESCRIPTIONS[diagKey] || [];
    const allChecked = steps.every((_, i) => state[i]);
    const statusEl = document.querySelector('[id^="dr-check-status"]');
    if (statusEl) {
      if (allChecked && steps.length > 0) {
        statusEl.innerHTML = `<div class="dr-check-complete">${App.statusSvg('normal')} ${t('report.check_complete', '수리 완료 — 측정값을 다시 확인하세요')}</div>`;
      } else {
        statusEl.innerHTML = '';
      }
    }
  }


  // ============================================================
  // SHARE / PRINT / SAVE
  // ============================================================

  function shareReport() {
    if (!_lastReport) {
      if (typeof App !== 'undefined') App.showToast(t('report.no_report', '공유할 진단서가 없습니다.'), 'warning');
      return;
    }

    const text = buildShareText(_lastReport);

    if (navigator.share) {
      navigator.share({
        title: t('report.title', 'HVAC Pulse 시스템 진단서'),
        text: text
      }).catch(() => {
        // Fallback: copy to clipboard
        copyToClipboard(text);
      });
    } else {
      copyToClipboard(text);
    }
  }

  function buildShareText(report) {
    let text = `🔬 ${t('report.title', 'HVAC Pulse 시스템 진단서')}\n`;
    text += `━━━━━━━━━━━━━━━━━━━\n`;
    text += `${t('report.date', '진단일시')}: ${report.timestamp}\n`;
    text += `${t('report.equip_type', '장비유형')}: ${(I18n.getLang() !== 'ko' && report.equip.name_en) ? report.equip.name_en : report.equip.name_kr}\n`;
    text += `${t('report.refrigerant', '냉매')}: ${report.refDisplay}\n\n`;

    text += `━━━ ${t('report.share.measurements', '측정결과')} ━━━\n`;
    report.measureRows.forEach(r => {
      const val = typeof r.value === 'number' ? r.value.toFixed(1) : r.value;
      const status = r.status === 'high' ? '▲' : r.status === 'low' ? '▼' : r.status === 'normal' ? '✓' : '─';
      text += `${r.label}: ${val}${r.unit} ${status}\n`;
    });

    text += `\n━━━ ${t('report.share.diagnosis', '진단소견')} ━━━\n`;
    const levelMark = report.primary.level === 'normal' ? '✓' : report.primary.level === 'danger' ? '✗' : '△';
    text += `${levelMark} ${report.primary.title}\n`;
    text += `${t('report.confidence', '신뢰도')}: ${report.primary.confidence}%\n`;

    if (report.primary.severity) {
      text += `${t('report.severity', '심각도')}: ${report.primary.severity.level}\n`;
    }

    if (report.efficiency) {
      text += `\n━━━ ${t('report.share.efficiency', '효율')} ━━━\n`;
      text += `COP: ${report.efficiency.cop.toFixed(2)} (${report.efficiency.copNote})\n`;
    }

    text += `\n※ ${t('report.share.disclaimer', '본 진단은 참고용입니다.')}\n`;
    text += `📊 CoolProp(NIST) · 📚 ASHRAE RP-1043, Bulgurcu(2014)\n`;
    return text;
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof App !== 'undefined') App.showToast(t('report.clipboard_copied', '진단서가 클립보드에 복사되었습니다.'), 'success');
    }).catch(() => {
      // Ultimate fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (typeof App !== 'undefined') App.showToast(t('report.clipboard_copied', '진단서가 클립보드에 복사되었습니다.'), 'success');
    });
  }

  function printReport() {
    // Add print class to body so @media print CSS can target it
    document.body.classList.add('printing-report');
    window.print();
    // Remove after print dialog closes
    setTimeout(() => document.body.classList.remove('printing-report'), 1000);
  }

  function saveToHistory() {
    if (!_lastReport) {
      if (typeof App !== 'undefined') App.showToast(t('report.no_save', '저장할 진단 결과가 없습니다.'), 'warning');
      return;
    }
    if (typeof DataBridge !== 'undefined') {
      DataBridge.saveDiagToServiceRecord(_lastReport.rawDiagResult);
    }
  }


  // ============================================================
  // MODAL: Open report from any diagnostic result
  // ============================================================
  function openReportModal(diagResult, refrigerant, measurements) {
    // Create modal if not exists
    let modal = document.getElementById('diag-report-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'diag-report-modal';
      modal.className = 'dr-modal';
      modal.innerHTML = `
        <div class="dr-modal-overlay" onclick="DiagnosticReport.closeModal()"></div>
        <div class="dr-modal-content">
          <button class="dr-modal-close" onclick="DiagnosticReport.closeModal()">✕</button>
          <div class="dr-modal-body" id="diag-report-modal-body"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    // Show equipment selector first
    const body = document.getElementById('diag-report-modal-body');
    body.innerHTML = renderEquipSelector(diagResult, refrigerant, measurements);
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function renderEquipSelector(diagResult, refrigerant, measurements) {
    // Store params for later use
    window._reportParams = { diagResult, refrigerant, measurements };

    let html = `
      <div class="dr-equip-selector">
        <div class="dr-equip-title">📋 ${t('report.gen_title', '진단서 생성')}</div>
        <div class="dr-equip-subtitle">${t('report.equip_select', '장비 유형을 선택하세요')}</div>
        <div class="dr-equip-grid">`;

    for (const [key, equip] of Object.entries(EQUIPMENT_TYPES)) {
      html += `
        <button class="dr-equip-btn" onclick="DiagnosticReport.generateFromSelector('${key}')">
          <span class="dr-equip-icon">${equip.icon}</span>
          <span class="dr-equip-name">${(I18n.getLang() !== 'ko' && equip.name_en) ? equip.name_en : equip.name_kr}</span>
        </button>`;
    }

    html += `</div></div>`;
    return html;
  }

  function generateFromSelector(equipType) {
    const params = window._reportParams;
    if (!params) return;

    const report = generateReport({
      equipType,
      refrigerant: params.refrigerant,
      diagResult: params.diagResult,
      measurements: params.measurements
    });

    if (!report) {
      if (typeof App !== 'undefined') App.showToast(t('report.gen_fail', '진단서 생성에 실패했습니다.'), 'error');
      return;
    }

    const body = document.getElementById('diag-report-modal-body');
    body.innerHTML = renderReport(report);

    // Scroll to top of modal
    body.scrollTop = 0;
  }

  function closeModal() {
    const modal = document.getElementById('diag-report-modal');
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }


  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    generateReport,
    renderReport,
    openReportModal,
    closeModal,
    generateFromSelector,
    toggleCheck,
    shareReport,
    printReport,
    saveToHistory,
    getLastReport: () => _lastReport
  };

})();

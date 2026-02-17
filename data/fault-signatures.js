// ===================================================
// HVAC Pulse — Academic Fault Signatures DB
// Sources: Bulgurcu (2014), ASHRAE RP-1043, LBNL FDD
// ===================================================
//
// References:
//   [1] Bulgurcu, H. (2014). Fault diagnosis of vapor compression
//       refrigeration systems using P-H diagram. International
//       Journal of Refrigeration, 40, 194–202.
//   [2] Comstock, M.C. & Braun, J.E. (1999). Development of analysis
//       tools for the evaluation of fault detection and diagnostics
//       in chillers. ASHRAE RP-1043 Final Report.
//   [3] LBNL (Lawrence Berkeley National Laboratory). FDD for
//       Residential and Small Commercial HVAC Systems —
//       DOE 4-level severity framework.
//   [4] Cheung, H. & Braun, J.E. (2012). Inverse modeling for
//       vapor compression equipment. International Refrigeration
//       and Air Conditioning Conference, Purdue.
// ===================================================

const FaultSignatures = (() => {

  // ═══════════════════════════════════════════════════
  // Severity Level Definitions (LBNL FDD 4-Level System)
  // ═══════════════════════════════════════════════════
  // Based on DOE / LBNL residential & small-commercial
  // FDD severity classification framework [3].
  // SL1: cosmetic / minor efficiency loss (<5% COP drop)
  // SL2: moderate performance degradation (5–15% COP drop)
  // SL3: serious — equipment damage risk, >15% COP drop
  // SL4: critical — imminent failure or safety hazard
  // ═══════════════════════════════════════════════════

  const SEVERITY_LEVELS = {
    SL1: {
      id: 'SL1',
      label_kr: '경미',
      label_en: 'Minor',
      color: '#FFD700',
      icon: '🟡',
      desc_kr: '효율 약간 저하 (<5% COP 감소). 다음 정기점검 시 조치.',
      desc_en: 'Minor efficiency loss (<5% COP). Address at next scheduled maintenance.'
    },
    SL2: {
      id: 'SL2',
      label_kr: '주의',
      label_en: 'Moderate',
      color: '#FFA500',
      icon: '🟠',
      desc_kr: '성능 저하 체감 (5~15% COP 감소). 1~2주 내 점검 권장.',
      desc_en: 'Noticeable performance drop (5–15% COP). Inspect within 1–2 weeks.'
    },
    SL3: {
      id: 'SL3',
      label_kr: '심각',
      label_en: 'Serious',
      color: '#FF4500',
      icon: '🔴',
      desc_kr: '장비 손상 위험 (>15% COP 감소). 즉시 점검 필요.',
      desc_en: 'Equipment damage risk (>15% COP). Immediate inspection required.'
    },
    SL4: {
      id: 'SL4',
      label_kr: '위험',
      label_en: 'Critical',
      color: '#FF0000',
      icon: '⛔',
      desc_kr: '장비 파손 임박 또는 안전 위험. 즉시 운전 중단 권고.',
      desc_en: 'Imminent failure or safety hazard. Shut down immediately.'
    }
  };


  // ═══════════════════════════════════════════════════
  // Section 1: Vapor Compression Common Faults
  // ═══════════════════════════════════════════════════
  // 7 canonical faults derived from Bulgurcu (2014) P-H
  // diagram analysis and AC Service Tech cross-diagnostic
  // matrix. Each fault includes:
  //   - Parameter signatures (direction of deviation)
  //   - LBNL severity thresholds
  //   - P-H diagram effect description [1]
  //   - Field-verified troubleshooting tips
  // ═══════════════════════════════════════════════════

  const VAPOR_COMPRESSION_FAULTS = {

    // ─────────────────────────────────────────────
    // FAULT 1: Refrigerant Undercharge / Leakage
    // ─────────────────────────────────────────────
    // Bulgurcu (2014): Evaporator pressure (Pe) drops,
    // superheat zone expands on P-H diagram. Cheung &
    // Braun (2012): COP degrades proportionally to charge
    // deficit percentage.
    // ─────────────────────────────────────────────
    refrigerant_low: {
      id: 'FAULT_REF_LOW',
      name_kr: '냉매 부족 (누설)',
      name_en: 'Refrigerant Undercharge / Leakage',
      diagKey: 'lowCharge',

      signatures: {
        suction_superheat:  { direction: 'up',   magnitude: 'high',   desc_kr: '과열도 증가', desc_en: 'Superheat rises' },
        suction_pressure:   { direction: 'down', magnitude: 'high',   desc_kr: '흡입압력 하락', desc_en: 'Suction pressure drops' },
        discharge_pressure: { direction: 'down', magnitude: 'slight', desc_kr: '토출압력 하락 (약간)', desc_en: 'Discharge pressure drops (slight)' },
        subcooling:         { direction: 'down', magnitude: 'high',   desc_kr: '과냉도 감소', desc_en: 'Subcooling decreases' },
        discharge_temp:     { direction: 'up',   magnitude: 'high',   desc_kr: '토출온도 상승', desc_en: 'Discharge temp rises' },
        compressor_current: { direction: 'down', magnitude: 'medium', desc_kr: '압축기 전류 감소', desc_en: 'Compressor current decreases' },
        cop:                { direction: 'down', magnitude: 'high',   desc_kr: 'COP 저하', desc_en: 'COP decreases' }
      },

      severity_thresholds: {
        metric: 'superheat',
        unit: '°F',
        SL1: { min: 16, max: 22, desc_kr: '경미 — 효율 약간 저하, 과열도 경미 상승' },
        SL2: { min: 22, max: 28, desc_kr: '주의 — 과열도 비정상, 성능 저하 체감' },
        SL3: { min: 28, max: 35, desc_kr: '심각 — 압축기 과열 위험, 즉시 점검 필요' },
        SL4: { min: 35, max: 999, desc_kr: '위험 — 압축기 손상 임박, 운전 중단 권고' }
      },

      ph_effect: {
        desc_kr: '증발압력(Pe) 하락 → P-H 사이클이 아래로 이동. 과열 영역 확장. 증발기 출구에서 냉매가 완전 기화 후에도 계속 가열되어 건도(quality) 1.0 지점이 왼쪽으로 이동.',
        desc_en: 'Evaporator pressure (Pe) drops → cycle shifts down on P-H diagram. Superheat region expands as refrigerant fully vaporizes earlier in the evaporator.',
        evap_pressure: 'decrease',
        cond_pressure: 'slight_decrease',
        superheat_region: 'expand',
        subcool_region: 'shrink'
      },

      field_tips_kr: [
        '흡입관 서리 라인 확인 — 서리가 정상보다 뒤로 후퇴',
        '사이트글라스 확인 — 기포 다수 발생',
        '누설 탐지기(전자식/비눗물)로 접합부 전수 검사',
        '플레어 너트, 서비스밸브, 용접 조인트 집중 점검',
        '누설 수리 후 진공 잡고 정량(무게 기반) 충전',
        '"Gas-n-Go" 금지 — 반드시 누설을 먼저 찾아 수리'
      ],
      field_tips_en: [
        'Check frost line on suction pipe — retreats toward compressor',
        'Inspect sight glass — excessive bubbling indicates undercharge',
        'Leak detect all joints with electronic sniffer or soap bubbles',
        'Focus on flare nuts, service valves, and brazed joints',
        'After repair: evacuate, then charge by weight per nameplate',
        'Never "Gas-n-Go" — always find and repair the leak first'
      ]
    },

    // ─────────────────────────────────────────────
    // FAULT 2: Refrigerant Overcharge
    // ─────────────────────────────────────────────
    // Bulgurcu (2014): Both Pe and Pc rise, cycle shifts
    // upward. Subcool region expands, liquid backs up into
    // condenser. Cheung & Braun (2012): Risk of liquid
    // slugging at compressor increases proportionally.
    // ─────────────────────────────────────────────
    refrigerant_high: {
      id: 'FAULT_REF_HIGH',
      name_kr: '냉매 과충전',
      name_en: 'Refrigerant Overcharge',
      diagKey: 'overcharge',

      signatures: {
        suction_superheat:  { direction: 'down', magnitude: 'medium', desc_kr: '과열도 감소', desc_en: 'Superheat decreases' },
        suction_pressure:   { direction: 'up',   magnitude: 'medium', desc_kr: '흡입압력 상승', desc_en: 'Suction pressure rises' },
        discharge_pressure: { direction: 'up',   magnitude: 'high',   desc_kr: '토출압력 상승', desc_en: 'Discharge pressure rises' },
        subcooling:         { direction: 'up',   magnitude: 'high',   desc_kr: '과냉도 증가', desc_en: 'Subcooling increases' },
        discharge_temp:     { direction: 'down', magnitude: 'slight', desc_kr: '토출온도 하락 (약간)', desc_en: 'Discharge temp drops (slight)' },
        compressor_current: { direction: 'up',   magnitude: 'medium', desc_kr: '압축기 전류 증가', desc_en: 'Compressor current increases' },
        cop:                { direction: 'down', magnitude: 'medium', desc_kr: 'COP 저하', desc_en: 'COP decreases' }
      },

      severity_thresholds: {
        metric: 'subcooling',
        unit: '°F',
        SL1: { min: 12, max: 15, desc_kr: '경미 — 과냉도 약간 높음, 효율 소폭 저하' },
        SL2: { min: 15, max: 20, desc_kr: '주의 — 과냉도 비정상, 고압 상승 시작' },
        SL3: { min: 20, max: 25, desc_kr: '심각 — 리퀴드백 위험 증가, 컴프레서 부하 과대' },
        SL4: { min: 25, max: 999, desc_kr: '위험 — 리퀴드 슬러깅 임박, 즉시 냉매 회수 필요' }
      },

      ph_effect: {
        desc_kr: '증발압력(Pe)·응축압력(Pc) 모두 상승 → P-H 사이클이 위로 이동. 과냉 영역 확장, 응축기 내 액냉매 축적. 압축일(W) 증가.',
        desc_en: 'Both evaporator and condenser pressures rise → cycle shifts upward on P-H diagram. Subcool region expands with liquid backing up in condenser. Compression work (W) increases.',
        evap_pressure: 'increase',
        cond_pressure: 'increase',
        superheat_region: 'shrink',
        subcool_region: 'expand'
      },

      field_tips_kr: [
        '명판 충전량 확인 후 실제 충전량과 비교',
        '과잉 냉매를 회수 탱크로 회수',
        '무게 기반 재충전 — 절대 압력만으로 판단 금지',
        '리퀴드백 징후 확인: 흡입관 결로, 컴프레서 하우징 결로',
        '컴프레서 오일 레벨 확인 (냉매 과잉 시 오일 희석 위험)',
        '시스템 세정 후 진공 → 정량 충전이 가장 확실'
      ],
      field_tips_en: [
        'Compare nameplate charge vs actual charge amount',
        'Recover excess refrigerant into recovery tank',
        'Recharge by weight — never judge by pressure alone',
        'Check for liquid flood-back: sweating suction line, sweating compressor housing',
        'Verify compressor oil level (overcharge dilutes oil)',
        'For best results: recover all, evacuate, weigh-in exact charge'
      ]
    },

    // ─────────────────────────────────────────────
    // FAULT 3: Condenser Fouling / Restricted Airflow
    // ─────────────────────────────────────────────
    // Bulgurcu (2014): Pc rises while Pe stays roughly
    // the same. DLT rises. KEY differential vs non-
    // condensable gas: subcooling DROPS with fouling
    // (less effective heat rejection area), but RISES
    // with non-condensable gas (gas occupies condenser
    // volume, pushing liquid into subcool region).
    // ─────────────────────────────────────────────
    condenser_fouling: {
      id: 'FAULT_COND_FOUL',
      name_kr: '응축기 오염 / 기류 부족',
      name_en: 'Condenser Fouling / Restricted Airflow',
      diagKey: null, // No direct match in existing DiagnosticEngine matrix

      signatures: {
        suction_superheat:  { direction: 'up',     magnitude: 'slight', desc_kr: '과열도 약간 증가', desc_en: 'Superheat rises slightly' },
        suction_pressure:   { direction: 'same',   magnitude: 'none',   desc_kr: '흡입압력 변화 적음', desc_en: 'Suction pressure relatively unchanged' },
        discharge_pressure: { direction: 'up',     magnitude: 'high',   desc_kr: '토출압력 상승', desc_en: 'Discharge pressure rises significantly' },
        subcooling:         { direction: 'down',   magnitude: 'medium', desc_kr: '과냉도 감소', desc_en: 'Subcooling decreases' },
        discharge_temp:     { direction: 'up',     magnitude: 'high',   desc_kr: '토출온도 상승', desc_en: 'Discharge temp rises' },
        compressor_current: { direction: 'up',     magnitude: 'medium', desc_kr: '압축기 전류 증가', desc_en: 'Compressor current increases' },
        cop:                { direction: 'down',   magnitude: 'high',   desc_kr: 'COP 저하', desc_en: 'COP decreases' }
      },

      severity_thresholds: {
        metric: 'discharge_pressure_pct',
        unit: '%',
        desc_kr: '정상 대비 토출압력 상승 비율',
        SL1: { min: 5,  max: 12, desc_kr: '경미 — 토출압력 +5~12%, 코일 경미 오염' },
        SL2: { min: 12, max: 20, desc_kr: '주의 — 토출압력 +12~20%, 성능 저하 체감' },
        SL3: { min: 20, max: 30, desc_kr: '심각 — 토출압력 +20~30%, 고압 트립 위험' },
        SL4: { min: 30, max: 999, desc_kr: '위험 — 토출압력 +30% 이상, 즉시 정지 후 세척' }
      },

      ph_effect: {
        desc_kr: '응축압력(Pc) 상승 → P-H 다이어그램에서 응축 곡선이 위로 이동. 응축기 유효 면적 감소로 과냉도 감소. 압축일(W) 증가, 냉동효과(RE) 감소.',
        desc_en: 'Condenser pressure (Pc) rises → condensation curve shifts upward on P-H diagram. Reduced effective area lowers subcooling. Compression work (W) increases, refrigeration effect (RE) decreases.',
        evap_pressure: 'same',
        cond_pressure: 'increase',
        superheat_region: 'slight_expand',
        subcool_region: 'shrink'
      },

      field_tips_kr: [
        '응축기 코일 외관 점검 — 먼지, 면화씨, 잎사귀, 곤충 등',
        '코일 세척: 안쪽에서 바깥쪽으로 (반대방향 절대 금지)',
        '응축기 팬 모터 작동 확인 (RPM, 전류, 회전 방향)',
        '응축기 주변 장애물 확인 (최소 30cm 이격 필요)',
        '핀 손상(눌림) 비율 확인 — 30% 이상이면 효율 급감',
        'CTOA 측정으로 성능 확인: 정상 15~30°F (SEER별)',
        '★ 감별진단: 과냉도↓ = 응축기 오염 / 과냉도↑ = 비응축가스'
      ],
      field_tips_en: [
        'Inspect condenser coil — dust, cottonwood, leaves, insects',
        'Clean coil from inside out (NEVER reverse direction)',
        'Verify condenser fan motor: RPM, current, rotation direction',
        'Check clearance around condenser (min 12 inches / 30cm)',
        'Check for bent fins — >30% blockage causes significant loss',
        'Measure CTOA to verify: normal is 15–30°F by SEER rating',
        'KEY DIFFERENTIAL: SC↓ = condenser fouling / SC↑ = non-condensable gas'
      ]
    },

    // ─────────────────────────────────────────────
    // FAULT 4: Evaporator Fouling / Low Indoor Airflow
    // ─────────────────────────────────────────────
    // Bulgurcu (2014): Pe drops due to reduced heat
    // load on evaporator. Superheat rises as refrigerant
    // vaporizes early. Discharge pressure may drop
    // slightly due to lower overall heat transfer.
    // ─────────────────────────────────────────────
    evaporator_fouling: {
      id: 'FAULT_EVAP_FOUL',
      name_kr: '증발기 오염 / 실내 기류 부족',
      name_en: 'Evaporator Fouling / Low Indoor Airflow',
      diagKey: 'lowAirflow',

      signatures: {
        suction_superheat:  { direction: 'up',   magnitude: 'high',   desc_kr: '과열도 증가', desc_en: 'Superheat rises' },
        suction_pressure:   { direction: 'down', magnitude: 'medium', desc_kr: '흡입압력 하락', desc_en: 'Suction pressure drops' },
        discharge_pressure: { direction: 'down', magnitude: 'slight', desc_kr: '토출압력 약간 하락', desc_en: 'Discharge pressure drops slightly' },
        subcooling:         { direction: 'up',   magnitude: 'slight', desc_kr: '과냉도 약간 증가', desc_en: 'Subcooling rises slightly' },
        discharge_temp:     { direction: 'up',   magnitude: 'medium', desc_kr: '토출온도 상승', desc_en: 'Discharge temp rises' },
        compressor_current: { direction: 'down', magnitude: 'slight', desc_kr: '압축기 전류 약간 감소', desc_en: 'Compressor current decreases slightly' },
        cop:                { direction: 'down', magnitude: 'high',   desc_kr: 'COP 저하', desc_en: 'COP decreases' }
      },

      severity_thresholds: {
        metric: 'superheat',
        unit: '°F',
        SL1: { min: 16, max: 20, desc_kr: '경미 — 에어필터 오염 초기, 효율 약간 저하' },
        SL2: { min: 20, max: 25, desc_kr: '주의 — 에어플로우 부족 확인, 필터 교체 필요' },
        SL3: { min: 25, max: 30, desc_kr: '심각 — 코일 결빙 위험, 즉시 점검 필요' },
        SL4: { min: 30, max: 999, desc_kr: '위험 — 코일 완전 결빙 가능, 운전 중단 후 해빙 필요' }
      },

      ph_effect: {
        desc_kr: '증발압력(Pe) 하락 → P-H 사이클 하단이 아래로 이동. 증발기 열교환 부족으로 과열 영역 확장. 냉매 부족과 유사하나 과냉도가 정상~약간 높은 것이 구별 포인트.',
        desc_en: 'Evaporator pressure (Pe) drops → lower portion of P-H cycle shifts down. Superheat region expands due to insufficient heat transfer. Similar to low charge but subcooling remains normal-to-slightly-high.',
        evap_pressure: 'decrease',
        cond_pressure: 'slight_decrease',
        superheat_region: 'expand',
        subcool_region: 'slight_expand'
      },

      field_tips_kr: [
        '에어필터 상태 확인 — 교체 또는 세척',
        '증발기 코일 청결도 점검 (라이트로 투과 확인)',
        '블로워 모터/팬 작동 확인 (RPM, 전류)',
        '덕트 연결부 누설/탈락 점검',
        '정압(TESP) 측정: 정상 0.3~0.7 inWC',
        '코일 결빙 시: 팬만 운전(해빙) → 근본원인 해결',
        '★ 냉매 부족과 감별: 과냉도 정상~높음이면 기류 부족'
      ],
      field_tips_en: [
        'Check air filter — replace or clean as needed',
        'Inspect evaporator coil cleanliness (use flashlight for light test)',
        'Verify blower motor/fan operation (RPM, current)',
        'Check duct connections for leaks or disconnection',
        'Measure TESP (Total External Static Pressure): normal 0.3–0.7 inWC',
        'If coil is frozen: fan-only mode (defrost) → then fix root cause',
        'KEY DIFFERENTIAL: Normal-to-high SC = airflow issue, not low charge'
      ]
    },

    // ─────────────────────────────────────────────
    // FAULT 5: Compressor Valve Leak (Efficiency Loss)
    // ─────────────────────────────────────────────
    // Bulgurcu (2014): Compression ratio drops because
    // discharge gas leaks back through valves. Suction
    // pressure rises slightly, discharge pressure drops.
    // ASHRAE RP-1043 [2]: Identifiable by comparing
    // actual vs expected compression ratio.
    // ─────────────────────────────────────────────
    compressor_valve_leak: {
      id: 'FAULT_COMP_VALVE',
      name_kr: '컴프레서 밸브 누설 (효율 저하)',
      name_en: 'Compressor Valve Leak / Efficiency Loss',
      diagKey: 'compressorWeak',

      signatures: {
        suction_superheat:  { direction: 'down',   magnitude: 'slight', desc_kr: '과열도 약간 감소', desc_en: 'Superheat decreases slightly' },
        suction_pressure:   { direction: 'up',     magnitude: 'slight', desc_kr: '흡입압력 약간 상승', desc_en: 'Suction pressure rises slightly' },
        discharge_pressure: { direction: 'down',   magnitude: 'high',   desc_kr: '토출압력 하락', desc_en: 'Discharge pressure drops' },
        subcooling:         { direction: 'down',   magnitude: 'slight', desc_kr: '과냉도 약간 감소', desc_en: 'Subcooling decreases slightly' },
        discharge_temp:     { direction: 'up',     magnitude: 'medium', desc_kr: '토출온도 상승 (재압축열)', desc_en: 'Discharge temp rises (re-compression heat)' },
        compressor_current: { direction: 'up',     magnitude: 'medium', desc_kr: '압축기 전류 증가 (비효율 운전)', desc_en: 'Compressor current increases (inefficient operation)' },
        cop:                { direction: 'down',   magnitude: 'high',   desc_kr: 'COP 급격 저하', desc_en: 'COP drops significantly' }
      },

      severity_thresholds: {
        metric: 'compression_ratio_deficit',
        unit: '%',
        desc_kr: '정상 대비 압축비 부족률',
        SL1: { min: 5,  max: 15, desc_kr: '경미 — 압축비 5~15% 부족, 효율 소폭 저하' },
        SL2: { min: 15, max: 30, desc_kr: '주의 — 압축비 15~30% 부족, 냉방 능력 저하 체감' },
        SL3: { min: 30, max: 50, desc_kr: '심각 — 압축비 30~50% 부족, 장시간 운전 불가' },
        SL4: { min: 50, max: 999, desc_kr: '위험 — 압축비 50%+ 부족, 컴프레서 교체 필요' }
      },

      ph_effect: {
        desc_kr: '토출압력(Pd) 하락, 흡입압력(Ps) 약간 상승 → P-H 다이어그램에서 압축 과정의 기울기가 완만해짐. 체적효율(ηv) 저하, 실질 냉동효과 감소.',
        desc_en: 'Discharge pressure (Pd) drops, suction pressure (Ps) rises slightly → compression slope flattens on P-H diagram. Volumetric efficiency (ηv) degrades, effective refrigeration capacity decreases.',
        evap_pressure: 'slight_increase',
        cond_pressure: 'decrease',
        superheat_region: 'slight_shrink',
        subcool_region: 'slight_shrink'
      },

      field_tips_kr: [
        '압축비 계산: (Pd+14.7)/(Ps+14.7) → 정상 범위 2:1~10:1',
        '컴프레서 전류 측정 — RLA 대비 비율 확인',
        '흡입/토출 온도차 확인 — 밸브 누설 시 온도차 감소',
        '오일 색상/상태 점검 — 산화(어두운 색) = 과열 이력',
        '모터 권선 저항(메거) 측정 — 절연 저하 확인',
        '컴프레서 교체 전 근본원인 확인 — "컴프레서는 죽지 않는다, 죽임당한다"',
        '시스템 오염 (산/수분) 검사 → 필터드라이어 교체'
      ],
      field_tips_en: [
        'Calculate compression ratio: (Pd+14.7)/(Ps+14.7) → normal 2:1–10:1',
        'Measure compressor current vs RLA rating',
        'Check suction-to-discharge temperature difference — decreases with valve leak',
        'Inspect oil color/condition — dark = overheating history',
        'Megohm test motor winding insulation',
        'Find root cause before replacing compressor — "compressors are killed, they do not die"',
        'Test system for contamination (acid/moisture) → replace filter drier'
      ]
    },

    // ─────────────────────────────────────────────
    // FAULT 6: Non-Condensable Gas (Air/Nitrogen)
    // ─────────────────────────────────────────────
    // Bulgurcu (2014): Pc rises because non-condensable
    // gas occupies condenser volume. CRITICAL differential
    // vs condenser fouling: SC INCREASES with non-
    // condensable gas (gas pushes liquid deeper into
    // subcool zone), SC DECREASES with fouling.
    // ─────────────────────────────────────────────
    non_condensable: {
      id: 'FAULT_NON_COND',
      name_kr: '비응축가스 혼입 (공기/질소)',
      name_en: 'Non-Condensable Gas (Air/Nitrogen)',
      diagKey: null, // No direct existing DiagnosticEngine match — requires differential diagnosis

      signatures: {
        suction_superheat:  { direction: 'same',   magnitude: 'none',   desc_kr: '과열도 변화 적음', desc_en: 'Superheat relatively unchanged' },
        suction_pressure:   { direction: 'same',   magnitude: 'none',   desc_kr: '흡입압력 변화 적음', desc_en: 'Suction pressure relatively unchanged' },
        discharge_pressure: { direction: 'up',     magnitude: 'high',   desc_kr: '토출압력 상승', desc_en: 'Discharge pressure rises' },
        subcooling:         { direction: 'up',     magnitude: 'high',   desc_kr: '과냉도 증가 (!)', desc_en: 'Subcooling increases (!)' },
        discharge_temp:     { direction: 'up',     magnitude: 'high',   desc_kr: '토출온도 상승', desc_en: 'Discharge temp rises' },
        compressor_current: { direction: 'up',     magnitude: 'medium', desc_kr: '압축기 전류 증가', desc_en: 'Compressor current increases' },
        cop:                { direction: 'down',   magnitude: 'high',   desc_kr: 'COP 저하', desc_en: 'COP decreases' }
      },

      severity_thresholds: {
        metric: 'discharge_pressure_pct',
        unit: '%',
        desc_kr: '정상 대비 토출압력 상승 비율 + 과냉도 동반 상승',
        SL1: { min: 5,  max: 10, desc_kr: '경미 — 미량의 공기 혼입, 효율 소폭 저하' },
        SL2: { min: 10, max: 18, desc_kr: '주의 — 고압 비정상 상승, 전량 회수·재충전 권장' },
        SL3: { min: 18, max: 28, desc_kr: '심각 — 컴프레서 과부하, 즉시 조치 필요' },
        SL4: { min: 28, max: 999, desc_kr: '위험 — 고압 트립 반복, 즉시 운전 중단 후 전량 회수' }
      },

      ph_effect: {
        desc_kr: '응축압력(Pc) 상승 (비응축가스의 분압 추가). P-H 다이어그램에서 응축 곡선이 위로 이동하지만 과냉 영역이 확장됨 — 비응축가스가 응축기 상부를 점거하여 액냉매를 아래로 밀어냄.',
        desc_en: 'Condenser pressure (Pc) rises due to partial pressure of non-condensable gas. On P-H diagram, condensation curve shifts up but subcool region EXPANDS — gas occupies upper condenser volume, pushing liquid further into subcool zone.',
        evap_pressure: 'same',
        cond_pressure: 'increase',
        superheat_region: 'same',
        subcool_region: 'expand'
      },

      field_tips_kr: [
        '★ 핵심 감별: 토출압력↑ + 과냉도↑ = 비응축가스 / 토출압력↑ + 과냉도↓ = 응축기 오염',
        '진공 불량 이력 확인 — 500미크론 이하로 진공 잡았는지?',
        '최근 서비스 이력 확인 — 배관 개방 후 질소 퍼지 없이 용접?',
        '냉매 전량 회수 → 진공(500미크론 이하) → 정량 재충전',
        '회수된 냉매는 재활용 장비로 정제 또는 폐기',
        '시스템 개방 시 반드시 질소 퍼지(flow nitrogen) 실시'
      ],
      field_tips_en: [
        'KEY DIFFERENTIAL: Pd↑ + SC↑ = non-condensable / Pd↑ + SC↓ = condenser fouling',
        'Check vacuum history — was system pulled below 500 microns?',
        'Review recent service — was brazing done without nitrogen flow?',
        'Full recovery → deep vacuum (below 500 microns) → weigh-in charge',
        'Recovered refrigerant should be reclaimed or properly disposed',
        'Always flow nitrogen when brazing on an open system'
      ]
    },

    // ─────────────────────────────────────────────
    // FAULT 7: TXV Malfunction
    // ─────────────────────────────────────────────
    // Two distinct sub-modes based on Sporlan/Parker
    // TXV troubleshooting guide and Bulgurcu (2014):
    //   A) Restricted (underfeeding) — SH↑↑, Ps↓↓
    //   B) Stuck Open (overfeeding) — SH↓↓, Ps↑
    // ─────────────────────────────────────────────
    txv_malfunction: {
      id: 'FAULT_TXV',
      name_kr: 'TXV (팽창밸브) 고장',
      name_en: 'TXV Malfunction',
      diagKey: null, // Has two sub-modes with different diagKeys

      sub_modes: {

        // ── SUB-MODE A: TXV Restricted (Underfeeding) ──
        txv_restricted: {
          id: 'FAULT_TXV_RESTRICT',
          name_kr: 'TXV 막힘 / 언더피딩',
          name_en: 'TXV Restricted / Underfeeding',
          diagKey: 'meteringRestriction',

          signatures: {
            suction_superheat:  { direction: 'up',   magnitude: 'very_high', desc_kr: '과열도 크게 증가', desc_en: 'Superheat rises significantly' },
            suction_pressure:   { direction: 'down', magnitude: 'very_high', desc_kr: '흡입압력 크게 하락', desc_en: 'Suction pressure drops significantly' },
            discharge_pressure: { direction: 'down', magnitude: 'slight',    desc_kr: '토출압력 약간 하락', desc_en: 'Discharge pressure drops slightly' },
            subcooling:         { direction: 'up',   magnitude: 'high',      desc_kr: '과냉도 증가 (고압측 냉매 체류)', desc_en: 'Subcooling increases (liquid trapped in high side)' },
            discharge_temp:     { direction: 'up',   magnitude: 'very_high', desc_kr: '토출온도 크게 상승', desc_en: 'Discharge temp rises significantly' },
            compressor_current: { direction: 'down', magnitude: 'medium',    desc_kr: '압축기 전류 감소', desc_en: 'Compressor current decreases' },
            cop:                { direction: 'down', magnitude: 'very_high', desc_kr: 'COP 급격 저하', desc_en: 'COP drops dramatically' }
          },

          severity_thresholds: {
            metric: 'superheat',
            unit: '°F',
            SL1: { min: 20, max: 28, desc_kr: '경미 — 과열도 높음, TXV 부분 제한' },
            SL2: { min: 28, max: 38, desc_kr: '주의 — TXV 상당 부분 막힘, 냉방 능력 저하' },
            SL3: { min: 38, max: 50, desc_kr: '심각 — DLT 과열 위험, 즉시 점검' },
            SL4: { min: 50, max: 999, desc_kr: '위험 — 완전 막힘 상태, 컴프레서 손상 임박' }
          },

          ph_effect: {
            desc_kr: '증발압력(Pe) 급격 하락 → P-H 다이어그램 하단이 크게 아래로 이동. 과열 영역 대폭 확장. 응축기 측에 냉매 체류로 과냉도 증가. 실질 냉동효과(RE) 급감.',
            desc_en: 'Evaporator pressure (Pe) drops dramatically → P-H cycle lower section shifts far down. Superheat region expands greatly. Liquid accumulates in condenser, increasing subcooling. Effective RE drops dramatically.',
            evap_pressure: 'large_decrease',
            cond_pressure: 'slight_decrease',
            superheat_region: 'large_expand',
            subcool_region: 'expand'
          },

          field_tips_kr: [
            '필터 드라이어 전후 온도차 확인: >3°F → 막힘',
            'TXV 입구 스트레이너 점검/청소',
            'TXV 센싱벌브에 손으로 열 가하기 → 반응 테스트',
            '외부 이퀄라이저 라인 막힘/꺾임 점검',
            '사이트글라스로 기포 확인 — 막힘 시 전후 기포 차이',
            'Sporlan 12 Solutions 참고: #1~#7 (Starving 체크리스트)',
            'TXV 교체 시 반드시 동일 톤수·냉매 타입 확인'
          ],
          field_tips_en: [
            'Check filter drier delta-T: >3°F across = restricted',
            'Inspect/clean TXV inlet strainer',
            'Apply hand heat to sensing bulb → check for response',
            'Inspect external equalizer line for blockage/kinks',
            'Use sight glass to compare upstream vs downstream bubbling',
            'Refer to Sporlan 12 Solutions: #1–#7 (Starving checklist)',
            'When replacing TXV: match tonnage and refrigerant type exactly'
          ]
        },

        // ── SUB-MODE B: TXV Stuck Open (Overfeeding) ──
        txv_stuck_open: {
          id: 'FAULT_TXV_OPEN',
          name_kr: 'TXV 열림 고착 / 오버피딩',
          name_en: 'TXV Stuck Open / Overfeeding',
          diagKey: 'txvOverfeed',

          signatures: {
            suction_superheat:  { direction: 'down', magnitude: 'very_high', desc_kr: '과열도 급격 감소 (0 또는 음수!)', desc_en: 'Superheat drops dramatically (0 or negative!)' },
            suction_pressure:   { direction: 'up',   magnitude: 'medium',    desc_kr: '흡입압력 상승', desc_en: 'Suction pressure rises' },
            discharge_pressure: { direction: 'up',   magnitude: 'slight',    desc_kr: '토출압력 약간 상승', desc_en: 'Discharge pressure rises slightly' },
            subcooling:         { direction: 'down', magnitude: 'medium',    desc_kr: '과냉도 감소', desc_en: 'Subcooling decreases' },
            discharge_temp:     { direction: 'down', magnitude: 'medium',    desc_kr: '토출온도 하락', desc_en: 'Discharge temp drops' },
            compressor_current: { direction: 'up',   magnitude: 'slight',    desc_kr: '압축기 전류 약간 증가', desc_en: 'Compressor current rises slightly' },
            cop:                { direction: 'down', magnitude: 'high',      desc_kr: 'COP 저하', desc_en: 'COP decreases' }
          },

          severity_thresholds: {
            metric: 'superheat',
            unit: '°F',
            desc_kr: '과열도 하한 기준 (낮을수록 위험)',
            SL1: { min: 2,    max: 5,    desc_kr: '경미 — 과열도 약간 낮음, TXV 약간 과개방' },
            SL2: { min: 0,    max: 2,    desc_kr: '주의 — 과열도 거의 0, 리퀴드백 위험' },
            SL3: { min: -5,   max: 0,    desc_kr: '심각 — 음수 과열도, 액냉매 컴프레서 유입' },
            SL4: { min: -999, max: -5,   desc_kr: '위험 — 심각한 리퀴드 슬러깅, 즉시 정지!' }
          },

          ph_effect: {
            desc_kr: '과열 영역 소멸 → P-H 다이어그램에서 컴프레서 흡입점이 포화 곡선 안쪽(2상 영역)으로 진입. 액냉매가 컴프레서로 직접 유입되어 리퀴드 슬러깅 발생.',
            desc_en: 'Superheat region vanishes → compressor inlet point moves inside the saturation dome (two-phase region) on P-H diagram. Liquid refrigerant enters compressor directly, causing liquid slugging.',
            evap_pressure: 'increase',
            cond_pressure: 'slight_increase',
            superheat_region: 'vanish',
            subcool_region: 'shrink'
          },

          field_tips_kr: [
            '★ 리퀴드 슬러깅 징후: 흡입관 전체 결로, 컴프레서 하우징 결로/결빙',
            'TXV 과열도 조정: 시계방향(CW)으로 조임 → 과열도↑',
            '센싱벌브 위치 확인: 흡입관 12시~4시, 바닥(6시) 금지',
            '센싱벌브 단열 확인 — 외부 열/냉기 영향 차단',
            '외부 이퀄라이저 라인 정상 연결 확인',
            'Sporlan 12 Solutions 참고: #8~#12 (Flooding 체크리스트)',
            '조정 불가 시 TXV 교체 — 내부 시트 손상 가능'
          ],
          field_tips_en: [
            'LIQUID SLUGGING SIGNS: entire suction line sweating, compressor housing sweating/icing',
            'Adjust TXV superheat: turn clockwise (CW) to increase superheat',
            'Sensing bulb position: 12–4 o\'clock on suction line, NEVER at 6 o\'clock',
            'Verify sensing bulb insulation — isolate from external heat/cold',
            'Confirm external equalizer line is properly connected',
            'Refer to Sporlan 12 Solutions: #8–#12 (Flooding checklist)',
            'If adjustment fails: replace TXV — internal seat may be damaged'
          ]
        }
      },

      // Aggregated tips for the parent TXV fault category
      field_tips_kr: [
        'TXV 고장은 크게 2가지: 막힘(Starving)과 열림 고착(Flooding)',
        '과열도 높음 → 막힘 의심 (Sporlan #1~#7)',
        '과열도 낮음(0 근처) → 열림 고착 의심 (Sporlan #8~#12)',
        'TXV 마법사 기능을 사용하여 단계별 진단 수행'
      ],
      field_tips_en: [
        'TXV failures fall into 2 categories: Restricted (Starving) and Stuck Open (Flooding)',
        'High superheat → suspect restriction (Sporlan #1–#7)',
        'Low/zero superheat → suspect stuck open (Sporlan #8–#12)',
        'Use the TXV Wizard feature for step-by-step diagnosis'
      ]
    }
  };


  // ═══════════════════════════════════════════════════
  // Section 2: Chiller-Specific Faults (ASHRAE RP-1043)
  // ═══════════════════════════════════════════════════
  // Comstock & Braun (1999) identified 8 canonical
  // chiller faults. The 4 most field-relevant are
  // included here with their signature patterns.
  // ═══════════════════════════════════════════════════

  const CHILLER_FAULTS = {

    // ─────────────────────────────────────────────
    // CHILLER FAULT 1 (RP-1043 F1):
    // Reduced Condenser Water Flow
    // ─────────────────────────────────────────────
    reduced_condenser_water: {
      id: 'FAULT_CH_F1',
      rp1043_code: 'F1',
      name_kr: '응축기 냉각수 유량 부족',
      name_en: 'Reduced Condenser Water Flow',

      signatures: {
        condenser_approach:   { direction: 'up',   desc_kr: '응축기 어프로치 증가', desc_en: 'Condenser approach increases' },
        condenser_pressure:   { direction: 'up',   desc_kr: '응축압력 상승', desc_en: 'Condensing pressure rises' },
        leaving_cond_water:   { direction: 'up',   desc_kr: '응축기 출구 수온 상승', desc_en: 'Leaving condenser water temp rises' },
        cond_water_delta_t:   { direction: 'up',   desc_kr: '응축기 수온차(ΔT) 증가', desc_en: 'Condenser water ΔT increases' },
        evaporator_approach:  { direction: 'same',  desc_kr: '증발기 어프로치 변화 적음', desc_en: 'Evaporator approach relatively unchanged' },
        power:                { direction: 'up',   desc_kr: '소비전력 증가', desc_en: 'Power consumption increases' },
        cop:                  { direction: 'down', desc_kr: 'COP 저하', desc_en: 'COP decreases' }
      },

      severity_thresholds: {
        metric: 'condenser_approach',
        unit: '°F',
        desc_kr: '응축기 어프로치 온도 (포화온도 - 출구수온)',
        SL1: { min: 3,  max: 5,  desc_kr: '경미 — 어프로치 약간 높음, 유량 소폭 감소' },
        SL2: { min: 5,  max: 8,  desc_kr: '주의 — 유량 부족 확인, 밸브/펌프 점검 필요' },
        SL3: { min: 8,  max: 12, desc_kr: '심각 — 고압 트립 위험, 즉시 유량 복구' },
        SL4: { min: 12, max: 999, desc_kr: '위험 — 즉시 정지, 냉각탑/펌프 긴급 점검' }
      },

      field_tips_kr: [
        '응축기 냉각수 펌프 작동 확인 (전류, 진동)',
        '콘덴서 워터 밸브 개도 확인',
        '냉각탑 팬 정상 가동 확인',
        '스트레이너/필터 막힘 점검',
        '응축기 튜브 스케일/오염 — 정기 화학세정 필요',
        '냉각수 수질 관리 확인 (pH, 경도, 전도도)'
      ],
      field_tips_en: [
        'Verify condenser water pump operation (current, vibration)',
        'Check condenser water valve positions',
        'Confirm cooling tower fan operation',
        'Inspect strainer/filter for blockage',
        'Check condenser tubes for scale/fouling — schedule chemical cleaning',
        'Verify water treatment program (pH, hardness, conductivity)'
      ]
    },

    // ─────────────────────────────────────────────
    // CHILLER FAULT 2 (RP-1043 F2):
    // Reduced Evaporator Water Flow
    // ─────────────────────────────────────────────
    reduced_evaporator_water: {
      id: 'FAULT_CH_F2',
      rp1043_code: 'F2',
      name_kr: '증발기 냉수 유량 부족',
      name_en: 'Reduced Evaporator Water Flow',

      signatures: {
        evaporator_approach:  { direction: 'up',   desc_kr: '증발기 어프로치 증가', desc_en: 'Evaporator approach increases' },
        evaporator_pressure:  { direction: 'down', desc_kr: '증발압력 하락', desc_en: 'Evaporating pressure drops' },
        leaving_evap_water:   { direction: 'down', desc_kr: '증발기 출구 수온 하락', desc_en: 'Leaving evaporator water temp drops' },
        evap_water_delta_t:   { direction: 'up',   desc_kr: '증발기 수온차(ΔT) 증가', desc_en: 'Evaporator water ΔT increases' },
        condenser_approach:   { direction: 'same',  desc_kr: '응축기 어프로치 변화 적음', desc_en: 'Condenser approach relatively unchanged' },
        power:                { direction: 'down', desc_kr: '소비전력 약간 감소', desc_en: 'Power decreases slightly' },
        cop:                  { direction: 'down', desc_kr: 'COP 저하', desc_en: 'COP decreases' }
      },

      severity_thresholds: {
        metric: 'evaporator_approach',
        unit: '°F',
        desc_kr: '증발기 어프로치 온도 (출구수온 - 포화온도)',
        SL1: { min: 3,  max: 5,  desc_kr: '경미 — 어프로치 약간 높음, 유량 소폭 감소' },
        SL2: { min: 5,  max: 8,  desc_kr: '주의 — 유량 부족 확인, 밸브/펌프 점검 필요' },
        SL3: { min: 8,  max: 12, desc_kr: '심각 — 저압 트립/결빙 위험, 즉시 유량 복구' },
        SL4: { min: 12, max: 999, desc_kr: '위험 — 증발기 결빙 임박, 즉시 정지' }
      },

      field_tips_kr: [
        '증발기 냉수 펌프 작동 확인 (전류, 진동)',
        '냉수 밸브(바이패스 포함) 개도 확인',
        '증발기 스트레이너 막힘 점검',
        '증발기 튜브 오염 — 정기 브러시 클리닝 필요',
        '유량계 또는 ΔT로 실제 유량 추정',
        '결빙 방지를 위한 저압 컷아웃 설정 확인'
      ],
      field_tips_en: [
        'Verify evaporator water pump operation (current, vibration)',
        'Check chilled water valve positions (including bypass)',
        'Inspect evaporator strainer for blockage',
        'Check evaporator tubes for fouling — schedule brush cleaning',
        'Estimate actual flow using flow meter or ΔT calculation',
        'Verify low-pressure cutout setting for freeze protection'
      ]
    },

    // ─────────────────────────────────────────────
    // CHILLER FAULT 5 (RP-1043 F5):
    // Non-Condensable Gas in Chiller
    // ─────────────────────────────────────────────
    non_condensable_chiller: {
      id: 'FAULT_CH_F5',
      rp1043_code: 'F5',
      name_kr: '칠러 비응축가스 혼입',
      name_en: 'Non-Condensable Gas in Chiller',

      signatures: {
        condenser_pressure:   { direction: 'up',   desc_kr: '응축압력 상승', desc_en: 'Condensing pressure rises' },
        subcooling:           { direction: 'up',   desc_kr: '과냉도 증가', desc_en: 'Subcooling increases' },
        condenser_approach:   { direction: 'up',   desc_kr: '응축기 어프로치 증가', desc_en: 'Condenser approach increases' },
        evaporator_approach:  { direction: 'same',  desc_kr: '증발기 어프로치 변화 적음', desc_en: 'Evaporator approach relatively unchanged' },
        power:                { direction: 'up',   desc_kr: '소비전력 증가', desc_en: 'Power consumption increases' },
        cop:                  { direction: 'down', desc_kr: 'COP 저하', desc_en: 'COP decreases' }
      },

      severity_thresholds: {
        metric: 'condenser_pressure_pct',
        unit: '%',
        desc_kr: '정상 대비 응축압력 상승 비율',
        SL1: { min: 3,  max: 8,  desc_kr: '경미 — 소량 공기 혼입, 효율 소폭 저하' },
        SL2: { min: 8,  max: 15, desc_kr: '주의 — 퍼지 유닛 작동 확인, 성능 저하 체감' },
        SL3: { min: 15, max: 25, desc_kr: '심각 — 고압 이상, 퍼지 유닛 점검 필수' },
        SL4: { min: 25, max: 999, desc_kr: '위험 — 대량 공기 유입, 즉시 정지 후 진공/재충전' }
      },

      field_tips_kr: [
        '퍼지 유닛(Purge Unit) 정상 작동 확인',
        '퍼지 카운터 확인 — 빈번한 퍼지 = 공기 유입 지점 존재',
        '저압 측(부압 운전 구간) 기밀 점검',
        '냉매 회수 → 진공(500미크론 이하) → 재충전',
        '시스템 누설 점검 — 특히 부압 운전 구간의 가스켓/씰',
        '오일 분석 — 산가(acid number) 확인'
      ],
      field_tips_en: [
        'Verify purge unit operation',
        'Check purge counter — frequent purges indicate air leak',
        'Leak check low-pressure (sub-atmospheric) sections',
        'Full recovery → deep vacuum (below 500 microns) → recharge',
        'Focus leak detection on gaskets/seals in sub-atmospheric sections',
        'Analyze oil — check acid number for contamination'
      ]
    },

    // ─────────────────────────────────────────────
    // CHILLER FAULT 7 (RP-1043 F7):
    // Excess Oil in Refrigerant Circuit
    // ─────────────────────────────────────────────
    excess_oil: {
      id: 'FAULT_CH_F7',
      rp1043_code: 'F7',
      name_kr: '냉매 회로 내 과잉 오일',
      name_en: 'Excess Oil in Refrigerant Circuit',

      signatures: {
        condenser_approach:   { direction: 'up',   desc_kr: '응축기 어프로치 증가', desc_en: 'Condenser approach increases' },
        evaporator_approach:  { direction: 'up',   desc_kr: '증발기 어프로치 증가', desc_en: 'Evaporator approach increases' },
        condenser_pressure:   { direction: 'up',   desc_kr: '응축압력 약간 상승', desc_en: 'Condensing pressure rises slightly' },
        evaporator_pressure:  { direction: 'down', desc_kr: '증발압력 약간 하락', desc_en: 'Evaporating pressure drops slightly' },
        power:                { direction: 'up',   desc_kr: '소비전력 증가', desc_en: 'Power consumption increases' },
        cop:                  { direction: 'down', desc_kr: 'COP 저하', desc_en: 'COP decreases' }
      },

      severity_thresholds: {
        metric: 'both_approaches_pct',
        unit: '%',
        desc_kr: '양쪽 어프로치 동시 상승 비율',
        SL1: { min: 10, max: 20, desc_kr: '경미 — 어프로치 소폭 상승, 열교환 약간 저하' },
        SL2: { min: 20, max: 35, desc_kr: '주의 — 열교환기 오일 코팅 의심, 오일 점검 필요' },
        SL3: { min: 35, max: 50, desc_kr: '심각 — 오일 과다, 열교환 효율 크게 저하' },
        SL4: { min: 50, max: 999, desc_kr: '위험 — 오일 로깅(logging) 상태, 오일 회수 필수' }
      },

      field_tips_kr: [
        '컴프레서 오일 사이트글라스 레벨 확인',
        '오일 충전 이력 확인 — 과잉 충전 여부',
        '오일 회수 장치(oil recovery system) 점검',
        '증발기/응축기 튜브 내부 오일 코팅 확인',
        '오일 분리기(oil separator) 정상 작동 확인',
        '오일 리턴 라인 막힘/제한 점검',
        '★ 감별: 양쪽 어프로치 동시↑ = 오일 과잉 의심'
      ],
      field_tips_en: [
        'Check compressor oil sight glass level',
        'Review oil charge history — was excess oil added?',
        'Inspect oil recovery system operation',
        'Check heat exchanger tubes for oil coating',
        'Verify oil separator is functioning properly',
        'Inspect oil return lines for blockage/restriction',
        'KEY DIFFERENTIAL: Both approaches rising together = suspect excess oil'
      ]
    }
  };


  // ═══════════════════════════════════════════════════
  // Section 3: Differential Diagnosis Keys
  // ═══════════════════════════════════════════════════
  // When a single symptom (e.g., high discharge pressure)
  // could indicate multiple faults, these differential
  // keys help the technician distinguish the actual cause
  // by examining secondary parameters.
  //
  // Based on Bulgurcu (2014) differential analysis and
  // AC Service Tech cross-diagnostic methodology.
  // ═══════════════════════════════════════════════════

  const DIFFERENTIAL_KEYS = {

    high_discharge_pressure: {
      symptom_kr: '토출압력(고압) 비정상 상승',
      symptom_en: 'Abnormally High Discharge Pressure',
      faults: [
        {
          faultId: 'condenser_fouling',
          probability: 'high',
          key_kr: '과냉도↓ → 응축기 오염 (열교환 면적 감소)',
          key_en: 'SC↓ → Condenser fouling (reduced heat exchange area)',
          secondary_checks: ['CTOA 30°F 초과', '응축기 코일 육안 점검', '팬 모터 전류']
        },
        {
          faultId: 'non_condensable',
          probability: 'medium',
          key_kr: '과냉도↑ → 비응축가스 혼입 (가스가 응축기 상부 점거)',
          key_en: 'SC↑ → Non-condensable gas (gas occupies upper condenser)',
          secondary_checks: ['최근 서비스 시 진공 이력', '시스템 개방 여부']
        },
        {
          faultId: 'refrigerant_high',
          probability: 'medium',
          key_kr: '흡입압력도↑ + 과냉도↑ → 냉매 과충전 (양쪽 모두 상승)',
          key_en: 'Ps also↑ + SC↑ → Refrigerant overcharge (both sides elevated)',
          secondary_checks: ['흡입압력 확인', '충전 이력', '명판 충전량 비교']
        }
      ]
    },

    high_superheat: {
      symptom_kr: '과열도 비정상 상승',
      symptom_en: 'Abnormally High Superheat',
      faults: [
        {
          faultId: 'refrigerant_low',
          probability: 'high',
          key_kr: '과냉도↓ → 냉매 부족 (전체적으로 냉매 부족)',
          key_en: 'SC↓ → Low refrigerant (system-wide undercharge)',
          secondary_checks: ['사이트글라스 기포', '서리 라인 후퇴', '누설 탐지']
        },
        {
          faultId: 'evaporator_fouling',
          probability: 'medium',
          key_kr: '과냉도 정상~↑ → 증발기 기류 부족 (열부하 감소)',
          key_en: 'SC normal~↑ → Evaporator airflow restriction (reduced heat load)',
          secondary_checks: ['에어필터 상태', 'TESP 측정', '블로워 전류']
        },
        {
          faultId: 'txv_restricted',
          probability: 'high',
          key_kr: '과냉도↑↑ + 흡입압↓↓ → TXV 막힘 (고압측 냉매 체류)',
          key_en: 'SC↑↑ + Ps↓↓ → TXV restriction (liquid trapped in high side)',
          secondary_checks: ['필터 드라이어 ΔT', 'TXV 반응 테스트', '사이트글라스']
        }
      ]
    },

    low_superheat: {
      symptom_kr: '과열도 비정상 하락',
      symptom_en: 'Abnormally Low Superheat',
      faults: [
        {
          faultId: 'refrigerant_high',
          probability: 'high',
          key_kr: '과냉도↑ → 냉매 과충전 (과잉 냉매가 증발기로 넘침)',
          key_en: 'SC↑ → Refrigerant overcharge (excess floods into evaporator)',
          secondary_checks: ['명판 충전량 대비', '흡입관 결로 범위', '컴프레서 하우징 결로']
        },
        {
          faultId: 'txv_stuck_open',
          probability: 'high',
          key_kr: '과냉도↓ + 과열도 0 또는 음수 → TXV 열림 고착',
          key_en: 'SC↓ + SH 0 or negative → TXV stuck open',
          secondary_checks: ['TXV 조정 반응', '센싱벌브 위치/단열', '흡입관 전체 결로']
        },
        {
          faultId: 'compressor_valve_leak',
          probability: 'medium',
          key_kr: '압축비↓ + 토출압↓ → 컴프레서 밸브 누설 (내부 바이패스)',
          key_en: 'Compression ratio↓ + Pd↓ → Compressor valve leak (internal bypass)',
          secondary_checks: ['압축비 계산', '컴프레서 전류 vs RLA', '흡입/토출 온도차']
        }
      ]
    }
  };


  // ═══════════════════════════════════════════════════
  // Section 4: Helper Functions
  // ═══════════════════════════════════════════════════

  /**
   * DiagnosticEngine diagKey → FaultSignatures fault key mapping.
   * Maps the existing cross-diagnostic matrix keys to the
   * academic fault signature identifiers in this module.
   */
  const DIAG_KEY_TO_FAULT_MAP = {
    'lowCharge':            'refrigerant_low',
    'overcharge':           'refrigerant_high',
    'meteringRestriction':  'txv_restricted',   // sub-mode of txv_malfunction
    'compressorWeak':       'compressor_valve_leak',
    'txvOverfeed':          'txv_stuck_open',   // sub-mode of txv_malfunction
    'lowAirflow':           'evaporator_fouling',
    'normal':               null
  };

  /**
   * Get a fault object by its key. Searches both top-level
   * vapor compression faults and TXV sub-modes.
   *
   * @param {string} faultId - Fault key (e.g., 'refrigerant_low', 'txv_restricted')
   * @returns {object|null} The fault definition object, or null if not found.
   */
  function getFault(faultId) {
    // Check top-level vapor compression faults
    if (VAPOR_COMPRESSION_FAULTS[faultId]) {
      return VAPOR_COMPRESSION_FAULTS[faultId];
    }

    // Check TXV sub-modes
    if (VAPOR_COMPRESSION_FAULTS.txv_malfunction &&
        VAPOR_COMPRESSION_FAULTS.txv_malfunction.sub_modes) {
      const subModes = VAPOR_COMPRESSION_FAULTS.txv_malfunction.sub_modes;
      if (subModes[faultId]) {
        return subModes[faultId];
      }
    }

    // Check chiller faults
    if (CHILLER_FAULTS[faultId]) {
      return CHILLER_FAULTS[faultId];
    }

    return null;
  }

  /**
   * Determine the LBNL severity level (SL1–SL4) for a given
   * fault based on measured values.
   *
   * For most vapor compression faults, severity is determined
   * by superheat or subcooling value. For TXV stuck open, the
   * logic is inverted (lower superheat = higher severity).
   *
   * @param {string} faultId - Fault key
   * @param {number} superheat - Measured superheat (°F)
   * @param {number} subcooling - Measured subcooling (°F)
   * @param {object} [extras] - Additional metrics (discharge_pressure_pct, compression_ratio_deficit, etc.)
   * @returns {object|null} { level: 'SL1'...'SL4', severity: SEVERITY_LEVELS entry, threshold: matching threshold }
   */
  function getSeverity(faultId, superheat, subcooling, extras) {
    const fault = getFault(faultId);
    if (!fault || !fault.severity_thresholds) return null;

    const thresholds = fault.severity_thresholds;
    let measuredValue;

    // Determine which metric to use for severity classification
    switch (thresholds.metric) {
      case 'superheat':
        // Special handling for TXV stuck open — severity is inverted
        if (faultId === 'txv_stuck_open') {
          measuredValue = superheat;
          // For stuck open, thresholds are ordered SL1 highest → SL4 lowest
          for (const level of ['SL4', 'SL3', 'SL2', 'SL1']) {
            const t = thresholds[level];
            if (t && measuredValue >= t.min && measuredValue < t.max) {
              return {
                level: level,
                severity: SEVERITY_LEVELS[level],
                threshold: t,
                metric_value: measuredValue,
                metric_name: thresholds.metric
              };
            }
          }
          return null;
        }
        measuredValue = superheat;
        break;

      case 'subcooling':
        measuredValue = subcooling;
        break;

      case 'discharge_pressure_pct':
        measuredValue = (extras && typeof extras.discharge_pressure_pct === 'number')
          ? extras.discharge_pressure_pct
          : null;
        break;

      case 'compression_ratio_deficit':
        measuredValue = (extras && typeof extras.compression_ratio_deficit === 'number')
          ? extras.compression_ratio_deficit
          : null;
        break;

      case 'condenser_approach':
        measuredValue = (extras && typeof extras.condenser_approach === 'number')
          ? extras.condenser_approach
          : null;
        break;

      case 'evaporator_approach':
        measuredValue = (extras && typeof extras.evaporator_approach === 'number')
          ? extras.evaporator_approach
          : null;
        break;

      case 'condenser_pressure_pct':
        measuredValue = (extras && typeof extras.condenser_pressure_pct === 'number')
          ? extras.condenser_pressure_pct
          : null;
        break;

      case 'both_approaches_pct':
        measuredValue = (extras && typeof extras.both_approaches_pct === 'number')
          ? extras.both_approaches_pct
          : null;
        break;

      default:
        measuredValue = null;
    }

    if (measuredValue === null || measuredValue === undefined) return null;

    // Standard threshold matching (SL1 → SL4, ascending severity)
    for (const level of ['SL1', 'SL2', 'SL3', 'SL4']) {
      const t = thresholds[level];
      if (t && measuredValue >= t.min && measuredValue < t.max) {
        return {
          level: level,
          severity: SEVERITY_LEVELS[level],
          threshold: t,
          metric_value: measuredValue,
          metric_name: thresholds.metric
        };
      }
    }

    return null;
  }

  /**
   * Get the differential diagnosis entry for a given symptom.
   *
   * @param {string} symptomKey - One of: 'high_discharge_pressure', 'high_superheat', 'low_superheat'
   * @returns {object|null} The differential diagnosis object with ranked fault candidates.
   */
  function getDifferential(symptomKey) {
    return DIFFERENTIAL_KEYS[symptomKey] || null;
  }

  /**
   * Get field troubleshooting tips for a fault.
   * Returns Korean tips by default, with an option for English.
   *
   * @param {string} faultId - Fault key
   * @param {string} [lang='kr'] - Language: 'kr' or 'en'
   * @returns {string[]|null} Array of tip strings, or null if not found.
   */
  function getFieldTips(faultId, lang) {
    const fault = getFault(faultId);
    if (!fault) return null;

    const tipLang = lang === 'en' ? 'field_tips_en' : 'field_tips_kr';
    return fault[tipLang] || fault.field_tips_kr || null;
  }

  /**
   * Map a DiagnosticEngine diagKey to a FaultSignatures fault key.
   * This bridges the existing cross-diagnostic matrix results
   * to the academic fault signature database.
   *
   * @param {string} diagKey - DiagnosticEngine key (e.g., 'lowCharge', 'overcharge')
   * @returns {string|null} Corresponding fault key, or null for 'normal'.
   */
  function mapDiagKeyToFault(diagKey) {
    if (!diagKey || diagKey === 'normal') return null;
    return DIAG_KEY_TO_FAULT_MAP[diagKey] || null;
  }

  // ═══════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════

  return {
    // Data collections
    SEVERITY_LEVELS,
    VAPOR_COMPRESSION_FAULTS,
    CHILLER_FAULTS,
    DIFFERENTIAL_KEYS,

    // Lookup functions
    getFault,
    getSeverity,
    getDifferential,
    getFieldTips,

    // Mapping functions
    mapDiagKeyToFault
  };

})();

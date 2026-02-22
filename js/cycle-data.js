// ===================================================
// HVAC Pulse — Refrigeration Cycle Data
// Component info, measurement points, diagnostic mapping
// ===================================================

const CYCLE_COMPONENTS = {

  compressor: {
    name_kr: '컴프레서 (압축기)',
    name_en: 'Compressor',
    role: '저압 냉매 가스를 고압으로 압축하여 응축기로 보냅니다.',
    normalConditions: [
      '토출온도: 150~220°F',
      '압축비: 2:1 ~ 10:1',
      '운전전류: RLA 이하',
      '오일 레벨: 사이트글라스 1/4~3/4'
    ],
    failureSymptoms: ['이상 소음 (노킹/그라인딩)', '과전류 트립', '토출온도 과열 (>275°F)', '압축비 저하', '오일 부족'],
    relatedErrors: ['Copeland: Locked Rotor, OL Trip', 'Bitzer: MP (모터보호), OL (과부하)', 'Danfoss: Motor Overload'],
    checkPoints: ['운전 전류 (클램프미터)', '절연 저항 (메거)', '오일 레벨/색상', '진동/소음', '토출 온도'],
    diagHighlight: ['compressorWeak']
  },

  condenser: {
    name_kr: '응축기',
    name_en: 'Condenser',
    role: '고온고압 가스를 외기로 냉각하여 액체로 응축시킵니다.',
    normalConditions: [
      'CTOA: 15~30°F (SEER별)',
      '과냉도: 8~14°F (TXV 시스템)',
      '팬 정상 작동',
      '코일 청결'
    ],
    failureSymptoms: ['고압 상승', '과냉도 과대', '팬 소음/정지', '코일 오염/막힘'],
    relatedErrors: ['Daikin: E7 (팬 이상)', 'Carrier: HIGH PRESS'],
    checkPoints: ['코일 청결 상태', '팬 모터 전류', '에어플로우 장애물', '과냉도 측정'],
    diagHighlight: ['lowAirflow', 'overcharge']
  },

  txv: {
    name_kr: '팽창밸브 (TXV)',
    name_en: 'Thermostatic Expansion Valve',
    role: '고압 액체를 저압으로 감압하고, 증발기 냉매 유량을 제어합니다.',
    normalConditions: [
      '과열도: 5~15°F 유지',
      '센싱벌브: 석션라인 12시~4시 위치',
      '캐필러리: 손상 없음',
      '필터 스트레이너: 깨끗'
    ],
    failureSymptoms: [
      '과열도 높음 → 스타빙 (Starving)',
      '과열도 낮음 → 플러딩 (Flooding)',
      '과열도 변동 → 헌팅 (Hunting)'
    ],
    relatedErrors: [],
    relatedLink: { text: 'TXV 마법사로 이동', nav: 'diag', sub: 'txv' },
    checkPoints: ['과열도 측정', '센싱벌브 위치/단열', '필터 스트레이너', '사이트글라스 상태'],
    diagHighlight: ['meteringRestriction', 'txvOverfeed']
  },

  evaporator: {
    name_kr: '증발기',
    name_en: 'Evaporator',
    role: '저압 냉매가 기화하며 주변 공기의 열을 흡수하여 냉각합니다.',
    normalConditions: [
      'DTD: 30~40°F (설계온도차)',
      'ΔT (공기측): 15~22°F',
      '코일 전체 균등 냉각',
      '결빙 없음'
    ],
    failureSymptoms: ['결빙/착상', '냉각 부족', '물방울/누수', '이상 착상 패턴 (부분 착상)'],
    relatedErrors: ['Daikin: A1 (실내기 이상)', 'Samsung: E1xx (실내기 센서)'],
    checkPoints: ['에어필터 상태', '코일 청결', '착상 패턴', 'ΔT 측정', '드레인 배수'],
    diagHighlight: ['lowAirflow', 'lowCharge']
  },

  receiver: {
    name_kr: '수액기 / 필터드라이어',
    name_en: 'Receiver / Filter Drier',
    role: '액냉매를 저장하고, 수분과 이물질을 제거하여 계량장치를 보호합니다.',
    normalConditions: [
      '전후 온도차: <3°F',
      '표면 결로/결빙 없음',
      '수분 인디케이터: 녹색 (건조)'
    ],
    failureSymptoms: ['전후 온도차 >3°F (막힘)', '표면 결빙 (심각 막힘)', '사이트글라스 변색 (수분)'],
    relatedErrors: [],
    checkPoints: ['입구/출구 온도차', '표면 상태', '사이트글라스 수분 인디케이터'],
    diagHighlight: ['meteringRestriction']
  },

  sightGlass: {
    name_kr: '사이트글라스',
    name_en: 'Sight Glass',
    role: '냉매 흐름 상태를 시각적으로 확인합니다. 기포 유무로 냉매량을 판단합니다.',
    normalConditions: [
      '맑은 흐름 (기포 없음) = 충분한 액냉매',
      '수분 인디케이터: 녹색'
    ],
    failureSymptoms: ['기포 발생 → 냉매 부족 또는 제한', '노란색 → 수분 혼입', '완전 안개 → 심각 부족'],
    relatedErrors: [],
    checkPoints: ['기포 유무 확인', '수분 인디케이터 색상', '정상 운전 중 관찰'],
    diagHighlight: ['lowCharge']
  },

  accumulator: {
    name_kr: '어큐뮬레이터',
    name_en: 'Accumulator',
    role: '컴프레서 흡입 전 액냉매를 분리하여 리퀴드 슬러깅을 방지합니다.',
    normalConditions: [
      '하단 결로/결빙 없음',
      '오일 리턴 정상'
    ],
    failureSymptoms: ['하단 결빙 (액냉매 과다)', '오일 트래핑 (오일 부족)'],
    relatedErrors: [],
    checkPoints: ['하단 온도 확인', '컴프레서 오일 레벨', '결빙 패턴'],
    diagHighlight: ['overcharge', 'txvOverfeed']
  }
};

// Measurement point definitions
const CYCLE_MEASURE_POINTS = {

  Pd: {
    name_kr: '토출압력',
    name_en: 'Discharge Pressure',
    abbr: 'Pd',
    unit: 'psig',
    inputType: 'pressure',
    description: '컴프레서 토출측 압력 (고압)',
    normalRange: '냉매/조건별 상이',
    getStatus: (val, ctx) => {
      if (!ctx.condensingSatTemp) return 'info';
      const ctoa = ctx.condensingSatTemp - (ctx.Tamb || 95);
      if (ctoa >= 15 && ctoa <= 30) return 'normal';
      if (ctoa > 30 && ctoa <= 40) return 'caution';
      return 'danger';
    }
  },

  Ps: {
    name_kr: '흡입압력',
    name_en: 'Suction Pressure',
    abbr: 'Ps',
    unit: 'psig',
    inputType: 'pressure',
    description: '컴프레서 흡입측 압력 (저압)',
    normalRange: '냉매/조건별 상이',
    getStatus: (val, ctx) => {
      if (!ctx.suctionSatTemp) return 'info';
      const dtd = (ctx.Tret || 75) - ctx.suctionSatTemp;
      if (dtd >= 30 && dtd <= 40) return 'normal';
      if (dtd > 40 && dtd <= 50) return 'caution';
      return 'danger';
    }
  },

  SH: {
    name_kr: '과열도',
    name_en: 'Superheat',
    abbr: 'SH',
    get unit() { return Settings.tempLabel(); },
    inputType: 'temp_or_calc',
    inputLabel: '석션라인 실측온도',
    description: '과열도 = 석션라인 온도 − 포화온도(Dew)',
    normalRange: '5~15°F (TXV)',
    getStatus: (val) => {
      if (val >= 5 && val <= 15) return 'normal';
      if ((val >= 0 && val < 5) || (val > 15 && val <= 25)) return 'caution';
      return 'danger';
    }
  },

  SC: {
    name_kr: '과냉도',
    name_en: 'Subcooling',
    abbr: 'SC',
    get unit() { return Settings.tempLabel(); },
    inputType: 'temp_or_calc',
    inputLabel: '리퀴드라인 실측온도',
    description: '과냉도 = 포화온도(Bubble) − 리퀴드라인 온도',
    normalRange: '8~14°F (TXV)',
    getStatus: (val) => {
      if (val >= 5 && val <= 18) return 'normal';
      if ((val >= 0 && val < 5) || (val > 18 && val <= 25)) return 'caution';
      return 'danger';
    }
  },

  DLT: {
    name_kr: '토출온도',
    name_en: 'Discharge Line Temp',
    abbr: 'DLT',
    get unit() { return Settings.tempLabel(); },
    inputType: 'temp',
    description: '컴프레서 토출 배관 온도',
    normalRange: '150~225°F',
    getStatus: (val) => {
      if (val >= 150 && val <= 225) return 'normal';
      if (val > 225 && val <= 275) return 'caution';
      if (val > 275) return 'danger';
      return 'info';
    }
  },

  Tret: {
    name_kr: '리턴공기',
    name_en: 'Return Air Temp',
    abbr: 'Tret',
    get unit() { return Settings.tempLabel(); },
    inputType: 'temp',
    description: '증발기 입구 공기 온도 (실내 리턴)',
    normalRange: '70~80°F (냉방)',
    getStatus: () => 'info'
  },

  Tsup: {
    name_kr: '공급공기',
    name_en: 'Supply Air Temp',
    abbr: 'Tsup',
    get unit() { return Settings.tempLabel(); },
    inputType: 'temp',
    description: '증발기 출구 공기 온도 (공급)',
    normalRange: '55~65°F (냉방)',
    getStatus: () => 'info'
  },

  Tamb: {
    name_kr: '외기온도',
    name_en: 'Ambient Temp',
    abbr: 'Tamb',
    get unit() { return Settings.tempLabel(); },
    inputType: 'temp',
    description: '응축기 입구 외기 온도',
    normalRange: '변동',
    getStatus: () => 'info'
  },

  DT: {
    name_kr: '델타T',
    name_en: 'Delta T',
    abbr: 'ΔT',
    get unit() { return Settings.tempLabel(); },
    inputType: 'auto',
    description: 'ΔT = 리턴공기 − 공급공기',
    normalRange: '15~22°F (냉방)',
    getStatus: (val) => {
      if (val >= 15 && val <= 22) return 'normal';
      if ((val >= 10 && val < 15) || (val > 22 && val <= 28)) return 'caution';
      return 'danger';
    }
  }
};

// Diagnosis → component highlight mapping
const DIAG_COMPONENT_MAP = {
  normal:               [],
  lowCharge:            ['evaporator', 'sightGlass', 'receiver'],
  meteringRestriction:  ['txv', 'receiver', 'sightGlass'],
  overcharge:           ['condenser', 'accumulator', 'compressor'],
  compressorWeak:       ['compressor'],
  txvOverfeed:          ['txv', 'accumulator'],
  lowAirflow:           ['evaporator']
};

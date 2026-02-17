// ===================================================
// HVAC Pulse — Error Codes Database
// 10 manufacturers, 150+ error codes
// Static data loaded in memory for fast search
// ===================================================

const ERROR_CODES_DB = [

  // =============================================
  // 1. Daikin VRV (다이킨)
  // =============================================
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'E0',
    description_kr: '안전장치 작동 (보호 정지)',
    description_en: 'Safety device activated (protective stop)',
    severity: 'critical',
    causes: ['고압/저압 보호 장치 작동', '과전류 보호', '기타 안전장치 트립'],
    checkSteps: [
      '에러 이력 확인 (리모컨 또는 서비스 모드)',
      '고압/저압 스위치 상태 확인',
      '컴프레서 운전 전류 측정',
      '냉매 압력 확인 (고압/저압)',
      '안전장치 리셋 후 재운전 시 재발 여부 확인'
    ],
    relatedParts: ['고압 스위치', '저압 스위치', '과부하 릴레이']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'E1',
    description_kr: '실외기 기판 에러',
    description_en: 'Outdoor unit PCB error',
    severity: 'critical',
    causes: ['기판 불량', '전원 이상', '커넥터 접촉 불량'],
    checkSteps: [
      '실외기 기판 LED 상태 확인',
      '전원 전압 측정 (정격 ±10%)',
      '커넥터 탈착 후 재삽입',
      '기판 퓨즈 확인',
      '기판 교체 검토'
    ],
    relatedParts: ['실외기 메인 PCB', '퓨즈', '커넥터']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'E3',
    description_kr: '고압 이상 (HP 트립)',
    description_en: 'High pressure abnormality (HP trip)',
    severity: 'critical',
    causes: ['응축기 오염', '실외 팬 불량', '냉매 과충전', '공기 혼입', '배관 막힘'],
    checkSteps: [
      '응축기 코일 청소 상태 확인',
      '실외 팬 모터 운전 확인',
      '토출 압력 측정',
      '과냉도 확인 (과충전 의심)',
      '배관 밸브 개폐 상태 확인',
      '비응축가스(공기) 혼입 여부 확인'
    ],
    relatedParts: ['응축기', '실외 팬 모터', '고압 스위치', '서비스 밸브']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'E4',
    description_kr: '저압 이상 (LP 트립)',
    description_en: 'Low pressure abnormality (LP trip)',
    severity: 'critical',
    causes: ['냉매 부족 (누설)', '증발기 동결', '필터 막힘', 'TXV/EXV 불량', '배관 막힘'],
    checkSteps: [
      '냉매 누설 점검 (전자식 리크 디텍터)',
      '흡입 압력 측정',
      '과열도 확인 (냉매 부족 시 높음)',
      '증발기 코일 상태 확인 (착상/오염)',
      'EXV 작동 확인',
      '필터 드라이어 ΔT 확인'
    ],
    relatedParts: ['저압 스위치', 'EXV', '필터 드라이어', '증발기']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'E5',
    description_kr: '인버터 컴프레서 과부하 (과전류)',
    description_en: 'Inverter compressor overload (overcurrent)',
    severity: 'critical',
    causes: ['컴프레서 과열', '전원 불량', '냉매 과충전', '컴프레서 기계적 불량'],
    checkSteps: [
      '컴프레서 운전 전류 측정 (RLA 대비)',
      '전원 전압 확인 (정격 ±10%)',
      '흡입/토출 압력 확인',
      '과열도/과냉도 확인',
      '컴프레서 절연저항 측정 (메거)'
    ],
    relatedParts: ['컴프레서', 'INV 기판', '컨택터', 'CT 센서']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'E6',
    description_kr: '표준 컴프레서 잠김/과전류',
    description_en: 'Standard compressor locked/overcurrent',
    severity: 'critical',
    causes: ['컴프레서 기계적 잠김', '전원 불량', '시동 회로 불량'],
    checkSteps: [
      '컴프레서 저항 측정 (C-R, C-S)',
      '기동 컨택터 상태 확인',
      '전원 전압/결상 확인',
      '컴프레서 절연저항 (메거)',
      '오일 레벨 확인'
    ],
    relatedParts: ['컴프레서', '컨택터', '과부하 릴레이']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'E7',
    description_kr: '실외 팬 모터 이상',
    description_en: 'Outdoor fan motor abnormality',
    severity: 'warning',
    causes: ['팬 모터 소손', '커넥터 불량', '팬 모터 기판 불량', '기계적 잠김'],
    checkSteps: [
      '팬 모터 회전 확인 (수동 회전 테스트)',
      '팬 모터 저항 측정',
      '커넥터 연결 상태 확인',
      '팬 모터 기판 확인',
      '팬 블레이드 이물질 확인'
    ],
    relatedParts: ['실외 팬 모터', '팬 모터 PCB']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'E9',
    description_kr: '전자 팽창밸브(EXV) 이상',
    description_en: 'Electronic expansion valve abnormality',
    severity: 'warning',
    causes: ['EXV 코일 소손', '커넥터 불량', 'EXV 기계적 고착'],
    checkSteps: [
      'EXV 코일 저항 측정',
      '커넥터 연결 상태 확인',
      'EXV 구동 소리 확인',
      '과열도/과냉도로 작동 상태 간접 확인',
      'EXV 교체 검토'
    ],
    relatedParts: ['EXV', 'EXV 코일', 'EXV 구동 기판']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'EA',
    description_kr: '4-way 밸브 이상',
    description_en: 'Four-way valve abnormality',
    severity: 'warning',
    causes: ['4-way 밸브 코일 불량', '밸브 기계적 고착', '냉매 압력 불균형'],
    checkSteps: [
      '4-way 밸브 코일 저항 측정',
      '코일 전압 인가 시 작동음 확인',
      '냉/난방 전환 시 배관 온도 변화 확인',
      '밸브 전후 배관 온도 비교'
    ],
    relatedParts: ['4-way 밸브', '4-way 밸브 코일']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'F3',
    description_kr: '토출관 온도 이상 (고온)',
    description_en: 'Discharge pipe temperature abnormality (high)',
    severity: 'critical',
    causes: ['냉매 부족', '과열 운전', '컴프레서 불량', '흡입가스 과열'],
    checkSteps: [
      '토출관 온도 측정 (서미스터 값 확인)',
      '과열도 확인',
      '냉매 충전량 확인',
      '흡입/토출 압력 확인',
      '컴프레서 오일 레벨 확인'
    ],
    relatedParts: ['토출관 서미스터', '컴프레서']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'F6',
    description_kr: '응축기 과부하',
    description_en: 'Condenser overload',
    severity: 'warning',
    causes: ['응축기 오염', '외기온도 과고', '팬 성능 저하'],
    checkSteps: [
      '응축기 코일 청소',
      '팬 모터 운전 상태 확인',
      '토출 압력/응축 온도 확인',
      '외기온도 확인'
    ],
    relatedParts: ['응축기', '실외 팬 모터']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'H8',
    description_kr: '컴프레서 전류 센서(CT) 이상',
    description_en: 'Compressor current sensor (CT) abnormality',
    severity: 'warning',
    causes: ['CT 센서 불량', '배선 이상', '기판 불량'],
    checkSteps: [
      'CT 센서 장착 상태 확인',
      'CT 센서 출력값 확인',
      '배선 연결 상태',
      '기판 CT 입력 단자 확인'
    ],
    relatedParts: ['CT 센서', '메인 PCB']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'J3',
    description_kr: '토출관 서미스터 이상',
    description_en: 'Discharge pipe thermistor abnormality',
    severity: 'warning',
    causes: ['서미스터 단선/단락', '커넥터 불량', '기판 입력부 불량'],
    checkSteps: [
      '서미스터 저항값 측정 (온도 대비)',
      '커넥터 탈착 후 재삽입',
      '배선 상태 확인',
      '서미스터 교체'
    ],
    relatedParts: ['토출관 서미스터']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'J6',
    description_kr: '열교환기 온도 센서 이상',
    description_en: 'Heat exchanger temperature sensor abnormality',
    severity: 'warning',
    causes: ['센서 단선/단락', '접촉 불량'],
    checkSteps: [
      '센서 저항값 측정',
      '커넥터 상태 확인',
      '센서 교체'
    ],
    relatedParts: ['열교환기 온도 센서']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'L1',
    description_kr: '인버터 기판 이상',
    description_en: 'Inverter PCB abnormality',
    severity: 'critical',
    causes: ['인버터 기판 불량', '전원 이상', '컴프레서 단락'],
    checkSteps: [
      '인버터 기판 LED 확인',
      '전원 전압 측정',
      '컴프레서 절연저항 측정',
      '인버터 기판 교체'
    ],
    relatedParts: ['인버터 PCB', '컴프레서']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'L4',
    description_kr: '방열핀 온도 상승 이상',
    description_en: 'Heat sink temperature rise abnormality',
    severity: 'warning',
    causes: ['방열핀 오염', '냉각 부족', '과부하 운전'],
    checkSteps: [
      '인버터 방열핀 청소',
      '냉각 팬 작동 확인',
      '주변 환기 상태 확인'
    ],
    relatedParts: ['인버터 방열핀', '냉각 팬']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'L5',
    description_kr: 'INV 컴프레서 과전류 (순간)',
    description_en: 'INV compressor instantaneous overcurrent',
    severity: 'critical',
    causes: ['순간 과전류', '전원 불안정', '컴프레서 기계적 이상'],
    checkSteps: [
      '전원 전압 안정성 확인',
      '컴프레서 절연저항 측정',
      '기동 시 전류 패턴 확인',
      '인버터 기판 확인'
    ],
    relatedParts: ['컴프레서', '인버터 PCB']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'P1',
    description_kr: '전원 불균형/결상',
    description_en: 'Power supply imbalance/phase loss',
    severity: 'critical',
    causes: ['3상 전원 결상', '전압 불균형 (>2%)', '배선 불량'],
    checkSteps: [
      '3상 전압 각각 측정 (R-S, S-T, T-R)',
      '전압 불균형률 계산',
      '배전반 차단기 상태 확인',
      '배선 연결 상태 확인'
    ],
    relatedParts: ['전원 단자대', '차단기']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'U0',
    description_kr: '냉매 부족 검출',
    description_en: 'Refrigerant shortage detected',
    severity: 'critical',
    causes: ['냉매 누설', '배관 접속부 누설', '밸브 미개방'],
    checkSteps: [
      '냉매 누설 점검 (전자식 디텍터)',
      '흡입 압력 확인',
      '과열도 확인 (높음 = 부족)',
      '배관 접속부 비눗물 테스트',
      '서비스 밸브 개폐 확인'
    ],
    relatedParts: ['배관', '플레어 너트', '서비스 밸브']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'U2',
    description_kr: '전원 이상 (저전압/과전압)',
    description_en: 'Power supply abnormality (under/over voltage)',
    severity: 'warning',
    causes: ['전원 전압 이상', '전원 품질 불량'],
    checkSteps: [
      '전원 전압 측정 (정격 ±10%)',
      '전원 안정성 확인 (전압 변동)',
      '배전반 상태 확인'
    ],
    relatedParts: ['전원 단자대']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'U4',
    description_kr: '실내-실외 통신 이상',
    description_en: 'Indoor-outdoor communication error',
    severity: 'warning',
    causes: ['통신선 단선/단락', '기판 통신부 불량', '노이즈 간섭'],
    checkSteps: [
      '통신선 연결 상태 확인 (F1, F2)',
      '통신선 전압 측정 (DC 약 5V 펄스)',
      '통신선 극성 확인',
      '노이즈 원 제거 (강전선과 이격)',
      '기판 통신 LED 확인'
    ],
    relatedParts: ['통신선', '메인 PCB']
  },
  {
    manufacturer: 'Daikin', series: 'VRV', code: 'UA',
    description_kr: '기종 설정 미완료',
    description_en: 'Unit type setting incomplete',
    severity: 'info',
    causes: ['시운전 시 기종 설정 미입력', '기판 교체 후 재설정 필요'],
    checkSteps: [
      '서비스 모드에서 기종/용량 설정 확인',
      '실내기 어드레스 설정 확인',
      '시운전 가이드에 따라 설정 완료'
    ],
    relatedParts: ['메인 PCB']
  },

  // =============================================
  // 2. Samsung DVM (삼성)
  // =============================================
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E101',
    description_kr: '통신 이상 (실내-실외)',
    description_en: 'Communication error (indoor-outdoor)',
    severity: 'warning',
    causes: ['통신선 단선/단락', '통신선 극성 반대', '기판 통신부 불량'],
    checkSteps: [
      '통신선 (F1, F2, F3) 연결 상태 확인',
      '통신선 극성 확인',
      '통신선 전압 파형 확인',
      '강전선과 이격 확인',
      '기판 LED 상태 확인'
    ],
    relatedParts: ['통신선', '메인 PCB']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E121',
    description_kr: '실내기 통신 에러',
    description_en: 'Indoor unit communication error',
    severity: 'warning',
    causes: ['실내기 기판 불량', '통신선 불량', '어드레스 중복'],
    checkSteps: [
      '실내기 어드레스 설정 확인 (중복 여부)',
      '통신선 연결 상태',
      '실내기 기판 LED 확인',
      '기판 리셋'
    ],
    relatedParts: ['실내기 PCB', '통신선']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E154',
    description_kr: '실내 팬 이상',
    description_en: 'Indoor fan abnormality',
    severity: 'warning',
    causes: ['팬 모터 불량', '팬 모터 커넥터 불량', '이물질로 인한 잠김'],
    checkSteps: [
      '팬 수동 회전 테스트',
      '팬 모터 커넥터 확인',
      '팬 모터 저항 측정',
      '팬 블레이드 이물질 확인'
    ],
    relatedParts: ['실내 팬 모터']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E201',
    description_kr: '컴프레서 과전류',
    description_en: 'Compressor overcurrent',
    severity: 'critical',
    causes: ['컴프레서 과부하', '전원 이상', '냉매 과충전', '컴프레서 불량'],
    checkSteps: [
      '컴프레서 운전 전류 측정 (RLA 대비)',
      '전원 전압 확인',
      '흡입/토출 압력 확인',
      '과열도/과냉도 확인',
      '컴프레서 절연저항 측정'
    ],
    relatedParts: ['컴프레서', 'CT 센서', '인버터 모듈']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E202',
    description_kr: '컴프레서 잠김',
    description_en: 'Compressor locked rotor',
    severity: 'critical',
    causes: ['컴프레서 기계적 잠김', '오일 부족', '리퀴드백'],
    checkSteps: [
      '컴프레서 절연저항 측정',
      '기동 시 전류 패턴 확인',
      '오일 레벨 확인',
      '크랭크케이스 히터 작동 확인'
    ],
    relatedParts: ['컴프레서', '크랭크케이스 히터']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E211',
    description_kr: '전원 결상/역상',
    description_en: 'Phase loss/phase reversal',
    severity: 'critical',
    causes: ['3상 전원 결상', '역상', '퓨즈 용단'],
    checkSteps: [
      '3상 전압 각각 측정',
      '상순 확인 (위상 테스터)',
      '배전반 퓨즈/차단기 확인',
      'R-S-T 배선 확인'
    ],
    relatedParts: ['전원 단자대', '차단기']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E221',
    description_kr: 'TH5 (토출) 온도센서 이상',
    description_en: 'TH5 (discharge) temperature sensor abnormality',
    severity: 'warning',
    causes: ['센서 단선/단락', '커넥터 불량'],
    checkSteps: [
      '센서 저항값 측정',
      '커넥터 확인',
      '센서 교체'
    ],
    relatedParts: ['토출 온도센서 (TH5)']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E231',
    description_kr: '고압 스위치 작동',
    description_en: 'High pressure switch activated',
    severity: 'critical',
    causes: ['냉매 과충전', '응축기 오염', '팬 불량', '비응축가스'],
    checkSteps: [
      '토출 압력 측정',
      '응축기 코일 청소',
      '팬 모터 운전 확인',
      '과냉도 확인',
      '고압 스위치 리셋'
    ],
    relatedParts: ['고압 스위치', '응축기', '실외 팬 모터']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E237',
    description_kr: '저압 이상',
    description_en: 'Low pressure abnormality',
    severity: 'critical',
    causes: ['냉매 부족', 'EXV 불량', '필터 막힘', '증발기 동결'],
    checkSteps: [
      '흡입 압력 측정',
      '과열도 확인',
      '냉매 누설 점검',
      'EXV 작동 확인',
      '에어필터 상태 확인'
    ],
    relatedParts: ['저압 센서', 'EXV', '필터 드라이어']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E251',
    description_kr: '실외 팬 모터 이상',
    description_en: 'Outdoor fan motor abnormality',
    severity: 'warning',
    causes: ['팬 모터 소손', '커넥터 불량', '이물질 잠김'],
    checkSteps: [
      '팬 모터 수동 회전 테스트',
      '모터 저항 측정',
      '커넥터 확인',
      '팬 블레이드 확인'
    ],
    relatedParts: ['실외 팬 모터']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E301',
    description_kr: '냉매 온도 센서 이상',
    description_en: 'Refrigerant temperature sensor abnormality',
    severity: 'warning',
    causes: ['센서 단선/단락', '커넥터 불량'],
    checkSteps: [
      '센서 저항값 측정',
      '커넥터 확인',
      '센서 교체'
    ],
    relatedParts: ['냉매 온도센서']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E401',
    description_kr: '냉매 과충전/부족',
    description_en: 'Refrigerant overcharge/shortage',
    severity: 'critical',
    causes: ['냉매 누설', '초기 충전량 오류', '배관 길이 미반영'],
    checkSteps: [
      '과열도/과냉도 측정',
      '냉매 누설 점검',
      '배관 길이에 따른 추가 충전량 확인',
      '충전량 재조정'
    ],
    relatedParts: ['배관', '서비스 밸브']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E402',
    description_kr: '시스템 이상 (EXV)',
    description_en: 'System abnormality (EXV)',
    severity: 'warning',
    causes: ['EXV 불량', 'EXV 코일 소손', '이물질로 인한 고착'],
    checkSteps: [
      'EXV 코일 저항 측정',
      'EXV 구동 소리 확인',
      '과열도/과냉도 확인',
      'EXV 교체 검토'
    ],
    relatedParts: ['EXV', 'EXV 코일']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E416',
    description_kr: '냉매 회수 운전',
    description_en: 'Refrigerant recovery operation',
    severity: 'info',
    causes: ['정상 운전 — 냉매 회수 모드 중'],
    checkSteps: [
      '냉매 회수 운전 완료 대기',
      '회수 운전이 반복될 경우 냉매량 확인'
    ],
    relatedParts: []
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E440',
    description_kr: '실내기 동결 방지',
    description_en: 'Indoor unit freeze protection',
    severity: 'info',
    causes: ['에어필터 막힘', '증발기 오염', '풍량 부족'],
    checkSteps: [
      '에어필터 청소/교체',
      '증발기 코일 상태 확인',
      '팬 모터 운전 확인',
      '흡입 그릴 막힘 확인'
    ],
    relatedParts: ['에어필터', '증발기', '실내 팬 모터']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E441',
    description_kr: '토출 온도 과열 방지',
    description_en: 'Discharge temperature overheat protection',
    severity: 'warning',
    causes: ['냉매 부족', '과열 운전', '에어플로우 부족'],
    checkSteps: [
      '토출 온도 측정',
      '과열도 확인',
      '냉매 충전량 확인',
      '응축기/증발기 상태 확인'
    ],
    relatedParts: ['토출 온도센서', '컴프레서']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E464',
    description_kr: 'CT(전류) 센서 이상',
    description_en: 'CT (current) sensor abnormality',
    severity: 'warning',
    causes: ['CT 센서 불량', '장착 불량', '배선 이상'],
    checkSteps: [
      'CT 센서 장착 상태 확인',
      'CT 센서 출력값 확인',
      '클램프 미터로 실제 전류 대비'
    ],
    relatedParts: ['CT 센서']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E556',
    description_kr: '인버터 이상 (IPM)',
    description_en: 'Inverter abnormality (IPM)',
    severity: 'critical',
    causes: ['IPM 모듈 소손', '전원 이상', '컴프레서 단락'],
    checkSteps: [
      '인버터 모듈 확인',
      '컴프레서 절연저항 측정',
      '전원 전압 확인',
      'INV 기판 교체'
    ],
    relatedParts: ['인버터 모듈 (IPM)', 'INV PCB']
  },
  {
    manufacturer: 'Samsung', series: 'DVM', code: 'E559',
    description_kr: '인버터 과열',
    description_en: 'Inverter overheat',
    severity: 'warning',
    causes: ['방열핀 오염', '냉각 부족', '과부하 운전'],
    checkSteps: [
      '인버터 방열핀 청소',
      '냉각 팬 작동 확인',
      '주변 환기 상태'
    ],
    relatedParts: ['인버터 방열핀', '냉각 팬']
  },

  // =============================================
  // 3. LG Multi V (LG)
  // =============================================
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH01',
    description_kr: '실내 온도센서 이상',
    description_en: 'Indoor temperature sensor abnormality',
    severity: 'warning',
    causes: ['센서 단선/단락', '커넥터 불량'],
    checkSteps: ['센서 저항값 측정', '커넥터 확인', '센서 교체'],
    relatedParts: ['실내 온도센서']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH02',
    description_kr: '실내 배관센서 이상',
    description_en: 'Indoor pipe sensor abnormality',
    severity: 'warning',
    causes: ['센서 단선/단락', '센서 탈락'],
    checkSteps: ['센서 저항값 측정', '배관 밀착 상태 확인', '센서 교체'],
    relatedParts: ['실내 배관센서']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH05',
    description_kr: '실내-실외 통신 에러',
    description_en: 'Indoor-outdoor communication error',
    severity: 'warning',
    causes: ['통신선 불량', '어드레스 설정 오류', '기판 불량'],
    checkSteps: [
      '통신선 연결 상태 확인',
      '어드레스 설정 확인',
      '통신선 극성 확인',
      '기판 LED 상태 확인'
    ],
    relatedParts: ['통신선', 'PCB']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH10',
    description_kr: '실내 팬 모터 이상',
    description_en: 'Indoor fan motor abnormality',
    severity: 'warning',
    causes: ['팬 모터 불량', '커넥터 불량', '이물질 잠김'],
    checkSteps: ['팬 수동 회전 테스트', '모터 저항 측정', '커넥터 확인'],
    relatedParts: ['실내 팬 모터']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH21',
    description_kr: '인버터 컴프레서 과전류',
    description_en: 'Inverter compressor overcurrent',
    severity: 'critical',
    causes: ['컴프레서 과부하', '전원 이상', '냉매 이상'],
    checkSteps: [
      '컴프레서 운전 전류 측정',
      '전원 전압 확인',
      '흡입/토출 압력 확인',
      '컴프레서 절연저항 측정'
    ],
    relatedParts: ['컴프레서', '인버터 모듈']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH22',
    description_kr: '정속 컴프레서 과전류',
    description_en: 'Constant speed compressor overcurrent',
    severity: 'critical',
    causes: ['컴프레서 과부하', '시동 불량', '전원 이상'],
    checkSteps: [
      '컴프레서 운전 전류 측정',
      '기동 컨택터 상태 확인',
      '전원 전압 확인',
      '컴프레서 절연저항 측정'
    ],
    relatedParts: ['컴프레서', '컨택터']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH23',
    description_kr: '컴프레서 토출 온도 이상',
    description_en: 'Compressor discharge temperature abnormality',
    severity: 'critical',
    causes: ['냉매 부족', '과열 운전', '컴프레서 불량'],
    checkSteps: [
      '토출 온도 측정',
      '과열도 확인',
      '냉매 충전량 확인',
      '컴프레서 오일 확인'
    ],
    relatedParts: ['토출 온도센서', '컴프레서']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH26',
    description_kr: '실외기 과부하',
    description_en: 'Outdoor unit overload',
    severity: 'warning',
    causes: ['응축기 오염', '고온 환경', '과부하 운전'],
    checkSteps: [
      '응축기 코일 청소',
      '실외 팬 확인',
      '토출 압력 확인'
    ],
    relatedParts: ['응축기', '실외 팬']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH27',
    description_kr: '고압 이상 (HPS 작동)',
    description_en: 'High pressure abnormality (HPS activated)',
    severity: 'critical',
    causes: ['냉매 과충전', '응축기 오염', '팬 불량', '배관 밸브 미개방'],
    checkSteps: [
      '토출 압력 측정',
      '응축기 코일 청소',
      '팬 모터 운전 확인',
      '서비스 밸브 확인',
      '과냉도 확인'
    ],
    relatedParts: ['고압 스위치', '응축기', '실외 팬']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH32',
    description_kr: '토출 온도 센서 이상',
    description_en: 'Discharge temperature sensor abnormality',
    severity: 'warning',
    causes: ['센서 단선/단락', '커넥터 불량'],
    checkSteps: ['센서 저항값 측정', '커넥터 확인', '센서 교체'],
    relatedParts: ['토출 온도센서']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH33',
    description_kr: '실외 흡입 온도센서 이상',
    description_en: 'Outdoor suction temperature sensor abnormality',
    severity: 'warning',
    causes: ['센서 단선/단락', '센서 탈락'],
    checkSteps: ['센서 저항값 측정', '배관 밀착 상태 확인', '센서 교체'],
    relatedParts: ['흡입 온도센서']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH38',
    description_kr: '응축기 온도센서 이상',
    description_en: 'Condenser temperature sensor abnormality',
    severity: 'warning',
    causes: ['센서 단선/단락'],
    checkSteps: ['센서 저항값 측정', '커넥터 확인', '센서 교체'],
    relatedParts: ['응축기 온도센서']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH40',
    description_kr: 'CT 센서 이상',
    description_en: 'CT sensor abnormality',
    severity: 'warning',
    causes: ['CT 센서 불량', '장착 불량'],
    checkSteps: ['CT 센서 장착 상태 확인', 'CT 출력값 확인'],
    relatedParts: ['CT 센서']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH44',
    description_kr: '실외 팬 이상',
    description_en: 'Outdoor fan abnormality',
    severity: 'warning',
    causes: ['팬 모터 불량', '커넥터 불량', '이물질 잠김'],
    checkSteps: ['팬 수동 회전', '모터 저항 측정', '커넥터 확인'],
    relatedParts: ['실외 팬 모터']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH53',
    description_kr: '통신 이상 (실외기간)',
    description_en: 'Communication error (between outdoor units)',
    severity: 'warning',
    causes: ['통신선 불량', '기판 불량'],
    checkSteps: ['통신선 연결 확인', '기판 확인'],
    relatedParts: ['통신선', 'PCB']
  },
  {
    manufacturer: 'LG', series: 'Multi V', code: 'CH62',
    description_kr: '전원 결상/역상',
    description_en: 'Phase loss/phase reversal',
    severity: 'critical',
    causes: ['3상 전원 결상', '역상'],
    checkSteps: ['3상 전압 측정', '상순 확인', '배선 확인'],
    relatedParts: ['전원 단자대']
  },

  // =============================================
  // 4. Mitsubishi City Multi (미쓰비시)
  // =============================================
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'E1',
    description_kr: '리모컨 통신 이상',
    description_en: 'Remote controller communication error',
    severity: 'warning',
    causes: ['리모컨 배선 불량', '리모컨 기판 불량'],
    checkSteps: ['리모컨 배선 확인', '리모컨 교체 테스트'],
    relatedParts: ['리모컨', '통신선']
  },
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'E6',
    description_kr: '실내-실외 통신 이상',
    description_en: 'Indoor-outdoor communication error',
    severity: 'warning',
    causes: ['통신선 단선', '기판 불량', '노이즈'],
    checkSteps: ['통신선 확인', '기판 LED 확인', '노이즈원 제거'],
    relatedParts: ['통신선', 'PCB']
  },
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'E9',
    description_kr: '실내-실외 통신 불가',
    description_en: 'Indoor-outdoor communication failure',
    severity: 'critical',
    causes: ['통신선 완전 단선', '기판 불량', '전원 공급 이상'],
    checkSteps: ['통신선 연속성 테스트', '전원 확인', '기판 교체'],
    relatedParts: ['통신선', 'PCB']
  },
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'P1',
    description_kr: '흡입 센서 이상',
    description_en: 'Suction sensor abnormality',
    severity: 'warning',
    causes: ['센서 단선/단락'],
    checkSteps: ['센서 저항값 측정', '커넥터 확인', '센서 교체'],
    relatedParts: ['흡입 온도센서']
  },
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'P2',
    description_kr: '배관 (응축) 센서 이상',
    description_en: 'Pipe (condenser) sensor abnormality',
    severity: 'warning',
    causes: ['센서 단선/단락', '밀착 불량'],
    checkSteps: ['센서 저항값 측정', '배관 밀착 확인', '센서 교체'],
    relatedParts: ['배관 온도센서']
  },
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'P6',
    description_kr: '동결/과열 감지',
    description_en: 'Freeze/overheat detection',
    severity: 'warning',
    causes: ['에어플로우 부족', '냉매 이상', '필터 막힘'],
    checkSteps: ['에어필터 확인', '풍량 확인', '냉매 상태 확인'],
    relatedParts: ['에어필터', '증발기']
  },
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'P8',
    description_kr: '배관 온도 이상',
    description_en: 'Pipe temperature abnormality',
    severity: 'warning',
    causes: ['냉매 이상', '센서 불량'],
    checkSteps: ['배관 온도 실측', '센서 값 비교', '냉매 상태 확인'],
    relatedParts: ['배관 온도센서']
  },
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'U1',
    description_kr: '고압 이상',
    description_en: 'High pressure abnormality',
    severity: 'critical',
    causes: ['응축기 오염', '팬 불량', '냉매 과충전'],
    checkSteps: ['토출 압력 측정', '응축기 청소', '팬 확인', '과냉도 확인'],
    relatedParts: ['고압 센서', '응축기', '실외 팬']
  },
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'U2',
    description_kr: '저압 이상/냉매 부족',
    description_en: 'Low pressure abnormality/refrigerant shortage',
    severity: 'critical',
    causes: ['냉매 누설', '필터 막힘', 'EXV 불량'],
    checkSteps: ['흡입 압력 측정', '과열도 확인', '누설 점검', 'EXV 확인'],
    relatedParts: ['저압 센서', 'EXV']
  },
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'U3',
    description_kr: '단락 감지',
    description_en: 'Short circuit detection',
    severity: 'critical',
    causes: ['배선 단락', '모듈 불량', '컴프레서 단락'],
    checkSteps: ['배선 절연 확인', '컴프레서 절연저항', '인버터 모듈 확인'],
    relatedParts: ['배선', '인버터 모듈', '컴프레서']
  },
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'U4',
    description_kr: '고온 이상 (토출)',
    description_en: 'High temperature abnormality (discharge)',
    severity: 'critical',
    causes: ['냉매 부족', '과열 운전'],
    checkSteps: ['토출 온도 측정', '과열도 확인', '냉매 확인'],
    relatedParts: ['토출 온도센서', '컴프레서']
  },
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'U5',
    description_kr: '방열판 온도 이상',
    description_en: 'Heat sink temperature abnormality',
    severity: 'warning',
    causes: ['방열핀 오염', '냉각 부족'],
    checkSteps: ['방열핀 청소', '냉각 팬 확인', '환기 상태 확인'],
    relatedParts: ['방열핀', '냉각 팬']
  },
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'U8',
    description_kr: '실외 팬 과전류',
    description_en: 'Outdoor fan overcurrent',
    severity: 'warning',
    causes: ['팬 모터 불량', '이물질 잠김'],
    checkSteps: ['팬 수동 회전', '모터 전류 측정', '이물질 확인'],
    relatedParts: ['실외 팬 모터']
  },
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'U9',
    description_kr: '저전압 감지',
    description_en: 'Low voltage detection',
    severity: 'warning',
    causes: ['전원 전압 낮음', '전원 품질 불량'],
    checkSteps: ['전원 전압 측정', '배전반 확인'],
    relatedParts: ['전원 단자대']
  },
  {
    manufacturer: 'Mitsubishi', series: 'City Multi', code: 'UA',
    description_kr: '전원 결상',
    description_en: 'Phase loss',
    severity: 'critical',
    causes: ['3상 전원 결상', '퓨즈 용단'],
    checkSteps: ['3상 전압 측정', '퓨즈/차단기 확인'],
    relatedParts: ['전원 단자대', '차단기']
  },

  // =============================================
  // 5. Carrier 칠러 (캐리어)
  // =============================================
  {
    manufacturer: 'Carrier', series: 'Chiller', code: 'AH01',
    description_kr: '냉수 온도 센서 이상',
    description_en: 'Chilled water temperature sensor fault',
    severity: 'warning',
    causes: ['센서 단선/단락', '배선 불량'],
    checkSteps: ['센서 저항값 측정', '배선 확인', '센서 교체'],
    relatedParts: ['냉수 온도센서']
  },
  {
    manufacturer: 'Carrier', series: 'Chiller', code: 'AH02',
    description_kr: '외기 온도 센서 이상',
    description_en: 'Outdoor air temperature sensor fault',
    severity: 'warning',
    causes: ['센서 단선/단락'],
    checkSteps: ['센서 저항값 측정', '센서 교체'],
    relatedParts: ['외기 온도센서']
  },
  {
    manufacturer: 'Carrier', series: 'Chiller', code: 'AH10',
    description_kr: '흡입 압력 센서 이상',
    description_en: 'Suction pressure sensor fault',
    severity: 'warning',
    causes: ['센서 불량', '배선 이상', '신호 범위 이탈'],
    checkSteps: ['센서 출력 신호 확인 (4-20mA)', '배선 확인', '센서 교체'],
    relatedParts: ['흡입 압력 센서']
  },
  {
    manufacturer: 'Carrier', series: 'Chiller', code: 'AH13',
    description_kr: '토출 압력 센서 이상',
    description_en: 'Discharge pressure sensor fault',
    severity: 'warning',
    causes: ['센서 불량', '배선 이상'],
    checkSteps: ['센서 출력 신호 확인', '배선 확인', '센서 교체'],
    relatedParts: ['토출 압력 센서']
  },
  {
    manufacturer: 'Carrier', series: 'Chiller', code: 'AL01',
    description_kr: '냉수 동결 방지 (Freeze Protection)',
    description_en: 'Chilled water freeze protection',
    severity: 'critical',
    causes: ['냉수 유량 부족', '냉수 온도 과저', '제어 이상'],
    checkSteps: [
      '냉수 출구 온도 확인',
      '냉수 유량 확인 (유량 스위치)',
      '냉수 펌프 운전 상태',
      '제어기 설정값 확인',
      '냉수 배관 밸브 개도 확인'
    ],
    relatedParts: ['냉수 온도센서', '유량 스위치', '냉수 펌프']
  },
  {
    manufacturer: 'Carrier', series: 'Chiller', code: 'AL02',
    description_kr: '저압 차단 (LP Cutout)',
    description_en: 'Low pressure cutout',
    severity: 'critical',
    causes: ['냉매 부족', '증발기 오염', '냉수 유량 부족', 'EXV 불량'],
    checkSteps: [
      '흡입 압력 확인',
      '냉매 누설 점검',
      '냉수 유량 확인',
      '증발기 접근온도 확인',
      'EXV 작동 확인'
    ],
    relatedParts: ['저압 센서', 'EXV', '증발기']
  },
  {
    manufacturer: 'Carrier', series: 'Chiller', code: 'AL03',
    description_kr: '고압 차단 (HP Cutout)',
    description_en: 'High pressure cutout',
    severity: 'critical',
    causes: ['응축기 오염', '냉각수 부족', '냉매 과충전', '비응축가스'],
    checkSteps: [
      '토출 압력 확인',
      '응축기 상태 (공냉: 코일 청소, 수냉: 튜브 청소)',
      '냉각수 유량/온도 확인',
      '과냉도 확인'
    ],
    relatedParts: ['고압 센서', '응축기', '냉각수 밸브']
  },
  {
    manufacturer: 'Carrier', series: 'Chiller', code: 'AL04',
    description_kr: '토출 온도 과열',
    description_en: 'Discharge temperature overheat',
    severity: 'critical',
    causes: ['냉매 부족', '과열 운전', '밸브 불량'],
    checkSteps: ['토출 온도 측정', '과열도 확인', '냉매 확인'],
    relatedParts: ['토출 온도센서', '컴프레서']
  },
  {
    manufacturer: 'Carrier', series: 'Chiller', code: 'AL05',
    description_kr: '오일 압력 이상',
    description_en: 'Oil pressure abnormality',
    severity: 'critical',
    causes: ['오일 부족', '오일 펌프 불량', '오일 필터 막힘', '오일 온도 이상'],
    checkSteps: [
      '오일 레벨 확인 (사이트글라스)',
      '오일 압력 측정 (차압)',
      '오일 필터 ΔP 확인',
      '오일 온도 확인',
      '오일 히터 작동 확인'
    ],
    relatedParts: ['오일 펌프', '오일 필터', '오일 히터']
  },
  {
    manufacturer: 'Carrier', series: 'Chiller', code: 'AL06',
    description_kr: '컴프레서 과전류',
    description_en: 'Compressor overcurrent',
    severity: 'critical',
    causes: ['컴프레서 과부하', '전원 이상', '기계적 불량'],
    checkSteps: ['운전 전류 측정', '전원 전압 확인', '부하 상태 확인'],
    relatedParts: ['컴프레서', 'CT 센서']
  },
  {
    manufacturer: 'Carrier', series: 'Chiller', code: 'AL10',
    description_kr: '오일 레벨 저하',
    description_en: 'Oil level low',
    severity: 'warning',
    causes: ['오일 누설', '냉매 측으로 오일 유출', '오일 분리기 불량'],
    checkSteps: [
      '오일 레벨 확인 (사이트글라스)',
      '오일 분리기 상태 확인',
      '오일 보충',
      '냉매 오일 함량 확인'
    ],
    relatedParts: ['오일 사이트글라스', '오일 분리기']
  },
  {
    manufacturer: 'Carrier', series: 'Chiller', code: 'AL12',
    description_kr: '모터 권선 온도 이상',
    description_en: 'Motor winding temperature abnormality',
    severity: 'critical',
    causes: ['과부하 운전', '냉각 부족', '절연 열화'],
    checkSteps: ['모터 온도 확인', '부하 상태 확인', '절연저항 측정'],
    relatedParts: ['모터 온도센서', '컴프레서 모터']
  },
  {
    manufacturer: 'Carrier', series: 'Chiller', code: 'AL22',
    description_kr: '냉수 유량 이상',
    description_en: 'Chilled water flow abnormality',
    severity: 'warning',
    causes: ['냉수 펌프 불량', '밸브 닫힘', '배관 막힘', '유량 스위치 불량'],
    checkSteps: [
      '냉수 펌프 운전 확인',
      '배관 밸브 개도 확인',
      '유량 스위치 작동 테스트',
      '차압 측정'
    ],
    relatedParts: ['냉수 펌프', '유량 스위치', '배관 밸브']
  },

  // =============================================
  // 6. Trane 칠러 (트레인)
  // =============================================
  {
    manufacturer: 'Trane', series: 'Chiller', code: 'LIMP MODE',
    description_kr: '과열도/과냉도 20분 이상 비정상 → 컴프레서 속도 제한',
    description_en: 'SH/SC abnormal >20min → compressor speed limited',
    severity: 'warning',
    causes: ['냉매 충전량 이상', 'EXV 불량', '증발기/응축기 오염'],
    checkSteps: [
      '과열도/과냉도 확인',
      'EXV 작동 상태 확인',
      '냉매 충전량 확인',
      '열교환기 상태 확인'
    ],
    relatedParts: ['EXV', '증발기', '응축기']
  },
  {
    manufacturer: 'Trane', series: 'Chiller', code: 'LIMP MODE LO',
    description_kr: '센서 상실 → 컴프레서 정지',
    description_en: 'Sensor loss → compressor stop',
    severity: 'critical',
    causes: ['압력/온도 센서 불량', '배선 단선'],
    checkSteps: ['모든 센서 상태 확인', '배선 점검', '센서 교체'],
    relatedParts: ['압력 센서', '온도 센서']
  },
  {
    manufacturer: 'Trane', series: 'Chiller', code: 'Low SH',
    description_kr: '저과열도 (≤2°F × 2400 deg·F·sec)',
    description_en: 'Low superheat',
    severity: 'critical',
    causes: ['냉매 과충전', 'EXV 과개방', '냉수 온도 과고'],
    checkSteps: [
      '과열도 실측',
      'EXV 개도 확인',
      '냉수 유량/온도 확인',
      '냉매 충전량 확인'
    ],
    relatedParts: ['EXV', '흡입 온도센서']
  },
  {
    manufacturer: 'Trane', series: 'Chiller', code: 'High SH',
    description_kr: '고과열도',
    description_en: 'High superheat',
    severity: 'warning',
    causes: ['냉매 부족', 'EXV 과제한', '필터 막힘'],
    checkSteps: [
      '과열도 실측',
      '냉매 충전량 확인',
      'EXV 개도 확인',
      '필터 드라이어 ΔT 확인'
    ],
    relatedParts: ['EXV', '필터 드라이어']
  },
  {
    manufacturer: 'Trane', series: 'Chiller', code: 'HP Trip',
    description_kr: '고압 차단',
    description_en: 'High pressure trip',
    severity: 'critical',
    causes: ['응축기 오염', '냉각수 부족', '냉매 과충전'],
    checkSteps: ['토출 압력 확인', '응축기 청소', '냉각수 유량 확인', '과냉도 확인'],
    relatedParts: ['고압 센서', '응축기']
  },
  {
    manufacturer: 'Trane', series: 'Chiller', code: 'LP Trip',
    description_kr: '저압 차단',
    description_en: 'Low pressure trip',
    severity: 'critical',
    causes: ['냉매 부족', '증발기 오염', '냉수 유량 부족'],
    checkSteps: ['흡입 압력 확인', '냉매 누설 점검', '냉수 유량 확인'],
    relatedParts: ['저압 센서', '증발기']
  },
  {
    manufacturer: 'Trane', series: 'Chiller', code: 'Loss of Charge',
    description_kr: '냉매 부족 감지',
    description_en: 'Refrigerant loss of charge',
    severity: 'critical',
    causes: ['냉매 누설', '밸브 미개방'],
    checkSteps: ['냉매 누설 점검', '과열도 확인', '사이트글라스 확인', '밸브 개도 확인'],
    relatedParts: ['배관', '서비스 밸브']
  },
  {
    manufacturer: 'Trane', series: 'Chiller', code: 'Oil Pressure',
    description_kr: '오일 차압 부족',
    description_en: 'Oil differential pressure low',
    severity: 'critical',
    causes: ['오일 부족', '오일 펌프 불량', '오일 필터 막힘'],
    checkSteps: ['오일 레벨 확인', '오일 차압 측정', '오일 필터 확인'],
    relatedParts: ['오일 펌프', '오일 필터']
  },
  {
    manufacturer: 'Trane', series: 'Chiller', code: 'Motor Temp',
    description_kr: '모터 온도 과열',
    description_en: 'Motor temperature overheat',
    severity: 'critical',
    causes: ['과부하', '냉각 부족', '절연 열화'],
    checkSteps: ['모터 온도 확인', '운전 전류 확인', '냉각 상태 확인'],
    relatedParts: ['모터 온도센서', '컴프레서 모터']
  },
  {
    manufacturer: 'Trane', series: 'Chiller', code: 'Freeze Protect',
    description_kr: '냉수 동결 방지',
    description_en: 'Chilled water freeze protection',
    severity: 'critical',
    causes: ['냉수 유량 부족', '냉수 온도 과저'],
    checkSteps: ['냉수 출구 온도 확인', '냉수 유량 확인', '냉수 펌프 확인'],
    relatedParts: ['냉수 온도센서', '유량 스위치']
  },
  {
    manufacturer: 'Trane', series: 'Chiller', code: 'Sensor Fault',
    description_kr: '센서 이상 (포화증발기/석션/응축)',
    description_en: 'Sensor fault (evaporator/suction/condenser)',
    severity: 'warning',
    causes: ['센서 단선/단락', '배선 불량'],
    checkSteps: ['센서 저항/출력값 측정', '배선 확인', '센서 교체'],
    relatedParts: ['온도센서', '압력 센서']
  },

  // =============================================
  // 7. York 칠러 (요크)
  // =============================================
  {
    manufacturer: 'York', series: 'Chiller', code: 'SA',
    description_kr: '흡입 공기 센서 이상',
    description_en: 'Suction air sensor fault',
    severity: 'warning',
    causes: ['센서 불량', '배선 이상'],
    checkSteps: ['센서 저항값 측정', '배선 확인', '센서 교체'],
    relatedParts: ['흡입 공기 센서']
  },
  {
    manufacturer: 'York', series: 'Chiller', code: 'SD',
    description_kr: '토출 공기 센서 이상',
    description_en: 'Discharge air sensor fault',
    severity: 'warning',
    causes: ['센서 불량', '배선 이상'],
    checkSteps: ['센서 저항값 측정', '배선 확인', '센서 교체'],
    relatedParts: ['토출 공기 센서']
  },
  {
    manufacturer: 'York', series: 'Chiller', code: 'SF',
    description_kr: '냉매 온도 센서 이상',
    description_en: 'Refrigerant temperature sensor fault',
    severity: 'warning',
    causes: ['센서 불량'],
    checkSteps: ['센서 저항값 측정', '센서 교체'],
    relatedParts: ['냉매 온도센서']
  },
  {
    manufacturer: 'York', series: 'Chiller', code: 'AL1',
    description_kr: '고압 차단',
    description_en: 'High pressure cutout',
    severity: 'critical',
    causes: ['응축기 오염', '냉각수 부족', '냉매 과충전'],
    checkSteps: ['토출 압력 확인', '응축기 청소', '냉각수 확인'],
    relatedParts: ['고압 스위치', '응축기']
  },
  {
    manufacturer: 'York', series: 'Chiller', code: 'AL2',
    description_kr: '저압 차단',
    description_en: 'Low pressure cutout',
    severity: 'critical',
    causes: ['냉매 부족', '증발기 오염', '유량 부족'],
    checkSteps: ['흡입 압력 확인', '냉매 누설 점검', '유량 확인'],
    relatedParts: ['저압 스위치', '증발기']
  },
  {
    manufacturer: 'York', series: 'Chiller', code: 'AL3',
    description_kr: '오일 압력 이상',
    description_en: 'Oil pressure abnormality',
    severity: 'critical',
    causes: ['오일 부족', '오일 펌프 불량'],
    checkSteps: ['오일 레벨 확인', '오일 차압 측정', '오일 펌프 확인'],
    relatedParts: ['오일 펌프', '오일 사이트글라스']
  },
  {
    manufacturer: 'York', series: 'Chiller', code: 'AL4',
    description_kr: '모터 과열',
    description_en: 'Motor overheat',
    severity: 'critical',
    causes: ['과부하', '냉각 부족'],
    checkSteps: ['모터 온도 확인', '운전 전류 확인', '냉각 상태 확인'],
    relatedParts: ['모터 온도센서']
  },
  {
    manufacturer: 'York', series: 'Chiller', code: 'AL5',
    description_kr: '냉수 유량 이상',
    description_en: 'Chilled water flow abnormality',
    severity: 'warning',
    causes: ['유량 부족', '펌프 불량', '밸브 닫힘'],
    checkSteps: ['유량 스위치 확인', '펌프 운전 확인', '밸브 개도 확인'],
    relatedParts: ['유량 스위치', '냉수 펌프']
  },
  {
    manufacturer: 'York', series: 'Chiller', code: 'AL6',
    description_kr: '동결 방지 (Freeze)',
    description_en: 'Freeze protection',
    severity: 'critical',
    causes: ['냉수 온도 과저', '유량 부족'],
    checkSteps: ['냉수 출구 온도 확인', '유량 확인', '펌프 확인'],
    relatedParts: ['냉수 온도센서', '유량 스위치']
  },

  // =============================================
  // 8. Bitzer 컴프레서 보호 (비쳐)
  // =============================================
  {
    manufacturer: 'Bitzer', series: 'Compressor Protection', code: 'HP',
    description_kr: '고압 보호 작동 (설정값 초과)',
    description_en: 'High pressure protection activated',
    severity: 'critical',
    causes: ['응축기 오염', '냉매 과충전', '팬 불량', '비응축가스'],
    checkSteps: [
      '토출 압력 측정',
      '응축기 청소',
      '팬 운전 확인',
      '과냉도 확인',
      '고압 스위치 설정값 확인'
    ],
    relatedParts: ['고압 스위치', '응축기']
  },
  {
    manufacturer: 'Bitzer', series: 'Compressor Protection', code: 'LP',
    description_kr: '저압 보호 작동',
    description_en: 'Low pressure protection activated',
    severity: 'critical',
    causes: ['냉매 부족', '필터 막힘', '증발기 동결', 'TXV 불량'],
    checkSteps: [
      '흡입 압력 측정',
      '과열도 확인',
      '냉매 누설 점검',
      '필터 드라이어 ΔT 확인',
      'TXV 작동 확인'
    ],
    relatedParts: ['저압 스위치', '필터 드라이어', 'TXV']
  },
  {
    manufacturer: 'Bitzer', series: 'Compressor Protection', code: 'OP',
    description_kr: '오일 차압 부족',
    description_en: 'Oil differential pressure low',
    severity: 'critical',
    causes: ['오일 부족', '오일 펌프 불량', '오일 필터 막힘', '리퀴드백'],
    checkSteps: [
      '오일 레벨 확인 (사이트글라스)',
      '오일 차압 측정 (토출-크랭크)',
      '오일 필터 확인',
      '크랭크케이스 히터 작동 확인',
      '리퀴드백 여부 확인 (과열도)'
    ],
    relatedParts: ['오일 차압 스위치', '오일 펌프', '오일 필터', '크랭크케이스 히터']
  },
  {
    manufacturer: 'Bitzer', series: 'Compressor Protection', code: 'MP',
    description_kr: '모터 보호 (PTC/클릭슨)',
    description_en: 'Motor protection (PTC/Klixon)',
    severity: 'critical',
    causes: ['모터 과열', '과전류', '전원 이상', '절연 열화'],
    checkSteps: [
      '모터 온도 확인 (DLT)',
      '운전 전류 측정',
      '전원 전압 확인',
      '컴프레서 절연저항 측정 (메거)',
      '냉각 상태 확인 (흡입가스 과열)'
    ],
    relatedParts: ['PTC/클릭슨 센서', '컴프레서 모터']
  },
  {
    manufacturer: 'Bitzer', series: 'Compressor Protection', code: 'SE1',
    description_kr: '토출 온도 센서 이상',
    description_en: 'Discharge temperature sensor fault',
    severity: 'warning',
    causes: ['센서 단선/단락', '배선 이상'],
    checkSteps: ['센서 저항값 측정', '배선 확인', '센서 교체'],
    relatedParts: ['토출 온도센서']
  },
  {
    manufacturer: 'Bitzer', series: 'Compressor Protection', code: 'SE2',
    description_kr: '흡입 온도 센서 이상',
    description_en: 'Suction temperature sensor fault',
    severity: 'warning',
    causes: ['센서 단선/단락'],
    checkSteps: ['센서 저항값 측정', '센서 교체'],
    relatedParts: ['흡입 온도센서']
  },
  {
    manufacturer: 'Bitzer', series: 'Compressor Protection', code: 'SE3',
    description_kr: '오일 온도 센서 이상',
    description_en: 'Oil temperature sensor fault',
    severity: 'warning',
    causes: ['센서 단선/단락'],
    checkSteps: ['센서 저항값 측정', '센서 교체'],
    relatedParts: ['오일 온도센서']
  },
  {
    manufacturer: 'Bitzer', series: 'Compressor Protection', code: 'SE4',
    description_kr: '모터 온도 센서 이상',
    description_en: 'Motor temperature sensor fault',
    severity: 'warning',
    causes: ['센서 단선/단락'],
    checkSteps: ['센서 저항값 측정', '센서 교체'],
    relatedParts: ['모터 온도센서']
  },
  {
    manufacturer: 'Bitzer', series: 'Compressor Protection', code: 'PH',
    description_kr: '위상 이상 (결상/역상)',
    description_en: 'Phase abnormality (phase loss/reversal)',
    severity: 'critical',
    causes: ['3상 전원 결상', '역상', '퓨즈 용단'],
    checkSteps: ['3상 전압 측정', '상순 확인', '퓨즈/차단기 확인', 'R-S-T 배선 확인'],
    relatedParts: ['위상 보호 릴레이', '전원 단자대']
  },
  {
    manufacturer: 'Bitzer', series: 'Compressor Protection', code: 'DLT',
    description_kr: '토출 온도 과열 (>130°C)',
    description_en: 'Discharge line temperature high (>130°C / 266°F)',
    severity: 'critical',
    causes: ['냉매 부족', '과열 운전', '압축비 과대', '밸브 불량'],
    checkSteps: [
      '토출 온도 측정 (>130°C = 위험)',
      '과열도 확인',
      '압축비 계산 (>12:1 = 과대)',
      '냉매 충전량 확인',
      '흡입/토출 밸브 리드 상태'
    ],
    relatedParts: ['토출 온도센서', '컴프레서']
  },
  {
    manufacturer: 'Bitzer', series: 'Compressor Protection', code: 'OL',
    description_kr: '과부하',
    description_en: 'Overload',
    severity: 'critical',
    causes: ['과전류', '전원 불량', '기계적 이상'],
    checkSteps: ['운전 전류 측정', '전원 전압 확인', '부하 상태 확인'],
    relatedParts: ['과부하 릴레이', '컴프레서']
  },

  // =============================================
  // 9. Copeland/Emerson CoreSense (코플랜드)
  // =============================================
  {
    manufacturer: 'Copeland', series: 'CoreSense', code: 'Discharge Temp High',
    description_kr: '토출 온도 과열 (>275°F / 135°C)',
    description_en: 'Discharge temperature high (>275°F)',
    severity: 'critical',
    causes: ['냉매 부족', '과열 운전', '리퀴드라인 제한', '밸브 불량'],
    checkSteps: [
      '토출 온도 측정',
      '과열도 확인 (높음 = 냉매 부족)',
      '냉매 충전량 확인',
      '필터 드라이어 ΔT 확인',
      '흡입/토출 압력 확인'
    ],
    relatedParts: ['토출 온도센서', '컴프레서', '필터 드라이어']
  },
  {
    manufacturer: 'Copeland', series: 'CoreSense', code: 'Low Suction SH',
    description_kr: '저과열도 (리퀴드백 위험)',
    description_en: 'Low suction superheat (liquid floodback risk)',
    severity: 'critical',
    causes: ['냉매 과충전', 'TXV 오버피딩', '증발기 부하 감소'],
    checkSteps: [
      '과열도 측정',
      'TXV 조정 (시계방향 — 닫힘)',
      '증발기 에어플로우 확인',
      '냉매 충전량 확인'
    ],
    relatedParts: ['TXV', '증발기']
  },
  {
    manufacturer: 'Copeland', series: 'CoreSense', code: 'High Compression Ratio',
    description_kr: '압축비 과대 (>12:1)',
    description_en: 'High compression ratio (>12:1)',
    severity: 'warning',
    causes: ['저흡입압력', '고토출압력', '양쪽 동시', '밸브 리드 누설'],
    checkSteps: [
      '흡입/토출 압력 측정',
      '압축비 계산 (절대 토출압 / 절대 흡입압)',
      '흡입 압력 저하 원인 조사',
      '토출 압력 상승 원인 조사'
    ],
    relatedParts: ['컴프레서']
  },
  {
    manufacturer: 'Copeland', series: 'CoreSense', code: 'Short Cycle',
    description_kr: '단시간 ON/OFF 반복',
    description_en: 'Short cycling',
    severity: 'warning',
    causes: ['제어 설정 이상', '냉매 부족', '안전장치 반복 트립'],
    checkSteps: [
      'ON/OFF 간격 기록 (최소 5분 이상이어야 함)',
      '안전장치 작동 이력 확인',
      '서모스탯/제어기 설정 확인',
      '냉매 상태 확인'
    ],
    relatedParts: ['제어기', '컨택터']
  },
  {
    manufacturer: 'Copeland', series: 'CoreSense', code: 'Locked Rotor',
    description_kr: '로터 잠김',
    description_en: 'Locked rotor',
    severity: 'critical',
    causes: ['컴프레서 기계적 잠김', '오일 부족', '리퀴드 슬러깅'],
    checkSteps: [
      '컴프레서 절연저항 측정',
      '기동 시 LRA 확인',
      '오일 레벨 확인',
      '크랭크케이스 히터 확인',
      '컴프레서 교체 검토'
    ],
    relatedParts: ['컴프레서', '크랭크케이스 히터']
  },
  {
    manufacturer: 'Copeland', series: 'CoreSense', code: 'Phase Loss',
    description_kr: '결상',
    description_en: 'Phase loss',
    severity: 'critical',
    causes: ['3상 전원 결상', '퓨즈 용단', '배선 불량'],
    checkSteps: ['3상 전압 측정', '퓨즈/차단기 확인', '배선 확인'],
    relatedParts: ['전원 단자대', '차단기']
  },
  {
    manufacturer: 'Copeland', series: 'CoreSense', code: 'Phase Reversal',
    description_kr: '역상',
    description_en: 'Phase reversal',
    severity: 'warning',
    causes: ['R-S-T 배선 순서 오류'],
    checkSteps: ['상순 확인 (위상 테스터)', 'R-S-T 중 2선 교체'],
    relatedParts: ['전원 단자대']
  },
  {
    manufacturer: 'Copeland', series: 'CoreSense', code: 'Winding Temp',
    description_kr: '모터 권선 과열',
    description_en: 'Motor winding temperature high',
    severity: 'critical',
    causes: ['과부하', '냉각 부족 (저과열도 → 흡입가스 냉각 부족)'],
    checkSteps: ['운전 전류 측정', '과열도 확인', '흡입가스 온도 확인', '절연저항 측정'],
    relatedParts: ['모터 온도센서', '컴프레서']
  },
  {
    manufacturer: 'Copeland', series: 'CoreSense', code: 'Oil Level',
    description_kr: '오일 레벨 저하',
    description_en: 'Oil level low',
    severity: 'warning',
    causes: ['오일 누출', '냉매 측 유출', '오일 분리기 불량'],
    checkSteps: ['오일 레벨 확인', '오일 분리기 확인', '오일 보충'],
    relatedParts: ['오일 사이트글라스', '오일 분리기']
  },
  {
    manufacturer: 'Copeland', series: 'CoreSense', code: 'Current Overload',
    description_kr: '과전류',
    description_en: 'Current overload',
    severity: 'critical',
    causes: ['기계적 과부하', '전원 이상', '냉매 과충전'],
    checkSteps: ['운전 전류 측정 (RLA 대비)', '전원 전압 확인', '부하 상태 확인'],
    relatedParts: ['CT 센서', '컴프레서']
  },

  // =============================================
  // 10. Danfoss 컨트롤러 (단포스)
  // =============================================
  {
    manufacturer: 'Danfoss', series: 'Controller', code: 'E01',
    description_kr: '온도 센서 1 이상',
    description_en: 'Temperature sensor 1 fault',
    severity: 'warning',
    causes: ['센서 단선/단락', '배선 이상'],
    checkSteps: ['센서 저항값 측정 (NTC 10kΩ @25°C 일반적)', '커넥터 확인', '센서 교체'],
    relatedParts: ['온도 센서 S1']
  },
  {
    manufacturer: 'Danfoss', series: 'Controller', code: 'E02',
    description_kr: '온도 센서 2 이상',
    description_en: 'Temperature sensor 2 fault',
    severity: 'warning',
    causes: ['센서 단선/단락'],
    checkSteps: ['센서 저항값 측정', '커넥터 확인', '센서 교체'],
    relatedParts: ['온도 센서 S2']
  },
  {
    manufacturer: 'Danfoss', series: 'Controller', code: 'E04',
    description_kr: '제상 실패 (시간 초과)',
    description_en: 'Defrost failure (timeout)',
    severity: 'warning',
    causes: ['디프로스트 히터 불량', '제상 센서 불량', '과도한 착상', '제상 시간 설정 부족'],
    checkSteps: [
      '디프로스트 히터 저항 측정',
      '디프로스트 종료 센서 위치/값 확인',
      '착상 패턴 확인',
      '제상 시간 설정 조정',
      '제상 주기 설정 확인'
    ],
    relatedParts: ['디프로스트 히터', '디프로스트 센서', '타이머']
  },
  {
    manufacturer: 'Danfoss', series: 'Controller', code: 'E07',
    description_kr: '도어 스위치 이상 (쇼케이스)',
    description_en: 'Door switch abnormality (showcase)',
    severity: 'info',
    causes: ['도어 스위치 불량', '배선 이상', '도어 장시간 개방'],
    checkSteps: [
      '도어 스위치 작동 확인',
      '도어 닫힘 상태 확인',
      '스위치 교체'
    ],
    relatedParts: ['도어 스위치']
  },
  {
    manufacturer: 'Danfoss', series: 'Controller', code: 'E12',
    description_kr: '팬 이상',
    description_en: 'Fan abnormality',
    severity: 'warning',
    causes: ['팬 모터 불량', '팬 모터 과전류', '배선 이상'],
    checkSteps: ['팬 모터 회전 확인', '모터 전류 측정', '배선 확인'],
    relatedParts: ['팬 모터']
  },
  {
    manufacturer: 'Danfoss', series: 'Controller', code: 'E15',
    description_kr: '냉매 부족 경보',
    description_en: 'Refrigerant shortage alarm',
    severity: 'critical',
    causes: ['냉매 누설', '충전량 부족'],
    checkSteps: [
      '냉매 누설 점검',
      '흡입 압력 확인',
      '과열도 확인',
      '냉매 보충'
    ],
    relatedParts: ['배관', '서비스 밸브']
  },
  {
    manufacturer: 'Danfoss', series: 'Controller', code: 'E16',
    description_kr: '결로 방지 히터 이상',
    description_en: 'Anti-condensation heater abnormality',
    severity: 'info',
    causes: ['히터 단선', '배선 이상'],
    checkSteps: ['히터 저항 측정', '배선 확인', '히터 교체'],
    relatedParts: ['결로 방지 히터']
  },
  {
    manufacturer: 'Danfoss', series: 'Controller', code: 'A01',
    description_kr: '고온 경보 (온도 상한 초과)',
    description_en: 'High temperature alarm (upper limit exceeded)',
    severity: 'critical',
    causes: ['냉각 능력 부족', '냉매 부족', '문/도어 장시간 개방', '과부하'],
    checkSteps: [
      '실내 온도 확인',
      '냉각 시스템 운전 상태 확인',
      '증발기 착상 여부',
      '에어플로우 확인',
      '냉매 상태 확인'
    ],
    relatedParts: ['온도 센서', '컴프레서', '증발기']
  },
  {
    manufacturer: 'Danfoss', series: 'Controller', code: 'A02',
    description_kr: '저온 경보 (온도 하한 초과)',
    description_en: 'Low temperature alarm (lower limit exceeded)',
    severity: 'warning',
    causes: ['설정 온도 과저', '제어 이상', '외기온도 영향'],
    checkSteps: [
      '실내 온도 확인',
      '설정 온도 확인',
      '제어기 설정 검토',
      '증발기 착상 패턴 확인'
    ],
    relatedParts: ['온도 센서', '제어기']
  },
  {
    manufacturer: 'Danfoss', series: 'Controller', code: 'A04',
    description_kr: '제상 중 고온 경보',
    description_en: 'High temperature alarm during defrost',
    severity: 'info',
    causes: ['제상 시간 과다', '제상 종료 온도 설정 과고'],
    checkSteps: [
      '제상 종료 온도 설정 확인',
      '제상 시간 설정 확인',
      '디프로스트 센서 위치 확인'
    ],
    relatedParts: ['디프로스트 센서', '디프로스트 히터']
  }
];

// Manufacturer metadata for UI
const ERROR_CODE_MANUFACTURERS = [
  { id: 'Daikin', label: '다이킨 (Daikin)', series: 'VRV', icon: '🇯🇵', type: 'VRF' },
  { id: 'Samsung', label: '삼성 (Samsung)', series: 'DVM', icon: '🇰🇷', type: 'VRF' },
  { id: 'LG', label: 'LG', series: 'Multi V', icon: '🇰🇷', type: 'VRF' },
  { id: 'Mitsubishi', label: '미쓰비시 (Mitsubishi)', series: 'City Multi', icon: '🇯🇵', type: 'VRF' },
  { id: 'Carrier', label: '캐리어 (Carrier)', series: 'Chiller', icon: '🇺🇸', type: 'Chiller' },
  { id: 'Trane', label: '트레인 (Trane)', series: 'Chiller', icon: '🇺🇸', type: 'Chiller' },
  { id: 'York', label: '요크 (York)', series: 'Chiller', icon: '🇺🇸', type: 'Chiller' },
  { id: 'Bitzer', label: '비쳐 (Bitzer)', series: 'Compressor Protection', icon: '🇩🇪', type: 'Compressor' },
  { id: 'Copeland', label: '코플랜드 (Copeland)', series: 'CoreSense', icon: '🇺🇸', type: 'Compressor' },
  { id: 'Danfoss', label: '단포스 (Danfoss)', series: 'Controller', icon: '🇩🇰', type: 'Controller' }
];

// ===================================================
// HVAC Pulse — Refrigerant Catalog
// Extended refrigerant database with CoolProp mapping
// 30+ refrigerants categorized for HVAC Pulse field use
// ===================================================

const RefrigerantCatalog = (() => {

  // -------------------------------------------------
  // Category definitions
  // -------------------------------------------------
  const CATEGORIES = {
    residential_ac: {
      name_kr: '가정/상업 AC',
      name_en: 'Residential / Commercial AC',
      icon: '🏠'
    },
    commercial_refrig: {
      name_kr: '상업 냉동',
      name_en: 'Commercial Refrigeration',
      icon: '❄️'
    },
    automotive_medium: {
      name_kr: '차량/중온',
      name_en: 'Automotive / Medium Temp',
      icon: '🚗'
    },
    natural: {
      name_kr: '자연냉매',
      name_en: 'Natural Refrigerants',
      icon: '🌿'
    },
    chiller: {
      name_kr: '칠러',
      name_en: 'Chillers',
      icon: '🏗️'
    },
    legacy: {
      name_kr: '레거시/특수',
      name_en: 'Legacy / Specialty',
      icon: '📦'
    }
  };

  // -------------------------------------------------
  // Complete refrigerant list (~30 entries)
  //
  // Each entry fields:
  //   id            – Industry designation (e.g. 'R-410A')
  //   coolpropName  – CoolProp WASM recognized fluid name
  //   name_kr       – Korean display name
  //   name_en       – English display name / full designation
  //   type          – Chemical family (HCFC, HFC, HFO, HC, etc.)
  //   gwp           – Global Warming Potential (AR5 100-yr)
  //   odp           – Ozone Depletion Potential
  //   safety        – ASHRAE 34 safety classification
  //   category      – One of CATEGORIES keys
  //   status        – 'current' | 'transition' | 'phase-down' | 'phase-out' | 'banned'
  //   replacement   – Array of recommended replacement refrigerant IDs
  //   isZeotropic   – true if zeotropic blend (has temperature glide)
  //   glide_f       – Temperature glide in Fahrenheit (0 for azeotropic/pure)
  //   use_kr        – Typical use description (Korean)
  //   use_en        – Typical use description (English)
  //   notes_kr      – Field-relevant notes (Korean)
  //   notes_en      – Field-relevant notes (English)
  //   hasLegacyData – true if also exists in the original REFRIGERANT_DB (js/refrigerant-data.js)
  // -------------------------------------------------
  const REFRIGERANTS = [

    // ===================================================
    // residential_ac — 가정/상업 AC
    // ===================================================
    {
      id: 'R-22',
      coolpropName: 'R22',
      name_kr: 'R-22',
      name_en: 'R-22 (HCFC-22, Chlorodifluoromethane)',
      type: 'HCFC',
      gwp: 1810,
      odp: 0.055,
      safety: 'A1',
      category: 'residential_ac',
      status: 'phase-out',
      replacement: ['R-410A', 'R-32', 'R-454B', 'R-407C'],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '구형 에어컨 (2010년 이전)',
      use_en: 'Legacy AC systems (pre-2010)',
      notes_kr: '2020년 생산 중단. 서비스용 재생 냉매만 사용 가능. 몬트리올 의정서 규제 대상.',
      notes_en: 'Production ceased in 2020. Only reclaimed refrigerant available for servicing. Regulated under Montreal Protocol.',
      hasLegacyData: true
    },
    {
      id: 'R-410A',
      coolpropName: 'R410A',
      name_kr: 'R-410A',
      name_en: 'R-410A (R-32/R-125 50/50)',
      type: 'HFC',
      gwp: 2088,
      odp: 0,
      safety: 'A1',
      category: 'residential_ac',
      status: 'current',
      replacement: ['R-32', 'R-454B'],
      isZeotropic: false,
      glide_f: 0.1,
      use_kr: '현행 주거/상업용 에어컨 표준',
      use_en: 'Current residential/commercial AC standard',
      notes_kr: '근사 공비혼합물. 높은 GWP로 단계적 감축 예정. 고압 냉매(운전압력 ~400psig).',
      notes_en: 'Near-azeotropic blend. Phase-down planned due to high GWP. High-pressure refrigerant (operating ~400 psig).',
      hasLegacyData: true
    },
    {
      id: 'R-32',
      coolpropName: 'R32',
      name_kr: 'R-32',
      name_en: 'R-32 (Difluoromethane)',
      type: 'HFC',
      gwp: 675,
      odp: 0,
      safety: 'A2L',
      category: 'residential_ac',
      status: 'current',
      replacement: [],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '차세대 에어컨 (일본/한국/아시아)',
      use_en: 'Next-gen AC (Japan/Korea/Asia)',
      notes_kr: 'R-410A 대비 GWP 68% 감소. 단일 성분으로 누설 시 재충전 용이. 미약한 가연성(A2L).',
      notes_en: '68% lower GWP than R-410A. Single component — easy to top off after leaks. Mildly flammable (A2L).',
      hasLegacyData: true
    },
    {
      id: 'R-454B',
      coolpropName: 'R454B',
      name_kr: 'R-454B',
      name_en: 'R-454B (R-32/R-1234yf 68.9/31.1)',
      type: 'HFO blend',
      gwp: 467,
      odp: 0,
      safety: 'A2L',
      category: 'residential_ac',
      status: 'transition',
      replacement: [],
      isZeotropic: true,
      glide_f: 2.5,
      use_kr: 'R-410A 대체 (2025년~ 북미)',
      use_en: 'R-410A replacement (2025+ North America)',
      notes_kr: 'AIM Act 대응 차세대 냉매. Carrier/Trane 채택. 온도 글라이드 약 2.5°F — Bubble/Dew 구분 필요.',
      notes_en: 'AIM Act compliant next-gen refrigerant. Adopted by Carrier/Trane. ~2.5°F glide — use Bubble/Dew points.',
      hasLegacyData: true
    },

    // ===================================================
    // commercial_refrig — 상업 냉동
    // ===================================================
    {
      id: 'R-404A',
      coolpropName: 'R404A',
      name_kr: 'R-404A',
      name_en: 'R-404A (R-125/R-143a/R-134a 44/52/4)',
      type: 'HFC blend',
      gwp: 3922,
      odp: 0,
      safety: 'A1',
      category: 'commercial_refrig',
      status: 'phase-down',
      replacement: ['R-448A', 'R-449A', 'R-452A'],
      isZeotropic: true,
      glide_f: 0.7,
      use_kr: '상업 냉동 (슈퍼마켓, 저온 저장)',
      use_en: 'Commercial refrigeration (supermarkets, cold storage)',
      notes_kr: '매우 높은 GWP. EU F-Gas 규정으로 신규 설비 사용 금지. 서비스용만 허용.',
      notes_en: 'Very high GWP. Banned for new equipment under EU F-Gas regulation. Service use only.',
      hasLegacyData: true
    },
    {
      id: 'R-407C',
      coolpropName: 'R407C',
      name_kr: 'R-407C',
      name_en: 'R-407C (R-32/R-125/R-134a 23/25/52)',
      type: 'HFC blend',
      gwp: 1774,
      odp: 0,
      safety: 'A1',
      category: 'commercial_refrig',
      status: 'current',
      replacement: ['R-32', 'R-454B'],
      isZeotropic: true,
      glide_f: 8.0,
      use_kr: 'R-22 레트로핏 대체, 패키지 에어컨',
      use_en: 'R-22 retrofit replacement, packaged AC',
      notes_kr: '큰 온도 글라이드(8°F) — Bubble/Dew 구분 필수. 누설 시 조성 변화로 전량 교체 필요.',
      notes_en: 'Large temperature glide (8°F) — must use Bubble/Dew points. Full charge replacement required after leaks due to composition shift.',
      hasLegacyData: true
    },
    {
      id: 'R-448A',
      coolpropName: 'R448A',
      name_kr: 'R-448A',
      name_en: 'R-448A (Solstice N40)',
      type: 'HFO blend',
      gwp: 1387,
      odp: 0,
      safety: 'A1',
      category: 'commercial_refrig',
      status: 'transition',
      replacement: [],
      isZeotropic: true,
      glide_f: 12.1,
      use_kr: 'R-404A/R-22 대체 (상업 냉동)',
      use_en: 'R-404A/R-22 replacement (commercial refrigeration)',
      notes_kr: '큰 온도 글라이드(12.1°F). Honeywell Solstice N40. 중/저온 냉동 겸용. Bubble/Dew 관리 중요.',
      notes_en: 'Large temperature glide (12.1°F). Honeywell Solstice N40. Medium/low temp refrigeration. Bubble/Dew management critical.',
      hasLegacyData: false
    },
    {
      id: 'R-449A',
      coolpropName: 'R449A',
      name_kr: 'R-449A',
      name_en: 'R-449A (Opteon XP40)',
      type: 'HFO blend',
      gwp: 1397,
      odp: 0,
      safety: 'A1',
      category: 'commercial_refrig',
      status: 'transition',
      replacement: [],
      isZeotropic: true,
      glide_f: 10.9,
      use_kr: 'R-404A/R-507A 대체 (상업 냉동)',
      use_en: 'R-404A/R-507A replacement (commercial refrigeration)',
      notes_kr: '큰 온도 글라이드(10.9°F). Chemours Opteon XP40. R-404A 레트로핏 가능.',
      notes_en: 'Large temperature glide (10.9°F). Chemours Opteon XP40. Can retrofit R-404A systems.',
      hasLegacyData: false
    },
    {
      id: 'R-507A',
      coolpropName: 'R507A',
      name_kr: 'R-507A',
      name_en: 'R-507A (R-125/R-143a 50/50)',
      type: 'HFC blend',
      gwp: 3985,
      odp: 0,
      safety: 'A1',
      category: 'commercial_refrig',
      status: 'phase-down',
      replacement: ['R-448A', 'R-449A'],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '저온 냉동 (아이스크림, 급속 동결)',
      use_en: 'Low-temp refrigeration (ice cream, blast freezing)',
      notes_kr: '공비혼합물(글라이드 없음). R-404A와 유사 성능. 매우 높은 GWP로 규제 대상.',
      notes_en: 'Azeotropic blend (no glide). Similar performance to R-404A. Very high GWP — subject to regulation.',
      hasLegacyData: false
    },
    {
      id: 'R-407A',
      coolpropName: 'R407A',
      name_kr: 'R-407A',
      name_en: 'R-407A (R-32/R-125/R-134a 20/40/40)',
      type: 'HFC blend',
      gwp: 2107,
      odp: 0,
      safety: 'A1',
      category: 'commercial_refrig',
      status: 'current',
      replacement: ['R-448A', 'R-449A'],
      isZeotropic: true,
      glide_f: 6.0,
      use_kr: '중/저온 상업 냉동',
      use_en: 'Medium/low-temp commercial refrigeration',
      notes_kr: '온도 글라이드 6°F. R-404A 대비 약간 낮은 GWP. 중온 냉장 케이스에 적합.',
      notes_en: '6°F temperature glide. Slightly lower GWP than R-404A. Suitable for medium-temp display cases.',
      hasLegacyData: false
    },

    // ===================================================
    // automotive_medium — 차량/중온
    // ===================================================
    {
      id: 'R-134a',
      coolpropName: 'R134a',
      name_kr: 'R-134a',
      name_en: 'R-134a (1,1,1,2-Tetrafluoroethane)',
      type: 'HFC',
      gwp: 1430,
      odp: 0,
      safety: 'A1',
      category: 'automotive_medium',
      status: 'phase-down',
      replacement: ['R-1234yf', 'R-513A'],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '차량 에어컨, 칠러, 중온 냉동',
      use_en: 'Automotive AC, chillers, medium-temp refrigeration',
      notes_kr: 'EU에서 차량용 사용 금지(2017~). R-1234yf로 전환 중. 칠러/중온 냉동에서는 계속 사용.',
      notes_en: 'Banned for automotive use in EU (2017+). Transitioning to R-1234yf. Still used in chillers and medium-temp systems.',
      hasLegacyData: true
    },
    {
      id: 'R-1234yf',
      coolpropName: 'R1234yf',
      name_kr: 'R-1234yf',
      name_en: 'R-1234yf (2,3,3,3-Tetrafluoropropene)',
      type: 'HFO',
      gwp: 4,
      odp: 0,
      safety: 'A2L',
      category: 'automotive_medium',
      status: 'current',
      replacement: [],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '신형 차량 에어컨 (2017년~ EU 의무)',
      use_en: 'New automotive AC (EU mandatory since 2017)',
      notes_kr: 'R-134a 직접 대체. 초저 GWP(4). 미약한 가연성(A2L). 냉매 단가 높음.',
      notes_en: 'Direct R-134a replacement. Ultra-low GWP (4). Mildly flammable (A2L). Higher refrigerant cost.',
      hasLegacyData: false
    },
    {
      id: 'R-1234ze(E)',
      coolpropName: 'R1234ze(E)',
      name_kr: 'R-1234ze(E)',
      name_en: 'R-1234ze(E) (trans-1,3,3,3-Tetrafluoropropene)',
      type: 'HFO',
      gwp: 7,
      odp: 0,
      safety: 'A2L',
      category: 'automotive_medium',
      status: 'current',
      replacement: [],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '칠러, 히트펌프, 중온 냉동',
      use_en: 'Chillers, heat pumps, medium-temp refrigeration',
      notes_kr: '저압 HFO. R-134a 대비 약 20% 낮은 용량. 칠러/히트펌프에서 R-134a 대체로 주목.',
      notes_en: 'Low-pressure HFO. ~20% lower capacity than R-134a. Gaining traction as R-134a replacement in chillers/heat pumps.',
      hasLegacyData: false
    },

    // ===================================================
    // natural — 자연냉매
    // ===================================================
    {
      id: 'R-290',
      coolpropName: 'Propane',
      name_kr: 'R-290 (프로판)',
      name_en: 'R-290 (Propane)',
      type: 'HC',
      gwp: 3,
      odp: 0,
      safety: 'A3',
      category: 'natural',
      status: 'current',
      replacement: [],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '가정용 냉장고, 소형 상업 시스템',
      use_en: 'Domestic refrigerators, small commercial systems',
      notes_kr: '가연성(A3) — 충전량 제한 150g(IEC 60335). 우수한 열역학 성능. EU에서 가정용 냉장고 표준.',
      notes_en: 'Flammable (A3) — charge limit 150g (IEC 60335). Excellent thermodynamic performance. EU standard for domestic refrigerators.',
      hasLegacyData: true
    },
    {
      id: 'R-600a',
      coolpropName: 'IsoButane',
      name_kr: 'R-600a (이소부탄)',
      name_en: 'R-600a (Isobutane)',
      type: 'HC',
      gwp: 3,
      odp: 0,
      safety: 'A3',
      category: 'natural',
      status: 'current',
      replacement: [],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '가정용 냉장고 (유럽/아시아 표준)',
      use_en: 'Domestic refrigerators (Europe/Asia standard)',
      notes_kr: '가연성(A3). 전 세계 가정용 냉장고에서 R-134a 대체. 소량 충전(~50-80g).',
      notes_en: 'Flammable (A3). Replacing R-134a in domestic refrigerators worldwide. Small charge (~50-80g).',
      hasLegacyData: false
    },
    {
      id: 'R-717',
      coolpropName: 'Ammonia',
      name_kr: 'R-717 (암모니아)',
      name_en: 'R-717 (Ammonia, NH3)',
      type: 'Natural (Inorganic)',
      gwp: 0,
      odp: 0,
      safety: 'B2L',
      category: 'natural',
      status: 'current',
      replacement: [],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '산업 냉동, 대형 냉장 창고, 식품 가공',
      use_en: 'Industrial refrigeration, large cold storage, food processing',
      notes_kr: '독성(B등급) + 가연성. 최고 효율의 냉매. 산업용 대형 시스템 전용. 구리 부식 — 스틸 배관 필수.',
      notes_en: 'Toxic (B-class) + flammable. Highest efficiency refrigerant. Industrial large systems only. Corrodes copper — steel piping required.',
      hasLegacyData: false
    },
    {
      id: 'R-744',
      coolpropName: 'CarbonDioxide',
      name_kr: 'R-744 (이산화탄소)',
      name_en: 'R-744 (Carbon Dioxide, CO2)',
      type: 'Natural (Inorganic)',
      gwp: 1,
      odp: 0,
      safety: 'A1',
      category: 'natural',
      status: 'current',
      replacement: [],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '트랜스크리티컬 냉동, 히트펌프 온수기',
      use_en: 'Transcritical refrigeration, heat pump water heaters',
      notes_kr: '초고압 운전(고압측 1000-1500psig). 트랜스크리티컬 사이클. 유럽 슈퍼마켓 확산. 특수 장비 필요.',
      notes_en: 'Ultra-high pressure operation (high side 1000-1500 psig). Transcritical cycle. Expanding in European supermarkets. Requires specialized equipment.',
      hasLegacyData: false
    },

    // ===================================================
    // chiller — 칠러
    // ===================================================
    {
      id: 'R-123',
      coolpropName: 'R123',
      name_kr: 'R-123',
      name_en: 'R-123 (HCFC-123, 2,2-Dichloro-1,1,1-trifluoroethane)',
      type: 'HCFC',
      gwp: 77,
      odp: 0.02,
      safety: 'B1',
      category: 'chiller',
      status: 'phase-out',
      replacement: ['R-1233zd(E)', 'R-514A'],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '저압 원심 칠러 (Trane/Carrier)',
      use_en: 'Low-pressure centrifugal chillers (Trane/Carrier)',
      notes_kr: '2030년 생산 중단 예정(HCFC). 독성(B등급). 저압 냉매(대기압 이하 운전). R-1233zd(E)로 대체.',
      notes_en: 'Production phase-out by 2030 (HCFC). Toxic (B-class). Low-pressure refrigerant (sub-atmospheric operation). Replaced by R-1233zd(E).',
      hasLegacyData: false
    },
    {
      id: 'R-1233zd(E)',
      coolpropName: 'R1233zd(E)',
      name_kr: 'R-1233zd(E)',
      name_en: 'R-1233zd(E) (trans-1-Chloro-3,3,3-trifluoropropene)',
      type: 'HCFO',
      gwp: 1,
      odp: 0.00034,
      safety: 'A1',
      category: 'chiller',
      status: 'current',
      replacement: [],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '저압 원심 칠러 (R-123 대체)',
      use_en: 'Low-pressure centrifugal chillers (R-123 replacement)',
      notes_kr: 'R-123 직접 대체. 비독성(A1). 초저 GWP. Trane, Carrier 신형 칠러에 채택. 무시할 수 있는 ODP.',
      notes_en: 'Direct R-123 replacement. Non-toxic (A1). Ultra-low GWP. Adopted by Trane and Carrier for new chillers. Negligible ODP.',
      hasLegacyData: false
    },
    {
      id: 'R-513A',
      coolpropName: 'R513A',
      name_kr: 'R-513A',
      name_en: 'R-513A (Opteon XP10, R-1234yf/R-134a 56/44)',
      type: 'HFO blend',
      gwp: 631,
      odp: 0,
      safety: 'A1',
      category: 'chiller',
      status: 'current',
      replacement: [],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '중압 원심/스크류 칠러 (R-134a 대체)',
      use_en: 'Medium-pressure centrifugal/screw chillers (R-134a replacement)',
      notes_kr: '공비혼합물(글라이드 없음). R-134a 레트로핏 가능. GWP 56% 감소. Chemours Opteon XP10.',
      notes_en: 'Azeotropic blend (no glide). Can retrofit R-134a systems. 56% GWP reduction. Chemours Opteon XP10.',
      hasLegacyData: false
    },
    {
      id: 'R-514A',
      coolpropName: 'R514A',
      name_kr: 'R-514A',
      name_en: 'R-514A (Opteon XP30, R-1336mzz(Z)/R-1130(E) 74.7/25.3)',
      type: 'HFO blend',
      gwp: 2,
      odp: 0,
      safety: 'B1',
      category: 'chiller',
      status: 'current',
      replacement: [],
      isZeotropic: false,
      glide_f: 0.2,
      use_kr: '저압 원심 칠러 (R-123 대체)',
      use_en: 'Low-pressure centrifugal chillers (R-123 replacement)',
      notes_kr: '초저 GWP(2). R-123 직접 대체. 독성(B1). Chemours Opteon XP30. 유사한 압력/용량.',
      notes_en: 'Ultra-low GWP (2). Direct R-123 replacement. Toxic (B1). Chemours Opteon XP30. Similar pressure/capacity.',
      hasLegacyData: false
    },
    {
      id: 'R-515B',
      coolpropName: 'R515B',
      name_kr: 'R-515B',
      name_en: 'R-515B (R-1234ze(E)/R-227ea 91.1/8.9)',
      type: 'HFO blend',
      gwp: 299,
      odp: 0,
      safety: 'A1',
      category: 'chiller',
      status: 'current',
      replacement: [],
      isZeotropic: false,
      glide_f: 0.1,
      use_kr: '중압 칠러, 히트펌프 (R-134a 대체)',
      use_en: 'Medium-pressure chillers, heat pumps (R-134a replacement)',
      notes_kr: '공비혼합물. R-134a 대비 낮은 용량(약 80%). 비가연성(A1). 유럽 히트펌프 시장 확대.',
      notes_en: 'Azeotropic blend. ~80% capacity vs R-134a. Non-flammable (A1). Growing in European heat pump market.',
      hasLegacyData: false
    },

    // ===================================================
    // legacy — 레거시/특수
    // ===================================================
    {
      id: 'R-12',
      coolpropName: 'R12',
      name_kr: 'R-12',
      name_en: 'R-12 (CFC-12, Dichlorodifluoromethane)',
      type: 'CFC',
      gwp: 10900,
      odp: 1.0,
      safety: 'A1',
      category: 'legacy',
      status: 'banned',
      replacement: ['R-134a', 'R-1234yf'],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '구형 차량 에어컨, 구형 냉장고 (1994년 이전)',
      use_en: 'Legacy automotive AC, legacy refrigerators (pre-1994)',
      notes_kr: '1996년 생산 완전 금지(몬트리올 의정서). ODP 1.0 기준 물질. 역사적 참고용.',
      notes_en: 'Production fully banned in 1996 (Montreal Protocol). ODP 1.0 reference substance. Historical reference only.',
      hasLegacyData: false
    },
    {
      id: 'R-502',
      coolpropName: 'R502',
      name_kr: 'R-502',
      name_en: 'R-502 (R-22/R-115 48.8/51.2)',
      type: 'CFC blend',
      gwp: 4657,
      odp: 0.33,
      safety: 'A1',
      category: 'legacy',
      status: 'banned',
      replacement: ['R-404A', 'R-507A', 'R-448A'],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '구형 저온 상업 냉동 (1990년대 이전)',
      use_en: 'Legacy low-temp commercial refrigeration (pre-1990s)',
      notes_kr: '1996년 생산 완전 금지. R-115(CFC) 포함. R-404A로 대체됨. 역사적 참고용.',
      notes_en: 'Production fully banned in 1996. Contains R-115 (CFC). Replaced by R-404A. Historical reference only.',
      hasLegacyData: false
    },
    {
      id: 'R-452A',
      coolpropName: 'R452A',
      name_kr: 'R-452A',
      name_en: 'R-452A (Opteon XP44, R-32/R-125/R-1234yf 11/59/30)',
      type: 'HFO blend',
      gwp: 2140,
      odp: 0,
      safety: 'A1',
      category: 'legacy',
      status: 'current',
      replacement: [],
      isZeotropic: true,
      glide_f: 1.0,
      use_kr: 'R-404A/R-507A 레트로핏 대체 (운송 냉동)',
      use_en: 'R-404A/R-507A retrofit replacement (transport refrigeration)',
      notes_kr: '비가연성(A1). 운송/트레일러 냉동에 적합. R-404A 대비 유사 성능. 작은 글라이드(1°F).',
      notes_en: 'Non-flammable (A1). Suitable for transport/trailer refrigeration. Similar performance to R-404A. Small glide (1°F).',
      hasLegacyData: false
    },
    {
      id: 'R-11',
      coolpropName: 'R11',
      name_kr: 'R-11',
      name_en: 'R-11 (CFC-11, Trichlorofluoromethane)',
      type: 'CFC',
      gwp: 4750,
      odp: 1.0,
      safety: 'A1',
      category: 'legacy',
      status: 'banned',
      replacement: ['R-123', 'R-1233zd(E)'],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '구형 저압 원심 칠러 (1990년대 이전)',
      use_en: 'Legacy low-pressure centrifugal chillers (pre-1990s)',
      notes_kr: '1996년 생산 완전 금지. ODP 1.0 기준 물질. R-123 → R-1233zd(E)로 세대 교체.',
      notes_en: 'Production fully banned in 1996. ODP 1.0 reference substance. Generational replacement: R-123 → R-1233zd(E).',
      hasLegacyData: false
    },
    {
      id: 'R-13',
      coolpropName: 'R13',
      name_kr: 'R-13',
      name_en: 'R-13 (CFC-13, Chlorotrifluoromethane)',
      type: 'CFC',
      gwp: 14400,
      odp: 1.0,
      safety: 'A1',
      category: 'legacy',
      status: 'banned',
      replacement: ['R-23', 'R-508B'],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '캐스케이드 초저온 시스템 (-80°C 이하)',
      use_en: 'Cascade ultra-low temp systems (below -80°C)',
      notes_kr: '1996년 생산 금지. 초저온 캐스케이드 저단측 사용. R-23 또는 R-508B로 대체.',
      notes_en: 'Production banned in 1996. Used in low stage of ultra-low temp cascade systems. Replaced by R-23 or R-508B.',
      hasLegacyData: false
    },
    {
      id: 'R-23',
      coolpropName: 'R23',
      name_kr: 'R-23',
      name_en: 'R-23 (HFC-23, Trifluoromethane)',
      type: 'HFC',
      gwp: 14800,
      odp: 0,
      safety: 'A1',
      category: 'legacy',
      status: 'phase-down',
      replacement: [],
      isZeotropic: false,
      glide_f: 0,
      use_kr: '캐스케이드 초저온 시스템 (-80°C 이하)',
      use_en: 'Cascade ultra-low temp systems (below -80°C)',
      notes_kr: '극히 높은 GWP(14800). 초저온 냉동 전용(-80°C 달성). 대체 냉매 제한적. 규제 강화 중.',
      notes_en: 'Extremely high GWP (14800). Ultra-low temp refrigeration only (reaches -80°C). Limited alternatives. Increasing regulatory pressure.',
      hasLegacyData: false
    },
    {
      id: 'R-410B',
      coolpropName: 'R410B',
      name_kr: 'R-410B',
      name_en: 'R-410B (R-32/R-125 45/55)',
      type: 'HFC',
      gwp: 2229,
      odp: 0,
      safety: 'A1',
      category: 'legacy',
      status: 'current',
      replacement: ['R-32', 'R-454B'],
      isZeotropic: false,
      glide_f: 0.1,
      use_kr: 'R-410A 대안 (일부 지역)',
      use_en: 'R-410A alternative (some regions)',
      notes_kr: 'R-410A와 유사하나 R-125 비율 높음. 일부 아시아 제조사에서 사용. 사용 빈도 낮음.',
      notes_en: 'Similar to R-410A but higher R-125 ratio. Used by some Asian manufacturers. Low adoption rate.',
      hasLegacyData: false
    },

    // ===================================================
    // Additional commonly encountered refrigerants
    // ===================================================
    {
      id: 'R-438A',
      coolpropName: 'R438A',
      name_kr: 'R-438A',
      name_en: 'R-438A (ISCEON MO99)',
      type: 'HFC blend',
      gwp: 2265,
      odp: 0,
      safety: 'A1',
      category: 'legacy',
      status: 'current',
      replacement: [],
      isZeotropic: true,
      glide_f: 8.8,
      use_kr: 'R-22 드롭인 대체 (레트로핏)',
      use_en: 'R-22 drop-in replacement (retrofit)',
      notes_kr: 'R-22 시스템에 오일 교체 없이 레트로핏 가능. POE/MO 오일 모두 호환. 큰 글라이드(8.8°F).',
      notes_en: 'Can retrofit R-22 systems without oil change. Compatible with both POE and mineral oil. Large glide (8.8°F).',
      hasLegacyData: false
    },
    {
      id: 'R-422D',
      coolpropName: 'R422D',
      name_kr: 'R-422D',
      name_en: 'R-422D (ISCEON MO29)',
      type: 'HFC blend',
      gwp: 2729,
      odp: 0,
      safety: 'A1',
      category: 'legacy',
      status: 'current',
      replacement: [],
      isZeotropic: true,
      glide_f: 6.5,
      use_kr: 'R-22 드롭인 대체 (에어컨 레트로핏)',
      use_en: 'R-22 drop-in replacement (AC retrofit)',
      notes_kr: 'R-22 에어컨 시스템 레트로핏용. 미네랄 오일 호환. 약간의 효율 저하 가능.',
      notes_en: 'For retrofitting R-22 AC systems. Compatible with mineral oil. Slight efficiency loss possible.',
      hasLegacyData: false
    }
  ];

  // -------------------------------------------------
  // Public API
  // -------------------------------------------------

  /**
   * Get all refrigerants in the catalog
   * @returns {Array} Complete refrigerant list
   */
  function getAll() {
    return REFRIGERANTS;
  }

  /**
   * Get category definitions
   * @returns {Object} Category map
   */
  function getCategories() {
    return CATEGORIES;
  }

  /**
   * Get refrigerants filtered by category
   * @param {string} cat - Category key (e.g. 'residential_ac')
   * @returns {Array} Refrigerants in that category
   */
  function getByCategory(cat) {
    return REFRIGERANTS.filter(r => r.category === cat);
  }

  /**
   * Get a single refrigerant by ID
   * @param {string} id - Refrigerant ID (e.g. 'R-410A')
   * @returns {Object|undefined} Refrigerant entry or undefined
   */
  function getById(id) {
    return REFRIGERANTS.find(r => r.id === id);
  }

  /**
   * Get CoolProp fluid name for a given refrigerant ID
   * @param {string} id - Refrigerant ID (e.g. 'R-290')
   * @returns {string|null} CoolProp fluid name or null
   */
  function getCoolPropName(id) {
    const r = getById(id);
    return r ? r.coolpropName : null;
  }

  /**
   * Get refrigerants grouped by category
   * @returns {Object} { categoryKey: { category: {...}, refrigerants: [...] }, ... }
   */
  function getGroupedByCategory() {
    const grouped = {};
    for (const [key, catDef] of Object.entries(CATEGORIES)) {
      grouped[key] = {
        category: catDef,
        refrigerants: REFRIGERANTS.filter(r => r.category === key)
      };
    }
    return grouped;
  }

  /**
   * Check if a refrigerant has legacy P-T data in the original REFRIGERANT_DB
   * (js/refrigerant-data.js). Useful for deciding whether to use pre-computed
   * lookup tables or CoolProp WASM for property calculations.
   * @param {string} id - Refrigerant ID
   * @returns {boolean} true if legacy fallback data exists
   */
  /**
   * Get replacement options for a given refrigerant
   * @param {string} id - Refrigerant ID to find replacements for
   * @returns {Array} Array of refrigerant objects that are listed as replacements
   */
  function getReplacements(id) {
    const r = getById(id);
    if (!r || !r.replacement || r.replacement.length === 0) return [];
    return r.replacement.map(repId => getById(repId)).filter(Boolean);
  }

  // -------------------------------------------------
  // Return public interface
  // -------------------------------------------------
  return {
    CATEGORIES,
    REFRIGERANTS,
    getAll,
    getCategories,
    getByCategory,
    getById,
    getCoolPropName,
    getGroupedByCategory,
    getReplacements
  };

})();

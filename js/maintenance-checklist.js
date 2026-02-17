// ===================================================
// HVAC Pulse — Maintenance Checklist
// Equipment type × Season/Period checklists
// Stored in IndexedDB via DB helper
// ===================================================

const MaintenanceChecklist = (() => {

  // --- Equipment types ---
  const EQUIP_TYPES = [
    { id: 'refrigerator', label: '냉동기', icon: '🧊' },
    { id: 'chiller_air', label: '칠러 (공냉식)', icon: '🏗️' },
    { id: 'chiller_water', label: '칠러 (수냉식)', icon: '💧' },
    { id: 'vrf', label: 'VRF 시스템', icon: '🔄' },
    { id: 'package_rtu', label: '패키지/루프탑', icon: '🏠' },
    { id: 'showcase', label: '냉동쇼케이스/저온저장고', icon: '🏪' },
    { id: 'precision_ac', label: '항온항습기', icon: '🌡️' }
  ];

  // --- Period types ---
  const PERIODS = [
    { id: 'monthly', label: '월간 점검', icon: '📅' },
    { id: 'quarterly', label: '분기 점검', icon: '📋' },
    { id: 'summer', label: '여름 시즌 전 (냉방 준비)', icon: '☀️' },
    { id: 'winter', label: '겨울 시즌 전 (난방 준비)', icon: '❄️' },
    { id: 'annual', label: '연간 종합 점검', icon: '📊' }
  ];

  // --- Checklist data: equipType → period → items ---
  const CHECKLIST_DATA = {
    refrigerator: {
      monthly: [
        '컴프레서 운전 전류 측정 (RLA 대비 %)',
        '흡입/토출 압력 기록',
        '과열도/과냉도 확인',
        '오일 레벨 확인 (사이트글라스)',
        '이상 소음/진동 확인',
        '응축기 코일 청소 상태',
        '증발기 코일 착상 여부',
        '필터 드라이어 ΔT 확인 (3°F 이하)',
        '배관 단열 상태',
        '냉매 누설 점검 (비눗물/전자식)'
      ],
      summer: [
        '냉매 충전량 확인 (과냉도 기준)',
        '응축기 코일 세척 (고압세척)',
        '응축기 팬 모터 베어링/전류',
        '컴프레서 절연저항 측정 (메거)',
        '크랭크케이스 히터 작동 확인',
        'TXV/EXV 작동 확인',
        '전기 접점/컨택터 상태',
        '안전장치 테스트 (고압/저압/오일압)',
        '제어판 설정값 확인',
        '배수 드레인 청소'
      ],
      winter: [
        '헤드 프레셔 컨트롤 작동 확인',
        '크랭크케이스 히터 연결/작동',
        '디프로스트 타이머/센서 확인',
        '디프로스트 히터 작동 테스트',
        '드레인 배수 히터 확인 (결빙 방지)',
        '실외 배관 단열 상태',
        '팬 사이클링 컨트롤 설정',
        '저온 경보 설정 확인'
      ],
      quarterly: [
        '컴프레서 운전 전류/전압 측정',
        '흡입/토출 압력 기록 및 이전 대비',
        '과열도/과냉도 트렌드 확인',
        '오일 레벨/색상 확인',
        '필터 드라이어 교체 필요성 판단',
        '전기 접점 상태',
        '안전장치 작동 테스트',
        '제어판 에러 로그 확인',
        '진동/소음 수준 기록'
      ],
      annual: [
        '냉매 충전량 정밀 확인',
        '컴프레서 절연저항 측정 (메거)',
        '컴프레서 오일 산도 검사',
        '모든 안전장치 교정/테스트',
        '전기 판넬 전체 점검',
        '배관 전체 누설 테스트',
        'TXV/EXV 분해 점검',
        '응축기/증발기 코일 정밀 세척',
        '제어기 펌웨어 업데이트 확인',
        '운전 로그 전체 분석',
        '에너지 효율 분석'
      ]
    },

    chiller_air: {
      monthly: [
        '냉수 입출구 온도 기록 (ΔT 확인)',
        '냉수 유량 확인',
        '컴프레서 운전 전류',
        '흡입/토출 압력',
        '응축기 코일 상태',
        '이상 소음/진동',
        '제어판 에러 로그 확인',
        '냉수 수질 확인 (pH, 전도도)'
      ],
      summer: [
        '응축기 코일 고압세척',
        '냉수 배관 플러싱',
        '냉수 펌프 전류/진동',
        '팽창탱크 압력 확인',
        '수처리약품 보충',
        '컴프레서 절연저항',
        '안전장치 전체 테스트',
        '제어 센서 교정'
      ],
      winter: [
        '동결 방지 히터 확인',
        '냉수 부동액 농도 확인',
        '저수온 경보 설정',
        '겨울철 운전 설정 변경',
        '프리쿨링 설정 확인'
      ],
      quarterly: [
        '냉수 수질 분석 (정밀)',
        '컴프레서 운전 데이터 트렌드',
        '오일 레벨/색상',
        '전기 접점 상태',
        'EXV/TXV 작동 확인',
        '팬 모터 베어링 상태'
      ],
      annual: [
        '냉매 충전량 정밀 확인',
        '컴프레서 오일 분석',
        '열교환기 효율 테스트',
        '전기 판넬 정밀 점검',
        '모든 센서 교정',
        '안전장치 교정',
        '에너지 효율 분석 보고서'
      ]
    },

    chiller_water: {
      monthly: [
        '냉수 입출구 온도 (ΔT)',
        '냉각수 입출구 온도 (ΔT)',
        '냉수/냉각수 유량',
        '컴프레서 운전 전류',
        '흡입/토출 압력',
        '오일 레벨/압력',
        '제어판 에러 로그',
        '냉각탑 상태 확인'
      ],
      summer: [
        '냉각탑 충전재 청소/교체',
        '냉각수 수처리 점검',
        '냉각수 배관 플러싱',
        '증발기/응축기 튜브 청소',
        '컴프레서 절연저항',
        '안전장치 테스트',
        '냉각수 펌프 점검'
      ],
      winter: [
        '프리쿨링 설정',
        '동결 방지 조치',
        '냉각탑 동절기 운전 모드',
        '부동액 농도 확인',
        '바이패스 밸브 설정'
      ],
      quarterly: [
        '냉수/냉각수 수질 분석',
        '컴프레서 운전 데이터 분석',
        '오일 분석 (산도/수분)',
        '진동 측정',
        '열교환기 접근온도 확인'
      ],
      annual: [
        '증발기/응축기 에디 커런트 테스트',
        '컴프레서 오일 교체',
        '냉매 분석 (수분/산도)',
        '전기 판넬 정밀 점검',
        '모든 센서/계측기 교정',
        '안전장치 교정',
        '에너지 효율 보고서'
      ]
    },

    vrf: {
      monthly: [
        '실외기 흡입/토출 압력',
        '실내기별 토출 온도 확인',
        '에러 이력 확인 (리모컨/중앙제어)',
        '실외기 코일 청소',
        '실내기 필터 청소/교체',
        '드레인 배수 상태',
        '냉매 배관 단열 상태',
        '통신선 연결 상태'
      ],
      summer: [
        '실외기 코일 고압세척',
        '실외기 팬 모터 전류',
        '냉매 충전량 확인',
        '인버터 컴프레서 운전 주파수 확인',
        '실내기 전체 냉방 성능 테스트',
        '리모컨/중앙제어 설정 확인',
        '드레인 배수 라인 청소'
      ],
      winter: [
        '난방 전환 테스트',
        '디프로스트 작동 확인',
        '4방 밸브 전환 확인',
        '실외기 베이스 히터 확인',
        '난방 성능 테스트'
      ],
      quarterly: [
        '전체 실내기 운전 확인',
        '냉매 배관 접속부 누설 점검',
        '통신 에러 분석',
        '인버터 보드 상태',
        '각 실내기 ΔT 확인'
      ],
      annual: [
        '냉매 충전량 정밀 확인',
        '컴프레서 절연저항',
        '모든 실내기 팬코일 세척',
        '중앙제어 시스템 점검',
        '에너지 사용량 분석',
        '전체 시스템 성능 테스트'
      ]
    },

    package_rtu: {
      monthly: [
        '에어필터 교체/청소',
        '벨트 장력/마모 확인',
        '흡입/토출 압력',
        '과열도/과냉도',
        '응축기 코일 상태',
        '증발기 코일 상태',
        '드레인팬/배수 상태',
        '이상 소음/진동'
      ],
      summer: [
        '응축기 코일 세척',
        '증발기 코일 세척',
        '블로워 모터/팬 점검',
        '벨트 교체',
        '에코노마이저 작동 확인',
        '서모스탯 교정',
        '냉매 충전량 확인',
        '전기 접점 점검'
      ],
      winter: [
        '가스 버너/열교환기 점검 (가스식)',
        '전기 히터 점검 (전기식)',
        '에코노마이저 모드 설정',
        '서모스탯 난방 설정',
        '배수 동결 방지'
      ],
      quarterly: [
        '벨트 장력 조정',
        '블로워 베어링 윤활',
        '전기 접점 상태',
        '안전장치 테스트',
        '덕트 연결 상태'
      ],
      annual: [
        '냉매 충전량 정밀 확인',
        '컴프레서 절연저항',
        '열교환기 효율 확인',
        '전체 덕트 검사',
        '에너지 효율 분석'
      ]
    },

    showcase: {
      monthly: [
        '내부 온도 기록 (설정 대비)',
        '증발기 착상 패턴 확인',
        '디프로스트 작동 확인',
        '도어 가스켓 상태',
        '팬 모터 작동',
        '조명 상태',
        '배수 상태',
        '응축기 청소 (언더마운트)'
      ],
      summer: [
        '냉매 충전량 확인',
        '응축기 코일 정밀 세척',
        '응축기 팬 전류',
        'TXV 작동 확인',
        '안전장치 테스트',
        '온도 컨트롤러 교정'
      ],
      winter: [
        '디프로스트 히터 점검',
        '디프로스트 타이머 설정',
        '드레인 히터 확인',
        '주변 온도 영향 확인'
      ],
      quarterly: [
        '온도 트렌드 분석',
        '에너지 사용량 확인',
        '도어 가스켓 교체 판단',
        '팬 블레이드 청소'
      ],
      annual: [
        '냉매 회로 전체 점검',
        '전기 시스템 점검',
        '단열 상태 확인',
        '조명 교체',
        '성능 테스트'
      ]
    },

    precision_ac: {
      monthly: [
        '급기/환기 온도·습도 기록',
        '에어필터 차압 확인/교체',
        '가습기 작동 확인',
        '냉수 코일 입출구 온도 (수냉식)',
        '응축기 상태 (공냉식)',
        '컴프레서 전류',
        '드레인 배수 상태',
        '제어판 에러/경보 확인'
      ],
      summer: [
        '응축기 코일 세척',
        '냉매 충전량 확인',
        '가습기 스케일 세척',
        '에어필터 전체 교체',
        '컴프레서 절연저항',
        '팬 벨트/베어링 점검',
        '바닥 에어플로우 확인 (하부급기)'
      ],
      winter: [
        '가습기 급수 라인 점검',
        '가열 히터 점검',
        '외기 도입량 조정',
        '결로 방지 확인'
      ],
      quarterly: [
        '온습도 트렌드 분석',
        '풍량 측정',
        '전기 접점 상태',
        '가습기 실린더/패드 교체 판단',
        '누수 감지기 테스트'
      ],
      annual: [
        '전체 시스템 성능 테스트',
        '센서 전체 교정 (온도/습도/차압)',
        '냉매 회로 정밀 점검',
        '에너지 효율 분석',
        '바닥하부 청소 (하부급기)',
        '비상 운전 테스트'
      ]
    }
  };

  // State
  let currentEquip = null;
  let currentPeriod = null;
  let checkStates = []; // { text, checked, memo }
  let viewMode = 'select'; // 'select' | 'checklist' | 'history'

  // =============================================
  // UI
  // =============================================
  function initUI() {
    renderSelectScreen();
  }

  function renderSelectScreen() {
    const container = document.getElementById('checklist-content');
    if (!container) return;
    viewMode = 'select';

    container.innerHTML = `
      <div class="page-header">
        <h1>📋 ${t('checklist.title', '정비 체크리스트')}</h1>
        <p class="subtitle">${t('checklist.subtitle', '장비 유형 × 점검 주기별 자동 생성')}</p>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button class="btn btn-sm btn-primary" id="cl-tab-new" onclick="MaintenanceChecklist.showView('select')" style="flex:1">${t('checklist.new', '새 체크리스트')}</button>
        <button class="btn btn-sm btn-secondary" id="cl-tab-history" onclick="MaintenanceChecklist.showView('history')" style="flex:1">${t('checklist.history', '저장 이력')}</button>
      </div>

      <div id="cl-view-area">
        <div class="glass-card">
          <div class="section-title">${t('checklist.select_equip', '장비 유형 선택')}</div>
          <div style="display:grid;gap:8px">
            ${EQUIP_TYPES.map(e => `
              <button class="choice-btn" onclick="MaintenanceChecklist.selectEquip('${e.id}')"
                style="flex-direction:row;justify-content:flex-start;min-height:48px;padding:12px 16px;gap:12px;font-size:0.9rem;border:1px solid var(--border)">
                <span>${e.icon}</span><span>${e.label}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>`;
  }

  function showView(mode) {
    const newBtn = document.getElementById('cl-tab-new');
    const histBtn = document.getElementById('cl-tab-history');
    if (newBtn && histBtn) {
      newBtn.className = mode === 'select' || mode === 'checklist' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
      histBtn.className = mode === 'history' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
    }

    if (mode === 'history') {
      renderHistory();
    } else {
      renderEquipSelect();
    }
  }

  function renderEquipSelect() {
    const area = document.getElementById('cl-view-area');
    if (!area) return;
    area.innerHTML = `
      <div class="glass-card">
        <div class="section-title">${t('checklist.select_equip', '장비 유형 선택')}</div>
        <div style="display:grid;gap:8px">
          ${EQUIP_TYPES.map(e => `
            <button class="choice-btn" onclick="MaintenanceChecklist.selectEquip('${e.id}')"
              style="flex-direction:row;justify-content:flex-start;min-height:48px;padding:12px 16px;gap:12px;font-size:0.9rem;border:1px solid var(--border)">
              <span>${e.icon}</span><span>${e.label}</span>
            </button>
          `).join('')}
        </div>
      </div>`;
  }

  function selectEquip(equipId) {
    currentEquip = equipId;
    const area = document.getElementById('cl-view-area');
    if (!area) return;

    const equip = EQUIP_TYPES.find(e => e.id === equipId);
    const periods = PERIODS.filter(p => CHECKLIST_DATA[equipId]?.[p.id]);

    area.innerHTML = `
      <div class="glass-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
          <button class="btn btn-sm btn-secondary" onclick="MaintenanceChecklist.renderEquipSelect()" style="width:auto;padding:8px 12px">← ${t('common.back', '뒤로')}</button>
          <span style="font-weight:600">${equip?.icon} ${equip?.label}</span>
        </div>
        <div class="section-title">${t('checklist.select_period', '점검 주기 선택')}</div>
        <div style="display:grid;gap:8px">
          ${periods.map(p => `
            <button class="choice-btn" onclick="MaintenanceChecklist.selectPeriod('${p.id}')"
              style="flex-direction:row;justify-content:flex-start;min-height:48px;padding:12px 16px;gap:12px;font-size:0.9rem;border:1px solid var(--border)">
              <span>${p.icon}</span><span>${p.label}</span>
            </button>
          `).join('')}
        </div>
      </div>`;
  }

  function selectPeriod(periodId) {
    currentPeriod = periodId;
    const items = CHECKLIST_DATA[currentEquip]?.[periodId] || [];
    checkStates = items.map(text => ({ text, checked: false, memo: '' }));
    renderChecklist();
  }

  function renderChecklist() {
    const area = document.getElementById('cl-view-area');
    if (!area) return;

    const equip = EQUIP_TYPES.find(e => e.id === currentEquip);
    const period = PERIODS.find(p => p.id === currentPeriod);
    const checkedCount = checkStates.filter(s => s.checked).length;
    const total = checkStates.length;
    const pct = total > 0 ? Math.round(checkedCount / total * 100) : 0;

    area.innerHTML = `
      <div class="glass-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <button class="btn btn-sm btn-secondary" onclick="MaintenanceChecklist.selectEquip('${currentEquip}')" style="width:auto;padding:8px 12px">← ${t('common.back', '뒤로')}</button>
          <span style="font-size:0.85rem;color:var(--text-secondary)">${equip?.icon} ${equip?.label} · ${period?.label}</span>
        </div>

        <!-- Progress -->
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:6px">
            <span style="color:var(--text-secondary)">${t('checklist.progress', '진행률')}</span>
            <span style="font-family:var(--font-mono);color:${pct === 100 ? 'var(--accent-green)' : 'var(--text-primary)'}">${checkedCount}/${total} (${pct}%)</span>
          </div>
          <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${pct === 100 ? 'var(--accent-green)' : 'var(--accent-blue)'};border-radius:3px;transition:width 0.3s ease"></div>
          </div>
        </div>

        <!-- Items -->
        <div style="display:grid;gap:6px">
          ${checkStates.map((item, i) => `
            <div style="background:var(--bg-card);border:1px solid ${item.checked ? 'rgba(16,185,129,0.3)' : 'var(--border)'};border-radius:var(--radius-md);padding:12px;transition:all 0.2s ease">
              <div style="display:flex;align-items:flex-start;gap:10px;cursor:pointer" onclick="MaintenanceChecklist.toggleCheck(${i})">
                <span style="font-size:1.2rem;flex-shrink:0;margin-top:2px">${item.checked ? '✅' : '⬜'}</span>
                <span style="font-size:0.85rem;line-height:1.5;${item.checked ? 'color:var(--text-muted);text-decoration:line-through' : 'color:var(--text-primary)'}">${item.text}</span>
              </div>
              ${item.memo ? `<div style="margin-top:6px;margin-left:32px;font-size:0.78rem;color:var(--accent-cyan);background:rgba(6,182,212,0.08);padding:4px 8px;border-radius:4px">${item.memo}</div>` : ''}
              <div style="margin-top:6px;margin-left:32px">
                <input type="text" placeholder="${t('checklist.add_memo', '메모 추가...')}" value="${item.memo || ''}"
                  onchange="MaintenanceChecklist.setMemo(${i}, this.value)"
                  style="width:100%;padding:6px 8px;background:var(--bg-deep);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);font-size:0.78rem;font-family:var(--font-sans);outline:none">
              </div>
            </div>
          `).join('')}
        </div>

        <button class="btn btn-success" style="margin-top:16px" onclick="MaintenanceChecklist.saveChecklist()">
          💾 ${t('checklist.save', '체크리스트 저장')}
        </button>
      </div>`;
  }

  function toggleCheck(index) {
    if (checkStates[index]) {
      checkStates[index].checked = !checkStates[index].checked;
      renderChecklist();
    }
  }

  function setMemo(index, value) {
    if (checkStates[index]) {
      checkStates[index].memo = value;
    }
  }

  async function saveChecklist() {
    const record = {
      date: new Date().toISOString(),
      equipType: currentEquip,
      period: currentPeriod,
      items: checkStates,
      checkedCount: checkStates.filter(s => s.checked).length,
      totalCount: checkStates.length
    };

    try {
      await DB.add(DB.STORES.CHECKLISTS, record);
      alert(t('checklist.saved', '체크리스트가 저장되었습니다.'));
      renderSelectScreen();
    } catch (err) {
      console.error('Save error:', err);
      alert('저장 실패: ' + err.message);
    }
  }

  async function renderHistory() {
    const area = document.getElementById('cl-view-area');
    if (!area) return;

    try {
      const records = await DB.getAll(DB.STORES.CHECKLISTS);
      records.sort((a, b) => new Date(b.date) - new Date(a.date));

      if (records.length === 0) {
        area.innerHTML = `
          <div class="glass-card" style="text-align:center;padding:40px 24px">
            <span style="font-size:2rem">📋</span>
            <p style="color:var(--text-secondary);margin-top:12px">${t('checklist.no_history', '저장된 체크리스트가 없습니다.')}</p>
          </div>`;
        return;
      }

      area.innerHTML = records.map(r => {
        const equip = EQUIP_TYPES.find(e => e.id === r.equipType);
        const period = PERIODS.find(p => p.id === r.period);
        const d = new Date(r.date);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const pct = r.totalCount > 0 ? Math.round(r.checkedCount / r.totalCount * 100) : 0;

        return `
          <div class="glass-card" style="padding:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span style="font-size:0.85rem;font-weight:600">${equip?.icon || ''} ${equip?.label || r.equipType}</span>
              <span style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono)">${dateStr}</span>
            </div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px">${period?.label || r.period}</div>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;height:4px;background:var(--border);border-radius:2px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${pct === 100 ? 'var(--accent-green)' : 'var(--accent-blue)'};border-radius:2px"></div>
              </div>
              <span style="font-size:0.75rem;font-family:var(--font-mono);color:${pct === 100 ? 'var(--accent-green)' : 'var(--text-secondary)'}">${r.checkedCount}/${r.totalCount}</span>
              <button onclick="MaintenanceChecklist.deleteRecord(${r.id})" style="background:none;border:none;color:var(--accent-red);cursor:pointer;font-size:0.8rem;padding:4px">${t('common.delete', '삭제')}</button>
            </div>
          </div>`;
      }).join('');
    } catch (err) {
      area.innerHTML = `<div class="alert-box alert-danger"><span>❌</span><span>${t('checklist.load_fail', '이력 로드 실패')}</span></div>`;
    }
  }

  async function deleteRecord(id) {
    if (!confirm(t('common.confirm_delete', '삭제하시겠습니까?'))) return;
    await DB.remove(DB.STORES.CHECKLISTS, id);
    renderHistory();
  }

  return {
    initUI, selectEquip, selectPeriod, toggleCheck, setMemo,
    saveChecklist, showView, renderEquipSelect, deleteRecord, renderSelectScreen
  };
})();

// ===================================================
// HVAC Pulse — Parts Cross Reference
// Search compatible/replacement parts
// ===================================================

const PartsCrossRef = (() => {

  // --- Parts database ---
  const PARTS_DB = [
    // Compressors
    { category: 'compressor', model: '4FES-5Y', manufacturer: 'Bitzer', compatModels: ['4FC-5.2'], compatMfrs: ['Bitzer'], capacity: '5HP', refrigerant: 'R-404A/R-134a', note: '세미허메틱, 구형 4FC 시리즈 대체' },
    { category: 'compressor', model: '4HE-18Y', manufacturer: 'Bitzer', compatModels: ['4H-15.2'], compatMfrs: ['Bitzer'], capacity: '18HP', refrigerant: 'R-404A/R-134a', note: '세미허메틱, 구형 4H 시리즈 대체' },
    { category: 'compressor', model: '4TES-12Y', manufacturer: 'Bitzer', compatModels: ['4TC-12.2'], compatMfrs: ['Bitzer'], capacity: '12HP', refrigerant: 'R-404A', note: '세미허메틱 트랜스크리티컬' },
    { category: 'compressor', model: 'ZR61K3', manufacturer: 'Copeland', compatModels: ['ZR61KC', 'ZR61KCE'], compatMfrs: ['Copeland', 'Copeland'], capacity: '5톤', refrigerant: 'R-22', note: '스크롤, 주거 AC용' },
    { category: 'compressor', model: 'ZR61KC', manufacturer: 'Copeland', compatModels: ['ZR61K3', 'ZR61KCE'], compatMfrs: ['Copeland', 'Copeland'], capacity: '5톤', refrigerant: 'R-22', note: '스크롤, 주거 AC용' },
    { category: 'compressor', model: 'ZP61KCE', manufacturer: 'Copeland', compatModels: ['ZP61K5E'], compatMfrs: ['Copeland'], capacity: '5톤', refrigerant: 'R-410A', note: '스크롤, UltraTech' },
    { category: 'compressor', model: 'ZB45KCE', manufacturer: 'Copeland', compatModels: ['ZB45KQ', 'ZB45KQE'], compatMfrs: ['Copeland', 'Copeland'], capacity: '4.5HP', refrigerant: 'R-404A', note: '상업 냉동용 스크롤' },
    { category: 'compressor', model: 'ZB45KQ', manufacturer: 'Copeland', compatModels: ['ZB45KCE', 'ZB45KQE'], compatMfrs: ['Copeland', 'Copeland'], capacity: '4.5HP', refrigerant: 'R-404A', note: '상업 냉동용 스크롤' },
    { category: 'compressor', model: 'SC15G', manufacturer: 'Danfoss', compatModels: ['EMT6170Z', 'SC15GH'], compatMfrs: ['Embraco', 'Danfoss'], capacity: '1/2HP', refrigerant: 'R-134a', note: '소형 허메틱, 상업 냉장' },
    { category: 'compressor', model: 'EMT6170Z', manufacturer: 'Embraco', compatModels: ['SC15G'], compatMfrs: ['Danfoss'], capacity: '1/2HP', refrigerant: 'R-134a', note: '소형 허메틱' },
    { category: 'compressor', model: 'NTZ068A4', manufacturer: 'Embraco', compatModels: ['AE4460Z'], compatMfrs: ['Tecumseh'], capacity: '1/3HP', refrigerant: 'R-404A', note: '소형 냉동용' },
    { category: 'compressor', model: 'SH184', manufacturer: 'Danfoss', compatModels: ['SH180', 'MTZ160'], compatMfrs: ['Danfoss', 'Danfoss'], capacity: '15HP', refrigerant: 'R-407C/R-134a', note: '스크롤, 칠러용' },
    { category: 'compressor', model: 'ZR94KCE', manufacturer: 'Copeland', compatModels: ['ZR94KC'], compatMfrs: ['Copeland'], capacity: '8톤', refrigerant: 'R-22', note: '대형 주거/경상업' },

    // Filter Driers
    { category: 'filter_drier', model: 'DML 083', manufacturer: 'Danfoss', compatModels: ['C-083', 'EK-083'], compatMfrs: ['Sporlan', 'Emerson'], capacity: '3/8"', refrigerant: '범용', note: '리퀴드라인 필터 드라이어' },
    { category: 'filter_drier', model: 'C-083', manufacturer: 'Sporlan', compatModels: ['DML 083', 'EK-083'], compatMfrs: ['Danfoss', 'Emerson'], capacity: '3/8"', refrigerant: '범용', note: 'Catch-All 필터 드라이어' },
    { category: 'filter_drier', model: 'EK-083', manufacturer: 'Emerson', compatModels: ['DML 083', 'C-083'], compatMfrs: ['Danfoss', 'Sporlan'], capacity: '3/8"', refrigerant: '범용', note: '리퀴드라인 필터 드라이어' },
    { category: 'filter_drier', model: 'DML 164', manufacturer: 'Danfoss', compatModels: ['C-164', 'EK-164S'], compatMfrs: ['Sporlan', 'Emerson'], capacity: '1/2"', refrigerant: '범용', note: '리퀴드라인 필터 드라이어' },
    { category: 'filter_drier', model: 'C-164', manufacturer: 'Sporlan', compatModels: ['DML 164', 'EK-164S'], compatMfrs: ['Danfoss', 'Emerson'], capacity: '1/2"', refrigerant: '범용', note: 'Catch-All 필터 드라이어' },
    { category: 'filter_drier', model: 'EK-164S', manufacturer: 'Emerson', compatModels: ['DML 164', 'C-164'], compatMfrs: ['Danfoss', 'Sporlan'], capacity: '1/2"', refrigerant: '범용', note: '리퀴드라인 필터 드라이어' },
    { category: 'filter_drier', model: 'DCL 083', manufacturer: 'Danfoss', compatModels: ['C-083-HH'], compatMfrs: ['Sporlan'], capacity: '3/8"', refrigerant: '범용', note: '비방향성(양방향) 필터 드라이어, 히트펌프용' },
    { category: 'filter_drier', model: 'C-083-HH', manufacturer: 'Sporlan', compatModels: ['DCL 083'], compatMfrs: ['Danfoss'], capacity: '3/8"', refrigerant: '범용', note: '비방향성 Catch-All, 히트펌프용' },
    { category: 'filter_drier', model: 'DML 305', manufacturer: 'Danfoss', compatModels: ['C-305', 'EK-305S'], compatMfrs: ['Sporlan', 'Emerson'], capacity: '5/8"', refrigerant: '범용', note: '대형 리퀴드라인' },

    // TXV
    { category: 'txv', model: 'VVE-A', manufacturer: 'Sporlan', compatModels: ['TUAE'], compatMfrs: ['Danfoss'], capacity: '다양', refrigerant: 'R-22/R-407C', note: '외부 이퀄라이저, AC용' },
    { category: 'txv', model: 'TUAE', manufacturer: 'Danfoss', compatModels: ['VVE-A'], compatMfrs: ['Sporlan'], capacity: '다양', refrigerant: 'R-22/R-407C', note: '외부 이퀄라이저, AC용' },
    { category: 'txv', model: 'EBSE', manufacturer: 'Sporlan', compatModels: ['TEX'], compatMfrs: ['Danfoss'], capacity: '다양', refrigerant: 'R-404A', note: '냉동용 TXV' },
    { category: 'txv', model: 'TEX', manufacturer: 'Danfoss', compatModels: ['EBSE'], compatMfrs: ['Sporlan'], capacity: '다양', refrigerant: 'R-404A', note: '냉동용 TXV' },
    { category: 'txv', model: 'EBS-A', manufacturer: 'Sporlan', compatModels: ['TES'], compatMfrs: ['Danfoss'], capacity: '다양', refrigerant: 'R-410A', note: 'R-410A AC용' },
    { category: 'txv', model: 'TES', manufacturer: 'Danfoss', compatModels: ['EBS-A'], compatMfrs: ['Sporlan'], capacity: '다양', refrigerant: 'R-410A', note: 'R-410A AC용' },

    // Solenoid Valves
    { category: 'solenoid', model: 'EVR 6', manufacturer: 'Danfoss', compatModels: ['B6F1'], compatMfrs: ['Sporlan'], capacity: '3/8"', refrigerant: '범용', note: '직동식 솔레노이드 밸브' },
    { category: 'solenoid', model: 'B6F1', manufacturer: 'Sporlan', compatModels: ['EVR 6'], compatMfrs: ['Danfoss'], capacity: '3/8"', refrigerant: '범용', note: '직동식 솔레노이드 밸브' },
    { category: 'solenoid', model: 'EVR 10', manufacturer: 'Danfoss', compatModels: ['B10F1'], compatMfrs: ['Sporlan'], capacity: '1/2"', refrigerant: '범용', note: '직동식 솔레노이드 밸브' },
  ];

  const CATEGORY_LABELS = {
    get compressor() { return t('parts.cat_compressor', '컴프레서'); },
    get filter_drier() { return t('parts.cat_filter_drier', '필터 드라이어'); },
    get txv() { return t('parts.cat_txv', 'TXV (팽창밸브)'); },
    get solenoid() { return t('parts.cat_solenoid', '솔레노이드 밸브'); }
  };

  function initUI() {
    render();
  }

  function render() {
    const container = document.getElementById('parts-content');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header">
        <h1>🔗 ${t('parts.title', '부품 호환 매칭')}</h1>
        <p class="subtitle">${t('parts.subtitle', '크로스 레퍼런스 검색')}</p>
      </div>

      <div class="glass-card">
        <div class="form-group">
          <label class="form-label">${t('parts.search_label', '부품 모델명 검색')}</label>
          <input type="text" id="parts-search" class="form-input" placeholder="${t('parts.search_placeholder', '예: ZR61K3, DML 083, TUAE...')}"
            oninput="PartsCrossRef.search()" style="font-family:var(--font-sans)">
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          <button class="btn btn-sm ${true ? 'btn-primary' : 'btn-secondary'}" onclick="PartsCrossRef.filterCategory('')" id="parts-cat-all" style="width:auto;padding:6px 12px;font-size:var(--text-sm)">${t('common.all', '전체')}</button>
          ${Object.entries(CATEGORY_LABELS).map(([k, v]) => `
            <button class="btn btn-sm btn-secondary" onclick="PartsCrossRef.filterCategory('${k}')" id="parts-cat-${k}" style="width:auto;padding:6px 12px;font-size:var(--text-sm)">${v}</button>
          `).join('')}
        </div>
      </div>

      <div id="parts-result-area">
        <div class="glass-card" style="text-align:center;padding:40px 24px">
          <span style="font-size:var(--text-3xl)">🔍</span>
          <p style="color:var(--text-secondary);margin-top:12px">${t('parts.enter_model', '부품 모델명을 입력하세요.')}</p>
          <p style="color:var(--text-muted);font-size:var(--text-sm);margin-top:4px">${t('parts.example_models', '예: ZR61, DML, C-083, TUAE')}</p>
        </div>
      </div>`;
  }

  let activeCategory = '';

  function filterCategory(cat) {
    activeCategory = cat;
    // Update button styles
    document.getElementById('parts-cat-all').className = `btn btn-sm ${cat === '' ? 'btn-primary' : 'btn-secondary'}`;
    Object.keys(CATEGORY_LABELS).forEach(k => {
      const btn = document.getElementById(`parts-cat-${k}`);
      if (btn) btn.className = `btn btn-sm ${cat === k ? 'btn-primary' : 'btn-secondary'}`;
    });
    search();
  }

  function search() {
    const query = (document.getElementById('parts-search')?.value || '').toUpperCase().trim();
    const resultEl = document.getElementById('parts-result-area');
    if (!resultEl) return;

    if (query.length < 2) {
      resultEl.innerHTML = `
        <div class="glass-card" style="text-align:center;padding:40px 24px">
          <span style="font-size:var(--text-3xl)">🔍</span>
          <p style="color:var(--text-secondary);margin-top:12px">${t('parts.min_chars', '2글자 이상 입력하세요.')}</p>
        </div>`;
      return;
    }

    let matches = PARTS_DB.filter(p => {
      const modelMatch = p.model.toUpperCase().includes(query) ||
        p.compatModels.some(m => m.toUpperCase().includes(query));
      const catMatch = !activeCategory || p.category === activeCategory;
      return modelMatch && catMatch;
    });

    if (matches.length === 0) {
      resultEl.innerHTML = `
        <div class="glass-card" style="text-align:center;padding:32px 24px">
          <span style="font-size:var(--text-3xl)">😕</span>
          <p style="color:var(--text-secondary);margin-top:12px">"${query}" ${t('parts.no_results', '검색 결과 없음')}</p>
          <p style="color:var(--text-muted);font-size:var(--text-sm);margin-top:4px">${t('parts.not_in_db', 'DB에 등록되지 않은 부품입니다.')}</p>
        </div>`;
      return;
    }

    resultEl.innerHTML = `<div style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:8px">${matches.length} ${t('parts.results_count', '개 결과')}</div>` +
      matches.map(p => {
        const catLabel = CATEGORY_LABELS[p.category] || p.category;
        const compats = p.compatModels.map((m, i) => `<span style="color:var(--accent-cyan);font-family:var(--font-mono);font-weight:600">${m}</span> <span style="color:var(--text-muted);font-size:var(--text-xs)">(${p.compatMfrs[i] || ''})</span>`).join(', ');

        return `
          <div class="glass-card" style="padding:16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
              <div>
                <span style="font-family:var(--font-mono);font-size:var(--text-base);font-weight:700;color:var(--text-primary)">${p.model}</span>
                <span style="font-size:var(--text-sm);color:var(--text-secondary);margin-left:6px">${p.manufacturer}</span>
              </div>
              <span class="badge badge-normal" style="font-size:var(--text-xs)">${catLabel}</span>
            </div>
            <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:8px">
              ${p.capacity ? `${t('parts.capacity', '용량')}: ${p.capacity} · ` : ''}${t('parts.refrigerant', '냉매')}: ${p.refrigerant}
            </div>
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;margin-bottom:8px">
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">${t('parts.compatible', '호환 부품')}:</div>
              <div style="font-size:var(--text-sm);line-height:1.8">${compats}</div>
            </div>
            ${p.note ? `<div style="font-size:var(--text-sm);color:var(--text-muted)">${p.note}</div>` : ''}
          </div>`;
      }).join('');
  }

  return { initUI, search, filterCategory };
})();

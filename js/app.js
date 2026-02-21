// ===================================================
// HVAC Pulse — Main Application
// Copyright (c) 2024-2026 HVAC Pulse.
// All rights reserved. Unauthorized copying prohibited.
// ===================================================

const APP_VERSION = '1.0.0';

const App = (() => {

  // HTML escape to prevent XSS
  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // Main tab → page element mapping
  const TAB_MAP = {
    'home':     'page-home',
    'tools':    'page-tools',
    'records':  'page-records',
    'settings': 'page-settings'
  };

  // Category → sub-tab mapping
  const CATEGORY_MAP = {
    'diag':   { label: '진단',     subs: ['cross', 'nist', 'txv', 'errorcode'] },
    'calc':   { label: '계산',     subs: ['pt', 'compare', 'pipe'] },
    'visual': { label: '시각화',   subs: ['cycle', 'ph', 'phlearn'] },
    'maint':  { label: '정비관리', subs: ['checklist', 'parts'] }
  };

  // Sub-tab display labels
  const SUB_LABELS = {
    'cross': '교차진단', 'nist': 'NIST', 'txv': 'TXV', 'errorcode': '에러코드',
    'pt': 'P-T 계산', 'compare': '냉매비교', 'pipe': '배관계산',
    'cycle': '사이클', 'ph': 'P-H 선도', 'phlearn': 'P-H 학습',
    'checklist': '체크리스트', 'parts': '부품호환'
  };

  // Sub-tab defaults
  const SUB_DEFAULTS = {
    'records': 'service'
  };

  let currentCategory = null;

  // =============================================
  // SVG Icon Library (replaces emoji)
  // =============================================
  const SVG_ICONS = {
    checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    alertCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    alertTriangle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    xCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"/></svg>',
    arrowDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    siren: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4"/><path d="M5.5 5.5l2.8 2.8"/><path d="M18.5 5.5l-2.8 2.8"/><circle cx="12" cy="14" r="6"/><line x1="12" y1="11" x2="12" y2="14"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };

  function diagIcon(level) {
    const iconMap = {
      normal: { svg: SVG_ICONS.checkCircle, cls: 'icon-normal' },
      caution: { svg: SVG_ICONS.alertTriangle, cls: 'icon-caution' },
      danger: { svg: SVG_ICONS.xCircle, cls: 'icon-danger' },
      info: { svg: SVG_ICONS.alertCircle, cls: 'icon-info' }
    };
    const i = iconMap[level] || iconMap.info;
    return `<div class="diag-icon-svg ${i.cls}">${i.svg}</div>`;
  }

  // Inline status SVG icon (replaces emoji ✅/⚠️/🔴 for cross-platform consistency)
  function statusSvg(status) {
    const map = {
      normal: `<span class="svg-icon svg-icon--sm icon-normal">${SVG_ICONS.checkCircle}</span>`,
      caution: `<span class="svg-icon svg-icon--sm icon-caution">${SVG_ICONS.alertTriangle}</span>`,
      danger: `<span class="svg-icon svg-icon--sm icon-danger">${SVG_ICONS.xCircle}</span>`,
      warning: `<span class="svg-icon svg-icon--sm icon-caution">${SVG_ICONS.alertTriangle}</span>`,
      info: `<span class="svg-icon svg-icon--sm icon-info">${SVG_ICONS.alertCircle}</span>`,
      high: `<span class="svg-icon svg-icon--sm icon-danger">${SVG_ICONS.arrowUp}</span>`,
      low: `<span class="svg-icon svg-icon--sm icon-danger">${SVG_ICONS.arrowDown}</span>`,
      siren: `<span class="svg-icon svg-icon--sm icon-danger">${SVG_ICONS.siren}</span>`
    };
    return map[status] || map.info;
  }

  // =============================================
  // Search Index
  // =============================================
  const SEARCH_INDEX = [
    { tkey: 'tool.pt', title: 'P-T 계산기', desc: '압력-온도 변환, 포화온도', keywords: 'pt 계산 압력 온도 포화 변환 calculator pressure temperature', cat: 'calc', sub: 'pt', icon: '🔢' },
    { tkey: 'tool.superheat', title: '과열도 계산', desc: '석션라인 과열도', keywords: '과열 superheat 석션 suction', cat: 'calc', sub: 'pt', icon: '🌡️' },
    { tkey: 'tool.subcooling', title: '과냉도 계산', desc: '리퀴드라인 과냉도', keywords: '과냉 subcooling 리퀴드 liquid', cat: 'calc', sub: 'pt', icon: '🌡️' },
    { tkey: 'tool.cross', title: '교차 진단', desc: '과열도 × 과냉도 자동 진단', keywords: '교차 진단 diagnostic cross 매트릭스 matrix', cat: 'diag', sub: 'cross', icon: '📊' },
    { tkey: 'tool.nist', title: 'NIST 비침습 진단', desc: '게이지 없이 온도만으로', keywords: 'nist 비침습 온도 게이지 없이 non-invasive DTD CTOA', cat: 'diag', sub: 'nist', icon: '🌡️' },
    { tkey: 'tool.txv', title: 'TXV 마법사', desc: 'TXV 트러블슈팅 12단계', keywords: 'txv 팽창밸브 마법사 wizard sporlan 언더피딩 플러딩', cat: 'diag', sub: 'txv', icon: '🔧' },
    { tkey: 'tool.errorcode', title: '에러코드 검색', desc: '제조사별 에러코드 DB', keywords: '에러코드 error code 삼성 LG 다이킨 캐리어 트레인', cat: 'diag', sub: 'errorcode', icon: '⚠️' },
    { tkey: 'tool.cycle', title: '냉동 사이클', desc: 'SVG 사이클 다이어그램', keywords: '사이클 cycle 다이어그램 diagram 압축 응축 팽창 증발', cat: 'visual', sub: 'cycle', icon: '🔄' },
    { tkey: 'tool.ph', title: 'P-H 선도', desc: 'CoolProp 실시간 P-H 다이어그램', keywords: 'ph 선도 diagram 엔탈피 압력 coolprop', cat: 'visual', sub: 'ph', icon: '📈' },
    { tkey: 'tool.phlearn', title: 'P-H 학습', desc: '인터랙티브 P-H 학습', keywords: 'ph 학습 interactive 인터랙티브', cat: 'visual', sub: 'phlearn', icon: '📚' },
    { tkey: 'tool.compare', title: '냉매 비교', desc: '냉매 물성 비교 차트', keywords: '냉매 비교 compare refrigerant GWP 안전 safety', cat: 'calc', sub: 'compare', icon: '⚖️' },
    { tkey: 'tool.pipe', title: '배관 계산', desc: '배관 사이즈 계산', keywords: '배관 pipe 계산 사이즈 size', cat: 'calc', sub: 'pipe', icon: '📏' },
    { tkey: 'tool.checklist', title: '정비 체크리스트', desc: '정기 정비 항목', keywords: '체크리스트 checklist 정비 maintenance 점검', cat: 'maint', sub: 'checklist', icon: '✅' },
    { tkey: 'tool.parts', title: '부품 호환', desc: '부품 호환 정보', keywords: '부품 parts 호환 cross reference', cat: 'maint', sub: 'parts', icon: '🔩' },
    { tkey: 'tool.service', title: '수리 이력', desc: '서비스 기록 관리', keywords: '수리 이력 기록 service history record', tab: 'records', icon: '📝' },
    { tkey: 'tool.notes', title: '현장 메모', desc: '현장 메모 기록', keywords: '메모 notes 현장 field', tab: 'records', icon: '📒' },
    // Refrigerant shortcuts
    { tkey: 'tool.r410a', title: 'R-410A', desc: '가장 많이 사용되는 냉매', keywords: 'r410a r-410a 410', cat: 'calc', sub: 'pt', icon: '❄️' },
    { tkey: 'tool.r22', title: 'R-22', desc: '단계적 퇴출 냉매', keywords: 'r22 r-22 프레온', cat: 'calc', sub: 'pt', icon: '❄️' },
    { tkey: 'tool.r32', title: 'R-32', desc: '차세대 냉매 (A2L)', keywords: 'r32 r-32', cat: 'calc', sub: 'pt', icon: '❄️' },
    { tkey: 'tool.r454b', title: 'R-454B', desc: 'R-410A 대체 냉매', keywords: 'r454b r-454b 대체', cat: 'calc', sub: 'pt', icon: '❄️' },
  ];

  // =============================================
  // Initialize
  // =============================================
  function init() {
    // Setup tab navigation
    document.querySelectorAll('.tab-item').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        if (target) switchTab(target);
      });
    });

    // Setup category cards
    document.querySelectorAll('.tool-category[data-category]').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.dataset.category;
        if (cat) showCategory(cat);
      });
    });

    // Update version displays
    document.querySelectorAll('.version-info').forEach(el => {
      el.textContent = `HVAC Pulse v${APP_VERSION}`;
    });
    const aboutVer = document.getElementById('about-version');
    if (aboutVer) aboutVer.textContent = `Version ${APP_VERSION}`;

    // Setup quick tool buttons (home)
    document.querySelectorAll('.quick-tool-btn[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nav = btn.dataset.nav;
        const cat = btn.dataset.category;
        const sub = btn.dataset.sub;
        if (nav) {
          switchTab(nav);
          if (cat) {
            setTimeout(() => {
              showCategory(cat);
              if (sub) setTimeout(() => showSub('tools', sub), 50);
            }, 50);
          }
        }
      });
    });

    // One-time migration: reset old defaults (v3)
    if (!localStorage.getItem('hvac-migrated-v3')) {
      localStorage.removeItem('hvac-unit');
      localStorage.removeItem('hvac-pressure-unit');
      localStorage.removeItem('hvac-lang');
      localStorage.setItem('hvac-migrated-v3', '1');
    }

    // i18n — initialize BEFORE modules so t() returns correct language from first render
    if (typeof I18n !== 'undefined') {
      I18n.init();
      I18n.renderSelector('lang-section');
    }

    // Populate home refrigerant dropdown
    initHomeRefDropdown();

    // Setup home quick diagnosis button
    const quickDiagBtn = document.getElementById('home-quick-diag-btn');
    if (quickDiagBtn) {
      quickDiagBtn.addEventListener('click', runQuickDiagnosis);
    }

    // Initialize core modules (I18n already active — renders in correct language)
    PTCalculator.initUI();
    DiagnosticEngine.initUI();
    NISTDiagnostic.initUI();
    TXVWizard.initUI();
    ErrorCodeSearch.initUI();
    CycleVisualization.initUI();

    // Initialize advanced modules
    if (typeof PHDiagram !== 'undefined') PHDiagram.initUI();
    if (typeof RefrigerantCompare !== 'undefined') RefrigerantCompare.initUI();

    // Initialize interactive tools
    if (typeof PHInteractive !== 'undefined') PHInteractive.initUI();

    // Initialize DB-dependent modules
    DB.open().then(() => {
      MaintenanceChecklist.initUI();
      ServiceHistory.initUI();
      PartsCrossRef.initUI();
      PipeCalculator.initUI();
      FieldNotes.initUI();
      updateHomeRecent();
      Settings.initUI();
      // Auth & Cloud Sync (optional — gracefully degrades if Firebase not configured)
      if (typeof Auth !== 'undefined') Auth.init();
    }).catch(err => {
      console.warn('DB open failed, initializing modules without DB:', err);
      MaintenanceChecklist.initUI();
      ServiceHistory.initUI();
      PartsCrossRef.initUI();
      PipeCalculator.initUI();
      FieldNotes.initUI();
      Settings.initUI();
      if (typeof Auth !== 'undefined') Auth.init();
    });

    // Security protections
    if (typeof AppSecurity !== 'undefined') AppSecurity.init();

    // Temperature unit settings
    initSettings();

    // Show home
    switchTab('home');

    // Register service worker
    registerSW();

    // Offline/online detection
    initOfflineDetection();

    // Install prompt
    InstallPrompt.init();

    // Hide splash screen
    hideSplash();

    // Initialize CoolProp WASM engine (async, non-blocking)
    initCoolProp();

    // --- New Features ---
    initOnboarding();
    initHelpTooltips();
    initSearch();
    initBackButton();
    initSessionStorage();
    initSubTabScrollHints();
  }

  // Sub-tab scroll fade hint
  function initSubTabScrollHints() {
    document.querySelectorAll('.sub-tab-bar').forEach(bar => {
      const wrap = bar.closest('.sub-tab-bar-wrap');
      if (!wrap) return;
      const check = () => {
        const atEnd = bar.scrollLeft + bar.clientWidth >= bar.scrollWidth - 8;
        wrap.classList.toggle('scrolled-end', atEnd);
      };
      bar.addEventListener('scroll', check, { passive: true });
      check();
    });
  }

  // =============================================
  // Onboarding (first-time user guide)
  // =============================================
  function initOnboarding() {
    if (localStorage.getItem('hvac-onboarding-done')) return;

    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;

    overlay.style.display = 'flex';
    let currentSlide = 0;
    const slides = overlay.querySelectorAll('.onboarding-slide');
    const dots = overlay.querySelectorAll('.onboarding-dot');
    const nextBtn = document.getElementById('onboarding-next');
    const skipBtn = document.getElementById('onboarding-skip');

    function showSlide(idx) {
      slides.forEach(s => s.classList.remove('active'));
      dots.forEach(d => d.classList.remove('active'));
      if (slides[idx]) slides[idx].classList.add('active');
      if (dots[idx]) dots[idx].classList.add('active');
      currentSlide = idx;
      if (nextBtn) nextBtn.textContent = idx === slides.length - 1 ? t('onboarding.start', '시작하기') : t('onboarding.next', '다음');
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentSlide < slides.length - 1) {
          showSlide(currentSlide + 1);
        } else {
          closeOnboarding();
        }
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', closeOnboarding);
    }

    function closeOnboarding() {
      localStorage.setItem('hvac-onboarding-done', '1');
      overlay.classList.add('hide');
      setTimeout(() => { overlay.style.display = 'none'; }, 400);
    }
  }

  // =============================================
  // Help Tooltips (? icons)
  // =============================================
  function initHelpTooltips() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.help-trigger');

      // Close all open tooltips first
      document.querySelectorAll('.help-trigger.show-tip').forEach(t => {
        if (t !== trigger) t.classList.remove('show-tip');
      });

      if (!trigger) return;
      e.preventDefault();
      e.stopPropagation();

      // Create tooltip if not exists
      if (!trigger.querySelector('.help-tooltip')) {
        const tip = document.createElement('div');
        tip.className = 'help-tooltip';
        tip.textContent = trigger.dataset.help || '';
        trigger.appendChild(tip);
      }

      trigger.classList.toggle('show-tip');
    });
  }

  // =============================================
  // App Search
  // =============================================
  function initSearch() {
    const trigger = document.getElementById('search-trigger');
    const overlay = document.getElementById('search-overlay');
    const input = document.getElementById('search-input');
    const closeBtn = document.getElementById('search-close');
    const resultsEl = document.getElementById('search-results');
    if (!overlay || !input) return;

    function openSearch() {
      overlay.classList.add('show');
      setTimeout(() => input.focus(), 100);
    }

    function closeSearch() {
      overlay.classList.remove('show');
      input.value = '';
      if (resultsEl) resultsEl.innerHTML = '';
    }

    if (trigger) trigger.addEventListener('click', openSearch);
    if (closeBtn) closeBtn.addEventListener('click', closeSearch);

    // Also close on Escape
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSearch();
    });

    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      if (!resultsEl) return;

      if (query.length < 1) {
        resultsEl.innerHTML = `<div class="search-empty">${t('search.hint', '도구명, 냉매, 기능을 검색하세요')}</div>`;
        return;
      }

      const matches = SEARCH_INDEX.filter(item => {
        const tTitle = t(item.tkey, item.title).toLowerCase();
        const tDesc = t(item.tkey + '.desc', item.desc).toLowerCase();
        return item.title.toLowerCase().includes(query) ||
               tTitle.includes(query) ||
               item.desc.toLowerCase().includes(query) ||
               tDesc.includes(query) ||
               item.keywords.toLowerCase().includes(query);
      });

      if (matches.length === 0) {
        resultsEl.innerHTML = `<div class="search-empty">"${input.value}" — ${t('search.noresults', '결과가 없습니다')}</div>`;
        return;
      }

      resultsEl.innerHTML = matches.map(item => `
        <div class="search-result-item" data-cat="${item.cat || ''}" data-sub="${item.sub || ''}" data-tab="${item.tab || ''}">
          <div class="sr-icon">${item.icon}</div>
          <div>
            <div class="sr-title">${highlightMatch(t(item.tkey, item.title), query)}</div>
            <div class="sr-desc">${t(item.tkey + '.desc', item.desc)}</div>
          </div>
        </div>
      `).join('');

      // Handle clicks
      resultsEl.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
          const cat = el.dataset.cat;
          const sub = el.dataset.sub;
          const tab = el.dataset.tab;
          closeSearch();
          if (tab) {
            switchTab(tab);
          } else if (cat && sub) {
            switchTab('tools');
            setTimeout(() => {
              showCategory(cat);
              setTimeout(() => showSub('tools', sub), 50);
            }, 50);
          }
        });
      });
    });

    function highlightMatch(text, query) {
      const idx = text.toLowerCase().indexOf(query);
      if (idx < 0) return text;
      return text.substring(0, idx) +
        '<strong style="color:var(--accent-cyan)">' + text.substring(idx, idx + query.length) + '</strong>' +
        text.substring(idx + query.length);
    }
  }

  // =============================================
  // Hardware Back Button (History API)
  // =============================================
  function initBackButton() {
    // Push initial state
    history.replaceState({ tab: 'home', category: null }, '');

    window.addEventListener('popstate', (e) => {
      const state = e.state;
      if (!state) return;

      if (state.category && state.tab === 'tools') {
        // Go back to category from sub-page, or hub from category
        if (currentCategory && currentCategory !== state.category) {
          backToHub();
        } else if (currentCategory) {
          backToHub();
        } else {
          switchTab(state.tab, true);
        }
      } else if (state.tab) {
        if (currentCategory) {
          backToHub();
          // Push state back so next back goes to home
          history.pushState({ tab: 'tools', category: null }, '');
        } else {
          switchTab(state.tab, true);
        }
      }
    });
  }

  // =============================================
  // SessionStorage — Preserve input values
  // =============================================
  const SS_KEY = 'hvac-inputs';

  function initSessionStorage() {
    // Restore saved values
    try {
      const saved = JSON.parse(sessionStorage.getItem(SS_KEY) || '{}');
      Object.entries(saved).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT')) {
          el.value = val;
        }
      });
    } catch (e) { /* ignore */ }

    // Auto-save on input change (debounced)
    let saveTimer = null;
    document.addEventListener('input', (e) => {
      const el = e.target;
      if (!el.id || !(el.tagName === 'INPUT' || el.tagName === 'SELECT')) return;
      // Only save form inputs (not search etc.)
      if (el.closest('.search-bar') || el.closest('.onboarding-overlay')) return;

      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveInputs(), 300);
    });

    document.addEventListener('change', (e) => {
      const el = e.target;
      if (!el.id || el.tagName !== 'SELECT') return;
      if (el.closest('.search-bar')) return;
      saveInputs();
    });
  }

  function saveInputs() {
    const data = {};
    const inputs = document.querySelectorAll('input[id][type="number"], select[id].form-select');
    inputs.forEach(el => {
      if (el.value && el.id && !el.closest('.search-bar') && !el.closest('.onboarding-overlay')) {
        data[el.id] = el.value;
      }
    });
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify(data));
    } catch (e) { /* quota exceeded, ignore */ }
  }

  // =============================================
  // Home — Refrigerant Dropdown
  // =============================================
  function initHomeRefDropdown() {
    const sel = document.getElementById('home-ref-select');
    if (!sel) return;

    if (typeof PTCalculator !== 'undefined' && PTCalculator.populateRefDropdown) {
      PTCalculator.populateRefDropdown(sel);
    } else if (typeof getRefrigerantList === 'function') {
      getRefrigerantList().forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = key;
        sel.appendChild(opt);
      });
    }
  }

  // =============================================
  // Home — Quick Diagnosis
  // =============================================
  function runQuickDiagnosis() {
    const shEl = document.getElementById('home-sh');
    const scEl = document.getElementById('home-sc');
    const sh = parseFloat(shEl?.value);
    const sc = parseFloat(scEl?.value);

    // Inline validation
    let hasError = false;
    [shEl, scEl].forEach(el => {
      const group = el?.closest('.form-group');
      const errSpan = group?.querySelector('.field-error span');
      if (!el || isNaN(parseFloat(el.value))) {
        if (group) group.classList.add('has-error');
        if (errSpan) errSpan.textContent = t('validation.required', '값을 입력하세요');
        hasError = true;
      } else {
        if (group) group.classList.remove('has-error');
      }
    });

    if (hasError) return;

    const result = (typeof DiagnosticEngine !== 'undefined' && DiagnosticEngine.quickDiagnose)
      ? DiagnosticEngine.quickDiagnose(sh, sc)
      : quickDiagnoseFallback(sh, sc);

    const resultEl = document.getElementById('home-quick-result');
    if (!resultEl) return;

    const levelClass = result.level === 'normal' ? 'result-normal' : result.level === 'caution' ? 'result-caution' : 'result-danger';
    const iconHtml = diagIcon(result.level);

    const safeTitle = esc(result.title);
    const safeSummary = esc(result.summary);
    const copyDetail = `SH ${sh}°F / SC ${sc}°F — ${result.summary}`;

    resultEl.innerHTML = `
      <div class="diag-result ${levelClass} anim-fade-up" style="padding:14px;border-radius:var(--radius-md)">
        <div style="display:flex;align-items:center;gap:12px">
          ${iconHtml}
          <div>
            <div class="fw-700" style="font-size:var(--text-base)">${safeTitle}</div>
            <div class="text-xs text-secondary mt-4">${safeSummary}</div>
          </div>
        </div>
        <div class="diag-actions-row">
          <button class="diag-action-btn btn-detail" data-action="detail">
            ${SVG_ICONS.arrowRight} ${t('home.detail', '상세 진단')}
          </button>
          <button class="diag-action-btn btn-copy" data-action="copy">
            ${SVG_ICONS.copy} ${t('home.copy', '복사')}
          </button>
        </div>
      </div>
    `;

    // Event delegation — no inline handlers
    resultEl.querySelector('[data-action="detail"]').addEventListener('click', () => {
      App.switchTab('tools');
      setTimeout(() => { App.showCategory('diag'); setTimeout(() => App.showSub('tools', 'cross'), 100); }, 100);
    });
    resultEl.querySelector('[data-action="copy"]').addEventListener('click', function () {
      copyDiagText(this, result.title, copyDetail);
    });
  }

  // Fallback if DiagnosticEngine.quickDiagnose not available
  function quickDiagnoseFallback(sh, sc) {
    const SH = t('pt.superheat', '과열도');
    const SC = t('pt.subcooling', '과냉도');
    const NRM = t('status.normal', '정상');
    const u = (typeof Settings !== 'undefined') ? Settings.tempLabel() : '°F';
    // Convert user deltas to °F for threshold comparison
    const shF = (typeof Settings !== 'undefined' && Settings.isMetric()) ? sh * 9 / 5 : sh;
    const scF = (typeof Settings !== 'undefined' && Settings.isMetric()) ? sc * 9 / 5 : sc;
    if (shF >= 5 && shF <= 15 && scF >= 8 && scF <= 14)
      return { title: t('diag.normal.title', '정상'), summary: t('quick.normal_summary', '측정값이 정상 범위입니다'), level: 'normal' };
    if (shF > 15 && scF < 8)
      return { title: t('diag.lowcharge.title', '냉매 부족 (누설 의심)'), summary: `${SH} ${sh}${u}↑ · ${SC} ${sc}${u}↓`, level: 'danger' };
    if (shF > 15 && scF > 14)
      return { title: t('diag.metering.title', '계량장치 제한'), summary: `${SH} ${sh}${u}↑ · ${SC} ${sc}${u}↑`, level: 'danger' };
    if (shF < 5 && scF > 14)
      return { title: t('diag.overcharge.title', '냉매 과충전'), summary: `${SH} ${sh}${u}↓ · ${SC} ${sc}${u}↑`, level: 'danger' };
    if (shF < 5 && scF < 8)
      return { title: t('diag.compressor.title', '컴프레서 불량'), summary: `${SH} ${sh}${u}↓ · ${SC} ${sc}${u}↓`, level: 'danger' };
    if (shF < 5 && scF >= 8 && scF <= 14)
      return { title: t('diag.txvoverfeed.title', 'TXV 오버피딩'), summary: `${SH} ${sh}${u}↓ · ${SC} ${NRM}`, level: 'caution' };
    if (shF > 15 && scF >= 8 && scF <= 14)
      return { title: t('diag.lowairflow.title', '에어플로우 부족'), summary: `${SH} ${sh}${u}↑ · ${SC} ${NRM}`, level: 'caution' };
    return { title: t('diag.atypical.title', '비정형 조합'), summary: `${SH} ${sh}${u} · ${SC} ${sc}${u} — ${t('diag.atypical.hint', '상세 진단 필요')}`, level: 'caution' };
  }

  // =============================================
  // Copy Diagnostic Text
  // =============================================
  function copyDiagText(btn, title, detail) {
    const text = `[HVAC Pulse] ${title}\n${detail}\n— ${new Date().toLocaleString('ko-KR')}`;
    navigator.clipboard.writeText(text).then(() => {
      btn.classList.add('copied');
      const origHtml = btn.innerHTML;
      btn.innerHTML = `${SVG_ICONS.checkCircle} ${t('home.copied', '복사됨')}`;
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = origHtml;
      }, 1500);
    }).catch(() => {
      // Fallback: select text
      showToast(t('toast.copy_fail', '클립보드 복사 실패'), 'error');
    });
  }

  // =============================================
  // CoolProp WASM Initialization
  // =============================================
  function initCoolProp() {
    if (typeof CoolPropEngine === 'undefined') return;

    CoolPropEngine.init().then(ready => {
      if (ready) {
        console.log('CoolProp WASM engine ready');
        showToast(t('toast.coolprop_ready', 'CoolProp 엔진 로드 완료 — NIST급 계산 활성화'), 'success');
        const badge = document.getElementById('home-engine-status');
        if (badge) {
          badge.textContent = t('app.engine_ready', 'CoolProp NIST 엔진 활성');
          badge.style.color = 'var(--accent-green)';
        }
        if (typeof PTCalculator !== 'undefined' && PTCalculator.onEngineReady) {
          PTCalculator.onEngineReady();
        }
        if (typeof PHDiagram !== 'undefined' && PHDiagram.onEngineReady) {
          PHDiagram.onEngineReady();
        }
        if (typeof PHInteractive !== 'undefined' && PHInteractive.onEngineReady) {
          PHInteractive.onEngineReady();
        }
      } else {
        console.log('CoolProp WASM not available, using legacy P-T data');
        const badge = document.getElementById('home-engine-status');
        if (badge) {
          badge.textContent = t('app.engine_legacy', '레거시 P-T 데이터 모드');
          badge.style.color = 'var(--text-muted)';
        }
      }
    });
  }

  // =============================================
  // Tab Switching (with History API)
  // =============================================
  function switchTab(tabName, fromPopstate) {
    if (!TAB_MAP[tabName]) return;

    // Hide all pages
    document.querySelectorAll('.page-section').forEach(p => {
      p.classList.remove('active');
    });

    // Show target page
    const targetPage = document.getElementById(TAB_MAP[tabName]);
    if (targetPage) targetPage.classList.add('active');

    // Update tab bar active state + aria
    document.querySelectorAll('.tab-item').forEach(t => {
      const isActive = t.dataset.tab === tabName;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // When switching to tools, show hub by default
    if (tabName === 'tools' && !currentCategory) {
      backToHub();
    }

    // Update home recent when switching to home
    if (tabName === 'home') {
      updateHomeRecent();
    }

    // Push history state (unless triggered by popstate)
    if (!fromPopstate) {
      history.pushState({ tab: tabName, category: null }, '');
    }

    // Scroll to top
    window.scrollTo(0, 0);
  }

  // =============================================
  // Category Hub Navigation
  // =============================================
  function showCategory(categoryKey) {
    const cat = CATEGORY_MAP[categoryKey];
    if (!cat) return;

    currentCategory = categoryKey;

    const hub = document.getElementById('tools-hub');
    const view = document.getElementById('tools-category-view');
    if (hub) hub.style.display = 'none';
    if (view) view.style.display = 'block';

    const backLabel = document.getElementById('category-back-label');
    if (backLabel) backLabel.textContent = t('tools.' + categoryKey + '.title', cat.label);

    const subTabBar = document.getElementById('tools-sub-tabs');
    if (subTabBar) {
      subTabBar.innerHTML = '';
      cat.subs.forEach((sub, i) => {
        const btn = document.createElement('button');
        btn.className = 'sub-tab-btn' + (i === 0 ? ' active' : '');
        btn.dataset.sub = sub;
        btn.dataset.ko = SUB_LABELS[sub] || sub;
        btn.textContent = t('nav.' + sub, SUB_LABELS[sub] || sub);
        btn.addEventListener('click', () => showSub('tools', sub));
        subTabBar.appendChild(btn);
      });
    }

    showSub('tools', cat.subs[0]);

    // Push history
    history.pushState({ tab: 'tools', category: categoryKey }, '');
  }

  function backToHub() {
    currentCategory = null;
    const hub = document.getElementById('tools-hub');
    const view = document.getElementById('tools-category-view');
    if (hub) hub.style.display = 'block';
    if (view) view.style.display = 'none';

    document.querySelectorAll('#page-tools .sub-page').forEach(sp => {
      sp.classList.remove('active');
    });
  }

  // =============================================
  // Sub-tab Switching
  // =============================================
  function showSub(page, subName) {
    const tabBar = document.getElementById(`${page}-sub-tabs`);
    if (tabBar) {
      tabBar.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sub === subName);
      });
    }

    const parentPage = document.getElementById(TAB_MAP[page]);
    if (parentPage) {
      parentPage.querySelectorAll('.sub-page').forEach(sp => {
        sp.classList.toggle('active', sp.id === `${page}-sub-${subName}`);
      });
    }
  }

  // =============================================
  // Home Recent Activity
  // =============================================
  async function updateHomeRecent() {
    try {
      const recentEl = document.getElementById('home-recent');
      const listEl = document.getElementById('home-recent-list');
      if (!recentEl || !listEl) return;

      const records = await DB.getAll(DB.STORES.SERVICE_RECORDS).catch(() => []);
      if (records.length === 0) {
        recentEl.style.display = 'none';
        return;
      }

      const sorted = records.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const latest = sorted.slice(0, 2);

      listEl.innerHTML = latest.map(r => `
        <div class="recent-item" style="padding:10px;background:var(--bg-card);border-radius:var(--radius-sm);margin-bottom:8px">
          <div class="fw-600 text-xs">${r.equipment || t('home.no_equipment', '장비 미지정')}</div>
          <div class="text-xxs text-secondary mt-4">${r.date || ''} · ${r.diagnosis || r.techMemo || ''}</div>
        </div>
      `).join('');

      recentEl.style.display = 'block';
    } catch (e) {
      // DB not ready yet
    }
  }

  // =============================================
  // Settings (Temperature Unit Toggle)
  // =============================================
  function initSettings() {
    const unitPref = localStorage.getItem('hvac-unit') || 'F';
    const unitToggleF = document.getElementById('setting-unit-f');
    const unitToggleC = document.getElementById('setting-unit-c');

    if (unitToggleF && unitToggleC) {
      if (unitPref === 'C') {
        unitToggleC.classList.add('active');
        unitToggleF.classList.remove('active');
      } else {
        unitToggleF.classList.add('active');
        unitToggleC.classList.remove('active');
      }

      unitToggleF.addEventListener('click', () => {
        localStorage.setItem('hvac-unit', 'F');
        unitToggleF.classList.add('active');
        unitToggleC.classList.remove('active');
      });

      unitToggleC.addEventListener('click', () => {
        localStorage.setItem('hvac-unit', 'C');
        unitToggleC.classList.add('active');
        unitToggleF.classList.remove('active');
      });
    }
  }

  // =============================================
  // Toast Notification
  // =============================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: SVG_ICONS.checkCircle,
      error: SVG_ICONS.xCircle,
      warning: SVG_ICONS.alertTriangle,
      info: SVG_ICONS.alertCircle
    };
    const svgIcon = iconMap[type] || iconMap.info;
    toast.innerHTML = `<span class="svg-icon svg-icon--sm" style="color:inherit">${svgIcon}</span> ${message}`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // =============================================
  // Offline/Online Detection
  // =============================================
  function initOfflineDetection() {
    const offlineBar = document.getElementById('offline-bar');
    if (!offlineBar) return;

    function updateStatus() {
      if (navigator.onLine) {
        offlineBar.style.display = 'none';
      } else {
        offlineBar.style.display = 'block';
      }
    }

    window.addEventListener('online', () => {
      updateStatus();
      showToast(t('toast.online', '온라인 상태로 복귀했습니다.'), 'success');
    });

    window.addEventListener('offline', () => {
      updateStatus();
      showToast(t('toast.offline', '오프라인 모드입니다. 저장된 데이터로 작동합니다.'), 'warning');
    });

    updateStatus();
  }

  // =============================================
  // Splash Screen
  // =============================================
  function hideSplash() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;

    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 500);
    }, 800);
  }

  // =============================================
  // Service Worker Registration
  // =============================================
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;

    // Auto-reload when a new SW takes control (prevents serving stale cache)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('SW registered:', reg.scope);

        // Check for updates every 30 minutes
        setInterval(() => reg.update(), 30 * 60 * 1000);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW is ready — send skipWaiting and let controllerchange handle reload
              newWorker.postMessage('SKIP_WAITING');
            }
          });
        });
      })
      .catch(err => console.log('SW registration failed:', err));
  }

  // =============================================
  // Inline Validation Utility
  // =============================================
  function validateField(el, msg) {
    const group = el?.closest('.form-group');
    const errSpan = group?.querySelector('.field-error span');
    if (!el || isNaN(parseFloat(el.value)) || el.value.trim() === '') {
      if (group) group.classList.add('has-error');
      if (errSpan) errSpan.textContent = msg || t('validation.required', '값을 입력하세요');
      return false;
    }
    if (group) group.classList.remove('has-error');
    return true;
  }

  function clearValidation(el) {
    const group = el?.closest('.form-group');
    if (group) group.classList.remove('has-error');
  }

  // =============================================
  // Public API
  // =============================================
  return {
    init, switchTab, showSub, showCategory, backToHub, showToast,
    copyDiagText, diagIcon, statusSvg, SVG_ICONS,
    validateField, clearValidation
  };
})();

// --- Accordion toggle (global, called from onclick) ---
function toggleAccordion(id) {
  const section = document.getElementById(id);
  if (section) section.classList.toggle('open');
}

// Boot on DOM ready
document.addEventListener('DOMContentLoaded', App.init);

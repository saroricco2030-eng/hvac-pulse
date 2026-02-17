// ===================================================
// HVAC Pulse — Error Code Search Engine
// 3 search modes: code, brand drill-down, keyword
// Bookmarks + recent search via IndexedDB
// ===================================================

const ErrorCodeSearch = (() => {

  function getSeverityMap() {
    return {
      critical: { label: t('severity.critical', '심각'), color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
      warning:  { label: t('severity.warning', '주의'), color: 'var(--accent-orange)', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
      info:     { label: t('severity.info', '정보'), color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' }
    };
  }

  let bookmarks = []; // { manufacturer, code }
  let recentSearches = [];
  let activeManufacturer = '';
  let expandedCards = new Set();

  function initUI() {
    loadBookmarks();
    loadRecentSearches();
    renderMain();
  }

  // --- Bookmark persistence (localStorage for simplicity — static data, not IndexedDB) ---
  function loadBookmarks() {
    try {
      bookmarks = JSON.parse(localStorage.getItem('hvac-error-bookmarks') || '[]');
    } catch (e) { bookmarks = []; }
  }

  function saveBookmarks() {
    localStorage.setItem('hvac-error-bookmarks', JSON.stringify(bookmarks));
  }

  function isBookmarked(manufacturer, code) {
    return bookmarks.some(b => b.manufacturer === manufacturer && b.code === code);
  }

  function toggleBookmark(manufacturer, code) {
    const idx = bookmarks.findIndex(b => b.manufacturer === manufacturer && b.code === code);
    if (idx >= 0) {
      bookmarks.splice(idx, 1);
    } else {
      bookmarks.push({ manufacturer, code });
    }
    saveBookmarks();
    // Re-render current results to reflect bookmark state
    const searchVal = document.getElementById('ec-search')?.value || '';
    if (searchVal) {
      search();
    } else if (activeManufacturer) {
      showManufacturerCodes(activeManufacturer);
    } else {
      renderMain();
    }
  }

  // --- Recent searches ---
  function loadRecentSearches() {
    try {
      recentSearches = JSON.parse(localStorage.getItem('hvac-error-recent') || '[]');
    } catch (e) { recentSearches = []; }
  }

  function addRecentSearch(query) {
    recentSearches = recentSearches.filter(q => q !== query);
    recentSearches.unshift(query);
    if (recentSearches.length > 10) recentSearches.pop();
    localStorage.setItem('hvac-error-recent', JSON.stringify(recentSearches));
  }

  // --- Main render ---
  function renderMain() {
    const container = document.getElementById('errorcode-content');
    if (!container) return;
    activeManufacturer = '';
    expandedCards.clear();

    const bookmarkedCodes = bookmarks.map(b => {
      return ERROR_CODES_DB.find(e => e.manufacturer === b.manufacturer && e.code === b.code);
    }).filter(Boolean);

    container.innerHTML = `
      <div class="page-header">
        <h1>🚨 ${t('errorcode.title', '에러코드 검색')}</h1>
        <p class="subtitle">${t('errorcode.subtitle', '10개 제조사 · 150+ 에러코드 · 즉시 검색')}</p>
      </div>

      <!-- Search bar -->
      <div class="glass-card" style="padding:16px">
        <div class="form-group" style="margin-bottom:8px">
          <input type="text" id="ec-search" class="form-input" placeholder="${t('errorcode.search_placeholder', '에러코드 또는 증상 검색 (예: E3, 고압, 통신...)')}"
            style="font-family:var(--font-sans);font-size:0.95rem"
            oninput="ErrorCodeSearch.search()">
        </div>
        ${recentSearches.length > 0 ? `
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            ${recentSearches.slice(0, 5).map(q => `
              <button onclick="ErrorCodeSearch.quickSearch('${q.replace(/'/g, "\\'")}')"
                style="padding:3px 8px;font-size:0.7rem;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;color:var(--text-muted);cursor:pointer;font-family:var(--font-sans)">${q}</button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Search results area -->
      <div id="ec-results"></div>

      <!-- Bookmarked codes -->
      ${bookmarkedCodes.length > 0 ? `
        <div class="glass-card">
          <div class="section-title">⭐ ${t('errorcode.bookmarks', '즐겨찾기')}</div>
          ${bookmarkedCodes.map(e => renderCodeCard(e, true)).join('')}
        </div>
      ` : ''}

      <!-- Brand drill-down -->
      <div class="glass-card">
        <div class="section-title">${t('errorcode.by_brand', '제조사별 검색')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${ERROR_CODE_MANUFACTURERS.map(m => {
            const count = ERROR_CODES_DB.filter(e => e.manufacturer === m.id).length;
            return `
              <button onclick="ErrorCodeSearch.showManufacturerCodes('${m.id}')"
                style="display:flex;align-items:center;gap:8px;padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text-primary);cursor:pointer;font-family:var(--font-sans);font-size:0.82rem;text-align:left;min-height:48px;transition:all 0.2s ease"
                onmousedown="this.style.transform='scale(0.97)'" onmouseup="this.style.transform=''" onmouseleave="this.style.transform=''">
                <span>${m.icon}</span>
                <div style="flex:1">
                  <div style="font-weight:600;font-size:0.82rem">${m.id}</div>
                  <div style="font-size:0.7rem;color:var(--text-muted)">${m.series} · ${count}개</div>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>`;
  }

  // --- Quick search from recent ---
  function quickSearch(query) {
    const input = document.getElementById('ec-search');
    if (input) {
      input.value = query;
      search();
    }
  }

  // --- Search logic ---
  function search() {
    const query = (document.getElementById('ec-search')?.value || '').trim();
    const resultEl = document.getElementById('ec-results');
    if (!resultEl) return;

    if (query.length < 1) {
      resultEl.innerHTML = '';
      return;
    }

    // Save to recent
    if (query.length >= 2) {
      addRecentSearch(query);
    }

    const queryUpper = query.toUpperCase();
    const queryLower = query.toLowerCase();

    let matches = ERROR_CODES_DB.filter(e => {
      // Code match
      if (e.code.toUpperCase().includes(queryUpper)) return true;
      // Description match (Korean)
      if (e.description_kr.includes(query)) return true;
      // Description match (English)
      if (e.description_en.toLowerCase().includes(queryLower)) return true;
      // Causes match
      if (e.causes.some(c => c.includes(query))) return true;
      // Manufacturer match
      if (e.manufacturer.toUpperCase().includes(queryUpper)) return true;
      return false;
    });

    // Sort: exact code match first, then by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    matches.sort((a, b) => {
      const aExact = a.code.toUpperCase() === queryUpper ? 0 : 1;
      const bExact = b.code.toUpperCase() === queryUpper ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
    });

    if (matches.length === 0) {
      resultEl.innerHTML = `
        <div class="glass-card" style="text-align:center;padding:32px 24px">
          <span style="font-size:2rem">😕</span>
          <p style="color:var(--text-secondary);margin-top:12px">"${query}" ${t('errorcode.no_results', '검색 결과 없음')}</p>
          <p style="color:var(--text-muted);font-size:0.8rem;margin-top:4px">${t('errorcode.try_other', '다른 키워드로 검색해 보세요.')}</p>
        </div>`;
      return;
    }

    resultEl.innerHTML = `
      <div style="font-size:0.8rem;color:var(--text-muted);margin:8px 0">${matches.length} ${t('errorcode.results', '개 결과')}</div>
      ${matches.slice(0, 50).map(e => renderCodeCard(e, false)).join('')}
      ${matches.length > 50 ? `<div style="text-align:center;color:var(--text-muted);font-size:0.8rem;padding:12px">... 외 ${matches.length - 50}개 결과</div>` : ''}
    `;
  }

  // --- Brand drill-down ---
  function showManufacturerCodes(mfr) {
    const container = document.getElementById('errorcode-content');
    if (!container) return;
    activeManufacturer = mfr;
    expandedCards.clear();

    const mfrInfo = ERROR_CODE_MANUFACTURERS.find(m => m.id === mfr);
    const codes = ERROR_CODES_DB.filter(e => e.manufacturer === mfr);

    // Group by severity
    const critical = codes.filter(c => c.severity === 'critical');
    const warning = codes.filter(c => c.severity === 'warning');
    const info = codes.filter(c => c.severity === 'info');

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-top:16px">
        <button class="btn btn-sm btn-secondary" onclick="ErrorCodeSearch.renderMain()" style="width:auto;padding:8px 12px">← ${t('common.all', '전체')}</button>
        <span style="font-size:1rem">${mfrInfo?.icon || ''}</span>
        <div>
          <div style="font-size:1rem;font-weight:700">${mfr}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${mfrInfo?.series || ''} · ${codes.length}개 에러코드</div>
        </div>
      </div>

      <!-- Search within brand -->
      <div style="margin-bottom:16px">
        <input type="text" id="ec-brand-search" class="form-input" placeholder="${mfr} 코드 내 검색..."
          style="font-family:var(--font-sans);font-size:0.85rem;min-height:40px"
          oninput="ErrorCodeSearch.filterBrand()">
      </div>

      <div id="ec-brand-results">
        ${critical.length > 0 ? `
          <div style="margin-bottom:8px">
            <div style="font-size:0.75rem;font-weight:600;color:var(--accent-red);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">🔴 ${t('severity.critical', '심각')} (${critical.length})</div>
            ${critical.map(e => renderCodeCard(e, false)).join('')}
          </div>
        ` : ''}
        ${warning.length > 0 ? `
          <div style="margin-bottom:8px">
            <div style="font-size:0.75rem;font-weight:600;color:var(--accent-orange);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">🟠 ${t('severity.warning', '주의')} (${warning.length})</div>
            ${warning.map(e => renderCodeCard(e, false)).join('')}
          </div>
        ` : ''}
        ${info.length > 0 ? `
          <div style="margin-bottom:8px">
            <div style="font-size:0.75rem;font-weight:600;color:var(--accent-blue);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">🔵 ${t('severity.info', '정보')} (${info.length})</div>
            ${info.map(e => renderCodeCard(e, false)).join('')}
          </div>
        ` : ''}
      </div>`;
  }

  function filterBrand() {
    const query = (document.getElementById('ec-brand-search')?.value || '').trim().toLowerCase();
    const cards = document.querySelectorAll('#ec-brand-results .ec-card');
    cards.forEach(card => {
      const text = (card.dataset.search || '').toLowerCase();
      card.style.display = (!query || text.includes(query)) ? 'block' : 'none';
    });
  }

  // --- Render a single error code card ---
  function renderCodeCard(e, showBookmarkStar) {
    const sev = getSeverityMap()[e.severity] || getSeverityMap().info;
    const cardId = `${e.manufacturer}-${e.code}`.replace(/[^a-zA-Z0-9-]/g, '_');
    const bookmarked = isBookmarked(e.manufacturer, e.code);
    const isExpanded = expandedCards.has(cardId);

    return `
      <div class="glass-card ec-card" style="padding:14px;margin-bottom:8px;border-left:3px solid ${sev.color}"
        data-search="${e.code} ${e.description_kr} ${e.description_en} ${e.causes.join(' ')} ${e.manufacturer}" data-card-id="${cardId}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-family:var(--font-mono);font-size:1.2rem;font-weight:700;color:${sev.color}">${e.code}</span>
              <span style="font-size:0.7rem;padding:2px 8px;border-radius:10px;background:${sev.bg};color:${sev.color};border:1px solid ${sev.border}">${sev.label}</span>
            </div>
            <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:4px">${e.manufacturer} · ${e.series}</div>
            <div style="font-size:0.88rem;color:var(--text-primary);line-height:1.5">${e.description_kr}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">${e.description_en}</div>
          </div>
          <button onclick="ErrorCodeSearch.toggleBookmark('${e.manufacturer}','${e.code.replace(/'/g, "\\'")}')"
            style="background:none;border:none;font-size:1.2rem;cursor:pointer;padding:4px;flex-shrink:0;color:${bookmarked ? 'var(--accent-orange)' : 'var(--text-muted)'}"
            title="${bookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}">${bookmarked ? '⭐' : '☆'}</button>
        </div>

        <button onclick="ErrorCodeSearch.toggleExpand('${cardId}')"
          style="margin-top:8px;padding:6px 12px;font-size:0.78rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-secondary);cursor:pointer;font-family:var(--font-sans);width:100%;text-align:center">
          ${isExpanded ? `▲ ${t('common.collapse', '접기')}` : `▼ ${t('common.detail', '상세보기')}`}
        </button>

        <div id="ec-detail-${cardId}" style="display:${isExpanded ? 'block' : 'none'};margin-top:12px">
          <!-- Causes -->
          <div style="margin-bottom:10px">
            <div style="font-size:0.75rem;font-weight:600;color:var(--accent-red);margin-bottom:4px">${t('errorcode.causes', '원인')}</div>
            <ul style="margin:0 0 0 16px;font-size:0.82rem;color:var(--text-secondary);line-height:1.7">
              ${e.causes.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </div>

          <!-- Check steps -->
          <div style="margin-bottom:10px">
            <div style="font-size:0.75rem;font-weight:600;color:var(--accent-green);margin-bottom:4px">${t('errorcode.check_steps', '점검 순서')}</div>
            <ol style="margin:0 0 0 16px;font-size:0.82rem;color:var(--text-secondary);line-height:1.7">
              ${e.checkSteps.map(s => `<li>${s}</li>`).join('')}
            </ol>
          </div>

          <!-- Related parts -->
          ${e.relatedParts.length > 0 ? `
            <div>
              <div style="font-size:0.75rem;font-weight:600;color:var(--accent-cyan);margin-bottom:4px">${t('errorcode.related_parts', '관련 부품')}</div>
              <div style="display:flex;gap:4px;flex-wrap:wrap">
                ${e.relatedParts.map(p => `<span style="padding:3px 8px;font-size:0.72rem;background:rgba(6,182,212,0.1);color:var(--accent-cyan);border-radius:10px;border:1px solid rgba(6,182,212,0.2)">${p}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${_renderRelatedDiagnostics(e)}
          ${_renderRelatedCycleComponents(e)}
        </div>
      </div>`;
  }

  function toggleExpand(cardId) {
    if (expandedCards.has(cardId)) {
      expandedCards.delete(cardId);
    } else {
      expandedCards.add(cardId);
    }
    const detailEl = document.getElementById(`ec-detail-${cardId}`);
    if (detailEl) {
      detailEl.style.display = expandedCards.has(cardId) ? 'block' : 'none';
    }
    // Update button text
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (card) {
      const btn = card.querySelector('button[onclick*="toggleExpand"]');
      if (btn) {
        btn.textContent = expandedCards.has(cardId) ? `▲ ${t('common.collapse', '접기')}` : `▼ ${t('common.detail', '상세보기')}`;
      }
    }
  }

  // --- DataBridge integration: Related diagnostics ---
  function _renderRelatedDiagnostics(errorCode) {
    if (typeof DataBridge === 'undefined') return '';

    // Match error code causes to diagnostic keys
    const causeText = (errorCode.causes || []).join(' ').toLowerCase();
    const descText = (errorCode.description_kr || '').toLowerCase();
    const searchText = causeText + ' ' + descText;

    const diagMatches = [];
    const diagKeywords = {
      lowCharge:           ['냉매 부족', '누설', 'leak', '저압'],
      overcharge:          ['냉매 과충전', '과충전', '고압'],
      meteringRestriction: ['필터', '막힘', '드라이어', 'clog'],
      compressorWeak:      ['컴프레서', '압축기', '과전류', '모터'],
      txvOverfeed:         ['팽창밸브', 'txv', '과열도'],
      lowAirflow:          ['에어플로우', '팬', '착상', '결빙']
    };

    const diagLabels = {
      lowCharge: t('diag.lowcharge.title', '냉매 부족'),
      overcharge: t('diag.overcharge.title', '냉매 과충전'),
      meteringRestriction: t('diag.metering.title', '계량장치 제한'),
      compressorWeak: t('diag.compressor.title', '컴프레서 불량'),
      txvOverfeed: t('diag.txvoverfeed.title', 'TXV 오버피딩'),
      lowAirflow: t('diag.lowairflow.title', '에어플로우 부족')
    };

    for (const [key, keywords] of Object.entries(diagKeywords)) {
      if (keywords.some(kw => searchText.includes(kw))) {
        diagMatches.push(key);
      }
    }

    if (diagMatches.length === 0) return '';

    let html = `<div style="margin-top:10px">
      <div class="section-label-sm orange">${t('errorcode.related_diag', '관련 진단')}</div>
      <div class="flex-col-gap-4">`;

    diagMatches.forEach(dk => {
      html += `<button class="ec-diag-link-btn" onclick="App.switchTab('tools');setTimeout(()=>{App.showCategory('diag');setTimeout(()=>App.showSub('tools','cross'),50)},50)">
        <span>🔍</span>
        <span>${diagLabels[dk] || dk}</span>
        <span style="margin-left:auto;color:var(--text-muted);font-size:0.7rem">${t('errorcode.cross_diag', '교차진단')} →</span>
      </button>`;
    });

    html += `</div></div>`;
    return html;
  }

  // --- DataBridge integration: Related cycle components ---
  function _renderRelatedCycleComponents(errorCode) {
    if (typeof DataBridge === 'undefined' || typeof CYCLE_COMPONENTS === 'undefined') return '';

    const comps = DataBridge.getRelatedCycleComponents(errorCode);
    if (comps.length === 0) return '';

    let html = `<div style="margin-top:10px">
      <div class="section-label-sm green">${t('errorcode.related_cycle', '관련 사이클 부품')}</div>
      <div class="flex-wrap-gap-4">`;

    comps.forEach(c => {
      html += `<button class="ec-comp-pill" onclick="App.switchTab('tools');setTimeout(()=>{App.showCategory('visual');setTimeout(()=>App.showSub('tools','cycle'),50)},50)">
        🔄 ${c.component.name_kr}
      </button>`;
    });

    html += `</div></div>`;
    return html;
  }

  return {
    initUI, renderMain, search, quickSearch,
    showManufacturerCodes, filterBrand,
    toggleBookmark, toggleExpand
  };
})();

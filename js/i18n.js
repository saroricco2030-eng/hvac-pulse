// ===================================================
// HVAC Pulse — Internationalization (i18n)
// Supports 10 languages with Korean as source language
// Copyright (c) 2024-2026. All rights reserved.
// ===================================================

const I18n = (() => {

  // Supported languages
  const LANGUAGES = [
    { code: 'ko', name: '한국어',     flag: '🇰🇷' },
    { code: 'en', name: 'English',    flag: '🇺🇸' },
    { code: 'ja', name: '日本語',     flag: '🇯🇵' },
    { code: 'zh', name: '中文简体',   flag: '🇨🇳' },
    { code: 'es', name: 'Español',    flag: '🇪🇸' },
    { code: 'fr', name: 'Français',   flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch',    flag: '🇩🇪' },
    { code: 'pt', name: 'Português',  flag: '🇧🇷' },
    { code: 'ar', name: 'العربية',    flag: '🇸🇦' },
    { code: 'hi', name: 'हिन्दी',      flag: '🇮🇳' }
  ];

  let currentLang = 'en';
  let packs = {}; // { en: { key: 'translation', ... }, ja: {...}, ... }
  let observer = null;

  // =============================================
  // Initialize
  // =============================================
  function init() {
    // Register available language packs
    if (typeof LANG_EN !== 'undefined') packs.en = LANG_EN;
    if (typeof LANG_JA !== 'undefined') packs.ja = LANG_JA;
    if (typeof LANG_ZH !== 'undefined') packs.zh = LANG_ZH;
    if (typeof LANG_ES !== 'undefined') packs.es = LANG_ES;
    if (typeof LANG_FR !== 'undefined') packs.fr = LANG_FR;
    if (typeof LANG_DE !== 'undefined') packs.de = LANG_DE;
    if (typeof LANG_PT !== 'undefined') packs.pt = LANG_PT;
    if (typeof LANG_AR !== 'undefined') packs.ar = LANG_AR;
    if (typeof LANG_HI !== 'undefined') packs.hi = LANG_HI;

    // One-time migration: clear language saved by old browser auto-detect bug
    if (!localStorage.getItem('hvac-lang-migrated')) {
      localStorage.removeItem('hvac-lang');
      localStorage.setItem('hvac-lang-migrated', '1');
    }

    // Restore saved language preference (no auto-detect; default is English)
    const saved = localStorage.getItem('hvac-lang');
    if (saved && (saved === 'ko' || packs[saved])) {
      currentLang = saved;
    }

    // Apply translations and unit labels (Korean also needs unit resolution)
    applyToStaticDOM();
    if (currentLang !== 'ko') {
      startObserver();
    }
  }

  // =============================================
  // Unit placeholder resolver
  // Replaces {tempUnit} / {pressUnit} and existing unit text
  // =============================================
  function resolveUnits(str) {
    if (!str || typeof str !== 'string') return str;
    if (str.indexOf('{') === -1 && str.indexOf('°') === -1 &&
        str.indexOf('psig') === -1 && str.indexOf('bar(') === -1 && str.indexOf('kPa(') === -1) return str;
    const tl = typeof Settings !== 'undefined' ? Settings.tempLabel() : '°F';
    const pl = typeof Settings !== 'undefined' ? Settings.pressureLabel() : 'psig';
    str = str
      .replace(/\{tempUnit\}/g, tl)
      .replace(/\{pressUnit\}/g, pl)
      .replace(/\(°[FC]\)/g, '(' + tl + ')')
      .replace(/\((psig|bar\(a\)|kPa\(a\))\)/g, '(' + pl + ')');

    // Convert numeric °F values to °C when in metric mode
    // Heuristic: value < 45 = delta temp (SH/SC/ΔT), value ≥ 45 = absolute temp
    if (tl === '°C') {
      const dC = v => (v * 5 / 9).toFixed(1).replace(/\.0$/, '');
      const aC = v => Math.round((v - 32) * 5 / 9);
      const conv = v => (v < 45 ? dC(v) : String(aC(v)));
      // Dual format: "50–76°F (10–24.4°C)" → keep °C part only
      str = str.replace(/(\d+(?:\.\d+)?)\s*[–\-~]\s*(\d+(?:\.\d+)?)°F\s*\((\d+(?:\.\d+)?)\s*[–\-~]\s*(\d+(?:\.\d+)?)°C\)/g,
        (_, _a, _b, c, d) => c + '–' + d + '°C');
      // Range: "5~15°F" or "150–220°F"
      str = str.replace(/(\d+(?:\.\d+)?)\s*([~–\-])\s*(\d+(?:\.\d+)?)°F/g,
        (_, a, sep, b) => conv(parseFloat(a)) + sep + conv(parseFloat(b)) + '°C');
      // Prefixed: "±5°F", ">3°F", "<5°F"
      str = str.replace(/([±><])\s*(\d+(?:\.\d+)?)°F/g,
        (_, pfx, v) => pfx + conv(parseFloat(v)) + '°C');
      // Standalone: "225°F"
      str = str.replace(/(\d+(?:\.\d+)?)°F/g,
        (_, v) => conv(parseFloat(v)) + '°C');
    }
    return str;
  }

  // =============================================
  // Core translate function
  // Korean text is always the fallback
  // =============================================
  function t(key, koreanFallback) {
    if (currentLang === 'ko') return resolveUnits(koreanFallback);
    return resolveUnits(packs[currentLang]?.[key] || packs.en?.[key] || koreanFallback);
  }

  // =============================================
  // Switch language
  // =============================================
  function setLanguage(lang) {
    if (lang === currentLang) return;
    currentLang = lang;
    localStorage.setItem('hvac-lang', lang);

    if (lang === 'ko') {
      stopObserver();
    } else {
      startObserver();
    }

    // Re-render entire app
    applyToStaticDOM();
    reRenderModules();

    // Update language selector active state
    renderSelector('lang-section');

    if (typeof App !== 'undefined') {
      App.showToast(t('settings.langChanged', '언어가 변경되었습니다.'), 'success');
    }
  }

  // =============================================
  // Apply translations to static DOM elements
  // Elements with [data-i18n] get their text replaced
  // Elements with [data-i18n-ph] get their placeholder replaced
  // =============================================
  function applyToStaticDOM() {
    if (currentLang === 'ko') {
      // Apply unit labels to Korean text (cache original if first run)
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const koText = el.dataset.i18nKo || getTextOnly(el);
        if (koText) {
          if (!el.dataset.i18nKo) el.dataset.i18nKo = koText;
          restoreElement(el, resolveUnits(koText));
        }
      });
      // Placeholders — resolve units
      document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const koPh = el.dataset.i18nKoPh || el.placeholder;
        if (koPh) {
          if (!el.dataset.i18nKoPh) el.dataset.i18nKoPh = koPh;
          el.placeholder = resolveUnits(koPh);
        }
      });
      // Help tooltips — resolve units
      document.querySelectorAll('[data-i18n-help]').forEach(el => {
        const koHelp = el.dataset.i18nKoHelp || el.dataset.help;
        if (koHelp) {
          if (!el.dataset.i18nKoHelp) el.dataset.i18nKoHelp = koHelp;
          el.dataset.help = resolveUnits(koHelp);
        }
      });
      // Aria-labels
      document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const koAria = el.dataset.i18nKoAria;
        if (koAria) el.setAttribute('aria-label', koAria);
      });
      return;
    }

    const pack = packs[currentLang] || packs.en;

    // Single query: all elements with any i18n attribute
    document.querySelectorAll('[data-i18n],[data-i18n-ph],[data-i18n-help],[data-i18n-aria]').forEach(el => {
      // Text content
      if (el.dataset.i18n) {
        const raw = pack?.[el.dataset.i18n];
        if (raw) {
          if (!el.dataset.i18nKo) el.dataset.i18nKo = getTextOnly(el);
          setTextPreservingChildren(el, resolveUnits(raw));
        }
      }
      // Placeholder
      if (el.dataset.i18nPh) {
        const translated = pack?.[el.dataset.i18nPh];
        if (translated) {
          if (!el.dataset.i18nKoPh) el.dataset.i18nKoPh = el.placeholder;
          el.placeholder = translated;
        }
      }
      // Help tooltip
      if (el.dataset.i18nHelp) {
        const translated = pack?.[el.dataset.i18nHelp];
        if (translated) {
          if (!el.dataset.i18nKoHelp) el.dataset.i18nKoHelp = el.dataset.help;
          el.dataset.help = translated;
        }
      }
      // Aria-label
      if (el.dataset.i18nAria) {
        const translated = pack?.[el.dataset.i18nAria];
        if (translated) {
          if (!el.dataset.i18nKoAria) el.dataset.i18nKoAria = el.getAttribute('aria-label');
          el.setAttribute('aria-label', translated);
        }
      }
    });
  }

  // Get text content without child element text
  function getTextOnly(el) {
    let text = '';
    el.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    });
    return text.trim() || el.textContent;
  }

  // Set text while preserving child elements (like SVG icons)
  function setTextPreservingChildren(el, newText) {
    const children = Array.from(el.childNodes);
    const hasElementChildren = children.some(n => n.nodeType === Node.ELEMENT_NODE);

    if (!hasElementChildren) {
      el.textContent = newText;
      return;
    }

    // Replace only text nodes
    let replaced = false;
    children.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        node.textContent = (node.textContent.startsWith(' ') ? ' ' : '') + newText;
        replaced = true;
      }
    });

    if (!replaced) {
      el.appendChild(document.createTextNode(' ' + newText));
    }
  }

  function restoreElement(el, koText) {
    setTextPreservingChildren(el, koText);
  }

  // =============================================
  // MutationObserver — translate dynamic content
  // =============================================
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(mutations => {
      if (currentLang === 'ko') return;
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Translate data-i18n elements in new nodes
            node.querySelectorAll?.('[data-i18n]')?.forEach(el => {
              const key = el.dataset.i18n;
              const pack = packs[currentLang] || packs.en;
              const raw = pack?.[key];
              if (raw) {
                if (!el.dataset.i18nKo) el.dataset.i18nKo = getTextOnly(el);
                setTextPreservingChildren(el, resolveUnits(raw));
              }
            });
            node.querySelectorAll?.('[data-i18n-ph]')?.forEach(el => {
              const key = el.dataset.i18nPh;
              const pack = packs[currentLang] || packs.en;
              const translated = pack?.[key];
              if (translated) el.placeholder = translated;
            });
            node.querySelectorAll?.('[data-i18n-help]')?.forEach(el => {
              const key = el.dataset.i18nHelp;
              const pack = packs[currentLang] || packs.en;
              const translated = pack?.[key];
              if (translated) {
                if (!el.dataset.i18nKoHelp) el.dataset.i18nKoHelp = el.dataset.help;
                el.dataset.help = translated;
              }
            });
            node.querySelectorAll?.('[data-i18n-aria]')?.forEach(el => {
              const key = el.dataset.i18nAria;
              const pack = packs[currentLang] || packs.en;
              const translated = pack?.[key];
              if (translated) {
                if (!el.dataset.i18nKoAria) el.dataset.i18nKoAria = el.getAttribute('aria-label');
                el.setAttribute('aria-label', translated);
              }
            });
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  // =============================================
  // Re-render all dynamic modules
  // =============================================
  function reRenderModules() {
    // Re-initialize modules that render Korean text dynamically
    // Each module's initUI() re-renders its content

    // Tab labels — store Korean fallback to prevent cascading bug
    document.querySelectorAll('.tab-item[data-tab]').forEach(tab => {
      const key = 'nav.' + tab.dataset.tab;
      const label = tab.querySelector('.tab-label');
      if (label) {
        if (!label.dataset.ko) label.dataset.ko = label.textContent;
        label.textContent = t(key, label.dataset.ko);
      }
    });

    // Re-render modules if they exist
    if (typeof PTCalculator !== 'undefined') PTCalculator.initUI?.();
    if (typeof DiagnosticEngine !== 'undefined') DiagnosticEngine.initUI?.();
    if (typeof NISTDiagnostic !== 'undefined') NISTDiagnostic.initUI?.();
    if (typeof TXVWizard !== 'undefined') TXVWizard.initUI?.();
    if (typeof ErrorCodeSearch !== 'undefined') ErrorCodeSearch.initUI?.();
    if (typeof CycleVisualization !== 'undefined') CycleVisualization.initUI?.();
    if (typeof PHDiagram !== 'undefined') PHDiagram.initUI?.();
    if (typeof ServiceHistory !== 'undefined') ServiceHistory.renderList?.();
    if (typeof FieldNotes !== 'undefined') FieldNotes.renderList?.();
    if (typeof MaintenanceChecklist !== 'undefined') MaintenanceChecklist.initUI?.();
    if (typeof PartsCrossRef !== 'undefined') PartsCrossRef.initUI?.();
    if (typeof PipeCalculator !== 'undefined') PipeCalculator.initUI?.();
    if (typeof RefrigerantCompare !== 'undefined') RefrigerantCompare.initUI?.();
    if (typeof PHInteractive !== 'undefined') PHInteractive.initUI?.();
    if (typeof Settings !== 'undefined') Settings.initUI?.();
    if (typeof Auth !== 'undefined') Auth.renderSection?.();

    // Sub-tab labels — only tools sub-tabs (not records, which use data-i18n)
    document.querySelectorAll('#tools-sub-tabs .sub-tab-btn[data-sub]').forEach(btn => {
      const sub = btn.dataset.sub;
      const key = 'nav.' + sub;
      // Use stored Korean text, or current text as initial value
      if (!btn.dataset.ko) btn.dataset.ko = btn.textContent;
      btn.textContent = t(key, btn.dataset.ko);
    });

    // Re-render refrigerant reference table
    if (typeof window.renderRefTable === 'function') window.renderRefTable();

    // Re-render CoolProp engine badge
    const badge = document.getElementById('home-engine-status');
    if (badge) {
      const isReady = badge.style.color === 'var(--accent-green)';
      badge.textContent = isReady
        ? t('app.engine_ready', 'CoolProp NIST 엔진 활성')
        : t('app.engine_legacy', '레거시 P-T 데이터 모드');
    }

    // Re-apply static DOM translations after modules re-render
    setTimeout(() => {
      applyToStaticDOM();
      renderSelector('lang-section');
    }, 100);
  }

  // =============================================
  // Render language selector UI (for settings page)
  // =============================================
  function renderSelector(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // If already rendered, just update active state (no DOM rebuild = no animation flicker)
    const existing = container.querySelector('.lang-grid');
    if (existing) {
      updateSelectorActive(container);
      return;
    }

    container.innerHTML = `
      <div class="glass-card">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title" data-i18n="settings.language">${t('settings.language', '언어')}</div>
            <div class="setting-desc" data-i18n="settings.langDesc">${t('settings.langDesc', '앱 표시 언어 선택')}</div>
          </div>
        </div>
        <div class="lang-grid">
          ${LANGUAGES.map(lang => {
            const isActive = lang.code === currentLang;
            return `
            <button class="lang-btn ${isActive ? 'active' : ''}" data-lang="${lang.code}"
              onclick="I18n.setLanguage('${lang.code}')"
              ${lang.code !== 'ko' && !packs[lang.code] ? 'disabled title="Coming soon"' : ''}>
              <span class="lang-flag">${lang.flag}</span>
              <span class="lang-name">${lang.name}</span>
              ${isActive ? '<span class="lang-check">✓</span>' : ''}
            </button>`;
          }).join('')}
        </div>
      </div>`;
  }

  // Update active state without replacing DOM (prevents transition flicker)
  function updateSelectorActive(container) {
    container.querySelectorAll('.lang-btn[data-lang]').forEach(btn => {
      const isActive = btn.dataset.lang === currentLang;
      btn.classList.toggle('active', isActive);
      // Add or remove checkmark
      const check = btn.querySelector('.lang-check');
      if (isActive && !check) {
        const span = document.createElement('span');
        span.className = 'lang-check';
        span.textContent = '✓';
        btn.appendChild(span);
      } else if (!isActive && check) {
        check.remove();
      }
    });
  }

  // =============================================
  // Public API
  // =============================================
  return {
    init,
    t,
    resolveUnits,
    setLanguage,
    getLang: () => currentLang,
    getLanguages: () => LANGUAGES,
    applyToStaticDOM,
    renderSelector
  };
})();

// Global shortcut — all modules use t() directly
function t(key, fallback) {
  return I18n.t(key, fallback);
}

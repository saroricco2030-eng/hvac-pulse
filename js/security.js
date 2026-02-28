// ===================================================
// HVAC Pulse — Security & Code Protection
// Copyright (c) 2024-2026 HVAC Pulse.
// All rights reserved. Unauthorized copying, modification,
// distribution, or use of this software is strictly prohibited.
// ===================================================

const AppSecurity = (() => {
  'use strict';

  // Build fingerprint (changes with each deployment)
  const BUILD_ID = 'PULSE-' + Date.now().toString(36).toUpperCase();
  const APP_VERSION = '1.0.0';
  const COPYRIGHT = '\u00A9 2024-2026 HVAC Pulse. All Rights Reserved.';

  // Authorized domains (add your production domain here)
  const ALLOWED_ORIGINS = [
    'saroricco2030-eng.github.io',
    'localhost',
    '127.0.0.1'
  ];

  // ---- Console Warning ----
  function showConsoleWarning() {
    const style1 = 'color:#ef4444;font-size:24px;font-weight:bold;text-shadow:1px 1px 2px rgba(0,0,0,0.3)';
    const style2 = 'color:#f59e0b;font-size:14px;font-weight:bold';
    const style3 = 'color:#8896b3;font-size:12px';

    console.log('%c\u26A0 WARNING / \uACBD\uACE0', style1);
    console.log('%cThis application is protected by copyright law.', style2);
    console.log('%c\uBB34\uB2E8 \uBCF5\uC81C, \uC218\uC815, \uBC30\uD3EC \uAE08\uC9C0. \uC800\uC791\uAD8C\uBC95\uC5D0 \uC758\uD574 \uBCF4\uD638\uB429\uB2C8\uB2E4.', style2);
    console.log('%c' + COPYRIGHT, style3);
    console.log('%cUnauthorized use of developer tools on this application may violate applicable laws.', style3);
    console.log('%cBuild: ' + BUILD_ID + ' | Version: ' + APP_VERSION, style3);
  }

  // ---- Context Menu Protection ----
  function setupContextMenuProtection() {
    document.addEventListener('contextmenu', (e) => {
      // Allow context menu on input/textarea for text editing
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
    });
  }

  // ---- Keyboard Shortcut Protection ----
  function setupKeyboardProtection() {
    document.addEventListener('keydown', (e) => {
      // Block F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+Shift+I (DevTools), Ctrl+Shift+J (Console), Ctrl+U (View Source)
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+S (Save page)
      if (e.ctrlKey && (e.key === 'S' || e.key === 's') && !(e.target.closest && e.target.closest('input, textarea'))) {
        e.preventDefault();
        return false;
      }
    });
  }

  // ---- Text Selection Protection ----
  function setupSelectionProtection() {
    // Allow selection in input/textarea, block elsewhere
    document.addEventListener('selectstart', (e) => {
      const el = e.target.nodeType === 1 ? e.target : e.target.parentElement;
      if (!el) return;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Allow selection in result areas (for copying diagnosis results)
      if (el.closest('.diag-result, .calc-result, .result-box, [data-selectable]')) return;
      e.preventDefault();
    });
  }

  // ---- Drag Protection ----
  function setupDragProtection() {
    document.addEventListener('dragstart', (e) => {
      const tag = e.target.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
      }
    });
  }

  // ---- DevTools Detection (multi-method) ----
  function setupDevToolsDetection() {
    let devToolsOpen = false;
    let warningCount = 0;

    // Method 1: Window size difference
    const checkWindowSize = () => {
      const widthDiff = window.outerWidth - window.innerWidth > 160;
      const heightDiff = window.outerHeight - window.innerHeight > 160;
      return widthDiff || heightDiff;
    };

    // Method 2: console.log object getter (most reliable)
    // When DevTools is open, accessing getters triggers; when closed it doesn't
    const checkConsoleLog = () => {
      let detected = false;
      const el = new Image();
      Object.defineProperty(el, 'id', {
        get: () => { detected = true; return ''; }
      });
      console.debug(el);
      return detected;
    };

    // Method 3: Performance timing — debugger breakpoints cause measurable delay
    const checkTiming = () => {
      const t0 = performance.now();
      for (let i = 0; i < 100; i++) { /* timing calibration */ }
      const t1 = performance.now();
      return (t1 - t0) > 50;
    };

    function runChecks() {
      const isOpen = checkWindowSize() || checkConsoleLog();
      if (isOpen && !devToolsOpen) {
        devToolsOpen = true;
        onDevToolsDetected();
      } else if (!isOpen) {
        devToolsOpen = false;
      }
    }

    function onDevToolsDetected() {
      warningCount++;
      if (document.getElementById('devtools-warning')) return;
      const overlay = document.createElement('div');
      overlay.id = 'devtools-warning';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:12px 20px;font-size:13px;font-weight:600;text-align:center;box-shadow:0 4px 20px rgba(239,68,68,0.4);transition:opacity 0.3s';
      overlay.textContent = '\u26A0 \uAC1C\uBC1C\uC790 \uB3C4\uAD6C \uAC10\uC9C0\uB428 — \uC774 \uC18C\uD504\uD2B8\uC6E8\uC5B4\uB294 \uC800\uC791\uAD8C\uBC95\uC73C\uB85C \uBCF4\uD638\uB429\uB2C8\uB2E4. Developer tools detected — This software is protected by copyright.';
      document.body.appendChild(overlay);
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.remove(), 300);
        }
      }, 8000);
    }

    setInterval(runChecks, 1500);
  }

  // ---- Source Watermark ----
  function embedWatermark() {
    // Hidden watermark in DOM for tracing unauthorized copies
    const wm = document.createElement('div');
    wm.style.cssText = 'position:absolute;top:-9999px;left:-9999px;opacity:0;pointer-events:none;font-size:0';
    wm.setAttribute('data-build', BUILD_ID);
    wm.setAttribute('data-copyright', COPYRIGHT);
    wm.setAttribute('data-integrity', generateIntegrityHash());
    document.body.appendChild(wm);
  }

  // ---- Integrity Hash ----
  function generateIntegrityHash() {
    // Simple hash of critical DOM elements for tampering detection
    const scripts = document.querySelectorAll('script[src]');
    let hash = 0;
    scripts.forEach(s => {
      const src = s.getAttribute('src') || '';
      for (let i = 0; i < src.length; i++) {
        hash = ((hash << 5) - hash) + src.charCodeAt(i);
        hash |= 0;
      }
    });
    return 'H' + Math.abs(hash).toString(36).toUpperCase();
  }

  // ---- Copy Protection on Page Source ----
  function setupCopyProtection() {
    document.addEventListener('copy', (e) => {
      const target = e.target.nodeType === 1 ? e.target : e.target.parentElement;
      if (!target) return;
      // Allow copy in inputs, textareas, and designated result areas
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (target.closest('.diag-result, .calc-result, .result-box, [data-selectable]')) return;

      // Inject copyright notice into copied text
      const selection = window.getSelection();
      if (selection && selection.toString().length > 50) {
        e.preventDefault();
        const copiedText = selection.toString() + '\n\n' + COPYRIGHT + '\nSource: HVAC Pulse';
        if (e.clipboardData) {
          e.clipboardData.setData('text/plain', copiedText);
        }
      }
    });
  }

  // ---- Domain Lock ----
  function enforceDomainLock() {
    const host = window.location.hostname;
    const isAllowed = ALLOWED_ORIGINS.some(d => host === d || host.endsWith('.' + d));
    // Also allow file:// for local development/PWA
    const isLocal = window.location.protocol === 'file:';
    if (!isAllowed && !isLocal) {
      document.documentElement.innerHTML = '';
      document.title = '';
      console.error('Unauthorized domain: ' + host);
    }
  }

  // ---- Anti-Automation Detection ----
  function detectAutomation() {
    const signs = [
      // Selenium
      !!window.document.__selenium_unwrapped,
      !!window.__fxdriver_unwrapped,
      !!window._phantom,
      !!window.callPhantom,
      // Puppeteer / Playwright / Headless Chrome
      !!navigator.webdriver,
      // Generic headless browser markers
      navigator.languages === undefined || navigator.languages.length === 0,
      !navigator.plugins || navigator.plugins.length === 0
    ];
    const score = signs.filter(Boolean).length;
    if (score >= 2) {
      // Likely automated — degrade gracefully (don't crash, just watermark)
      const msg = document.createElement('div');
      msg.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#f59e0b;color:#000;padding:8px;font-size:12px;text-align:center;font-weight:600';
      msg.textContent = 'Automated access detected. ' + COPYRIGHT;
      document.body?.appendChild(msg);
    }
  }

  // ---- Anti-Iframe (Clickjacking Protection) ----
  function preventFraming() {
    if (window.self !== window.top) {
      try {
        const parentHost = window.parent.location.hostname;
        const allowed = ALLOWED_ORIGINS.some(d => parentHost === d || parentHost.endsWith('.' + d));
        if (!allowed) {
          window.top.location = window.self.location;
        }
      } catch (e) {
        // Cross-origin frame — force break out
        window.top.location = window.self.location;
      }
    }
  }

  // ---- Crypto Integrity Verification ----
  async function verifyIntegrity() {
    if (!window.crypto || !window.crypto.subtle) return;
    try {
      // Hash critical script sources for tamper detection
      const scripts = Array.from(document.querySelectorAll('script[src^="./js/"]'));
      const sources = scripts.map(s => s.getAttribute('src')).sort().join('|');
      const data = new TextEncoder().encode(sources);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      // Embed in DOM for forensic tracing
      const wm = document.querySelector('[data-integrity]');
      if (wm) wm.setAttribute('data-integrity', hashHex.substring(0, 16));
    } catch (e) { /* non-critical */ }
  }

  // ---- Service Worker Integrity Check ----
  function verifySWIntegrity() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.active) {
          // SW is registered and active
          verifyIntegrity();
        }
      }).catch(() => {});
    }
  }

  // ---- Print Protection ----
  function setupPrintProtection() {
    // Add watermark when printing
    window.addEventListener('beforeprint', () => {
      const printWm = document.createElement('div');
      printWm.id = 'print-watermark';
      printWm.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:60px;color:rgba(0,0,0,0.08);pointer-events:none;z-index:99999;white-space:nowrap;font-weight:bold';
      printWm.textContent = COPYRIGHT;
      document.body.appendChild(printWm);
    });
    window.addEventListener('afterprint', () => {
      const wm = document.getElementById('print-watermark');
      if (wm) wm.remove();
    });
  }

  // ---- Initialize All Protections ----
  function init() {
    // Layer 1: Domain & frame protection (first — blocks unauthorized hosts)
    enforceDomainLock();
    preventFraming();
    // Layer 2: User-facing protections
    showConsoleWarning();
    setupContextMenuProtection();
    setupKeyboardProtection();
    setupSelectionProtection();
    setupDragProtection();
    setupDevToolsDetection();
    // Layer 3: Forensic & integrity
    embedWatermark();
    setupCopyProtection();
    setupPrintProtection();
    verifySWIntegrity();
    // Layer 4: Anti-automation (delayed to not block init)
    setTimeout(detectAutomation, 2000);
  }

  return {
    init,
    COPYRIGHT,
    BUILD_ID,
    APP_VERSION
  };
})();

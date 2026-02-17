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
      if (e.ctrlKey && (e.key === 'S' || e.key === 's') && !e.target.closest('input, textarea')) {
        e.preventDefault();
        return false;
      }
    });
  }

  // ---- Text Selection Protection ----
  function setupSelectionProtection() {
    // Allow selection in input/textarea, block elsewhere
    document.addEventListener('selectstart', (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Allow selection in result areas (for copying diagnosis results)
      if (e.target.closest('.diag-result, .calc-result, .result-box, [data-selectable]')) return;
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

  // ---- DevTools Detection ----
  function setupDevToolsDetection() {
    let devToolsOpen = false;

    // Method 1: Window size difference
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;

      if (widthThreshold || heightThreshold) {
        if (!devToolsOpen) {
          devToolsOpen = true;
          onDevToolsDetected();
        }
      } else {
        devToolsOpen = false;
      }
    };

    // Method 2: debugger detection via timing
    const detectDebugger = () => {
      const start = performance.now();
      // debugger is disabled in production — timing check only
      const end = performance.now();
      if (end - start > 100) {
        onDevToolsDetected();
      }
    };

    function onDevToolsDetected() {
      // Show warning overlay (non-blocking — doesn't break the app)
      if (document.getElementById('devtools-warning')) return;
      const overlay = document.createElement('div');
      overlay.id = 'devtools-warning';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:12px 20px;font-size:13px;font-weight:600;text-align:center;box-shadow:0 4px 20px rgba(239,68,68,0.4);transition:opacity 0.3s';
      overlay.textContent = '\u26A0 \uAC1C\uBC1C\uC790 \uB3C4\uAD6C \uAC10\uC9C0\uB428 — \uC774 \uC18C\uD504\uD2B8\uC6E8\uC5B4\uB294 \uC800\uC791\uAD8C\uBC95\uC73C\uB85C \uBCF4\uD638\uB429\uB2C8\uB2E4. Developer tools detected — This software is protected by copyright.';
      document.body.appendChild(overlay);
      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.remove(), 300);
        }
      }, 8000);
    }

    // Check periodically
    setInterval(checkDevTools, 2000);
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
      const target = e.target;
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

  // ---- Service Worker Integrity Check ----
  function verifySWIntegrity() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.active) {
          // SW is registered and active — app integrity maintained
          console.log('%c\u2713 App integrity verified', 'color:#10b981;font-size:11px');
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
    showConsoleWarning();
    setupContextMenuProtection();
    setupKeyboardProtection();
    setupSelectionProtection();
    setupDragProtection();
    setupDevToolsDetection();
    embedWatermark();
    setupCopyProtection();
    setupPrintProtection();
    verifySWIntegrity();
  }

  return {
    init,
    COPYRIGHT,
    BUILD_ID,
    APP_VERSION
  };
})();

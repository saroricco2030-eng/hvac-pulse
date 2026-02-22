// ===================================================
// HVAC Pulse — Service Worker
// ===================================================

const CACHE_VERSION = 57;
const CACHE_NAME = `hvac-pulse-v${CACHE_VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './manifest.json',
  './images/icon-192.png',
  './images/icon-512.png',
  './images/icon-maskable-192.png',
  './images/icon-maskable-512.png',
  './images/icon-maskable.svg',
  './images/icon.svg',
  // Core data
  './js/refrigerant-data.js',
  './data/refrigerant-catalog.js',
  './data/fault-signatures.js',
  './js/coolprop-engine.js',
  // Calculators & diagnostics
  './js/pt-calculator.js',
  './js/diagnostic-engine.js',
  './js/nist-diagnostic.js',
  './js/txv-wizard.js',
  './js/advanced-diagnostic.js',
  // DB & management
  './js/db-helper.js',
  './js/maintenance-checklist.js',
  './js/service-history.js',
  './js/parts-cross-ref.js',
  './js/pipe-calculator.js',
  './js/field-notes.js',
  // Error codes
  './data/error-codes-data.js',
  './js/error-codes.js',
  // Cycle visualization
  './js/cycle-data.js',
  './js/cycle-visualization.js',
  './js/cycle-animation.js',
  './js/gauge-dashboard.js',
  './js/diagnostic-report.js',
  // Interactive tools
  './js/ph-interactive.js',
  './js/ph-diagram.js',
  './js/refrigerant-compare.js',
  // PWA & settings
  './js/install-prompt.js',
  './js/settings.js',
  // Auth & cloud sync
  './js/firebase-config.js',
  './js/auth.js',
  './js/sync.js',
  // i18n (internationalization)
  './js/i18n.js',
  './data/lang/en.js',
  './data/lang/ko.js',
  './data/lang/ja.js',
  './data/lang/zh.js',
  './data/lang/es.js',
  './data/lang/fr.js',
  './data/lang/de.js',
  './data/lang/pt.js',
  './data/lang/ar.js',
  './data/lang/hi.js',
  // Security
  './js/security.js',
  // Integration & main
  './js/data-bridge.js',
  './js/app.js'
];

// CoolProp WASM files — cached separately (large)
const WASM_ASSETS = [
  './lib/coolprop.js',
  './lib/coolprop.wasm'
];

// ---- Install: Pre-cache static assets ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => {
        // Try to cache WASM files but don't fail installation if unavailable
        return caches.open(CACHE_NAME).then(cache =>
          Promise.allSettled(WASM_ASSETS.map(url => cache.add(url)))
        ).then(results => {
          results.forEach((r, i) => {
            if (r.status === 'rejected') console.warn('[SW] WASM cache failed:', WASM_ASSETS[i], r.reason);
          });
        });
      })
      // Don't skipWaiting here — let the user trigger update via toast
  );
});

// ---- Activate: Clean old caches ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ---- Fetch: Cache-first for static, network-first for navigation ----
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // WASM files: cache-first with network fallback
  if (request.url.endsWith('.wasm') || request.url.includes('coolprop')) {
    event.respondWith(
      caches.match(request)
        .then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            }
            return response;
          });
        })
        .catch(() => new Response('', { status: 404, statusText: 'CoolProp not available offline' }))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
      .catch(() => {
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      })
  );
});

// ---- Message: Skip waiting on demand ----
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

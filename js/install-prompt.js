// ===================================================
// HVAC Pulse — PWA Install Prompt
// beforeinstallprompt handler + iOS Safari guide
// ===================================================

const InstallPrompt = (() => {

  let deferredPrompt = null;
  const DISMISSED_KEY = 'hvac-install-dismissed';

  function init() {
    // Already installed as PWA — skip
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone === true) return; // iOS standalone

    // Check if user dismissed recently (7 days)
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 86400000) return;

    // Android/Chrome: listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showBanner('android');
    });

    // iOS Safari detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|Chrome/.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setTimeout(() => showBanner('ios'), 3000);
    }

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      hideBanner();
      deferredPrompt = null;
    });
  }

  function showBanner(type) {
    const banner = document.getElementById('install-banner');
    if (!banner) return;

    const body = document.getElementById('install-banner-body');
    if (type === 'ios') {
      body.innerHTML = `
        <div style="font-weight:600;margin-bottom:6px">${t('install.ios_title', '홈 화면에 추가하기')}</div>
        <div style="font-size:var(--text-sm);color:var(--text-secondary)">
          ${t('install.ios_desc', 'Safari 하단의 <strong style="color:var(--accent-blue)">공유 버튼 ↗</strong>을 누르고<br><strong style="color:var(--text-primary)">"홈 화면에 추가"</strong>를 선택하세요.')}
        </div>`;
      document.getElementById('install-btn')?.remove();
    } else {
      body.innerHTML = `
        <div style="font-weight:600;margin-bottom:4px">${t('install.android_title', '앱으로 설치하기')}</div>
        <div style="font-size:var(--text-sm);color:var(--text-secondary)">${t('install.android_desc', '오프라인에서도 사용할 수 있습니다.')}</div>`;
    }

    banner.classList.add('show');
  }

  function hideBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.remove('show');
  }

  function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choice => {
      if (choice.outcome === 'accepted') {
        hideBanner();
      }
      deferredPrompt = null;
    });
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    hideBanner();
  }

  return { init, install, dismiss };
})();

// ===================================================
// HVAC Pulse — Authentication Module
// Optional email + Google login for cloud sync
// Gracefully degrades when Firebase is not configured
// ===================================================

const Auth = (() => {

  let currentUser = null;

  // =============================================
  // Initialize
  // =============================================
  function init() {
    if (!isFirebaseConfigured()) {
      // Firebase not configured — local-only mode
      renderSection();
      return;
    }

    try {
      if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') {
        console.warn('Auth: Firebase SDK partially loaded — local-only mode');
        renderSection();
        return;
      }

      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }

      // Keep user logged in across sessions
      firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

      // Listen for auth state changes
      firebase.auth().onAuthStateChanged(user => {
        currentUser = user;
        renderSection();

        if (user && typeof CloudSync !== 'undefined') {
          CloudSync.onLogin(user);
        }
      });
    } catch (e) {
      console.warn('Auth: Firebase init failed', e);
      renderSection();
    }
  }

  // =============================================
  // Settings Page — Auth Section Rendering
  // =============================================
  function renderSection() {
    const container = document.getElementById('auth-section');
    if (!container) return;

    if (!isFirebaseConfigured()) {
      container.innerHTML = '';
      return;
    }

    if (currentUser) {
      renderProfile(container);
    } else {
      renderLogin(container);
    }
  }

  function renderLogin(container) {
    container.innerHTML = `
      <div class="glass-card auth-card">
        <div class="section-title" style="display:flex;align-items:center;gap:8px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          ${t('auth.account_sync', '계정 & 클라우드 동기화')}
        </div>
        <p class="auth-desc">
          ${t('auth.sync_desc', '로그인하면 수리기록과 메모를 클라우드에 백업할 수 있습니다.')}
        </p>
        <div class="auth-buttons">
          <button class="btn auth-btn auth-btn-google" onclick="Auth.loginWithGoogle()">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            ${t('auth.google_login', 'Google 로그인')}
          </button>
          <button class="btn auth-btn auth-btn-email" onclick="Auth.showEmailModal()">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            ${t('auth.email_login', '이메일 로그인')}
          </button>
        </div>
        <p class="auth-note">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          ${t('auth.optional_note', '로그인은 선택사항입니다. 오프라인에서도 모든 기능을 사용할 수 있습니다.')}
        </p>
      </div>`;
  }

  function renderProfile(container) {
    const user = currentUser;
    const displayName = user.displayName || user.email?.split('@')[0] || t('auth.user', '사용자');
    const email = user.email || '';
    const photoURL = user.photoURL;
    const syncStatus = (typeof CloudSync !== 'undefined') ? CloudSync.getStatusText() : '';

    container.innerHTML = `
      <div class="glass-card auth-card">
        <div class="section-title" style="display:flex;align-items:center;gap:8px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          ${t('auth.account', '계정')}
        </div>
        <div class="auth-profile">
          <div class="auth-avatar">
            ${photoURL
              ? `<img src="${photoURL}" alt="${t('auth.profile', '프로필')}" referrerpolicy="no-referrer">`
              : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
            }
          </div>
          <div class="auth-info">
            <div class="auth-name">${displayName}</div>
            <div class="auth-email">${email}</div>
            ${syncStatus ? `<div class="auth-sync-status">${syncStatus}</div>` : ''}
          </div>
        </div>
        <div class="auth-buttons">
          <button class="btn auth-btn auth-btn-sync" onclick="Auth.syncNow()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            ${t('auth.sync_now', '지금 동기화')}
          </button>
          <button class="btn auth-btn auth-btn-logout" onclick="Auth.logout()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            ${t('auth.logout', '로그아웃')}
          </button>
        </div>
      </div>`;
  }

  // =============================================
  // Email Auth Modal
  // =============================================
  function showEmailModal(mode) {
    mode = mode || 'login';

    // Remove existing modal
    const existing = document.getElementById('auth-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'auth-modal-overlay';
    overlay.className = 'auth-modal-overlay';
    overlay.dataset.mode = mode;

    overlay.innerHTML = `
      <div class="auth-modal">
        <button class="auth-modal-close" onclick="Auth.closeEmailModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div class="auth-modal-title">${mode === 'login' ? t('auth.email_login', '이메일 로그인') : t('auth.signup', '회원가입')}</div>
        <div class="form-group">
          <label class="form-label">${t('auth.email', '이메일')}</label>
          <input type="email" id="auth-email" class="form-input" placeholder="example@email.com"
            autocomplete="email" style="font-family:var(--font-sans)">
        </div>
        <div class="form-group">
          <label class="form-label">${t('auth.password', '비밀번호')}</label>
          <input type="password" id="auth-password" class="form-input" placeholder="${t('auth.pw_hint', '6자 이상')}"
            autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"
            style="font-family:var(--font-sans)">
        </div>
        <div id="auth-error" class="auth-error" style="display:none"></div>
        <button class="btn btn-primary auth-submit-btn" id="auth-submit-btn" onclick="Auth.submitEmail()">
          ${mode === 'login' ? t('auth.login', '로그인') : t('auth.signup', '회원가입')}
        </button>
        <div class="auth-modal-footer">
          ${mode === 'login'
            ? `<span>${t('auth.no_account', '계정이 없으신가요?')} <a href="#" onclick="Auth.showEmailModal('signup');return false">${t('auth.signup', '회원가입')}</a></span>
               <span><a href="#" onclick="Auth.resetPassword();return false">${t('auth.reset_pw', '비밀번호 재설정')}</a></span>`
            : `<span>${t('auth.has_account', '이미 계정이 있으신가요?')} <a href="#" onclick="Auth.showEmailModal('login');return false">${t('auth.login', '로그인')}</a></span>`
          }
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('show'));

    // Focus email field
    setTimeout(() => document.getElementById('auth-email')?.focus(), 200);

    // Event handlers (stored for cleanup)
    overlay._onBgClick = (e) => {
      if (e.target === overlay) closeEmailModal();
    };
    overlay._onKey = (e) => {
      if (e.key === 'Enter') submitEmail();
      if (e.key === 'Escape') closeEmailModal();
    };
    overlay.addEventListener('click', overlay._onBgClick);
    overlay.addEventListener('keydown', overlay._onKey);
  }

  function closeEmailModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    if (overlay) {
      if (overlay._onBgClick) overlay.removeEventListener('click', overlay._onBgClick);
      if (overlay._onKey) overlay.removeEventListener('keydown', overlay._onKey);
      overlay.classList.remove('show');
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 300);
    }
  }

  function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  // =============================================
  // Email Submit (Login / Signup)
  // =============================================
  async function submitEmail() {
    const overlay = document.getElementById('auth-modal-overlay');
    const mode = overlay?.dataset.mode || 'login';
    const email = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    const submitBtn = document.getElementById('auth-submit-btn');

    if (!email || !password) {
      showAuthError(t('auth.err_empty', '이메일과 비밀번호를 입력하세요.'));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAuthError(t('auth.err_invalid_email', '유효하지 않은 이메일 형식입니다.'));
      return;
    }

    if (password.length < 6) {
      showAuthError(t('auth.err_pw_short', '비밀번호는 6자 이상이어야 합니다.'));
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = t('auth.processing', '처리 중...');
    }

    try {
      if (mode === 'signup') {
        await firebase.auth().createUserWithEmailAndPassword(email, password);
        App.showToast(t('auth.signup_success', '회원가입 완료! 클라우드 동기화가 활성화됩니다.'), 'success');
      } else {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        App.showToast(t('auth.login_success', '로그인 성공!'), 'success');
      }
      closeEmailModal();
    } catch (err) {
      const errorMessages = {
        'auth/email-already-in-use': t('auth.err_email_exists', '이미 등록된 이메일입니다.'),
        'auth/invalid-email': t('auth.err_invalid_email', '유효하지 않은 이메일 형식입니다.'),
        'auth/user-not-found': t('auth.err_not_found', '등록되지 않은 이메일입니다.'),
        'auth/wrong-password': t('auth.err_wrong_pw', '비밀번호가 일치하지 않습니다.'),
        'auth/weak-password': t('auth.err_weak_pw', '비밀번호가 너무 약합니다. 6자 이상 입력하세요.'),
        'auth/too-many-requests': t('auth.err_too_many', '너무 많은 시도입니다. 잠시 후 다시 시도하세요.'),
        'auth/network-request-failed': t('auth.err_network', '네트워크 오류입니다. 인터넷 연결을 확인하세요.'),
        'auth/invalid-credential': t('auth.err_invalid_cred', '이메일 또는 비밀번호가 올바르지 않습니다.')
      };
      console.warn('Auth error:', err.code, err.message);
      showAuthError(errorMessages[err.code] || t('auth.err_generic', '오류가 발생했습니다. 다시 시도하세요.'));
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = mode === 'login' ? t('auth.login', '로그인') : t('auth.signup', '회원가입');
      }
    }
  }

  // =============================================
  // Google Login
  // =============================================
  async function loginWithGoogle() {
    if (!isFirebaseConfigured()) return;

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await firebase.auth().signInWithPopup(provider);
      App.showToast(t('auth.google_success', 'Google 로그인 성공!'), 'success');
    } catch (err) {
      if (err.code === 'auth/popup-blocked') {
        App.showToast(t('auth.popup_blocked', '팝업이 차단되었습니다. 팝업을 허용해주세요.'), 'warning');
      } else if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup — no action needed
      } else {
        console.warn('Google auth error:', err.code, err.message);
        App.showToast(t('auth.google_fail', 'Google 로그인 실패'), 'error');
      }
    }
  }

  // =============================================
  // Logout
  // =============================================
  async function logout() {
    if (!isFirebaseConfigured()) return;

    try {
      await firebase.auth().signOut();
      currentUser = null;
      App.showToast(t('auth.logout_success', '로그아웃되었습니다.'), 'info');
    } catch (err) {
      App.showToast(t('auth.logout_fail', '로그아웃 실패'), 'error');
    }
  }

  // =============================================
  // Password Reset
  // =============================================
  async function resetPassword() {
    const email = document.getElementById('auth-email')?.value?.trim();
    if (!email) {
      showAuthError(t('auth.err_enter_email', '이메일을 먼저 입력하세요.'));
      return;
    }

    try {
      await firebase.auth().sendPasswordResetEmail(email);
      showAuthError('');
      App.showToast(t('auth.reset_sent', '비밀번호 재설정 이메일을 발송했습니다.'), 'success');
    } catch (err) {
      showAuthError(t('auth.err_reset_fail', '이메일 발송 실패. 이메일 주소를 확인하세요.'));
    }
  }

  // =============================================
  // Sync Shortcut
  // =============================================
  function syncNow() {
    if (typeof CloudSync !== 'undefined' && currentUser) {
      CloudSync.syncAll();
    }
  }

  // =============================================
  // Public API
  // =============================================
  function getUser() { return currentUser; }
  function isLoggedIn() { return !!currentUser; }

  return {
    init, renderSection,
    showEmailModal, closeEmailModal, submitEmail,
    loginWithGoogle, logout, resetPassword,
    syncNow, getUser, isLoggedIn
  };
})();

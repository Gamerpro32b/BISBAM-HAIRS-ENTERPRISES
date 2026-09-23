/* =========================================================
   BISBAM HAIRS — auth.js
   Email + password signup, login, logout, password reset.
   ========================================================= */

(function () {
  'use strict';

  const REDIRECT_AFTER_AUTH = 'account.html';

  let mode = 'login';

  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  const authForm = document.getElementById('authForm');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const authError = document.getElementById('authError');
  const authSuccess = document.getElementById('authSuccess');
  const toggleText = document.getElementById('authToggleText');
  const toggleLink = document.getElementById('authToggleLink');
  const forgotLinkWrap = document.getElementById('forgotLinkWrap');
  const forgotLink = document.getElementById('forgotLink');

  /* ============ HELPERS ============ */
  function db() {
    if (!window.BisbamDB && window.initSupabase) window.initSupabase();
    return window.BisbamDB;
  }

  function showError(msg) {
    if (authError) {
      authError.hidden = false;
      authError.textContent = msg;
    }
    if (authSuccess) authSuccess.hidden = true;
  }

  function showSuccess(msg) {
    if (authSuccess) {
      authSuccess.hidden = false;
      authSuccess.textContent = msg;
    }
    if (authError) authError.hidden = true;
  }

  function clearMessages() {
    if (authError) authError.hidden = true;
    if (authSuccess) authSuccess.hidden = true;
  }

  /* ============ REDIRECT IF ALREADY LOGGED IN ============ */
  async function checkSession() {
    const client = db();
    if (!client) return;

    const { data } = await client.auth.getSession();
    if (data && data.session) {
      window.location.href = REDIRECT_AFTER_AUTH;
    }
  }
  checkSession();

  /* ============ MODE SWITCHER ============ */
  function setMode(newMode) {
    mode = newMode;
    clearMessages();

    if (mode === 'login') {
      authTitle.textContent = 'Welcome Back';
      authSubtitle.textContent = 'Sign in to your Bisbam Hairs account';
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      authSubmitBtn.textContent = 'Sign In';
      authPassword.setAttribute('autocomplete', 'current-password');
      toggleText.innerHTML = `Don't have an account? <a href="#" id="authToggleLink">Sign up here</a>`;
      if (forgotLinkWrap) forgotLinkWrap.style.display = '';
    } else {
      authTitle.textContent = 'Create Account';
      authSubtitle.textContent = 'Join Bisbam Hairs — save wishlists, faster checkout';
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      authSubmitBtn.textContent = 'Create Account';
      authPassword.setAttribute('autocomplete', 'new-password');
      toggleText.innerHTML = `Already have an account? <a href="#" id="authToggleLink">Sign in here</a>`;
      if (forgotLinkWrap) forgotLinkWrap.style.display = 'none';
    }

    // Re-attach toggle listener
    const newToggle = document.getElementById('authToggleLink');
    if (newToggle) {
      newToggle.addEventListener('click', (e) => {
        e.preventDefault();
        setMode(mode === 'login' ? 'signup' : 'login');
      });
    }
  }

  if (tabLogin) {
    tabLogin.addEventListener('click', () => setMode('login'));
  }
  if (tabSignup) {
    tabSignup.addEventListener('click', () => setMode('signup'));
  }
  if (toggleLink) {
    toggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      setMode(mode === 'login' ? 'signup' : 'login');
    });
  }

  /* ============ EMAIL + PASSWORD FORM ============ */
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const client = db();
      if (!client) return showError('Connection error. Please try again.');

      const email = authEmail.value.trim();
      const password = authPassword.value;

      if (!email || !password) {
        return showError('Please enter both email and password.');
      }

      if (mode === 'signup' && password.length < 6) {
        return showError('Password must be at least 6 characters.');
      }

      clearMessages();

      const originalText = authSubmitBtn.textContent;
      authSubmitBtn.textContent = mode === 'signup' ? 'Creating account…' : 'Signing in…';
      authSubmitBtn.disabled = true;

      try {
        if (mode === 'signup') {
          const { data, error } = await client.auth.signUp({ email, password });

          if (error) throw error;

          if (data && data.session) {
            // Optional welcome email
            try {
              await fetch('https://tqcwmqqxzzsdfuxskayl.supabase.co/functions/v1/send-auth-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'welcome', email })
              });
            } catch (e) { /* ignore */ }

            window.location.href = REDIRECT_AFTER_AUTH;
          } else {
            showSuccess('Account created. Please sign in.');
            setMode('login');
          }
        } else {
          const { error } = await client.auth.signInWithPassword({ email, password });

          if (error) throw error;

          window.location.href = REDIRECT_AFTER_AUTH;
        }
      } catch (err) {
        console.error('Auth error:', err);
        showError(err.message || 'Something went wrong. Please try again.');
      } finally {
        authSubmitBtn.textContent = originalText;
        authSubmitBtn.disabled = false;
      }
    });
  }

  /* ============ FORGOT PASSWORD ============ */
  if (forgotLink) {
    forgotLink.addEventListener('click', async (e) => {
      e.preventDefault();

      const email = authEmail.value.trim();
      if (!email) {
        return showError('Enter your email first, then tap "Forgot password?"');
      }

      const client = db();
      if (!client) return showError('Connection error.');

      clearMessages();
      forgotLink.textContent = 'Sending…';

      try {
        const res = await fetch('https://tqcwmqqxzzsdfuxskayl.supabase.co/functions/v1/send-auth-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset-password', email })
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || 'Could not send reset email.');
        }

        showSuccess('Check your email for the password reset link.');
      } catch (err) {
        console.error('Forgot password error:', err);
        showError(err.message || 'Something went wrong.');
      } finally {
        forgotLink.textContent = 'Forgot password?';
      }
    });
  }

})();
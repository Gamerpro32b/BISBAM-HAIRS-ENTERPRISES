/* =========================================================
   BISBAM HAIRS — reset-password.js
   Handles reset link → set new password → redirect.
   ========================================================= */

(function () {
  'use strict';

  function db() {
    if (!window.BisbamDB && window.initSupabase) window.initSupabase();
    return window.BisbamDB;
  }

  const loading = document.getElementById('resetLoading');
  const form = document.getElementById('resetForm');
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  const submitBtn = document.getElementById('resetSubmitBtn');
  const errorEl = document.getElementById('resetError');
  const successEl = document.getElementById('resetSuccess');
  const title = document.getElementById('resetTitle');
  const subtitle = document.getElementById('resetSubtitle');
  const backWrap = document.getElementById('resetBackWrap');

  function showError(msg) {
    if (errorEl) { errorEl.hidden = false; errorEl.textContent = msg; }
    if (successEl) successEl.hidden = true;
  }

  function showSuccess(msg) {
    if (successEl) { successEl.hidden = false; successEl.textContent = msg; }
    if (errorEl) errorEl.hidden = true;
  }

  /* ============ INIT ============ */
  async function init() {
    const client = db();
    if (!client) {
      if (loading) loading.style.display = 'none';
      showError('Connection error.');
      return;
    }

    // Supabase automatically processes the ?code= or #access_token from the URL
    // and creates a temporary session. We need to wait for it.

    // Give Supabase a moment to process URL tokens
    await new Promise(r => setTimeout(r, 300));

    // Method 1: check if a session already exists (Supabase handled the URL)
    let { data: sessionData } = await client.auth.getSession();

    if (sessionData && sessionData.session) {
      readyToReset();
      return;
    }

    // Method 2: some Supabase versions need explicit code exchange
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      try {
        const { data, error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw error;
        if (data && data.session) {
          readyToReset();
          return;
        }
      } catch (err) {
        console.warn('Code exchange error:', err);
      }
    }

    // If we got here, no valid session
    if (loading) loading.style.display = 'none';
    if (title) title.textContent = 'Link Expired';
    if (subtitle) subtitle.textContent = 'This reset link is invalid or has expired.';
    showError('Please request a new password reset link.');
    if (backWrap) backWrap.style.display = '';
  }

  function readyToReset() {
    if (loading) loading.style.display = 'none';
    if (form) form.style.display = 'block';
  }

  /* ============ SUBMIT ============ */
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const pwd = newPassword.value;
      const confirm = confirmPassword.value;

      if (!pwd || !confirm) {
        return showError('Please fill in both fields.');
      }

      if (pwd.length < 6) {
        return showError('Password must be at least 6 characters.');
      }

      if (pwd !== confirm) {
        return showError('Passwords do not match.');
      }

      const client = db();
      if (!client) return showError('Connection error.');

      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Saving…';
      submitBtn.disabled = true;

      try {
        const { error } = await client.auth.updateUser({ password: pwd });
        if (error) throw error;

        showSuccess('Password updated! Redirecting to sign in…');

        // Sign out the temp session so they log in with the new password
        await client.auth.signOut();

        setTimeout(() => {
          window.location.href = 'auth.html';
        }, 1500);
      } catch (err) {
        console.error('Update password error:', err);
        showError(err.message || 'Could not update password. Please try again.');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  init();

})();
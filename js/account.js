/* =========================================================
   BISBAM HAIRS — account.js
   Profile, stats, order history link, wishlist link,
   personal info edit (display name), change password.
   ========================================================= */

(function () {
  'use strict';

  function db() {
    if (!window.BisbamDB && window.initSupabase) window.initSupabase();
    return window.BisbamDB;
  }

  function naira(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG');
  }

  const loading = document.getElementById('accountLoading');
  const content = document.getElementById('accountContent');

  /* ============ MODAL ELEMENTS ============ */
  const profileModal = document.getElementById('profileModal');
  const profileForm = document.getElementById('profileForm');
  const profileFullName = document.getElementById('profileFullName');
  const profileEmailReadonly = document.getElementById('profileEmailReadonly');
  const profileSaveBtn = document.getElementById('profileSaveBtn');
  const profileModalError = document.getElementById('profileModalError');
  const profileModalSuccess = document.getElementById('profileModalSuccess');

  /* ============ MODAL HELPERS ============ */
  function openProfileModal() {
    if (profileModal) profileModal.hidden = false;
    if (profileModalError) profileModalError.hidden = true;
    if (profileModalSuccess) profileModalSuccess.hidden = true;
  }

  function closeProfileModal() {
    if (profileModal) profileModal.hidden = true;
  }

  document.querySelectorAll('[data-close-profile-modal]').forEach(el => {
    el.addEventListener('click', closeProfileModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProfileModal();
  });

  /* ============ MAIN INIT ============ */
  async function init() {
    const client = db();
    if (!client) {
      window.location.href = 'auth.html';
      return;
    }

    const { data } = await client.auth.getSession();

    if (!data || !data.session) {
      window.location.href = 'auth.html';
      return;
    }

    const user = data.session.user;

    // Basic info
    const email = user.email || '';
    const meta = user.user_metadata || {};
    const name = meta.full_name || meta.name || email.split('@')[0] || 'Bam Babe';
    const avatarUrl = meta.avatar_url || meta.picture || '';

    // Fill profile
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileEmail').textContent = email;

    // Verified badge
    if (user.email_confirmed_at) {
      document.getElementById('verifiedBadge').style.display = 'inline-flex';
    }

    // Avatar
    const avatarWrap = document.getElementById('avatarWrap');
    if (avatarUrl) {
      avatarWrap.innerHTML = `<img src="${avatarUrl}" alt="${name}" class="account-avatar-img">`;
    } else {
      const initial = name.charAt(0).toUpperCase();
      avatarWrap.innerHTML = `<div class="account-avatar">${initial}</div>`;
    }

    // Populate modal fields
    if (profileFullName) profileFullName.value = name;
    if (profileEmailReadonly) profileEmailReadonly.value = email;

    // Fetch user's orders
    try {
      const { data: orders } = await client
        .from('orders')
        .select('*')
        .eq('customer_email', email)
        .order('created_at', { ascending: false });

      const list = orders || [];

      const pending = list.filter(o => o.status === 'pending').length;
      const delivered = list.filter(o => o.status === 'delivered').length;
      const spent = list.reduce((s, o) => s + Number(o.total || 0), 0);

      document.getElementById('statOrders').textContent = list.length;
      document.getElementById('statPending').textContent = pending;
      document.getElementById('statDelivered').textContent = delivered;
      document.getElementById('statSpent').textContent = naira(spent);
    } catch (err) {
      console.warn('Order stats fetch failed:', err);
    }

    /* ============ SIGN OUT ============ */
    document.getElementById('signOutBtn').addEventListener('click', async () => {
      if (!confirm('Sign out of your account?')) return;
      await client.auth.signOut();
      window.location.href = 'index.html';
    });

    /* ============ MENU — ORDER HISTORY ============ */
    const menuOrders = document.getElementById('menuOrders');
    if (menuOrders) {
      menuOrders.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'orders.html';
      });
    }

    /* ============ MENU — WISHLIST ============ */
    const menuWishlist = document.getElementById('menuWishlist');
    if (menuWishlist) {
      menuWishlist.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'wishlist.html';
      });
    }

    /* ============ MENU — PERSONAL INFO ============ */
    const menuEditProfile = document.getElementById('menuEditProfile');
    if (menuEditProfile) {
      menuEditProfile.addEventListener('click', (e) => {
        e.preventDefault();
        openProfileModal();
      });
    }

    /* ============ MENU — CHANGE PASSWORD ============ */
    const menuChangePassword = document.getElementById('menuChangePassword');
    if (menuChangePassword) {
      menuChangePassword.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!email) return;
        if (!confirm('Send a password reset link to ' + email + '?')) return;

        try {
          const res = await fetch('https://tqcwmqqxzzsdfuxskayl.supabase.co/functions/v1/send-auth-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset-password', email })
          });
          const data = await res.json();
          if (!res.ok || data.error) throw new Error(data.error || 'Failed');
          alert('Reset link sent to ' + email);
        } catch (err) {
          alert('Could not send reset link: ' + err.message);
        }
      });
    }

    /* ============ PROFILE FORM SUBMIT ============ */
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newName = (profileFullName?.value || '').trim();
        if (!newName) {
          if (profileModalError) {
            profileModalError.hidden = false;
            profileModalError.textContent = 'Please enter a name.';
          }
          return;
        }

        if (profileModalError) profileModalError.hidden = true;
        if (profileModalSuccess) profileModalSuccess.hidden = true;

        const originalText = profileSaveBtn.textContent;
        profileSaveBtn.textContent = 'Saving…';
        profileSaveBtn.disabled = true;

        try {
          const { error } = await client.auth.updateUser({
            data: { full_name: newName }
          });

          if (error) throw error;

          // Update UI immediately
          document.getElementById('profileName').textContent = newName;
          const initial = newName.charAt(0).toUpperCase();

          // Update avatar initial if no avatar image
          if (!avatarUrl && avatarWrap) {
            avatarWrap.innerHTML = `<div class="account-avatar">${initial}</div>`;
          }

          if (profileModalSuccess) {
            profileModalSuccess.hidden = false;
            profileModalSuccess.textContent = 'Saved!';
          }

          setTimeout(closeProfileModal, 1200);
        } catch (err) {
          console.error('Profile update error:', err);
          if (profileModalError) {
            profileModalError.hidden = false;
            profileModalError.textContent = err.message || 'Could not save. Please try again.';
          }
        } finally {
          profileSaveBtn.textContent = originalText;
          profileSaveBtn.disabled = false;
        }
      });
    }

    /* ============ SHOW CONTENT ============ */
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
  }

  init();

})();
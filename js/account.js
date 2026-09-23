/* =========================================================
   BISBAM HAIRS — account.js
   Reads logged-in user, shows profile + order stats.
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
    const isGoogle = (user.app_metadata && user.app_metadata.provider === 'google');

    // Fill profile
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileEmail').textContent = email;

    // Verified badge (Google = verified email)
    if (isGoogle && user.email_confirmed_at) {
      document.getElementById('verifiedBadge').style.display = 'inline-flex';
    } else if (user.email_confirmed_at) {
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

    // Fetch user's orders
    // We match by customer_email (since orders table stores customer_email)
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

    // Sign out
    document.getElementById('signOutBtn').addEventListener('click', async () => {
      if (!confirm('Sign out of your account?')) return;
      await client.auth.signOut();
      window.location.href = 'index.html';
    });

    // Menu placeholders
    document.getElementById('menuOrders').addEventListener('click', (e) => {
      e.preventDefault();
      alert('Order history page coming soon.');
    });

    document.getElementById('menuWishlist').addEventListener('click', (e) => {
      e.preventDefault();
      alert('Wishlist coming soon.');
    });

    document.getElementById('menuEditProfile').addEventListener('click', (e) => {
      e.preventDefault();
      alert('Profile editing coming soon.');
    });

    document.getElementById('menuChangePassword').addEventListener('click', async (e) => {
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

    // Show content
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
  }

  init();

})();
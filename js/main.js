/* =========================================================
   BISBAM HAIRS — main.js
   Global scripts: mobile nav, header scroll, contact form,
   cart count, scroll-reveal, header account link, helpers.
   ========================================================= */

(function () {
  'use strict';

  /* ============ 1. CART COUNT (from localStorage) ============ */
  function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('bisbam_cart') || '[]');
    const total = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = total;
    });
  }
  updateCartCount();

  window.addEventListener('cart-updated', updateCartCount);

  /* ============ 2. STICKY HEADER — shadow on scroll ============ */
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }, { passive: true });
  }

  /* ============ 3. MOBILE NAV TOGGLE ============ */
  const nav = document.querySelector('.main-nav');

  if (nav && header) {
    if (!document.querySelector('.nav-toggle')) {

      const toggle = document.createElement('button');
      toggle.className = 'nav-toggle';
      toggle.setAttribute('aria-label', 'Toggle menu');
      toggle.type = 'button';
      toggle.innerHTML = '<span></span><span></span><span></span>';

      const overlay = document.createElement('div');
      overlay.className = 'nav-overlay';

      const logo = header.querySelector('.logo');
      if (logo && logo.parentNode) {
        logo.parentNode.insertBefore(toggle, logo.nextSibling);
      } else {
        header.querySelector('.header-inner').appendChild(toggle);
      }

      document.body.appendChild(overlay);

      function openNav() {
        nav.classList.add('is-open');
        toggle.classList.add('is-active');
        overlay.classList.add('is-active');
        document.body.style.overflow = 'hidden';
      }

      function closeNav() {
        nav.classList.remove('is-open');
        toggle.classList.remove('is-active');
        overlay.classList.remove('is-active');
        document.body.style.overflow = '';
      }

      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (nav.classList.contains('is-open')) {
          closeNav();
        } else {
          openNav();
        }
      });

      overlay.addEventListener('click', closeNav);

      nav.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', function () {
          closeNav();
        });
      });

      window.addEventListener('resize', function () {
        if (window.innerWidth > 768) closeNav();
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeNav();
      });
    }
  }

  /* ============ 4. CONTACT FORM → WHATSAPP ============ */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();

      const name = contactForm.querySelector('#name')?.value.trim() || '';
      const phone = contactForm.querySelector('#phone')?.value.trim() || '';
      const message = contactForm.querySelector('#message')?.value.trim() || '';

      if (!name || !phone || !message) {
        alert('Please fill in all fields.');
        return;
      }

      const text =
        `Hi Bisbam Hairs!%0A%0A` +
        `Name: ${encodeURIComponent(name)}%0A` +
        `Phone: ${encodeURIComponent(phone)}%0A%0A` +
        `Message: ${encodeURIComponent(message)}`;

      window.open(`https://wa.me/2348146108122?text=${text}`, '_blank');
    });
  }

  /* ============ 5. SMOOTH SCROLL for #anchors ============ */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ============ 6. LOGOUT (admin) ============ */
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Log out of admin?')) {
        localStorage.removeItem('bisbam_admin');
        window.location.href = 'login.html';
      }
    });
  }

  /* ============ 6b. FLOATING WHATSAPP BUTTON ============ */
  function initWhatsAppFloat() {
    if (document.querySelector('.whatsapp-float')) return;
    if (document.querySelector('.admin-body')) return;

    const btn = document.createElement('a');
    btn.className = 'whatsapp-float';
    btn.href = 'https://wa.me/2348146108122?text=' + encodeURIComponent('Hi Bisbam Hairs, I need help.');
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.setAttribute('aria-label', 'Chat on WhatsApp');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    `;
    document.body.appendChild(btn);
  }

  initWhatsAppFloat();

  /* ============ 6c. HEADER ACCOUNT LINK ============ */
  async function initAccountLink() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;
    if (document.querySelector('.account-link')) return;
    if (document.querySelector('.admin-body')) return;

    // Create the link
    const link = document.createElement('a');
    link.className = 'account-link';
    link.href = 'auth.html';
    link.setAttribute('aria-label', 'Account');
    link.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    `;
    headerActions.insertBefore(link, headerActions.firstChild);

    // Check session
    const client = (window.BisbamDB) || (window.initSupabase ? window.initSupabase() : null);
    if (!client) return;

    const { data } = await client.auth.getSession();

    if (data && data.session) {
      const user = data.session.user;
      const email = user.email || '';
      const meta = user.user_metadata || {};
      const name = meta.full_name || meta.name || email.split('@')[0] || 'U';
      const initial = name.charAt(0).toUpperCase();

      link.href = 'account.html';
      link.classList.add('has-user');
      link.setAttribute('data-initial', initial);
      link.setAttribute('aria-label', 'My Account');
    } else {
      link.href = 'auth.html';
    }
  }

  initAccountLink();

  /* ============ 7. SCROLL-REVEAL OBSERVER ============ */
  function initScrollReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -60px 0px'
    });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  initScrollReveal();

  /* ============ 8. SHARED HELPERS ============ */
  window.Bisbam = {
    formatNaira(amount) {
      const n = Number(amount) || 0;
      return '₦' + n.toLocaleString('en-NG');
    },

    getCart() {
      return JSON.parse(localStorage.getItem('bisbam_cart') || '[]');
    },

    saveCart(cart) {
      localStorage.setItem('bisbam_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cart-updated'));
    },

    whatsapp(text = '') {
      const msg = text ? `?text=${encodeURIComponent(text)}` : '';
      return `https://wa.me/2348146108122${msg}`;
    }
  };

/* ============ 9. PASSWORD EYE TOGGLE ============ */
function initPasswordToggles() {
  const inputs = document.querySelectorAll('input[type="password"]');
  if (!inputs.length) return;

  inputs.forEach(input => {
    // Skip if already wrapped
    if (input.parentElement && input.parentElement.classList.contains('password-wrap')) return;

    // Wrap the input
    const wrap = document.createElement('span');
    wrap.className = 'password-wrap';

    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    // Create the toggle button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'password-toggle';
    btn.setAttribute('aria-label', 'Show password');
    btn.innerHTML = `
      <svg class="eye-open" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <svg class="eye-closed" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <path d="M1 1l22 22"/>
      </svg>
    `;
    wrap.appendChild(btn);

    // Toggle handler
    btn.addEventListener('click', () => {
      if (input.type === 'password') {
        input.type = 'text';
        btn.classList.add('is-visible');
        btn.setAttribute('aria-label', 'Hide password');
      } else {
        input.type = 'password';
        btn.classList.remove('is-visible');
        btn.setAttribute('aria-label', 'Show password');
      }
    });
  });
}

initPasswordToggles();
})();
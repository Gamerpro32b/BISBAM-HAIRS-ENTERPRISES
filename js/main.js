/* =========================================================
   BISBAM HAIRS — main.js
   Global scripts: mobile nav, header scroll, contact form,
   cart count display, shared helpers.
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

      // Place toggle AFTER logo, but wrapper-safe
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

  /* ============ 7. SHARED HELPERS ============ */
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

})();
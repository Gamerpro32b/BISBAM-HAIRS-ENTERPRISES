/* =========================================================
   BISBAM HAIRS — shop.js
   Product listing with filter, sort, search + wishlist hearts.
   ========================================================= */

(function () {
  'use strict';

  const grid = document.getElementById('shopGrid');
  const countEl = document.querySelector('.shop-count');
  const filterSearch = document.getElementById('filterSearch');
  const filterCategory = document.getElementById('filterCategory');
  const filterLength = document.getElementById('filterLength');
  const filterTexture = document.getElementById('filterTexture');
  const filterSort = document.getElementById('filterSort');

  if (!grid) return;

  let allProducts = [];
  let savedWishlistIds = new Set();
  let currentUserId = null;

  /* ============ HELPERS ============ */
  function db() {
    if (!window.BisbamDB && window.initSupabase) window.initSupabase();
    return window.BisbamDB;
  }

  /* ============ SKELETONS ============ */
  function showSkeletons(n = 6) {
    grid.innerHTML = Array.from({ length: n }).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-image"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    `).join('');
    if (countEl) countEl.textContent = 'Loading products…';
  }

  /* ============ HEART SVG ============ */
  const HEART_SVG = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  `;

  /* ============ RENDER ============ */
  function renderProducts(products) {
    if (!products || products.length === 0) {
      grid.innerHTML = `
        <p style="grid-column:1/-1;text-align:center;color:var(--grey);padding:var(--space-xl) 0;">
          No products yet. Products will appear here once added from the admin dashboard.
        </p>`;
      if (countEl) countEl.textContent = 'Showing 0 products';
      return;
    }

    grid.innerHTML = products.map(p => {
      const price = '₦' + (p.price || 0).toLocaleString('en-NG');
      const tags = (p.tags || []).join(' ');
      const isSaved = savedWishlistIds.has(String(p.id));
      return `
        <article class="product-card"
                 data-id="${p.id}"
                 data-category="${p.category || ''}"
                 data-texture="${(p.textures && p.textures[0]) || ''}"
                 data-length="${(p.lengths && p.lengths[0]) || ''}"
                 data-price="${p.price || 0}"
                 data-date="${p.date || 0}"
                 data-popularity="${p.stock || 0}"
                 data-search="${(p.name || '').toLowerCase()} ${(p.category || '').toLowerCase()} ${tags.toLowerCase()}">
          <button type="button" class="wishlist-heart ${isSaved ? 'is-saved' : ''}"
                  data-wishlist-id="${p.id}"
                  aria-label="${isSaved ? 'Remove from wishlist' : 'Save to wishlist'}">
            ${HEART_SVG}
          </button>
          <div class="product-image">
            <img src="${p.image}" alt="${p.name}" loading="lazy">
          </div>
          <h3 class="product-name">${p.name}</h3>
          <p class="product-price">${price}</p>
          <a href="product.html?id=${p.slug || p.id}" class="btn btn-small btn-outline">View</a>
        </article>
      `;
    }).join('');

    // Attach wishlist heart handlers
    grid.querySelectorAll('.wishlist-heart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(btn);
      });
    });
  }

  /* ============ WISHLIST ============ */
  async function loadWishlist() {
    const client = db();
    if (!client) return;

    const { data: session } = await client.auth.getSession();
    if (!session || !session.session) {
      currentUserId = null;
      savedWishlistIds = new Set();
      return;
    }

    currentUserId = session.session.user.id;

    try {
      const { data } = await client
        .from('wishlists')
        .select('product_id')
        .eq('user_id', currentUserId);

      savedWishlistIds = new Set((data || []).map(w => String(w.product_id)));
    } catch (err) {
      console.warn('Wishlist load error:', err);
    }
  }

  async function toggleWishlist(btn) {
    const productId = btn.getAttribute('data-wishlist-id');

    // Not signed in?
    if (!currentUserId) {
      alert('Sign in to save items to your wishlist.');
      return;
    }

    const client = db();
    if (!client) return;

    const currentlySaved = savedWishlistIds.has(String(productId));

    // Small pop animation
    btn.classList.add('tapped');
    setTimeout(() => btn.classList.remove('tapped'), 400);

    try {
      if (currentlySaved) {
        // Remove
        const { error } = await client
          .from('wishlists')
          .delete()
          .eq('user_id', currentUserId)
          .eq('product_id', productId);

        if (error) throw error;

        savedWishlistIds.delete(String(productId));
        btn.classList.remove('is-saved');
        btn.setAttribute('aria-label', 'Save to wishlist');
      } else {
        // Add
        const { error } = await client
          .from('wishlists')
          .insert({ user_id: currentUserId, product_id: productId });

        if (error) throw error;

        savedWishlistIds.add(String(productId));
        btn.classList.add('is-saved');
        btn.setAttribute('aria-label', 'Remove from wishlist');
      }
    } catch (err) {
      console.error('Wishlist toggle error:', err);
      alert('Could not update wishlist. Please try again.');
    }
  }

  /* ============ FILTERS ============ */
  function getCards() {
    return Array.from(grid.querySelectorAll('.product-card'));
  }

  function applyFilters() {
    const search = (filterSearch?.value || '').trim().toLowerCase();
    const cat = (filterCategory?.value || '').toLowerCase();
    const length = (filterLength?.value || '').toLowerCase();
    const texture = (filterTexture?.value || '').toLowerCase();
    const sort = filterSort?.value || 'newest';

    let cards = getCards();

    cards.forEach(card => {
      const cardCat = (card.dataset.category || '').toLowerCase();
      const cardLen = (card.dataset.length || '').toLowerCase();
      const cardTex = (card.dataset.texture || '').toLowerCase();
      const cardSearch = (card.dataset.search || '').toLowerCase();

      const matchesSearch = !search || cardSearch.includes(search);
      const matchesCat = !cat || cardCat === cat;
      const matchesLen = !length || cardLen === length;
      const matchesTex = !texture || cardTex === texture;

      card.style.display = (matchesSearch && matchesCat && matchesLen && matchesTex) ? '' : 'none';
    });

    const visible = cards.filter(c => c.style.display !== 'none');

    visible.sort((a, b) => {
      const priceA = parseInt(a.dataset.price || '0', 10);
      const priceB = parseInt(b.dataset.price || '0', 10);
      const dateA = parseInt(a.dataset.date || '0', 10);
      const dateB = parseInt(b.dataset.date || '0', 10);
      const popA = parseInt(a.dataset.popularity || '0', 10);
      const popB = parseInt(b.dataset.popularity || '0', 10);

      if (sort === 'price-asc') return priceA - priceB;
      if (sort === 'price-desc') return priceB - priceA;
      if (sort === 'popular') return popB - popA;
      return dateB - dateA;
    });

    visible.forEach(card => grid.appendChild(card));

    if (countEl) {
      countEl.textContent = `Showing ${visible.length} product${visible.length === 1 ? '' : 's'}`;
    }
  }

  /* ============ WIRE EVENTS ============ */
  [filterSearch, filterCategory, filterLength, filterTexture, filterSort].forEach(el => {
    if (!el) return;
    const evt = el.tagName === 'INPUT' ? 'input' : 'change';
    el.addEventListener(evt, applyFilters);
  });

  /* ============ URL PARAMS ============ */
  const params = new URLSearchParams(window.location.search);
  const catParam = params.get('cat');
  if (catParam && filterCategory) {
    filterCategory.value = catParam;
  }

  /* ============ INIT ============ */
  async function init() {
    showSkeletons(6);

    // Load user wishlist first (sets currentUserId + savedWishlistIds)
    await loadWishlist();

    allProducts = await window.BisbamDB2.getProducts();
    renderProducts(allProducts);
    applyFilters();
  }
  init();

  window.BisbamShop = { applyFilters, renderProducts };

})();
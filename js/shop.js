/* =========================================================
   BISBAM HAIRS — shop.js
   Shop page: render products from data, filter, sort.
   Data comes from js/products.js (placeholders for now).
   ========================================================= */

(function () {
  'use strict';

  const grid = document.getElementById('shopGrid');
  const countEl = document.querySelector('.shop-count');
  const filterCategory = document.getElementById('filterCategory');
  const filterLength = document.getElementById('filterLength');
  const filterTexture = document.getElementById('filterTexture');
  const filterSort = document.getElementById('filterSort');

  if (!grid) return;

  /* ============ RENDER PRODUCTS FROM DATA ============ */
  function renderProducts() {
    const products = window.BISBAM_PRODUCTS || [];

    if (products.length === 0) {
      grid.innerHTML = `
        <p style="grid-column:1/-1;text-align:center;color:var(--grey);padding:var(--space-xl) 0;">
          No products yet. Products will appear here once added from the admin dashboard.
        </p>`;
      return;
    }

    grid.innerHTML = products.map(p => {
      const price = '₦' + (p.price || 0).toLocaleString('en-NG');
      return `
        <article class="product-card"
                 data-id="${p.id}"
                 data-category="${p.category || ''}"
                 data-texture="${p.texture || ''}"
                 data-length="${p.length || ''}"
                 data-price="${p.price || 0}"
                 data-date="${p.date || 0}"
                 data-popularity="${p.stock || 0}">
          <div class="product-image">
            <img src="${p.image}" alt="${p.name}">
          </div>
          <h3 class="product-name">${p.name}</h3>
          <p class="product-price">${price}</p>
          <a href="product.html?id=${p.id}" class="btn btn-small btn-outline">View</a>
        </article>
      `;
    }).join('');
  }

  renderProducts();

  /* ============ COLLECT PRODUCT CARDS ============ */
  function getCards() {
    return Array.from(grid.querySelectorAll('.product-card'));
  }

  /* ============ APPLY FILTERS + SORT ============ */
  function applyFilters() {
    const cat = (filterCategory?.value || '').toLowerCase();
    const length = (filterLength?.value || '').toLowerCase();
    const texture = (filterTexture?.value || '').toLowerCase();
    const sort = filterSort?.value || 'newest';

    let cards = getCards();

    // Filter
    cards.forEach(card => {
      const cardCat = (card.dataset.category || '').toLowerCase();
      const cardLen = (card.dataset.length || '').toLowerCase();
      const cardTex = (card.dataset.texture || '').toLowerCase();

      const matchesCat = !cat || cardCat === cat;
      const matchesLen = !length || cardLen === length;
      const matchesTex = !texture || cardTex === texture;

      if (matchesCat && matchesLen && matchesTex) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });

    // Sort (visible cards only)
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
      return dateB - dateA; // newest first
    });

    visible.forEach(card => grid.appendChild(card));

    // Update count
    if (countEl) {
      countEl.textContent = `Showing ${visible.length} product${visible.length === 1 ? '' : 's'}`;
    }
  }

  /* ============ WIRE EVENTS ============ */
  [filterCategory, filterLength, filterTexture, filterSort].forEach(el => {
    if (el) el.addEventListener('change', applyFilters);
  });

  /* ============ READ URL PARAMS ============ */
  const params = new URLSearchParams(window.location.search);
  const catParam = params.get('cat');
  if (catParam && filterCategory) {
    filterCategory.value = catParam;
  }

  /* ============ INIT ============ */
  applyFilters();

  /* ============ EXPOSE FOR OTHER SCRIPTS ============ */
  window.BisbamShop = {
    applyFilters,
    renderProducts
  };

})();
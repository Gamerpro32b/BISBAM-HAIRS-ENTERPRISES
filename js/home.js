/* =========================================================
   BISBAM HAIRS — home.js
   Homepage: categories + featured products from Supabase.
   ========================================================= */

(function () {
  'use strict';

  const categoryGrid = document.getElementById('categoryGrid');
  const featuredGrid = document.getElementById('featuredGrid');

  if (!categoryGrid && !featuredGrid) return;

  /* ============ SKELETONS ============ */
  function showCategorySkeletons(n = 4) {
    if (!categoryGrid) return;
    categoryGrid.innerHTML = Array.from({ length: n }).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-image"></div>
      </div>
    `).join('');
  }

  function showFeaturedSkeletons(n = 4) {
    if (!featuredGrid) return;
    featuredGrid.innerHTML = Array.from({ length: n }).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-image"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    `).join('');
  }

  /* ============ CATEGORIES ============ */
  async function renderCategories() {
    if (!categoryGrid) return;

    const cats = await window.BisbamDB2.getCategories();

    if (!cats || cats.length === 0) {
      categoryGrid.innerHTML = '';
      return;
    }

    const imageFor = (cat) => {
      if (cat && cat.image_url) return cat.image_url;
      return 'assets/images/banners/about.jpg';
    };

    // Show ALL categories — no limit
    categoryGrid.innerHTML = cats.map(c => `
      <a href="shop.html?cat=${c.slug}" class="category-card">
        <img src="${imageFor(c)}" alt="${c.name}" loading="lazy">
        <h3>${c.name}</h3>
      </a>
    `).join('');
  }

  /* ============ FEATURED ============ */
  async function renderFeatured() {
    if (!featuredGrid) return;

    const products = await window.BisbamDB2.getFeaturedProducts(4);

    if (!products || products.length === 0) {
      featuredGrid.innerHTML = `
        <p style="grid-column:1/-1;text-align:center;color:var(--grey);padding:var(--space-xl) 0;">
          No featured products yet.
        </p>`;
      return;
    }

    featuredGrid.innerHTML = products.map(p => {
  const price = '₦' + (p.price || 0).toLocaleString('en-NG');
  return `
    <article class="product-card" data-id="${p.id}">
      <button type="button" class="wishlist-heart"
              data-wishlist-id="${p.id}"
              aria-label="Save to wishlist">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
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

// Bind hearts (uses global helper from main.js)
if (window.BisbamWishlist) window.BisbamWishlist.init();
  }

  /* ============ INIT ============ */
  async function init() {
    showCategorySkeletons(4);
    showFeaturedSkeletons(4);

    await Promise.all([
      renderCategories(),
      renderFeatured()
    ]);
  }
  init();

})();
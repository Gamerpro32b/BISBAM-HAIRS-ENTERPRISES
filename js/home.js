/* =========================================================
   BISBAM HAIRS — home.js
   Homepage: renders category grid + featured products
   from Supabase (via db.js).
   ========================================================= */

(function () {
  'use strict';

  const categoryGrid = document.getElementById('categoryGrid');
  const featuredGrid = document.getElementById('featuredGrid');

  if (!categoryGrid && !featuredGrid) return;

  /* ============ CATEGORIES ============ */
  async function renderCategories() {
    if (!categoryGrid) return;

    const cats = await window.BisbamDB2.getCategories();

    if (!cats || cats.length === 0) {
      categoryGrid.innerHTML = '';
      return;
    }

    // Map slug → default image (we don't have category images yet)
    const imageFor = (slug) => {
      if (slug === 'wigs' || slug === 'human-hair') return 'assets/images/banners/hero.jpg';
      return 'assets/images/banners/about.jpg';
    };

    categoryGrid.innerHTML = cats.slice(0, 4).map(c => `
      <a href="shop.html?cat=${c.slug}" class="category-card">
        <img src="${imageFor(c.slug)}" alt="${c.name}" loading="lazy">
        <h3>${c.name}</h3>
      </a>
    `).join('');
  }

  /* ============ FEATURED PRODUCTS ============ */
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
        <article class="product-card">
          <div class="product-image">
            <img src="${p.image}" alt="${p.name}" loading="lazy">
          </div>
          <h3 class="product-name">${p.name}</h3>
          <p class="product-price">${price}</p>
          <a href="product.html?id=${p.slug || p.id}" class="btn btn-small btn-outline">View</a>
        </article>
      `;
    }).join('');
  }

  /* ============ INIT ============ */
  async function init() {
    await new Promise(r => setTimeout(r, 100));
    await renderCategories();
    await renderFeatured();
  }
  init();

})();
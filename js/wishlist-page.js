/* =========================================================
   BISBAM HAIRS — wishlist-page.js
   Renders user's saved wishlist products.
   ========================================================= */

(function () {
  'use strict';

  const grid = document.getElementById('wishlistGrid');
  const loading = document.getElementById('wishlistLoading');

  if (!grid) return;

  function db() {
    if (!window.BisbamDB && window.initSupabase) window.initSupabase();
    return window.BisbamDB;
  }

  function naira(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG');
  }

  const HEART_SVG = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  `;

  async function init() {
    const client = db();
    if (!client) {
      window.location.href = 'auth.html';
      return;
    }

    const { data: session } = await client.auth.getSession();
    if (!session || !session.session) {
      window.location.href = 'auth.html';
      return;
    }

    const userId = session.session.user.id;

    try {
      // Get wishlist entries
      const { data: items, error } = await client
        .from('wishlists')
        .select('id, product_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!items || items.length === 0) {
        return renderEmpty();
      }

      // Get product details
      const productIds = items.map(i => i.product_id);
      const { data: products, error: prodErr } = await client
        .from('products')
        .select('*')
        .in('id', productIds);

      if (prodErr) throw prodErr;

      // Map products by id for lookup
      const productMap = {};
      (products || []).forEach(p => { productMap[p.id] = p; });

      // Build render list in wishlist order
      const render = items
        .map(item => {
          const p = productMap[item.product_id];
          if (!p) return null;
          return {
            wishlistRowId: item.id,
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.sale_price || p.retail_price || 0,
            image: (p.images && p.images[0]) || 'assets/images/products/placeholder.jpg'
          };
        })
        .filter(Boolean);

      if (render.length === 0) {
        return renderEmpty();
      }

      renderWishlist(render);
    } catch (err) {
      console.warn('Wishlist page error:', err);
      renderEmpty();
    }
  }

  function renderEmpty() {
    if (loading) loading.style.display = 'none';
    grid.innerHTML = `
      <div class="wishlist-empty" style="grid-column:1/-1;">
        <svg class="wishlist-empty-icon" viewBox="0 0 24 24">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <h2>Your wishlist is empty</h2>
        <p>Save your favorite products by tapping the heart on any product.</p>
        <a href="shop.html" class="btn btn-primary">Browse Products</a>
      </div>
    `;
  }

  function renderWishlist(items) {
    if (loading) loading.style.display = 'none';

    grid.innerHTML = items.map(item => `
      <article class="product-card" data-id="${item.id}">
        <button type="button" class="wishlist-heart is-saved"
                data-wishlist-id="${item.id}"
                aria-label="Remove from wishlist">
          ${HEART_SVG}
        </button>
        <div class="product-image">
          <img src="${item.image}" alt="${item.name}" loading="lazy">
        </div>
        <h3 class="product-name">${item.name}</h3>
        <p class="product-price">${naira(item.price)}</p>
        <a href="product.html?id=${item.slug || item.id}" class="btn btn-small btn-outline">View</a>
      </article>
    `).join('');

    // Attach remove handlers
    grid.querySelectorAll('.wishlist-heart').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await removeFromWishlist(btn);
      });
    });
  }

  async function removeFromWishlist(btn) {
    const productId = btn.getAttribute('data-wishlist-id');
    const client = db();
    if (!client) return;

    const { data: session } = await client.auth.getSession();
    if (!session || !session.session) return;

    const userId = session.session.user.id;

    // Pop animation
    btn.classList.add('tapped');
    setTimeout(() => btn.classList.remove('tapped'), 400);

    try {
      const { error } = await client
        .from('wishlists')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) throw error;

      // Remove the card from DOM
      const card = btn.closest('.product-card');
      if (card) {
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
          card.remove();
          // If no cards left → show empty state
          if (grid.querySelectorAll('.product-card').length === 0) {
            renderEmpty();
          }
        }, 320);
      }
    } catch (err) {
      console.error('Remove from wishlist failed:', err);
      alert('Could not remove item. Please try again.');
    }
  }

  init();

})();
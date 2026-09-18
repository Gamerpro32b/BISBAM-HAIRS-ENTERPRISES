/* =========================================================
   BISBAM HAIRS — product.js
   Product detail page. Fetches from Supabase, loads images + video.
   ========================================================= */

(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  /* ============ HELPERS ============ */
  function naira(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG');
  }

  function db() {
    if (!window.BisbamDB && window.initSupabase) window.initSupabase();
    return window.BisbamDB;
  }

  /* ============ LOAD PRODUCT ============ */
  async function loadProduct() {
    if (!productId) {
      showNotFound('No product selected.');
      return;
    }

    const client = db();
    if (!client) {
      showNotFound('Not connected.');
      return;
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);

    const { data, error } = await client
      .from('products')
      .select('*')
      .eq(isUuid ? 'id' : 'slug', productId)
      .single();

    if (error || !data) {
      console.warn('Product fetch error:', error);
      showNotFound('Product not found.');
      return;
    }

    renderProduct(data);
    loadRelated(data);
  }

  /* ============ RENDER ============ */
  function renderProduct(p) {
    const pageTitle = document.querySelector('.product-title');
    const price = document.querySelector('.product-info .product-price');
    const desc = document.querySelector('.product-description');
    const mainImage = document.getElementById('mainImage');
    const thumbs = document.querySelector('.product-gallery-thumbs');
    const breadcrumbName = document.querySelector('.breadcrumb span');
    const stockStatus = document.getElementById('stockStatus');
    const categoryEl = document.getElementById('productCategory');

    document.title = p.name + ' — Bisbam Hairs';

    if (pageTitle) pageTitle.textContent = p.name;
    if (breadcrumbName) breadcrumbName.textContent = p.name;
    if (price) price.textContent = naira(p.sale_price || p.retail_price || 0);
    if (desc) desc.textContent = p.description || 'No description yet.';
    if (categoryEl) categoryEl.textContent = p.category_slug || '—';

    if (stockStatus) {
      if ((p.stock || 0) === 0) stockStatus.textContent = 'Out of stock';
      else if ((p.stock || 0) <= 3) stockStatus.textContent = 'Low stock';
      else stockStatus.textContent = 'In stock';
    }

    /* ===== IMAGES ===== */
    const images = (p.images && p.images.length)
      ? p.images
      : ['assets/images/products/placeholder.jpg'];

    if (mainImage) {
      mainImage.src = images[0];
      mainImage.alt = p.name;
    }

    if (thumbs) {
      thumbs.innerHTML = images.slice(0, 6).map((src, i) => `
        <img src="${src}" alt="${p.name} view ${i + 1}" data-src="${src}">
      `).join('');

      thumbs.querySelectorAll('img').forEach(t => {
        t.addEventListener('click', () => {
          if (mainImage) {
            mainImage.src = t.dataset.src;
            mainImage.style.display = '';
          }
          const videoEl = document.getElementById('productVideo');
          if (videoEl) videoEl.pause();
        });
      });
    }

    /* ===== VIDEO ===== */
    const videoEl = document.getElementById('productVideo');
    if (videoEl) {
      if (p.video_url) {
        videoEl.src = p.video_url;
        videoEl.hidden = false;
        // Show video alongside image (both visible)
      } else {
        videoEl.hidden = true;
        videoEl.removeAttribute('src');
      }
    }

    /* ===== VARIATIONS ===== */
    fillVariation('length', p.lengths);
    fillVariation('texture', p.textures);
    fillVariation('color', p.colors);
    fillVariation('density', p.densities);

    /* ===== STORE PRODUCT FOR CART ===== */
    window.BISBAM_CURRENT_PRODUCT = {
      id: p.slug || p.id,
      name: p.name,
      price: p.sale_price || p.retail_price || 0,
      image: images[0]
    };

    /* ===== ADD TO CART ===== */
    const addBtn = document.getElementById('addToCartBtn');
    if (addBtn) {
      const fresh = addBtn.cloneNode(true);
      addBtn.parentNode.replaceChild(fresh, addBtn);

      fresh.addEventListener('click', () => {
        const length = document.getElementById('length')?.value || '';
        const texture = document.getElementById('texture')?.value || '';
        const color = document.getElementById('color')?.value || '';
        const density = document.getElementById('density')?.value || '';
        const qty = parseInt(document.getElementById('qty')?.value || '1', 10);

        const cart = JSON.parse(localStorage.getItem('bisbam_cart') || '[]');
        const key = [p.slug || p.id, length, texture, color, density].join('|');
        const existing = cart.find(i => i.key === key);

        if (existing) {
          existing.qty += qty;
        } else {
          cart.push({
            key,
            id: p.slug || p.id,
            name: p.name,
            price: p.sale_price || p.retail_price || 0,
            image: images[0],
            length, texture, color, density,
            qty
          });
        }

        localStorage.setItem('bisbam_cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cart-updated'));

        fresh.textContent = 'Added ✓';
        fresh.disabled = true;
        setTimeout(() => {
          fresh.textContent = 'Add to Cart';
          fresh.disabled = false;
        }, 1500);
      });
    }

    /* ===== WHATSAPP ENQUIRY ===== */
    const waBtn = document.querySelector('.whatsapp-btn');
    if (waBtn) {
      const text = `Hi Bisbam Hairs, I'm interested in: ${p.name}`;
      waBtn.href = `https://wa.me/2348146108122?text=${encodeURIComponent(text)}`;
    }
  }

  function fillVariation(selectId, values) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const first = sel.querySelector('option');
    sel.innerHTML = '';
    if (first) sel.appendChild(first);
    (values || []).forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    });
  }

  /* ============ RELATED PRODUCTS ============ */
  async function loadRelated(current) {
    const grid = document.getElementById('relatedGrid');
    if (!grid) return;

    const client = db();
    if (!client) return;

    const { data } = await client
      .from('products')
      .select('*')
      .eq('category_slug', current.category_slug)
      .neq('id', current.id)
      .limit(4);

    if (!data || data.length === 0) {
      grid.innerHTML = '';
      return;
    }

    grid.innerHTML = data.map(p => {
      const image = (p.images && p.images[0]) || 'assets/images/products/placeholder.jpg';
      return `
        <article class="product-card">
          <div class="product-image">
            <img src="${image}" alt="${p.name}" loading="lazy">
          </div>
          <h3 class="product-name">${p.name}</h3>
          <p class="product-price">${naira(p.sale_price || p.retail_price || 0)}</p>
          <a href="product.html?id=${p.slug || p.id}" class="btn btn-small btn-outline">View</a>
        </article>
      `;
    }).join('');
  }

  function showNotFound(msg) {
    const title = document.querySelector('.product-title');
    if (title) title.textContent = msg || 'Product not found';
    const main = document.querySelector('.product-gallery-main img');
    if (main) main.src = 'assets/images/products/placeholder.jpg';
  }

  /* ============ INIT ============ */
  loadProduct();

})();
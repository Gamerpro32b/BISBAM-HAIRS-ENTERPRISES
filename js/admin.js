/* =========================================================
   BISBAM HAIRS — admin.js
   Admin dashboard + products + auth.
   Sub-steps: 21a, 21b, 21c, 22b
   ========================================================= */

(function () {
  'use strict';

  const localProducts = window.BISBAM_PRODUCTS || [];
  const localOrders = window.BISBAM_ORDERS || [];
  const localCustomers = window.BISBAM_CUSTOMERS || [];
  const localCategories = window.BISBAM_CATEGORIES || [];

  function naira(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG');
  }

  function db() {
    if (!window.BisbamDB && window.initSupabase) window.initSupabase();
    return window.BisbamDB;
  }

  /* =========================================================
     LOGIN PAGE
     ========================================================= */
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const client = db();
      const errEl = document.getElementById('adminLoginError');
      const emailEl = document.getElementById('adminEmail');
      const passEl = document.getElementById('adminPassword');
      const btn = loginForm.querySelector('button[type="submit"]');

      const email = emailEl.value.trim();
      const password = passEl.value;

      if (!email || !password) {
        errEl.hidden = false;
        errEl.textContent = 'Please enter email and password.';
        return;
      }

      const originalText = btn.textContent;
      btn.textContent = 'Signing in…';
      btn.disabled = true;
      errEl.hidden = true;

      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });

      btn.textContent = originalText;
      btn.disabled = false;

      if (error) {
        errEl.hidden = false;
        errEl.textContent = error.message || 'Login failed.';
        return;
      }

      // Success — redirect to dashboard
      window.location.href = 'index.html';
    });
  }

  /* =========================================================
     PROTECT ADMIN PAGES
     ========================================================= */
  // Only run on admin pages (not login.html)
  const path = window.location.pathname.split('/').pop() || 'index.html';
  const isLoginPage = path === 'login.html';

  if (!isLoginPage && document.body.classList.contains('admin-body')) {
    (async () => {
      const client = db();
      const { data } = await client.auth.getSession();

      if (!data || !data.session) {
        window.location.href = 'login.html';
      }
    })();
  }

  /* =========================================================
     LOGOUT
     ========================================================= */
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (!confirm('Log out of admin?')) return;
      const client = db();
      await client.auth.signOut();
      window.location.href = 'login.html';
    });
  }

  /* =========================================================
     REST OF ADMIN (only runs if not on login page)
     ========================================================= */
  if (isLoginPage) return;

  async function fetchAll() {
    const client = db();
    const result = {
      products: localProducts,
      orders: localOrders,
      customers: localCustomers,
      categories: localCategories
    };

    if (!client) return result;

    try {
      const [p, o, c, cat] = await Promise.all([
        client.from('products').select('*').order('created_at', { ascending: false }),
        client.from('orders').select('*').order('created_at', { ascending: false }),
        client.from('customers').select('*').order('created_at', { ascending: false }),
        client.from('categories').select('*').order('name')
      ]);

      if (!p.error && p.data && p.data.length) {
        result.products = p.data.map(x => ({
          id: x.id,
          name: x.name,
          slug: x.slug,
          description: x.description,
          category: x.category_slug,
          tags: x.tags || [],
          price: x.sale_price || x.retail_price || 0,
          retail_price: x.retail_price,
          wholesale_price: x.wholesale_price,
          sale_price: x.sale_price,
          stock: x.stock,
          availability: x.availability,
          lengths: x.lengths || [],
          textures: x.textures || [],
          colors: x.colors || [],
          densities: x.densities || [],
          lace_type: x.lace_type,
          cap_size: x.cap_size,
          image: (x.images && x.images[0]) || 'assets/images/products/placeholder.jpg',
          images: x.images || [],
          video_url: x.video_url,
          featured: x.featured,
          wholesale_available: x.wholesale_available
        }));
      }

      if (!o.error && o.data) {
        result.orders = o.data.map(x => ({
          id: x.order_number || x.id,
          customer: x.customer_name,
          phone: x.customer_phone,
          address: x.delivery_address,
          city: x.city,
          items: x.items || [],
          total: x.total,
          payment: x.payment_method,
          status: x.status,
          date: (x.created_at || '').split('T')[0],
          notes: x.notes
        }));
      }

      if (!c.error && c.data) {
        result.customers = c.data.map(x => ({
          id: x.id,
          name: x.name,
          phone: x.phone,
          email: x.email,
          city: x.city,
          orders: x.total_orders || 0,
          totalSpent: x.total_spent || 0,
          lastOrder: x.last_order_at ? x.last_order_at.split('T')[0] : '—'
        }));
      }

      if (!cat.error && cat.data && cat.data.length) {
        result.categories = cat.data;
      }
    } catch (err) {
      console.warn('fetchAll exception:', err);
    }

    return result;
  }

  /* ============ SIDEBAR ============ */
  document.querySelectorAll('.admin-sidebar nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path) a.classList.add('active');
    else a.classList.remove('active');
  });

  /* ============ MODALS ============ */
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.hidden = false;
  }
  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.hidden = true;
  }
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', () => {
      const modal = el.closest('.admin-modal');
      if (modal) modal.hidden = true;
    });
  });

  /* ============ DROPDOWNS ============ */
  function fillCategoryDropdown(selectEl, cats) {
    if (!selectEl) return;
    const firstOption = selectEl.querySelector('option');
    selectEl.innerHTML = '';
    if (firstOption) selectEl.appendChild(firstOption);
    (cats || []).forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.slug;
      opt.textContent = c.name;
      selectEl.appendChild(opt);
    });
  }

  /* ============ DASHBOARD ============ */
  function renderDashboardStats(orders, products) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set('statTotalOrders', orders.length);
    set('statPendingOrders', orders.filter(o => o.status === 'pending').length);
    set('statConfirmedOrders', orders.filter(o => o.status === 'confirmed').length);
    set('statDeliveredOrders', orders.filter(o => o.status === 'delivered').length);
    set('statTotalProducts', products.length);
    set('statOutOfStock', products.filter(p => (p.stock || 0) === 0).length);
    set('statRevenue', naira(orders.reduce((s, o) => s + (o.total || 0), 0)));
    set('statWeekOrders', orders.length + ' orders');
  }

  function renderRecentOrders(orders) {
    const body = document.getElementById('recentOrdersBody');
    if (!body) return;
    if (orders.length === 0) {
      body.innerHTML = `<tr><td colspan="8" class="admin-empty">No orders yet.</td></tr>`;
      return;
    }
    body.innerHTML = orders.slice(0, 5).map(o => `
      <tr>
        <td>${o.id}</td>
        <td>${o.customer}</td>
        <td>${o.phone}</td>
        <td>${(o.items || []).length}</td>
        <td>${naira(o.total)}</td>
        <td><span class="status-badge status-${o.status}">${o.status}</span></td>
        <td>${o.date}</td>
        <td><button class="btn btn-small btn-outline view-order" data-id="${o.id}">View</button></td>
      </tr>
    `).join('');
  }

  function renderLowStock(products) {
    const body = document.getElementById('lowStockBody');
    if (!body) return;
    const low = products.filter(p => (p.stock || 0) <= 3);
    if (low.length === 0) {
      body.innerHTML = `<tr><td colspan="5" class="admin-empty">No low-stock products.</td></tr>`;
      return;
    }
    body.innerHTML = low.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.stock}</td>
        <td>${p.stock === 0 ? 'Out of Stock' : 'Low'}</td>
        <td><a href="products.html" class="btn btn-small btn-outline">Edit</a></td>
      </tr>
    `).join('');
  }

  /* ============ PRODUCTS PAGE ============ */
  let productSearch = '';
  let productCategoryFilter = '';
  let productStockFilter = '';

  function renderProductsTable(products) {
    const body = document.getElementById('productsBody');
    if (!body) return;

    let list = products.slice();

    if (productCategoryFilter) {
      list = list.filter(p => (p.category || '') === productCategoryFilter);
    }

    if (productStockFilter) {
      list = list.filter(p => {
        const stock = p.stock || 0;
        if (productStockFilter === 'out') return stock === 0;
        if (productStockFilter === 'low') return stock > 0 && stock <= 3;
        if (productStockFilter === 'in') return stock > 3;
        return true;
      });
    }

    if (productSearch) {
      const q = productSearch.toLowerCase();
      list = list.filter(p => (p.name || '').toLowerCase().includes(q));
    }

    if (list.length === 0) {
      body.innerHTML = `<tr><td colspan="8" class="admin-empty">No products match.</td></tr>`;
      return;
    }

    body.innerHTML = list.map(p => `
      <tr>
        <td><img src="../${p.image}" alt="" style="width:48px;height:60px;object-fit:cover;border-radius:6px;"></td>
        <td>${p.name}</td>
        <td>${p.category || '—'}</td>
        <td>${naira(p.retail_price || p.price)}</td>
        <td>${p.wholesale_price ? naira(p.wholesale_price) : '—'}</td>
        <td>${p.stock}</td>
        <td>${p.stock === 0 ? 'Out' : 'In Stock'}</td>
        <td>
          <button class="btn btn-small btn-outline edit-product" data-id="${p.id}">Edit</button>
        </td>
      </tr>
    `).join('');
  }

  function wireProductsPageFilters() {
    const search = document.getElementById('productSearch');
    const cat = document.getElementById('productCategoryFilter');
    const stock = document.getElementById('productStockFilter');

    if (search) search.addEventListener('input', e => {
      productSearch = e.target.value.trim();
      renderProductsTable((window.BisbamAdminData || {}).products || []);
    });
    if (cat) cat.addEventListener('change', e => {
      productCategoryFilter = e.target.value;
      renderProductsTable((window.BisbamAdminData || {}).products || []);
    });
    if (stock) stock.addEventListener('change', e => {
      productStockFilter = e.target.value;
      renderProductsTable((window.BisbamAdminData || {}).products || []);
    });
  }

  /* ============ CHECKBOX HELPERS ============ */
  function fillCheckboxes(containerId, values, name) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = (values || []).map(v => `
      <label>
        <input type="checkbox" name="${name}" value="${v}">
        <span>${v}</span>
      </label>
    `).join('');
  }

  function getChecked(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return [];
    return Array.from(el.querySelectorAll('input:checked')).map(i => i.value);
  }

  /* ============ CREATE PRODUCT ============ */
  async function handleProductSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const client = db();
    if (!client) return alert('Not connected to database.');

    const name = form.querySelector('#pName').value.trim();
    const description = form.querySelector('#pDescription').value.trim();
    const categorySlug = form.querySelector('#pCategory').value;
    const tags = form.querySelector('#pTags').value
      .split(',').map(t => t.trim()).filter(Boolean);

    const retailPrice = Number(form.querySelector('#pRetailPrice').value) || 0;
    const wholesalePrice = Number(form.querySelector('#pWholesalePrice').value) || null;
    const salePrice = Number(form.querySelector('#pSalePrice').value) || null;

    const stock = Number(form.querySelector('#pStock').value) || 0;
    const lowStock = Number(form.querySelector('#pLowStockThreshold').value) || 3;
    const availability = form.querySelector('#pAvailability').value;

    const lengths = getChecked('lengthCheckboxes');
    const textures = getChecked('textureCheckboxes');
    const colors = getChecked('colorCheckboxes');
    const densities = getChecked('densityCheckboxes');

    const laceType = form.querySelector('#pLaceType').value || null;
    const capSize = form.querySelector('#pCapSize').value || null;

    const featured = form.querySelector('#pFeatured').checked;
    const wholesaleAvailable = form.querySelector('#pWholesaleAvailable').checked;

    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36);

    const images = ['assets/images/products/placeholder.jpg'];

    const payload = {
      name, slug, description,
      category_slug: categorySlug,
      tags,
      retail_price: retailPrice,
      wholesale_price: wholesalePrice,
      sale_price: salePrice,
      stock,
      low_stock_threshold: lowStock,
      availability,
      lengths, textures, colors, densities,
      lace_type: laceType,
      cap_size: capSize,
      images,
      featured,
      wholesale_available: wholesaleAvailable
    };

    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving…';
    btn.disabled = true;

    const { error } = await client.from('products').insert(payload);

    btn.textContent = originalText;
    btn.disabled = false;

    if (error) {
      console.error('Insert error:', error);
      alert('Error saving product: ' + error.message);
      return;
    }

    alert('Product added successfully.');
    form.reset();

    const data = await fetchAll();
    window.BisbamAdminData = data;
    renderProductsTable(data.products);
    renderDashboardStats(data.orders, data.products);
    renderLowStock(data.products);

    closeModal('productModal');
  }

  /* ============ INIT ============ */
  async function init() {
    const data = await fetchAll();
    window.BisbamAdminData = data;

    fillCategoryDropdown(document.getElementById('pCategory'), data.categories);
    fillCategoryDropdown(document.getElementById('productCategoryFilter'), data.categories);

    fillCheckboxes('lengthCheckboxes',
      ['10','12','14','16','18','20','22','24','26','28','30'], 'length');
    fillCheckboxes('textureCheckboxes',
      ['bone-straight','silky-straight','body-wave','loose-wave','deep-curly','kinky-curly'], 'texture');
    fillCheckboxes('colorCheckboxes',
      ['natural-black','dark-brown','chestnut-brown','blonde','99j-burgundy'], 'color');
    fillCheckboxes('densityCheckboxes',
      ['150','180','200','250','300'], 'density');

    renderDashboardStats(data.orders, data.products);
    renderRecentOrders(data.orders);
    renderLowStock(data.products);
    renderProductsTable(data.products);
    wireProductsPageFilters();

    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
      addProductBtn.addEventListener('click', () => openModal('productModal'));
    }

    const productForm = document.getElementById('productForm');
    if (productForm) {
      productForm.addEventListener('submit', handleProductSubmit);
    }
  }
  init();

  /* ============ ORDER MODAL ============ */
  document.addEventListener('click', e => {
    const viewBtn = e.target.closest('.view-order');
    if (!viewBtn) return;

    const data = window.BisbamAdminData || {};
    const order = (data.orders || []).find(o => String(o.id) === viewBtn.dataset.id);
    if (!order) return;

    const body = document.getElementById('orderModalBody');
    if (!body) return;

    body.innerHTML = `
      <p><strong>Order:</strong> ${order.id}</p>
      <p><strong>Customer:</strong> ${order.customer}</p>
      <p><strong>Phone:</strong> ${order.phone}</p>
      <p><strong>Address:</strong> ${order.address}, ${order.city}</p>
      <p><strong>Payment:</strong> ${order.payment}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p><strong>Date:</strong> ${order.date}</p>
      <hr style="margin:16px 0;border:none;border-top:1px solid var(--pink-border);">
      <p><strong>Items:</strong></p>
      ${(order.items || []).map(i => `<p>${i.name} × ${i.qty} — ${naira(i.price * i.qty)}</p>`).join('')}
      <hr style="margin:16px 0;border:none;border-top:1px solid var(--pink-border);">
      <p><strong>Total:</strong> ${naira(order.total)}</p>
    `;

    openModal('orderModal');
  });

  /* ============ CATEGORIES PAGE ============ */
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', () => openModal('categoryModal'));
  }

})();
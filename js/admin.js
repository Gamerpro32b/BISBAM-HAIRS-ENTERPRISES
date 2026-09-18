/* =========================================================
   BISBAM HAIRS — admin.js  (Part 1 of 2)
   ========================================================= */

(function () {
  'use strict';

  const localProducts = window.BISBAM_PRODUCTS || [];
  const localOrders = window.BISBAM_ORDERS || [];
  const localCustomers = window.BISBAM_CUSTOMERS || [];
  const localCategories = window.BISBAM_CATEGORIES || [];

  let editingProductId = null;
  window.BISBAM_PENDING_IMAGES = [];

  function naira(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG');
  }

  function db() {
    if (!window.BisbamDB && window.initSupabase) window.initSupabase();
    return window.BisbamDB;
  }

  /* ============ LOGIN PAGE ============ */
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

      const { error } = await client.auth.signInWithPassword({ email, password });

      btn.textContent = originalText;
      btn.disabled = false;

      if (error) {
        errEl.hidden = false;
        errEl.textContent = error.message || 'Login failed.';
        return;
      }

      window.location.href = 'index.html';
    });
  }

  /* ============ PROTECT ADMIN PAGES ============ */
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

  /* ============ LOGOUT ============ */
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (!confirm('Log out of admin?')) return;
      const client = db();
      await client.auth.signOut();
      window.location.href = 'login.html';
    });
  }

  if (isLoginPage) return;

  /* ============ FETCH ALL DATA ============ */
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
      // Reset image picker if closing product modal
      if (modal && modal.id === 'productModal') {
        window.BISBAM_PENDING_IMAGES = [];
        renderImagePreviews();
      }
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

  /* ============ PRODUCTS TABLE ============ */
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

    body.innerHTML = list.map(p => {
      const imgSrc = p.image && p.image.startsWith('http') ? p.image : '../' + p.image;
      return `
        <tr>
          <td><img src="${imgSrc}" alt="" style="width:48px;height:60px;object-fit:cover;border-radius:6px;"></td>
          <td>${p.name}</td>
          <td>${p.category || '—'}</td>
          <td>${naira(p.retail_price || p.price)}</td>
          <td>${p.wholesale_price ? naira(p.wholesale_price) : '—'}</td>
          <td>${p.stock}</td>
          <td>${p.stock === 0 ? 'Out' : 'In Stock'}</td>
          <td>
            <button class="btn btn-small btn-outline edit-product" data-id="${p.id}">Edit</button>
            <button class="btn btn-small btn-outline delete-product" data-id="${p.id}" style="color:#b00020;border-color:#b00020;">Del</button>
          </td>
        </tr>
      `;
    }).join('');
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

  /* ============ CHECKBOXES ============ */
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

  function setChecked(containerId, values) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.querySelectorAll('input').forEach(i => {
      i.checked = (values || []).includes(i.value);
    });
  }

  /* ============ IMAGE PICKER ============ */
  function renderImagePreviews() {
    const grid = document.getElementById('imagePreviewGrid');
    const note = document.getElementById('imageCountNote');
    if (!grid) return;

    grid.innerHTML = (window.BISBAM_PENDING_IMAGES || []).map((file, i) => `
      <div class="image-preview-item">
        <img src="${URL.createObjectURL(file)}" alt="Preview ${i + 1}">
        <button type="button" class="image-preview-remove" data-index="${i}">×</button>
      </div>
    `).join('');

    if (note) {
      const n = window.BISBAM_PENDING_IMAGES.length;
      note.textContent = n + ' image' + (n === 1 ? '' : 's') + ' selected';
    }

    grid.querySelectorAll('.image-preview-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.index, 10);
        window.BISBAM_PENDING_IMAGES.splice(i, 1);
        renderImagePreviews();
      });
    });
  }

  const addImageBtn = document.getElementById('addImageBtn');
  const imageInput = document.getElementById('pImages');

  if (addImageBtn && imageInput) {
    addImageBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (file.size > 500 * 1024) {
        alert('"' + file.name + '" is over 500KB. Please compress it first.');
        imageInput.value = '';
        return;
      }

      window.BISBAM_PENDING_IMAGES.push(file);
      imageInput.value = '';
      renderImagePreviews();
    });
  }

  // PART 2 continues below...
    /* =========================================================
     PART 2
     ========================================================= */

  /* ============ OPEN EDIT MODAL ============ */
  function openEditModal(product) {
    editingProductId = product.id;
    window.BISBAM_PENDING_IMAGES = [];

    const form = document.getElementById('productForm');
    form.querySelector('#pName').value = product.name || '';
    form.querySelector('#pDescription').value = product.description || '';
    form.querySelector('#pCategory').value = product.category || '';
    form.querySelector('#pTags').value = (product.tags || []).join(', ');

    form.querySelector('#pRetailPrice').value = product.retail_price || 0;
    form.querySelector('#pWholesalePrice').value = product.wholesale_price || '';
    form.querySelector('#pSalePrice').value = product.sale_price || '';

    form.querySelector('#pStock').value = product.stock || 0;
    form.querySelector('#pLowStockThreshold').value = 3;
    form.querySelector('#pAvailability').value = product.availability || 'in';

    setChecked('lengthCheckboxes', product.lengths || []);
    setChecked('textureCheckboxes', product.textures || []);
    setChecked('colorCheckboxes', product.colors || []);
    setChecked('densityCheckboxes', product.densities || []);

    form.querySelector('#pLaceType').value = product.lace_type || '';
    form.querySelector('#pCapSize').value = product.cap_size || '';

    form.querySelector('#pFeatured').checked = !!product.featured;
    form.querySelector('#pWholesaleAvailable').checked = !!product.wholesale_available;

    renderImagePreviews();

    document.getElementById('productModalTitle').textContent = 'Edit Product';
    openModal('productModal');
  }

  /* ============ UPLOAD HELPERS ============ */
  async function uploadImages(client, files) {
    const uploaded = [];
    for (const file of files) {
      if (file.size > 500 * 1024) throw new Error(`"${file.name}" over 500KB.`);
      const ext = file.name.split('.').pop().toLowerCase();
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const filepath = `products/${filename}`;
      const { error } = await client.storage.from('Product-images').upload(filepath, file, {
        cacheControl: '31536000', upsert: false
      });
      if (error) throw error;
      const { data: pub } = client.storage.from('Product-images').getPublicUrl(filepath);
      if (pub && pub.publicUrl) uploaded.push(pub.publicUrl);
    }
    return uploaded;
  }

  async function uploadVideo(client, file) {
    if (file.size > 15 * 1024 * 1024) throw new Error('Video is over 15MB.');
    const ext = file.name.split('.').pop().toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const filepath = `videos/${filename}`;
    const { error } = await client.storage.from('Product-videos').upload(filepath, file, {
      cacheControl: '31536000', upsert: false
    });
    if (error) throw error;
    const { data: pub } = client.storage.from('Product-videos').getPublicUrl(filepath);
    return pub ? pub.publicUrl : null;
  }

  /* ============ CREATE / UPDATE PRODUCT ============ */
  async function handleProductSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const client = db();
    if (!client) return alert('Not connected to database.');

    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;

    try {
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

      const files = window.BISBAM_PENDING_IMAGES || [];

      const videoInput = form.querySelector('#pVideo');
      const videoFile = videoInput && videoInput.files[0] ? videoInput.files[0] : null;

      const current = editingProductId
        ? ((window.BisbamAdminData || {}).products || []).find(p => p.id === editingProductId)
        : null;

      let images = current && current.images && current.images.length
        ? current.images
        : ['assets/images/products/placeholder.jpg'];

      let videoUrl = current ? current.video_url : null;

      btn.textContent = 'Uploading…';
      btn.disabled = true;

      if (files.length > 0) {
        const uploaded = await uploadImages(client, files);
        if (uploaded.length) images = uploaded;
      }

      if (videoFile) {
        const url = await uploadVideo(client, videoFile);
        if (url) videoUrl = url;
      }

      btn.textContent = 'Saving…';

      const payload = {
        name, description,
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
        video_url: videoUrl,
        featured,
        wholesale_available: wholesaleAvailable
      };

      if (editingProductId) {
        const { error } = await client
          .from('products')
          .update(payload)
          .eq('id', editingProductId);
        if (error) throw error;
        alert('Product updated.');
      } else {
        payload.slug = name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36);
        const { error } = await client.from('products').insert(payload);
        if (error) throw error;
        alert('Product added.');
      }

      form.reset();
      window.BISBAM_PENDING_IMAGES = [];
      renderImagePreviews();
      editingProductId = null;
      document.getElementById('productModalTitle').textContent = 'Add Product';

      const data = await fetchAll();
      window.BisbamAdminData = data;
      renderProductsTable(data.products);
      renderDashboardStats(data.orders, data.products);
      renderLowStock(data.products);

      closeModal('productModal');

    } catch (err) {
      console.error('Save error:', err);
      alert('Error: ' + (err.message || err));
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  /* ============ DELETE PRODUCT ============ */
  async function handleDelete(productId) {
    const data = window.BisbamAdminData || {};
    const product = (data.products || []).find(p => String(p.id) === String(productId));
    if (!product) return;

    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

    const client = db();
    if (!client) return alert('Not connected to database.');

    try {
      const imagesToDelete = (product.images || [])
        .filter(u => u.includes('/Product-images/'))
        .map(u => 'products/' + u.split('/Product-images/')[1]);

      if (imagesToDelete.length) {
        await client.storage.from('Product-images').remove(imagesToDelete);
      }

      if (product.video_url && product.video_url.includes('/Product-videos/')) {
        const videoPath = 'videos/' + product.video_url.split('/Product-videos/')[1];
        await client.storage.from('Product-videos').remove([videoPath]);
      }

      const { error } = await client.from('products').delete().eq('id', productId);
      if (error) throw error;

      alert('Product deleted.');

      const data2 = await fetchAll();
      window.BisbamAdminData = data2;
      renderProductsTable(data2.products);
      renderDashboardStats(data2.orders, data2.products);
      renderLowStock(data2.products);

    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting: ' + (err.message || err));
    }
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
    renderImagePreviews();

    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
      addProductBtn.addEventListener('click', () => {
        editingProductId = null;
        window.BISBAM_PENDING_IMAGES = [];
        document.getElementById('productForm').reset();
        document.getElementById('productModalTitle').textContent = 'Add Product';
        renderImagePreviews();
        openModal('productModal');
      });
    }

    const productForm = document.getElementById('productForm');
    if (productForm) {
      productForm.addEventListener('submit', handleProductSubmit);
    }
  }
  init();

  /* ============ EDIT / DELETE / ORDER CLICKS ============ */
  document.addEventListener('click', e => {
    const editBtn = e.target.closest('.edit-product');
    if (editBtn) {
      const data = window.BisbamAdminData || {};
      const product = (data.products || []).find(p => String(p.id) === editBtn.dataset.id);
      if (product) openEditModal(product);
      return;
    }

    const delBtn = e.target.closest('.delete-product');
    if (delBtn) {
      handleDelete(delBtn.dataset.id);
      return;
    }

    const viewBtn = e.target.closest('.view-order');
    if (viewBtn) {
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
      return;
    }
  });

  /* ============ CATEGORIES PAGE ============ */
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', () => openModal('categoryModal'));
  }

})();
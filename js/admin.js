/* =========================================================
   BISBAM HAIRS — admin.js (Part 1 of 4)
   ========================================================= */

(function () {
  'use strict';

  const localProducts = window.BISBAM_PRODUCTS || [];
  const localOrders = window.BISBAM_ORDERS || [];
  const localCustomers = window.BISBAM_CUSTOMERS || [];
  const localCategories = window.BISBAM_CATEGORIES || [];

  let editingProductId = null;
  let editingCategoryId = null;
  window.BISBAM_PENDING_IMAGES = [];
  window.BISBAM_PENDING_CATEGORY_IMAGE = null;
  window.BISBAM_SEEN_ORDERS = JSON.parse(localStorage.getItem('bisbam_seen_orders') || '[]');

  function naira(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG');
  }

  function db() {
    if (!window.BisbamDB && window.initSupabase) window.initSupabase();
    return window.BisbamDB;
  }

  /* ============ LOGIN ============ */
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

  /* ============ PROTECT ADMIN ============ */
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

  /* ============ FETCH ALL ============ */
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
          id: x.id, name: x.name, slug: x.slug, description: x.description,
          category: x.category_slug, tags: x.tags || [],
          price: x.sale_price || x.retail_price || 0,
          retail_price: x.retail_price, wholesale_price: x.wholesale_price,
          sale_price: x.sale_price, stock: x.stock, availability: x.availability,
          lengths: x.lengths || [], textures: x.textures || [],
          colors: x.colors || [], densities: x.densities || [],
          lace_type: x.lace_type, cap_size: x.cap_size,
          image: (x.images && x.images[0]) || 'assets/images/products/placeholder.jpg',
          images: x.images || [], video_url: x.video_url,
          featured: x.featured, wholesale_available: x.wholesale_available
        }));
      }

      if (!o.error && o.data) {
        result.orders = o.data.map(x => ({
          id: x.id,
          orderNumber: x.order_number || x.id,
          customerId: x.customer_id,
          customer: x.customer_name,
          phone: x.customer_phone,
          email: x.customer_email,
          address: x.delivery_address,
          city: x.city,
          items: x.items || [],
          subtotal: x.subtotal,
          deliveryFee: x.delivery_fee,
          total: x.total,
          payment: x.payment_method,
          status: x.status,
          date: (x.created_at || '').split('T')[0],
          createdAt: x.created_at,
          notes: x.notes
        }));
      }

      if (!c.error && c.data) {
        result.customers = c.data.map(x => ({
          id: x.id, name: x.name, phone: x.phone, email: x.email,
          city: x.city, address: x.address,
          orders: x.total_orders || 0,
          totalSpent: x.total_spent || 0,
          lastOrder: x.last_order_at ? x.last_order_at.split('T')[0] : '—',
          lastOrderFull: x.last_order_at
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
      if (modal && modal.id === 'productModal') {
        window.BISBAM_PENDING_IMAGES = [];
        renderImagePreviews();
      }
      if (modal && modal.id === 'categoryModal') {
        window.BISBAM_PENDING_CATEGORY_IMAGE = null;
        renderCategoryImagePreview();
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
        <td>${o.orderNumber}</td>
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

  /* ============ IMAGE PICKER (PRODUCT) ============ */
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

  /* ============ IMAGE PICKER (CATEGORY) ============ */
  function renderCategoryImagePreview() {
    const grid = document.getElementById('categoryImagePreview');
    const note = document.getElementById('categoryImageNote');
    if (!grid) return;

    const file = window.BISBAM_PENDING_CATEGORY_IMAGE;

    if (!file) {
      grid.innerHTML = '';
      if (note) note.textContent = 'No image selected';
      return;
    }

    grid.innerHTML = `
      <div class="image-preview-item">
        <img src="${URL.createObjectURL(file)}" alt="Category preview">
        <button type="button" class="image-preview-remove" id="removeCategoryImage">×</button>
      </div>
    `;

    if (note) note.textContent = '1 image selected';

    const removeBtn = document.getElementById('removeCategoryImage');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        window.BISBAM_PENDING_CATEGORY_IMAGE = null;
        renderCategoryImagePreview();
      });
    }
  }

  const addCategoryImageBtn = document.getElementById('addCategoryImageBtn');
  const categoryImageInput = document.getElementById('cImage');

  if (addCategoryImageBtn && categoryImageInput) {
    addCategoryImageBtn.addEventListener('click', () => categoryImageInput.click());
    categoryImageInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 500 * 1024) {
        alert('"' + file.name + '" is over 500KB. Please compress it first.');
        categoryImageInput.value = '';
        return;
      }
      window.BISBAM_PENDING_CATEGORY_IMAGE = file;
      categoryImageInput.value = '';
      renderCategoryImagePreview();
    });
  }

  /* ============ AUTO-SLUG ============ */
  const cNameInput = document.getElementById('cName');
  const cSlugInput = document.getElementById('cSlug');
  if (cNameInput && cSlugInput) {
    cNameInput.addEventListener('input', () => {
      if (!editingCategoryId) {
        cSlugInput.value = cNameInput.value.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
    });
  }

  // PART 2 continues below...
  /* =========================================================
   PART 2
   ========================================================= */

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

async function uploadCategoryImage(client, file) {
  if (file.size > 500 * 1024) throw new Error('Image over 500KB.');
  const ext = file.name.split('.').pop().toLowerCase();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const filepath = `categories/${filename}`;
  const { error } = await client.storage.from('Product-images').upload(filepath, file, {
    cacheControl: '31536000', upsert: false
  });
  if (error) throw error;
  const { data: pub } = client.storage.from('Product-images').getPublicUrl(filepath);
  return pub ? pub.publicUrl : null;
}

/* ============ PRODUCT SAVE ============ */
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
      name, description, category_slug: categorySlug, tags,
      retail_price: retailPrice, wholesale_price: wholesalePrice,
      sale_price: salePrice, stock, low_stock_threshold: lowStock,
      availability, lengths, textures, colors, densities,
      lace_type: laceType, cap_size: capSize, images,
      video_url: videoUrl, featured, wholesale_available: wholesaleAvailable
    };

    if (editingProductId) {
      const { error } = await client.from('products').update(payload).eq('id', editingProductId);
      if (error) throw error;
      alert('Product updated.');
    } else {
      payload.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36);
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

/* ============ PRODUCT EDIT ============ */
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

/* ============ PRODUCT DELETE ============ */
async function handleDelete(productId) {
  const data = window.BisbamAdminData || {};
  const product = (data.products || []).find(p => String(p.id) === String(productId));
  if (!product) return;
  if (!confirm(`Delete "${product.name}"?`)) return;

  const client = db();
  if (!client) return alert('Not connected.');

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

/* ============ CATEGORIES TABLE ============ */
function renderCategoriesTable(categories) {
  const body = document.getElementById('categoriesBody');
  if (!body) return;

  if (!categories || categories.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="admin-empty">No categories yet.</td></tr>`;
    return;
  }

  body.innerHTML = categories.map(c => {
    const imgSrc = c.image_url
      ? (c.image_url.startsWith('http') ? c.image_url : '../' + c.image_url)
      : '../assets/images/products/placeholder.jpg';
    return `
      <tr>
        <td><img src="${imgSrc}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px;"></td>
        <td>${c.name}</td>
        <td>${c.slug}</td>
        <td>${c.description || '—'}</td>
        <td>
          <button class="btn btn-small btn-outline edit-category" data-id="${c.id}">Edit</button>
          <button class="btn btn-small btn-outline delete-category" data-id="${c.id}" style="color:#b00020;border-color:#b00020;">Del</button>
        </td>
      </tr>
    `;
  }).join('');
}

/* ============ CATEGORY SAVE ============ */
async function handleCategorySubmit(e) {
  e.preventDefault();
  const form = e.target;
  const client = db();
  if (!client) return alert('Not connected.');

  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.textContent;

  try {
    const name = form.querySelector('#cName').value.trim();
    const slug = form.querySelector('#cSlug').value.trim();
    const description = form.querySelector('#cDescription').value.trim();

    const imageFile = window.BISBAM_PENDING_CATEGORY_IMAGE;

    const current = editingCategoryId
      ? ((window.BisbamAdminData || {}).categories || []).find(c => c.id === editingCategoryId)
      : null;

    let imageUrl = current ? current.image_url : null;

    btn.textContent = 'Saving…';
    btn.disabled = true;

    if (imageFile) {
      imageUrl = await uploadCategoryImage(client, imageFile);
    }

    const payload = { name, slug, description, image_url: imageUrl };

    if (editingCategoryId) {
      const { error } = await client.from('categories').update(payload).eq('id', editingCategoryId);
      if (error) throw error;
      alert('Category updated.');
    } else {
      const { error } = await client.from('categories').insert(payload);
      if (error) throw error;
      alert('Category added.');
    }

    form.reset();
    window.BISBAM_PENDING_CATEGORY_IMAGE = null;
    renderCategoryImagePreview();
    editingCategoryId = null;
    document.getElementById('categoryModalTitle').textContent = 'Add Category';

    const data = await fetchAll();
    window.BisbamAdminData = data;
    renderCategoriesTable(data.categories);
    fillCategoryDropdown(document.getElementById('pCategory'), data.categories);
    fillCategoryDropdown(document.getElementById('productCategoryFilter'), data.categories);

    closeModal('categoryModal');
  } catch (err) {
    console.error('Category save error:', err);
    alert('Error: ' + (err.message || err));
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

/* ============ CATEGORY EDIT ============ */
function openEditCategoryModal(category) {
  editingCategoryId = category.id;
  window.BISBAM_PENDING_CATEGORY_IMAGE = null;

  const form = document.getElementById('categoryForm');
  form.querySelector('#cName').value = category.name || '';
  form.querySelector('#cSlug').value = category.slug || '';
  form.querySelector('#cDescription').value = category.description || '';

  renderCategoryImagePreview();
  document.getElementById('categoryModalTitle').textContent = 'Edit Category';
  openModal('categoryModal');
}

/* ============ CATEGORY DELETE ============ */
async function handleDeleteCategory(categoryId) {
  const data = window.BisbamAdminData || {};
  const category = (data.categories || []).find(c => String(c.id) === String(categoryId));
  if (!category) return;
  if (!confirm(`Delete category "${category.name}"?`)) return;

  const client = db();
  if (!client) return alert('Not connected.');

  try {
    if (category.image_url && category.image_url.includes('/Product-images/')) {
      const path = 'categories/' + category.image_url.split('/Product-images/')[1];
      await client.storage.from('Product-images').remove([path]);
    }

    const { error } = await client.from('categories').delete().eq('id', categoryId);
    if (error) throw error;

    alert('Category deleted.');
    const data2 = await fetchAll();
    window.BisbamAdminData = data2;
    renderCategoriesTable(data2.categories);
    fillCategoryDropdown(document.getElementById('pCategory'), data2.categories);
    fillCategoryDropdown(document.getElementById('productCategoryFilter'), data2.categories);
  } catch (err) {
    console.error('Delete category error:', err);
    alert('Error: ' + (err.message || err));
  }
}

// PART 3 continues below...
/* =========================================================
   PART 3
   ========================================================= */

/* ============ ORDERS PAGE ============ */
let activeOrderStatus = 'all';
let orderSearchTerm = '';

function renderOrdersTable(orders) {
  const body = document.getElementById('ordersBody');
  if (!body) return;

  let list = orders.slice();

  if (activeOrderStatus !== 'all') {
    list = list.filter(o => o.status === activeOrderStatus);
  }

  if (orderSearchTerm) {
    const q = orderSearchTerm.toLowerCase();
    list = list.filter(o =>
      (o.orderNumber || '').toLowerCase().includes(q) ||
      (o.customer || '').toLowerCase().includes(q) ||
      (o.phone || '').includes(q)
    );
  }

  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="10" class="admin-empty">No orders match.</td></tr>`;
    return;
  }

  body.innerHTML = list.map(o => `
    <tr>
      <td>${o.orderNumber}</td>
      <td>${o.customer}</td>
      <td>${o.phone}</td>
      <td>${o.address}, ${o.city}</td>
      <td>${(o.items || []).length}</td>
      <td>${naira(o.total)}</td>
      <td>${o.payment}</td>
      <td><span class="status-badge status-${o.status}">${o.status}</span></td>
      <td>${o.date}</td>
      <td>
        <button class="btn btn-small btn-outline view-order" data-id="${o.id}">View</button>
        <button class="btn btn-small btn-outline delete-order" data-id="${o.id}" style="color:#b00020;border-color:#b00020;">Del</button>
      </td>
    </tr>
  `).join('');
}

function wireOrdersPage() {
  const tabs = document.querySelectorAll('.tab-btn');
  if (tabs.length) {
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeOrderStatus = btn.dataset.status || 'all';
        renderOrdersTable((window.BisbamAdminData || {}).orders || []);
      });
    });
  }

  const search = document.getElementById('orderSearch');
  if (search) {
    search.addEventListener('input', e => {
      orderSearchTerm = e.target.value.trim();
      renderOrdersTable((window.BisbamAdminData || {}).orders || []);
    });
  }
}

/* ============ ORDER DELETE ============ */
async function handleDeleteOrder(orderId) {
  const data = window.BisbamAdminData || {};
  const order = (data.orders || []).find(o => String(o.id) === String(orderId));
  if (!order) return;

  if (!confirm(`Delete order ${order.orderNumber}? This cannot be undone.`)) return;

  const client = db();
  if (!client) return alert('Not connected.');

  try {
    const { error } = await client.from('orders').delete().eq('id', orderId);
    if (error) throw error;

    alert('Order deleted.');

    const data2 = await fetchAll();
    window.BisbamAdminData = data2;
    renderOrdersTable(data2.orders);
    renderRecentOrders(data2.orders);
    renderDashboardStats(data2.orders, data2.products);
    renderBell();
  } catch (err) {
    console.error('Delete order error:', err);
    alert('Error deleting: ' + (err.message || err));
  }
}

/* ============ CUSTOMERS PAGE ============ */
let customerSearchTerm = '';

function renderCustomersTable(customers) {
  const body = document.getElementById('customersBody');
  if (!body) return;

  let list = customers.slice();

  if (customerSearchTerm) {
    const q = customerSearchTerm.toLowerCase();
    list = list.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  }

  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="8" class="admin-empty">No customers match.</td></tr>`;
    return;
  }

  body.innerHTML = list.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.phone}</td>
      <td>${c.email || '—'}</td>
      <td>${c.city || '—'}</td>
      <td>${c.orders}</td>
      <td>${naira(c.totalSpent)}</td>
      <td>${c.lastOrder}</td>
      <td>
        <button class="btn btn-small btn-outline view-customer" data-id="${c.id}">View</button>
        <button class="btn btn-small btn-outline delete-customer" data-id="${c.id}" style="color:#b00020;border-color:#b00020;">Del</button>
      </td>
    </tr>
  `).join('');
}

function wireCustomersPage() {
  const search = document.getElementById('customerSearch');
  if (search) {
    search.addEventListener('input', e => {
      customerSearchTerm = e.target.value.trim();
      renderCustomersTable((window.BisbamAdminData || {}).customers || []);
    });
  }
}

/* ============ CUSTOMER DETAIL MODAL ============ */
function openCustomerModal(customerId) {
  const data = window.BisbamAdminData || {};
  const c = (data.customers || []).find(x => String(x.id) === String(customerId));
  if (!c) return;

  const body = document.getElementById('customerModalBody');
  if (!body) return;

  const customerOrders = (data.orders || []).filter(o => String(o.customerId) === String(customerId));

  let ordersHtml = '';
  if (customerOrders.length === 0) {
    ordersHtml = `<p style="color:var(--grey);font-size:0.9rem;">No orders on record.</p>`;
  } else {
    ordersHtml = customerOrders.map(o => `
      <div style="padding:10px 0;border-bottom:1px solid var(--pink-border);">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <strong>${o.orderNumber}</strong>
          <span class="status-badge status-${o.status}">${o.status}</span>
        </div>
        <div style="font-size:0.85rem;color:var(--grey);">
          ${o.date} · ${(o.items || []).length} item${(o.items || []).length === 1 ? '' : 's'} · ${naira(o.total)}
        </div>
      </div>
    `).join('');
  }

  body.innerHTML = `
    <p><strong>Name:</strong> ${c.name}</p>
    <p><strong>Phone:</strong> ${c.phone}</p>
    ${c.email ? `<p><strong>Email:</strong> ${c.email}</p>` : ''}
    ${c.city ? `<p><strong>City:</strong> ${c.city}</p>` : ''}
    ${c.address ? `<p><strong>Address:</strong> ${c.address}</p>` : ''}
    <hr style="margin:16px 0;border:none;border-top:1px solid var(--pink-border);">
    <p><strong>Total Orders:</strong> ${c.orders}</p>
    <p><strong>Total Spent:</strong> ${naira(c.totalSpent)}</p>
    <p><strong>Last Order:</strong> ${c.lastOrder}</p>
    <hr style="margin:16px 0;border:none;border-top:1px solid var(--pink-border);">
    <p><strong>Order History</strong></p>
    ${ordersHtml}
  `;

  openModal('customerModal');
}

/* ============ CUSTOMER DELETE ============ */
async function handleDeleteCustomer(customerId) {
  const data = window.BisbamAdminData || {};
  const customer = (data.customers || []).find(c => String(c.id) === String(customerId));
  if (!customer) return;

  if (!confirm(`Delete customer "${customer.name}"? Their orders will be kept but unlinked.`)) return;

  const client = db();
  if (!client) return alert('Not connected.');

  try {
    // Step 1: Unlink orders (set customer_id = null)
    await client.from('orders').update({ customer_id: null }).eq('customer_id', customerId);

    // Step 2: Delete customer row
    const { error } = await client.from('customers').delete().eq('id', customerId);
    if (error) throw error;

    alert('Customer deleted.');

    const data2 = await fetchAll();
    window.BisbamAdminData = data2;
    renderCustomersTable(data2.customers);
  } catch (err) {
    console.error('Delete customer error:', err);
    alert('Error: ' + (err.message || err));
  }
}

/* ============ SETTINGS LOAD ============ */
async function loadSettings() {
  const form = document.getElementById('settingsForm');
  if (!form) return;

  const client = db();
  if (!client) return;

  const { data, error } = await client
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) return;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== null && val !== undefined) el.value = val;
  };

  set('sBrandName', data.brand_name);
  set('sTagline', data.tagline);
  set('sDescription', data.description);
  set('sWhatsApp', data.whatsapp);
  set('sAddress', data.address);
  set('sHours', data.hours);
  set('sInstagram', data.instagram);
  set('sTikTok', data.tiktok);
  set('sBankName', data.bank_name);
  set('sAccountName', data.account_name);
  set('sAccountNumber', data.account_number);
  set('sDeliveryInfo', data.delivery_info);
  set('sDeliveryFee', data.delivery_fee);

  const notifyEmail = document.getElementById('sNotifyEmail');
  const notifyWA = document.getElementById('sNotifyWhatsApp');
  if (notifyEmail) notifyEmail.checked = !!data.notify_email;
  if (notifyWA) notifyWA.checked = !!data.notify_whatsapp;
}

/* ============ SETTINGS SAVE ============ */
async function handleSettingsSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const client = db();
  if (!client) return alert('Not connected.');

  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.textContent = 'Saving…';
  btn.disabled = true;

  const get = (id) => (document.getElementById(id)?.value || '').trim();

  const payload = {
    brand_name: get('sBrandName'),
    tagline: get('sTagline'),
    description: get('sDescription'),
    whatsapp: get('sWhatsApp'),
    address: get('sAddress'),
    hours: get('sHours'),
    instagram: get('sInstagram'),
    tiktok: get('sTikTok'),
    bank_name: get('sBankName'),
    account_name: get('sAccountName'),
    account_number: get('sAccountNumber'),
    delivery_info: get('sDeliveryInfo'),
    delivery_fee: Number(get('sDeliveryFee')) || 0,
    notify_email: document.getElementById('sNotifyEmail')?.checked || false,
    notify_whatsapp: document.getElementById('sNotifyWhatsApp')?.checked || false
  };

  try {
    const { error } = await client
      .from('settings')
      .upsert({ id: 1, ...payload }, { onConflict: 'id' });

    if (error) throw error;
    alert('Settings saved.');
  } catch (err) {
    console.error('Settings save error:', err);
    alert('Error: ' + (err.message || err));
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */
function injectBell() {
  const headerActions = document.querySelector('.admin-header-actions');
  if (!headerActions) return;
  if (document.getElementById('adminBellWrap')) return;

  const wrap = document.createElement('div');
  wrap.className = 'admin-bell-wrap';
  wrap.id = 'adminBellWrap';
  wrap.innerHTML = `
    <button type="button" class="admin-bell" id="adminBellBtn" aria-label="Notifications">
      <svg viewBox="0 0 24 24">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      <span class="admin-bell-count" id="adminBellCount">0</span>
    </button>
    <div class="admin-bell-panel" id="adminBellPanel" hidden>
      <div class="admin-bell-panel-header">
        New Orders
        <span id="adminBellMarkSeen" style="cursor:pointer;text-decoration:underline;">Mark all read</span>
      </div>
      <div class="admin-bell-panel-body" id="adminBellBody">
        <div class="admin-bell-empty">No new orders.</div>
      </div>
    </div>
  `;
  headerActions.insertBefore(wrap, headerActions.firstChild);

  const btn = document.getElementById('adminBellBtn');
  const panel = document.getElementById('adminBellPanel');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) panel.hidden = true;
  });

  const markSeen = document.getElementById('adminBellMarkSeen');
  if (markSeen) {
    markSeen.addEventListener('click', () => {
      const orders = (window.BisbamAdminData || {}).orders || [];
      window.BISBAM_SEEN_ORDERS = orders.map(o => o.id);
      localStorage.setItem('bisbam_seen_orders', JSON.stringify(window.BISBAM_SEEN_ORDERS));
      renderBell();
    });
  }
}

function renderBell() {
  const orders = (window.BisbamAdminData || {}).orders || [];
  const unseen = orders.filter(o => !window.BISBAM_SEEN_ORDERS.includes(o.id));

  const countEl = document.getElementById('adminBellCount');
  const bodyEl = document.getElementById('adminBellBody');

  if (countEl) {
    countEl.textContent = unseen.length;
    if (unseen.length > 0) countEl.classList.add('is-visible');
    else countEl.classList.remove('is-visible');
  }

  if (bodyEl) {
    if (unseen.length === 0) {
      bodyEl.innerHTML = `<div class="admin-bell-empty">No new orders.</div>`;
    } else {
      bodyEl.innerHTML = unseen.slice(0, 10).map(o => `
        <a class="admin-bell-item" href="orders.html">
          <div class="admin-bell-item-title">${o.orderNumber}</div>
          <div class="admin-bell-item-meta">${o.customer} · ${naira(o.total)} · ${o.date}</div>
        </a>
      `).join('');
    }
  }
}

// PART 4 continues below...
  /* =========================================================
     PART 4 — FINAL
     ========================================================= */

  function showToast(order) {
    const old = document.getElementById('adminToast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.className = 'admin-toast';
    toast.id = 'adminToast';
    toast.innerHTML = `
      <div class="admin-toast-title">🔔 New Order</div>
      <div class="admin-toast-body">${order.customer} — ${naira(order.total)}</div>
      <div class="admin-toast-meta">${order.orderNumber}</div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('is-visible'), 50);

    toast.addEventListener('click', () => {
      window.location.href = 'orders.html';
    });

    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 400);
    }, 8000);
  }

  function startRealtime() {
    const client = db();
    if (!client) return;

    client
      .channel('public:orders')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          const data = await fetchAll();
          window.BisbamAdminData = data;

          renderDashboardStats(data.orders, data.products);
          renderRecentOrders(data.orders);
          renderOrdersTable(data.orders);
          renderCustomersTable(data.customers);
          renderBell();

          showToast({
            customer: payload.new.customer_name || 'Customer',
            total: payload.new.total || 0,
            orderNumber: payload.new.order_number || 'New order'
          });
        }
      )
      .subscribe();
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
    renderCategoriesTable(data.categories);
    renderOrdersTable(data.orders);
    renderCustomersTable(data.customers);
    wireProductsPageFilters();
    wireOrdersPage();
    wireCustomersPage();
    renderImagePreviews();
    renderCategoryImagePreview();

    injectBell();
    renderBell();

    await loadSettings();
    startRealtime();

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
    if (productForm) productForm.addEventListener('submit', handleProductSubmit);

    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
      addCategoryBtn.addEventListener('click', () => {
        editingCategoryId = null;
        window.BISBAM_PENDING_CATEGORY_IMAGE = null;
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryModalTitle').textContent = 'Add Category';
        renderCategoryImagePreview();
        openModal('categoryModal');
      });
    }

    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) categoryForm.addEventListener('submit', handleCategorySubmit);

    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) settingsForm.addEventListener('submit', handleSettingsSubmit);
  }
  init();

  /* ============ GLOBAL CLICKS ============ */
  document.addEventListener('click', e => {
    const editProduct = e.target.closest('.edit-product');
    if (editProduct) {
      const data = window.BisbamAdminData || {};
      const product = (data.products || []).find(p => String(p.id) === editProduct.dataset.id);
      if (product) openEditModal(product);
      return;
    }

    const delProduct = e.target.closest('.delete-product');
    if (delProduct) {
      handleDelete(delProduct.dataset.id);
      return;
    }

    const editCategory = e.target.closest('.edit-category');
    if (editCategory) {
      const data = window.BisbamAdminData || {};
      const category = (data.categories || []).find(c => String(c.id) === editCategory.dataset.id);
      if (category) openEditCategoryModal(category);
      return;
    }

    const delCategory = e.target.closest('.delete-category');
    if (delCategory) {
      handleDeleteCategory(delCategory.dataset.id);
      return;
    }

    const delOrder = e.target.closest('.delete-order');
    if (delOrder) {
      handleDeleteOrder(delOrder.dataset.id);
      return;
    }

    const delCustomer = e.target.closest('.delete-customer');
    if (delCustomer) {
      handleDeleteCustomer(delCustomer.dataset.id);
      return;
    }

    const viewCustomer = e.target.closest('.view-customer');
    if (viewCustomer) {
      openCustomerModal(viewCustomer.dataset.id);
      return;
    }

    const viewOrder = e.target.closest('.view-order');
    if (viewOrder) {
      const data = window.BisbamAdminData || {};
      const order = (data.orders || []).find(o => String(o.id) === viewOrder.dataset.id);
      if (!order) return;

      const body = document.getElementById('orderModalBody');
      if (!body) return;

      const itemLines = (order.items || []).map(i => {
        const variant = [i.length && `${i.length}"`, i.texture, i.color, i.density]
          .filter(Boolean).join(' · ');
        return `<p>${i.name}${variant ? ` (${variant})` : ''} × ${i.qty} — ${naira(i.price * i.qty)}</p>`;
      }).join('');

      body.innerHTML = `
        <p><strong>Order:</strong> ${order.orderNumber}</p>
        <p><strong>Customer:</strong> ${order.customer}</p>
        <p><strong>Phone:</strong> ${order.phone}</p>
        ${order.email ? `<p><strong>Email:</strong> ${order.email}</p>` : ''}
        <p><strong>Address:</strong> ${order.address}, ${order.city}</p>
        <p><strong>Payment:</strong> ${order.payment}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Date:</strong> ${order.date}</p>
        <hr style="margin:16px 0;border:none;border-top:1px solid var(--pink-border);">
        <p><strong>Items:</strong></p>
        ${itemLines}
        <hr style="margin:16px 0;border:none;border-top:1px solid var(--pink-border);">
        <p><strong>Subtotal:</strong> ${naira(order.subtotal || 0)}</p>
        ${order.deliveryFee ? `<p><strong>Delivery:</strong> ${naira(order.deliveryFee)}</p>` : ''}
        <p><strong>Total:</strong> ${naira(order.total)}</p>
        ${order.notes ? `<hr style="margin:16px 0;border:none;border-top:1px solid var(--pink-border);"><p><strong>Notes:</strong> ${order.notes}</p>` : ''}
        <hr style="margin:16px 0;border:none;border-top:1px solid var(--pink-border);">
        <p><strong>Change Status:</strong></p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
          <button class="btn btn-small btn-outline update-order-status" data-id="${order.id}" data-status="pending">Pending</button>
          <button class="btn btn-small btn-outline update-order-status" data-id="${order.id}" data-status="confirmed">Confirmed</button>
          <button class="btn btn-small btn-outline update-order-status" data-id="${order.id}" data-status="delivered">Delivered</button>
          <button class="btn btn-small btn-outline update-order-status" data-id="${order.id}" data-status="cancelled">Cancelled</button>
        </div>
      `;
      openModal('orderModal');
      return;
    }

    const updateStatus = e.target.closest('.update-order-status');
    if (updateStatus) {
      const id = updateStatus.dataset.id;
      const status = updateStatus.dataset.status;
      const client = db();
      if (!client) return;

      (async () => {
        const { error } = await client.from('orders').update({ status }).eq('id', id);
        if (error) {
          alert('Error: ' + error.message);
          return;
        }
        alert('Order marked as ' + status + '.');

        const data = await fetchAll();
        window.BisbamAdminData = data;
        renderOrdersTable(data.orders);
        renderRecentOrders(data.orders);
        renderDashboardStats(data.orders, data.products);
        closeModal('orderModal');
      })();
      return;
    }
  });

})();
/* =========================================================
   BISBAM HAIRS — admin.js
   Admin dashboard: modals, tabs, table rendering, login.
   Uses placeholder data. Will be wired to Supabase later.
   ========================================================= */

(function () {
  'use strict';

  const products = window.BISBAM_PRODUCTS || [];
  const orders = window.BISBAM_ORDERS || [];
  const customers = window.BISBAM_CUSTOMERS || [];

  function naira(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG');
  }

  /* ============ SIDEBAR ACTIVE STATE ============ */
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.admin-sidebar nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path) a.classList.add('active');
    else a.classList.remove('active');
  });

  /* ============ MODAL HELPERS ============ */
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.hidden = false;
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.hidden = true;
  }

  // Wire all close buttons + overlays
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', () => {
      const modal = el.closest('.admin-modal');
      if (modal) modal.hidden = true;
    });
  });

  /* ============ DASHBOARD STATS ============ */
  function renderDashboardStats() {
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
  renderDashboardStats();

  /* ============ RECENT ORDERS TABLE (dashboard) ============ */
  const recentOrdersBody = document.getElementById('recentOrdersBody');
  if (recentOrdersBody) {
    if (orders.length === 0) {
      recentOrdersBody.innerHTML = `<tr><td colspan="8" class="admin-empty">No orders yet.</td></tr>`;
    } else {
      recentOrdersBody.innerHTML = orders.slice(0, 5).map(o => `
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
  }

  /* ============ LOW STOCK TABLE (dashboard) ============ */
  const lowStockBody = document.getElementById('lowStockBody');
  if (lowStockBody) {
    const low = products.filter(p => (p.stock || 0) <= 3);
    if (low.length === 0) {
      lowStockBody.innerHTML = `<tr><td colspan="5" class="admin-empty">No low-stock products.</td></tr>`;
    } else {
      lowStockBody.innerHTML = low.map(p => `
        <tr>
          <td>${p.name}</td>
          <td>${p.category}</td>
          <td>${p.stock}</td>
          <td>${p.stock === 0 ? 'Out of Stock' : 'Low'}</td>
          <td><a href="products.html" class="btn btn-small btn-outline">Edit</a></td>
        </tr>
      `).join('');
    }
  }

  /* ============ ORDERS PAGE ============ */
  const ordersBody = document.getElementById('ordersBody');
  if (ordersBody) {
    let activeStatus = 'all';
    let searchTerm = '';

    function renderOrders() {
      let list = orders.slice();

      if (activeStatus !== 'all') {
        list = list.filter(o => o.status === activeStatus);
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        list = list.filter(o =>
          o.id.toLowerCase().includes(q) ||
          o.customer.toLowerCase().includes(q) ||
          o.phone.includes(q)
        );
      }

      if (list.length === 0) {
        ordersBody.innerHTML = `<tr><td colspan="10" class="admin-empty">No orders match.</td></tr>`;
        return;
      }

      ordersBody.innerHTML = list.map(o => `
        <tr>
          <td>${o.id}</td>
          <td>${o.customer}</td>
          <td>${o.phone}</td>
          <td>${o.address}, ${o.city}</td>
          <td>${(o.items || []).length}</td>
          <td>${naira(o.total)}</td>
          <td>${o.payment}</td>
          <td><span class="status-badge status-${o.status}">${o.status}</span></td>
          <td>${o.date}</td>
          <td><button class="btn btn-small btn-outline view-order" data-id="${o.id}">View</button></td>
        </tr>
      `).join('');
    }
    renderOrders();

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeStatus = btn.dataset.status || 'all';
        renderOrders();
      });
    });

    // Search
    const orderSearch = document.getElementById('orderSearch');
    if (orderSearch) {
      orderSearch.addEventListener('input', e => {
        searchTerm = e.target.value.trim();
        renderOrders();
      });
    }
  }

  /* ============ ORDER MODAL ============ */
  document.addEventListener('click', e => {
    const viewBtn = e.target.closest('.view-order');
    if (!viewBtn) return;

    const order = orders.find(o => o.id === viewBtn.dataset.id);
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

  /* ============ PRODUCTS PAGE ============ */
  const productsBody = document.getElementById('productsBody');
  if (productsBody) {
    productsBody.innerHTML = products.length === 0
      ? `<tr><td colspan="8" class="admin-empty">No products yet.</td></tr>`
      : products.map(p => `
        <tr>
      <td><img src="../${p.image}" alt="" style="width:48px;height:60px;object-fit:cover;border-radius:6px;"></td>
          <td>${p.name}</td>
          <td>${p.category}</td>
          <td>${naira(p.price)}</td>
          <td>—</td>
          <td>${p.stock}</td>
          <td>${p.stock === 0 ? 'Out' : 'In Stock'}</td>
          <td><button class="btn btn-small btn-outline">Edit</button></td>
        </tr>
      `).join('');

    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
      addProductBtn.addEventListener('click', () => openModal('productModal'));
    }
  }

  /* ============ CATEGORIES PAGE ============ */
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', () => openModal('categoryModal'));
  }

  /* ============ CUSTOMERS PAGE ============ */
  const customersBody = document.getElementById('customersBody');
  if (customersBody) {
    customersBody.innerHTML = customers.length === 0
      ? `<tr><td colspan="8" class="admin-empty">No customers yet.</td></tr>`
      : customers.map(c => `
        <tr>
          <td>${c.name}</td>
          <td>${c.phone}</td>
          <td>${c.email || '—'}</td>
          <td>${c.city}</td>
          <td>${c.orders}</td>
          <td>${naira(c.totalSpent)}</td>
          <td>${c.lastOrder}</td>
          <td><button class="btn btn-small btn-outline">View</button></td>
        </tr>
      `).join('');
  }

  /* ============ LOGIN PAGE ============ */
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const errEl = document.getElementById('adminLoginError');
      // Placeholder — real auth comes with Supabase
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = 'Login will be enabled once Supabase is connected.';
      }
    });
  }

})();
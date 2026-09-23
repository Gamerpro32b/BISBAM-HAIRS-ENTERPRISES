/* =========================================================
   BISBAM HAIRS — orders-page.js
   Fetches logged-in user's orders, renders cards + modal.
   ========================================================= */

(function () {
  'use strict';

  function db() {
    if (!window.BisbamDB && window.initSupabase) window.initSupabase();
    return window.BisbamDB;
  }

  function naira(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return iso;
    }
  }

  const loading = document.getElementById('ordersLoading');
  const list = document.getElementById('ordersList');
  const modal = document.getElementById('orderModal');
  const modalBody = document.getElementById('orderModalBody');

  /* ============ INIT ============ */
  async function init() {
    const client = db();
    if (!client) {
      window.location.href = 'auth.html';
      return;
    }

    const { data: sessionData } = await client.auth.getSession();

    if (!sessionData || !sessionData.session) {
      window.location.href = 'auth.html';
      return;
    }

    const user = sessionData.session.user;
    const email = user.email || '';

    if (!email) {
      renderEmpty();
      return;
    }

    try {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .eq('customer_email', email)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const orders = data || [];

      if (orders.length === 0) {
        renderEmpty();
        return;
      }

      renderOrders(orders);
    } catch (err) {
      console.warn('Orders fetch error:', err);
      renderEmpty();
    }
  }

  /* ============ EMPTY ============ */
  function renderEmpty() {
    if (loading) loading.style.display = 'none';
    if (!list) return;

    list.innerHTML = `
      <div class="orders-empty">
        <svg class="orders-empty-icon" viewBox="0 0 24 24">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <path d="M3 6h18"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <h2>No orders yet</h2>
        <p>You haven't placed any orders yet.</p>
        <a href="shop.html" class="btn btn-primary">Start Shopping</a>
      </div>
    `;
  }

  /* ============ RENDER ORDERS ============ */
  function renderOrders(orders) {
    if (loading) loading.style.display = 'none';
    if (!list) return;

    list.innerHTML = orders.map(order => {
      const itemCount = (order.items || []).reduce((s, i) => s + (i.qty || 1), 0);
      const status = order.status || 'pending';
      const orderNumber = order.order_number || order.id;
      const date = formatDate(order.created_at);
      const total = naira(order.total || 0);

      return `
        <div class="order-card" data-order-id="${order.id}">
          <div class="order-card-header">
            <div>
              <p class="order-card-id">${orderNumber}</p>
              <p class="order-card-date">${date}</p>
            </div>
            <span class="status-pill status-${status}">${status}</span>
          </div>

          <p class="order-card-summary">
            <strong>${itemCount}</strong> item${itemCount === 1 ? '' : 's'}
          </p>

          <div class="order-card-footer">
            <span class="order-card-total">${total}</span>
            <button type="button" class="order-card-btn" data-view-order="${order.id}">View Details</button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click handlers
    list.querySelectorAll('[data-view-order]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-view-order');
        const order = orders.find(o => String(o.id) === String(id));
        if (order) openOrderModal(order);
      });
    });
  }

  /* ============ MODAL ============ */
  function openOrderModal(order) {
    if (!modal || !modalBody) return;

    const orderNumber = order.order_number || order.id;
    const date = formatDate(order.created_at);
    const status = order.status || 'pending';

    const itemsHtml = (order.items || []).map(i => {
      const variant = [i.length && `${i.length}"`, i.texture, i.color, i.density]
        .filter(Boolean).join(' · ');
      return `
        <div class="order-item-line">
          ${i.name} × ${i.qty}
          ${variant ? `<span class="order-item-variant">${variant}</span>` : ''}
          <span style="float:right;color:var(--pink-deep);font-weight:600;">
            ${naira((i.price || 0) * (i.qty || 1))}
          </span>
        </div>
      `;
    }).join('');

    modalBody.innerHTML = `
      <p class="order-detail-row"><strong>Order #:</strong> ${orderNumber}</p>
      <p class="order-detail-row"><strong>Date:</strong> ${date}</p>
      <p class="order-detail-row"><strong>Status:</strong>
        <span class="status-pill status-${status}">${status}</span>
      </p>
      <hr style="margin:16px 0;border:none;border-top:1px solid var(--pink-border);">
      <p class="order-detail-row"><strong>Items</strong></p>
      <div class="order-items-list">${itemsHtml}</div>
      <hr style="margin:16px 0;border:none;border-top:1px solid var(--pink-border);">
      <p class="order-detail-row"><strong>Subtotal:</strong> ${naira(order.subtotal || 0)}</p>
      ${order.delivery_fee ? `<p class="order-detail-row"><strong>Delivery:</strong> ${naira(order.delivery_fee)}</p>` : ''}
      <p class="order-detail-row" style="font-size:1.05rem;">
        <strong>Total:</strong> <span style="color:var(--pink-deep);font-weight:700;">${naira(order.total || 0)}</span>
      </p>
      ${order.notes ? `<hr style="margin:16px 0;border:none;border-top:1px solid var(--pink-border);"><p class="order-detail-row"><strong>Notes:</strong> ${order.notes}</p>` : ''}
      <div style="margin-top:20px;text-align:center;">
        <a href="https://wa.me/2348146108122?text=${encodeURIComponent('Hi Bisbam Hairs, about order ' + orderNumber)}"
           target="_blank" rel="noopener"
           class="btn btn-outline btn-small">
           Message us about this order
        </a>
      </div>
    `;

    modal.hidden = false;
  }

  // Close modal handlers
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', () => {
      if (modal) modal.hidden = true;
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal) modal.hidden = true;
  });

  init();

})();
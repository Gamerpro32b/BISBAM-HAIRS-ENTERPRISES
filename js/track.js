/* =========================================================
   BISBAM HAIRS — track.js
   Customer enters order number → sees status.
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

  const input = document.getElementById('trackInput');
  const btn = document.getElementById('trackBtn');
  const result = document.getElementById('trackResult');

  if (!input || !btn || !result) return;

  /* ============ INIT — remember last order number ============ */
  const lastOrder = localStorage.getItem('bisbam_last_tracked');
  if (lastOrder) {
    input.value = lastOrder;
    trackOrder(lastOrder);
  }

  /* ============ EVENTS ============ */
  btn.addEventListener('click', () => {
    const val = input.value.trim().toUpperCase();
    if (!val) {
      input.focus();
      return;
    }
    trackOrder(val);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btn.click();
    }
  });

  /* ============ TRACK ============ */
  async function trackOrder(orderNumber) {
    const client = db();
    if (!client) return;

    // Loading state
    result.innerHTML = `<div class="track-loading">Looking up your order…</div>`;

    try {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        renderNotFound(orderNumber);
        return;
      }

      // Save for next time
      localStorage.setItem('bisbam_last_tracked', orderNumber);

      renderOrder(data);
    } catch (err) {
      console.error('Track error:', err);
      result.innerHTML = `<div class="track-loading">Could not load. Please try again.</div>`;
    }
  }

  /* ============ NOT FOUND ============ */
  function renderNotFound(orderNumber) {
    result.innerHTML = `
      <div class="track-error">
        <svg class="track-error-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4"/>
          <path d="M12 16h.01"/>
        </svg>
        <h2>Order not found</h2>
        <p>We couldn't find an order with the number "<strong>${orderNumber}</strong>". Please check and try again.</p>
        <a href="https://wa.me/2348146108122?text=${encodeURIComponent('Hi Bisbam Hairs, I need help with my order ' + orderNumber)}"
           target="_blank" rel="noopener"
           class="btn btn-primary">Message us on WhatsApp</a>
      </div>
    `;
  }

  /* ============ RENDER ORDER ============ */
  function renderOrder(order) {
    const orderNumber = order.order_number || order.id;
    const date = formatDate(order.created_at);
    const status = order.status || 'pending';

    // Determine step progress
    const isPlaced = true;
    const isConfirmed = status === 'confirmed' || status === 'delivered';
    const isDelivered = status === 'delivered';
    const isCancelled = status === 'cancelled';

    // Items
    const itemsHtml = (order.items || []).map(i => {
      const variant = [i.length && `${i.length}"`, i.texture, i.color, i.density]
        .filter(Boolean).join(' · ');
      return `
        <div class="track-item-line">
          <div>
            ${i.name} × ${i.qty}
            ${variant ? `<span class="track-item-variant">${variant}</span>` : ''}
          </div>
          <div class="track-item-price">${naira((i.price || 0) * (i.qty || 1))}</div>
        </div>
      `;
    }).join('');

    // Progress tracker (skip if cancelled)
    let progressHtml = '';
    if (isCancelled) {
      progressHtml = `
        <div class="track-progress">
          <p class="track-progress-title">Status</p>
          <div class="track-step is-done">
            <div class="track-step-dot" style="background:#FEE2E2;border-color:transparent;color:#991B1B;">✕</div>
            <p class="track-step-label" style="color:#991B1B;font-weight:600;">Order Cancelled</p>
          </div>
        </div>
      `;
    } else {
      progressHtml = `
        <div class="track-progress">
          <p class="track-progress-title">Progress</p>

          <div class="track-step ${isPlaced ? 'is-done' : ''}">
            <div class="track-step-dot"></div>
            <div>
              <p class="track-step-label">Order Placed</p>
              <span class="track-step-sub">We received your order</span>
            </div>
          </div>

          <div class="track-step ${isConfirmed ? 'is-done' : ''}">
            <div class="track-step-dot"></div>
            <div>
              <p class="track-step-label">Confirmed</p>
              <span class="track-step-sub">Payment confirmed, preparing your order</span>
            </div>
          </div>

          <div class="track-step ${isDelivered ? 'is-done' : ''}">
            <div class="track-step-dot"></div>
            <div>
              <p class="track-step-label">Delivered</p>
              <span class="track-step-sub">Your order has been delivered</span>
            </div>
          </div>

        </div>
      `;
    }

    result.innerHTML = `
      <div class="track-card">
        <div class="track-card-header">
          <div>
            <p class="track-order-id">${orderNumber}</p>
            <p class="track-order-date">Placed ${date}</p>
          </div>
          <span class="status-pill status-${status}">${status}</span>
        </div>

        ${progressHtml}

        <div class="track-items">
          <p class="track-items-title">Your Items</p>
          ${itemsHtml}
        </div>

        <div class="track-total">
          <span>Total</span>
          <span>${naira(order.total || 0)}</span>
        </div>

        <p class="track-help">
          Questions? <a href="https://wa.me/2348146108122?text=${encodeURIComponent('Hi Bisbam Hairs, about order ' + orderNumber)}" target="_blank" rel="noopener">Message us on WhatsApp</a>
        </p>
      </div>
    `;
  }

})();
/* =========================================================
   BISBAM HAIRS — cart.js
   Cart engine + checkout. Card + bank transfer via Korapay.
   ========================================================= */

(function () {
  'use strict';

  const KORAPAY_INIT_URL = 'https://tqcwmqqxzzsdfuxskayl.supabase.co/functions/v1/Korapay-init-';

  function getCart() {
    return JSON.parse(localStorage.getItem('bisbam_cart') || '[]');
  }

  function saveCart(cart) {
    localStorage.setItem('bisbam_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
  }

  function formatNaira(amount) {
    return '₦' + Number(amount || 0).toLocaleString('en-NG');
  }

  function cartTotal(cart) {
    return cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
  }

  function db() {
    if (!window.BisbamDB && window.initSupabase) window.initSupabase();
    return window.BisbamDB;
  }

  /* ============ ADD TO CART ============ */
  function addToCart(item) {
    const cart = getCart();
    const key = [item.id, item.length || '', item.texture || '', item.color || '', item.density || ''].join('|');
    const existing = cart.find(i => i.key === key);

    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      cart.push({ ...item, key, qty: item.qty || 1 });
    }
    saveCart(cart);
  }

  function removeFromCart(key) {
    let cart = getCart();
    cart = cart.filter(i => i.key !== key);
    saveCart(cart);
    renderCartPage();
  }

  function updateQty(key, qty) {
    const cart = getCart();
    const item = cart.find(i => i.key === key);
    if (item) {
      item.qty = Math.max(1, parseInt(qty, 10) || 1);
      saveCart(cart);
      renderCartPage();
    }
  }

  /* ============ PRODUCT PAGE ============ */
  const addBtn = document.getElementById('addToCartBtn');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      const length = document.getElementById('length')?.value || '';
      const texture = document.getElementById('texture')?.value || '';
      const color = document.getElementById('color')?.value || '';
      const density = document.getElementById('density')?.value || '';
      const qty = parseInt(document.getElementById('qty')?.value || '1', 10);

      const name = document.querySelector('.product-title')?.textContent.trim() || 'Product';
      const priceText = document.querySelector('.product-info .product-price')?.textContent || '₦0';
      const price = parseInt(priceText.replace(/[^\d]/g, ''), 10) || 0;
      const image = document.querySelector('.product-gallery-main img')?.getAttribute('src') || '';
      const id = name.toLowerCase().replace(/\s+/g, '-');

      addToCart({ id, name, price, image, length, texture, color, density, qty });

      addBtn.textContent = 'Added ✓';
      addBtn.disabled = true;
      setTimeout(() => {
        addBtn.textContent = 'Add to Cart';
        addBtn.disabled = false;
      }, 1500);
    });
  }

  /* ============ CART PAGE ============ */
  function renderCartPage() {
    const cartEmpty = document.getElementById('cartEmpty');
    const cartFilled = document.getElementById('cartFilled');
    const cartItemsEl = document.getElementById('cartItems');
    const subtotalEl = document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('cartTotal');

    if (!cartFilled) return;

    const cart = getCart();

    if (cart.length === 0) {
      if (cartEmpty) cartEmpty.style.display = '';
      cartFilled.style.display = 'none';
      return;
    }

    if (cartEmpty) cartEmpty.style.display = 'none';
    cartFilled.style.display = '';

    cartItemsEl.innerHTML = cart.map(item => {
      const variant = [item.length && `${item.length}"`, item.texture, item.color, item.density]
        .filter(Boolean).join(' · ');

      return `
        <div class="cart-item" data-key="${item.key}">
          <div class="cart-item-image">
            <img src="${item.image}" alt="${item.name}">
          </div>
          <div class="cart-item-info">
            <h3>${item.name}</h3>
            ${variant ? `<p>${variant}</p>` : ''}
            <p>Qty: <input type="number" class="cart-qty-input" value="${item.qty}" min="1" data-key="${item.key}"></p>
          </div>
          <div class="cart-item-actions">
            <span class="cart-item-price">${formatNaira(item.price * item.qty)}</span>
            <button class="cart-item-remove" data-key="${item.key}">Remove</button>
          </div>
        </div>
      `;
    }).join('');

    const subtotal = cartTotal(cart);
    if (subtotalEl) subtotalEl.textContent = formatNaira(subtotal);
    if (totalEl) totalEl.textContent = formatNaira(subtotal);

    cartItemsEl.querySelectorAll('.cart-qty-input').forEach(input => {
      input.addEventListener('change', e => {
        updateQty(e.target.dataset.key, e.target.value);
      });
    });

    cartItemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        removeFromCart(e.target.dataset.key);
      });
    });
  }
  renderCartPage();

  /* ============ CHECKOUT PAGE ============ */
  async function renderCheckoutPage() {
    const itemsEl = document.getElementById('checkoutItems');
    const subtotalEl = document.getElementById('checkoutSubtotal');
    const totalEl = document.getElementById('checkoutTotal');
    const deliveryEl = document.getElementById('checkoutDelivery');

    if (!itemsEl) return;

    const cart = getCart();

    if (cart.length === 0) {
      itemsEl.innerHTML = '<p style="color:var(--grey);font-size:0.9rem;">Your cart is empty.</p>';
      if (subtotalEl) subtotalEl.textContent = formatNaira(0);
      if (totalEl) totalEl.textContent = formatNaira(0);
      return;
    }

    itemsEl.innerHTML = cart.map(item => {
      const variant = [item.length && `${item.length}"`, item.texture, item.color]
        .filter(Boolean).join(' · ');
      return `
        <div class="checkout-item">
          <span>${item.name} ${variant ? `(${variant})` : ''} × ${item.qty}</span>
          <span>${formatNaira(item.price * item.qty)}</span>
        </div>
      `;
    }).join('');

    const subtotal = cartTotal(cart);
    if (subtotalEl) subtotalEl.textContent = formatNaira(subtotal);

    let deliveryFee = 0;
    const client = db();
    if (client) {
      try {
        const { data } = await client.from('settings').select('delivery_fee').eq('id', 1).single();
        if (data && data.delivery_fee) deliveryFee = Number(data.delivery_fee) || 0;
      } catch (err) { /* ignore */ }
    }

    if (deliveryEl) {
      deliveryEl.textContent = deliveryFee > 0 ? formatNaira(deliveryFee) : 'Calculated at checkout';
    }

    if (totalEl) totalEl.textContent = formatNaira(subtotal + deliveryFee);
  }
  renderCheckoutPage();

  /* ============ ORDER NUMBER ============ */
  function generateOrderNumber() {
    const d = new Date();
    const y = String(d.getFullYear()).slice(-2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    return `ORD-${y}${m}${day}-${rand}`;
  }

  /* ============ CHECKOUT SUBMIT ============ */
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const cart = getCart();
      if (cart.length === 0) {
        alert('Your cart is empty.');
        return;
      }

      const name = document.getElementById('fullName')?.value.trim() || '';
      const whatsapp = document.getElementById('whatsapp')?.value.trim() || '';
      const phone = document.getElementById('phone')?.value.trim() || '';
      const email = document.getElementById('email')?.value.trim() || '';
      const address = document.getElementById('address')?.value.trim() || '';
      const city = document.getElementById('city')?.value.trim() || '';
      const notes = document.getElementById('notes')?.value.trim() || '';
      const payment = document.querySelector('input[name="payment"]:checked')?.value || 'card';

      /* All fields required except email and notes */
      if (!name || !whatsapp || !phone || !address || !city) {
        alert('Please fill in all required fields.');
        return;
      }

      const btn = document.getElementById('placeOrderBtn');
      const originalText = btn ? btn.textContent : '';
      if (btn) {
        btn.textContent = 'Placing order…';
        btn.disabled = true;
      }

      const client = db();
      const orderNumber = generateOrderNumber();

      const subtotal = cartTotal(cart);
      let deliveryFee = 0;

      if (client) {
        try {
          const { data } = await client.from('settings').select('delivery_fee').eq('id', 1).single();
          if (data && data.delivery_fee) deliveryFee = Number(data.delivery_fee) || 0;
        } catch (err) { /* ignore */ }
      }

      const total = subtotal + deliveryFee;

      /* ============ SAVE ORDER TO SUPABASE ============ */
      if (client) {
        try {
          let customerId = null;

          const { data: existingCust } = await client
            .from('customers')
            .select('id, total_orders, total_spent')
            .eq('whatsapp', whatsapp)
            .maybeSingle();

          if (existingCust) {
            customerId = existingCust.id;
            await client.from('customers').update({
              name,
              phone: phone || null,
              whatsapp,
              email: email || null,
              city,
              address,
              total_orders: (existingCust.total_orders || 0) + 1,
              total_spent: Number(existingCust.total_spent || 0) + total,
              last_order_at: new Date().toISOString()
            }).eq('id', customerId);
          } else {
            await client.from('customers').insert({
              name,
              phone: phone || null,
              whatsapp,
              email: email || null,
              city,
              address,
              total_orders: 1,
              total_spent: total,
              last_order_at: new Date().toISOString()
            });
          }

          const orderPayload = {
            order_number: orderNumber,
            customer_id: customerId,
            customer_name: name,
            customer_phone: phone || null,
            customer_whatsapp: whatsapp,
            customer_email: email || null,
            delivery_address: address,
            city,
            notes: notes || null,
            items: cart.map(i => ({
              name: i.name,
              qty: i.qty,
              price: i.price,
              length: i.length || '',
              texture: i.texture || '',
              color: i.color || '',
              density: i.density || ''
            })),
            subtotal,
            delivery_fee: deliveryFee,
            total,
            payment_method: payment,
            payment_status: 'unpaid',
            status: 'pending'
          };

          const { error: orderErr } = await client
            .from('orders')
            .insert(orderPayload);

          if (orderErr) throw orderErr;

        } catch (err) {
          console.error('Order save error:', err);
          alert('Could not save order: ' + (err.message || err));
          if (btn) { btn.textContent = originalText; btn.disabled = false; }
          return;
        }
      }

      /* ============ KORAPAY PAYMENT FLOW ============ */
      if (payment === 'card' || payment === 'bank-transfer') {
        if (btn) btn.textContent = 'Redirecting to payment…';

        try {
          const res = await fetch(KORAPAY_INIT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_number: orderNumber,
              order_id: orderNumber,
              amount: total,
              customer_name: name,
              customer_email: email || 'customer@example.com',
              customer_phone: whatsapp,
              payment_method: payment
            })
          });

          const data = await res.json();

          if (!res.ok || !data.success || !data.checkout_url) {
            throw new Error(data.error || 'Could not initiate payment');
          }

          localStorage.removeItem('bisbam_cart');
          window.dispatchEvent(new Event('cart-updated'));

          window.location.href = data.checkout_url;
          return;

        } catch (err) {
          console.error('Korapay init error:', err);
          alert('Could not start payment: ' + (err.message || err) + '\n\nWe will open WhatsApp so you can complete the order manually.');
        }
      }

      /* ============ WHATSAPP FALLBACK ============ */
      let message = `*NEW ORDER — Bisbam Hairs*%0A`;
      message += `*Order #:* ${orderNumber}%0A%0A`;
      message += `*Name:* ${encodeURIComponent(name)}%0A`;
      message += `*WhatsApp:* ${encodeURIComponent(whatsapp)}%0A`;
      if (phone) message += `*Phone:* ${encodeURIComponent(phone)}%0A`;
      if (email) message += `*Email:* ${encodeURIComponent(email)}%0A`;
      message += `*Address:* ${encodeURIComponent(address)}, ${encodeURIComponent(city)}%0A`;
      message += `*Payment:* ${encodeURIComponent(payment)}%0A%0A`;
      message += `*Items:*%0A`;

      cart.forEach((item, i) => {
        const variant = [item.length && `${item.length}"`, item.texture, item.color, item.density]
          .filter(Boolean).join(' · ');
        message += `${i + 1}. ${encodeURIComponent(item.name)}`;
        if (variant) message += ` (${encodeURIComponent(variant)})`;
        message += ` × ${item.qty} — ${formatNaira(item.price * item.qty)}%0A`;
      });

      message += `%0A*Subtotal:* ${formatNaira(subtotal)}`;
      if (deliveryFee > 0) message += `%0A*Delivery:* ${formatNaira(deliveryFee)}`;
      message += `%0A*Total:* ${formatNaira(total)}`;

      if (notes) message += `%0A%0A*Notes:* ${encodeURIComponent(notes)}`;

      localStorage.removeItem('bisbam_cart');
      window.dispatchEvent(new Event('cart-updated'));

      window.location.href = `https://wa.me/2348146108122?text=${message}`;

      if (btn) {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  }

})();
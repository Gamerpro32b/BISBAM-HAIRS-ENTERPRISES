/* =========================================================
   BISBAM HAIRS — cart.js
   Cart engine: add, remove, update qty, render, checkout.
   Uses localStorage key 'bisbam_cart'.
   ========================================================= */

(function () {
  'use strict';

  /* ============ HELPERS ============ */
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

  /* ============ ADD TO CART ============ */
  function addToCart(item) {
    const cart = getCart();

    // Unique key: id + selected variations
    const key = [
      item.id,
      item.length || '',
      item.texture || '',
      item.color || '',
      item.density || ''
    ].join('|');

    const existing = cart.find(i => i.key === key);

    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      cart.push({ ...item, key, qty: item.qty || 1 });
    }

    saveCart(cart);
  }

  /* ============ REMOVE ============ */
  function removeFromCart(key) {
    let cart = getCart();
    cart = cart.filter(i => i.key !== key);
    saveCart(cart);
    renderCartPage();
  }

  /* ============ UPDATE QTY ============ */
  function updateQty(key, qty) {
    const cart = getCart();
    const item = cart.find(i => i.key === key);
    if (item) {
      item.qty = Math.max(1, parseInt(qty, 10) || 1);
      saveCart(cart);
      renderCartPage();
    }
  }

  /* ============ PRODUCT PAGE — Add to Cart ============ */
  const addBtn = document.getElementById('addToCartBtn');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      const length = document.getElementById('length')?.value || '';
      const texture = document.getElementById('texture')?.value || '';
      const color = document.getElementById('color')?.value || '';
      const density = document.getElementById('density')?.value || '';
      const qty = parseInt(document.getElementById('qty')?.value || '1', 10);

      // Read product info from the page (placeholder for now — will be data-driven later)
      const name = document.querySelector('.product-title')?.textContent.trim() || 'Product';
      const priceText = document.querySelector('.product-info .product-price')?.textContent || '₦0';
      const price = parseInt(priceText.replace(/[^\d]/g, ''), 10) || 0;
      const image = document.querySelector('.product-gallery-main img')?.getAttribute('src') || '';
      const id = name.toLowerCase().replace(/\s+/g, '-');

      addToCart({
        id,
        name,
        price,
        image,
        length,
        texture,
        color,
        density,
        qty
      });

      // Feedback
      addBtn.textContent = 'Added ✓';
      addBtn.disabled = true;
      setTimeout(() => {
        addBtn.textContent = 'Add to Cart';
        addBtn.disabled = false;
      }, 1500);
    });
  }

  /* ============ CART PAGE — Render items ============ */
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
        .filter(Boolean)
        .join(' · ');

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

    // Qty change
    cartItemsEl.querySelectorAll('.cart-qty-input').forEach(input => {
      input.addEventListener('change', e => {
        updateQty(e.target.dataset.key, e.target.value);
      });
    });

    // Remove
    cartItemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        removeFromCart(e.target.dataset.key);
      });
    });
  }
  renderCartPage();

  /* ============ CHECKOUT PAGE — Render summary + WhatsApp order ============ */
  function renderCheckoutPage() {
    const itemsEl = document.getElementById('checkoutItems');
    const subtotalEl = document.getElementById('checkoutSubtotal');
    const totalEl = document.getElementById('checkoutTotal');

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
        .filter(Boolean)
        .join(' · ');
      return `
        <div class="checkout-item">
          <span>${item.name} ${variant ? `(${variant})` : ''} × ${item.qty}</span>
          <span>${formatNaira(item.price * item.qty)}</span>
        </div>
      `;
    }).join('');

    const subtotal = cartTotal(cart);
    if (subtotalEl) subtotalEl.textContent = formatNaira(subtotal);
    if (totalEl) totalEl.textContent = formatNaira(subtotal);
  }
  renderCheckoutPage();

  /* ============ CHECKOUT FORM → WHATSAPP ORDER ============ */
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', e => {
      e.preventDefault();

      const cart = getCart();
      if (cart.length === 0) {
        alert('Your cart is empty.');
        return;
      }

      const name = document.getElementById('fullName')?.value.trim() || '';
      const phone = document.getElementById('phone')?.value.trim() || '';
      const email = document.getElementById('email')?.value.trim() || '';
      const address = document.getElementById('address')?.value.trim() || '';
      const city = document.getElementById('city')?.value.trim() || '';
      const notes = document.getElementById('notes')?.value.trim() || '';
      const payment = document.querySelector('input[name="payment"]:checked')?.value || '';

      if (!name || !phone || !address || !city) {
        alert('Please fill in all required fields.');
        return;
      }

      let message = `*NEW ORDER — Bisbam Hairs*%0A%0A`;
      message += `*Customer:* ${encodeURIComponent(name)}%0A`;
      message += `*Phone:* ${encodeURIComponent(phone)}%0A`;
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

      message += `%0A*Total:* ${formatNaira(cartTotal(cart))}`;
      if (notes) message += `%0A%0A*Notes:* ${encodeURIComponent(notes)}`;

      window.open(`https://wa.me/2348146108122?text=${message}`, '_blank');
    });
  }

  /* ============ EXPOSE TO OTHER SCRIPTS ============ */
  window.BisbamCart = {
    getCart,
    saveCart,
    addToCart,
    removeFromCart,
    updateQty,
    renderCartPage,
    renderCheckoutPage,
    formatNaira
  };

})();
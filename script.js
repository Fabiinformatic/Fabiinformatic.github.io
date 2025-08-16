// script.js — Versión optimizada y compatible (reemplaza tu script.js actual)
// Conserva toda la funcionalidad original (mini-cart, panel, addToCart, i18n, reveal...)
// Mejoras: trabajo no crítico en idle, debounce resize, defensivas, menos reflows.

(function(){
  'use strict';

  // helpers para posponer trabajo no crítico
  const idle = (fn, opts = {}) => {
    if ('requestIdleCallback' in window && !opts.forceSync) {
      requestIdleCallback(fn, { timeout: opts.timeout || 1000 });
    } else {
      // next tick but after paint
      setTimeout(fn, opts.delay || 120);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    try {
      /* =========================
         CONSTANTES Y TRANSLACIONES
         ========================= */
      const CART_KEY = 'lixby_cart_v1';
      const LANG_KEY = 'lixby_lang';
      const THEME_KEY = 'lixby_theme';

      const translations = {
        es: {
          "nav.inicio":"Inicio","nav.productos":"Productos","nav.contacto":"Contáctanos","nav.conocenos":"Conócenos",
          "cart.title":"Carrito","cart.clear":"Vaciar","cart.total":"Total:","cart.checkout":"Pagar",
          "btn.add":"Añadir al carrito","btn.added":"Añadido","btn.explorar":"Explorar","btn.enviar":"Enviar",
          "theme.toggle":"Cambiar tema","cart.empty":"Tu carrito está vacío.","view.cart":"Ver carrito",
          "continue.payment":"Continuar con el pago","shipping.free":"GRATIS","vat.label":"Incluye {vat} de IVA (21%)",
          "label.subtotal":"Subtotal","label.shipping":"Envío","label.your_total":"Tu total:"
        },
        en: {
          "nav.inicio":"Home","nav.productos":"Products","nav.contacto":"Contact","nav.conocenos":"About",
          "cart.title":"Cart","cart.clear":"Clear","cart.total":"Total:","cart.checkout":"Checkout",
          "btn.add":"Add to cart","btn.added":"Added","btn.explorar":"Explore","btn.enviar":"Send",
          "theme.toggle":"Toggle theme","cart.empty":"Your cart is empty.","view.cart":"View cart",
          "continue.payment":"Continue to payment","shipping.free":"FREE","vat.label":"Includes {vat} VAT (21%)",
          "label.subtotal":"Subtotal","label.shipping":"Shipping","label.your_total":"Your total:"
        },
        fr: {
          "nav.inicio":"Accueil","nav.productos":"Produits","nav.contacto":"Contact","nav.conocenos":"À propos",
          "cart.title":"Panier","cart.clear":"Vider","cart.total":"Total:","cart.checkout":"Payer",
          "btn.add":"Ajouter au panier","btn.added":"Ajouté","btn.explorar":"Explorer","btn.enviar":"Envoyer",
          "theme.toggle":"Changer le thème","cart.empty":"Votre panier est vide.","view.cart":"Voir le panier",
          "continue.payment":"Continuer le paiement","shipping.free":"GRATUIT","vat.label":"Inclut {vat} de TVA (21%)",
          "label.subtotal":"Sous-total","label.shipping":"Livraison","label.your_total":"Votre total :"
        }
      };

      /* =========================
         UTILIDADES (precio, storage)
         ========================= */
      function parsePriceToNumber(priceStr){
        if (priceStr === 0) return 0;
        if (!priceStr) return 0;
        const clean = String(priceStr).replace(/[^\d.,-]/g,'').replace(',', '.');
        return parseFloat(clean) || 0;
      }
      function formatPriceNum(num){
        return (Math.round(num * 100) / 100).toFixed(2) + ' €';
      }
      function loadCart(){ try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch(e){ return []; } }
      function saveCart(c){ try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch(e){} }

      // estado
      let cart = loadCart();

      /* =========================
         0) INJECT CSS FIXES (no crítico)
         ========================= */
      idle(() => {
        if (document.getElementById('lixby-fixes-css')) return;
        const css = `
          .nav { border-radius: 0 !important; box-shadow: none !important; }
          .nav-inner { display:flex !important; align-items:center !important; justify-content:space-between !important; gap:16px !important; max-width:1200px; margin:0 auto; min-height:64px !important; }
          .nav-left{ display:flex !important; align-items:center !important; gap:8px !important; flex:0 0 auto !important; }
          #navLinks{ display:flex !important; gap:18px !important; align-items:center !important; justify-content:center !important; flex:1 1 auto !important; padding:0 12px !important; white-space:nowrap !important; }
          .nav-right{ display:flex !important; flex-direction:row !important; gap:10px !important; align-items:center !important; justify-content:flex-end !important; flex:0 0 auto !important; }
          .reveal{ opacity:1 !important; transform:none !important; transition:none !important; }
          .mini-cart{ right:18px !important; top:56px !important; width:320px !important; box-sizing:border-box !important; }
          @media (max-width:720px){ .mini-cart{ width:92% !important; right:8px !important; top:56px !important; } }
          .cart-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:210; display:none; }
          .cart-backdrop.open{ display:block; }
          .cart-panel{ position:fixed; top:0; right:0; bottom:0; width:360px; transform:translateX(110%); transition:transform .28s ease; z-index:220; pointer-events:auto; }
          .cart-panel.open{ transform:translateX(0); }
          @media (max-width:720px){ .cart-panel{ width:92% !important; } }
        `;
        const s = document.createElement('style');
        s.id = 'lixby-fixes-css';
        s.textContent = css;
        document.head.appendChild(s);
      });

      /* =========================
         HEADER layout enforcement + debounced padding-top adjust
         ========================= */
      (function forceHeaderLayoutAndPadding(){
        const header = document.querySelector('.nav');
        const navInner = document.querySelector('.nav-inner');
        if (header && navInner) {
          // read once
          navInner.style.display = 'flex';
          navInner.style.alignItems = 'center';
          navInner.style.justifyContent = 'space-between';
        }
        const adjust = () => {
          const h = document.querySelector('.nav');
          if (!h) return;
          const pad = Math.round(h.getBoundingClientRect().height + 12);
          document.body.style.paddingTop = pad + 'px';
        };
        let t;
        const debounced = () => { clearTimeout(t); t = setTimeout(adjust, 120); };
        window.addEventListener('resize', debounced);
        adjust();
      })();

      /* =========================
         ELEMENT REFERENCES (defensivas)
         ========================= */
      const cartBtn = document.getElementById('cartBtn');
      const miniCart = document.getElementById('miniCart');
      const miniCartItems = document.getElementById('miniCartItems');
      const miniCartTotal = document.getElementById('miniCartTotal');
      const cartCount = document.getElementById('cartCount');
      const clearCartBtn = document.getElementById('clearCart');
      const checkoutBtn = document.getElementById('checkoutBtn');

      /* =========================
         CART PANEL (drawer) creation
         ========================= */
      function ensureCartPanel(){
        if (document.getElementById('cartPanel')) return;
        // create panel
        const panel = document.createElement('aside');
        panel.id = 'cartPanel';
        panel.className = 'cart-panel';
        panel.setAttribute('aria-hidden', 'true');

        // build inner with DOM methods to avoid innerHTML large reflows
        const inner = document.createElement('div');
        inner.className = 'cart-panel-inner glass';
        inner.setAttribute('role','dialog');
        inner.setAttribute('aria-label','Carrito');
        // header
        const headerRow = document.createElement('div');
        headerRow.className = 'cart-header';
        headerRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.04)';
        const title = document.createElement('strong'); title.setAttribute('data-i18n','cart.title'); title.textContent = translations['es']['cart.title'];
        const headerControls = document.createElement('div'); headerControls.style.cssText = 'display:flex;gap:8px;align-items:center;';
        const clearBtn = document.createElement('button'); clearBtn.id = 'cartPanelClear'; clearBtn.className = 'btn ghost'; clearBtn.setAttribute('data-i18n','cart.clear'); clearBtn.textContent = translations['es']['cart.clear'];
        const closeBtn = document.createElement('button'); closeBtn.id = 'cartPanelClose'; closeBtn.className = 'text-btn'; closeBtn.setAttribute('aria-label','Cerrar'); closeBtn.textContent = '✕';
        headerControls.appendChild(clearBtn); headerControls.appendChild(closeBtn);
        headerRow.appendChild(title); headerRow.appendChild(headerControls);

        // items container
        const list = document.createElement('div');
        list.id = 'cartPanelItems';
        list.className = 'cart-list';
        list.style.cssText = 'padding:12px;overflow:auto;flex:1;';

        // footer
        const footer = document.createElement('div');
        footer.className = 'cart-footer';
        footer.style.cssText = 'padding:12px;border-top:1px solid rgba(255,255,255,0.04);display:flex;flex-direction:column;gap:10px;';

        const subRow = document.createElement('div');
        subRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
        const subLabel = document.createElement('div'); subLabel.setAttribute('data-i18n','label.subtotal'); subLabel.textContent = translations['es']['label.subtotal'];
        const subVal = document.createElement('div'); subVal.id = 'cartPanelSubtotal'; subVal.textContent = '0 €';
        subRow.appendChild(subLabel); subRow.appendChild(subVal);

        const shipRow = document.createElement('div');
        shipRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
        const shipLabel = document.createElement('div'); shipLabel.setAttribute('data-i18n','label.shipping'); shipLabel.textContent = translations['es']['label.shipping'];
        const shipVal = document.createElement('div'); shipVal.id = 'cartPanelShipping'; shipVal.textContent = translations['es']['shipping.free'];
        shipRow.appendChild(shipLabel); shipRow.appendChild(shipVal);

        const totalRow = document.createElement('div');
        totalRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:1.05rem;margin-top:8px;';
        const totLabel = document.createElement('div'); totLabel.setAttribute('data-i18n','label.your_total'); totLabel.textContent = translations['es']['label.your_total'];
        const totVal = document.createElement('div'); totVal.id = 'cartPanelTotal'; totVal.textContent = '0 €';
        totalRow.appendChild(totLabel); totalRow.appendChild(totVal);

        const vatRow = document.createElement('div');
        vatRow.style.cssText = 'font-size:0.92rem;color:var(--muted);margin-top:6px;';
        const vatSpan = document.createElement('span'); vatSpan.id = 'cartPanelVAT'; vatSpan.textContent = '0 €';
        const vatLabel = document.createElement('span'); vatLabel.setAttribute('data-i18n','vat.label'); vatLabel.textContent = translations['es']['vat.label'].replace('{vat}','0 €');
        vatRow.appendChild(vatSpan); vatRow.appendChild(document.createTextNode(' ')); vatRow.appendChild(vatLabel);

        const footerBtns = document.createElement('div');
        footerBtns.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
        const checkoutBtnPanel = document.createElement('button');
        checkoutBtnPanel.id = 'cartPanelCheckout';
        checkoutBtnPanel.className = 'btn primary';
        checkoutBtnPanel.style.cssText = 'flex:1';
        checkoutBtnPanel.setAttribute('data-i18n','continue.payment');
        checkoutBtnPanel.textContent = translations['es']['continue.payment'];
        footerBtns.appendChild(checkoutBtnPanel);

        footer.appendChild(subRow);
        footer.appendChild(shipRow);
        footer.appendChild(totalRow);
        footer.appendChild(vatRow);
        footer.appendChild(footerBtns);

        // compose
        inner.appendChild(headerRow);
        inner.appendChild(list);
        inner.appendChild(footer);
        panel.appendChild(inner);
        document.body.appendChild(panel);

        // backdrop
        if (!document.getElementById('cartBackdrop')) {
          const backdrop = document.createElement('div');
          backdrop.id = 'cartBackdrop';
          backdrop.className = 'cart-backdrop';
          backdrop.setAttribute('aria-hidden','true');
          document.body.appendChild(backdrop);
          backdrop.addEventListener('click', ()=> toggleCartPanel(false));
        }

        // listeners
        closeBtn.addEventListener('click', ()=> toggleCartPanel(false));
        clearBtn.addEventListener('click', ()=> { cart = []; saveCart(cart); updateMiniCartUI(); updateCartPanelUI(); });
        checkoutBtnPanel.addEventListener('click', ()=> {
          if (!cart || cart.length === 0) return alert(translations[currentLang]?.['cart.empty'] || translations['es']['cart.empty']);
          alert('Simulación de checkout — artículos: ' + cart.reduce((s,i)=>s+(i.qty||0),0));
        });

        // escape key closes
        document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') toggleCartPanel(false); });
      }

      function toggleCartPanel(open){
        ensureCartPanel();
        const panel = document.getElementById('cartPanel');
        const backdrop = document.getElementById('cartBackdrop');
        if (!panel) return;
        const show = (typeof open === 'boolean') ? open : !panel.classList.contains('open');
        panel.classList.toggle('open', show);
        panel.setAttribute('aria-hidden', String(!show));
        if (backdrop) { backdrop.classList.toggle('open', show); backdrop.setAttribute('aria-hidden', String(!show)); }
        document.documentElement.style.overflow = show ? 'hidden' : '';
        if (show) updateCartPanelUI();
      }

      /* =========================
         MINI-CART popover render + update
         ========================= */
      function updateMiniCartUI(){
        try {
          if (cartCount) cartCount.textContent = cart.reduce((s,i)=>s+(i.qty||0),0);
          if (!miniCartItems) return;
          // build fragment to avoid repeated reflows
          const frag = document.createDocumentFragment();
          if (!cart || cart.length === 0) {
            const empty = document.createElement('div');
            empty.style.padding = '8px';
            empty.style.color = 'var(--muted)';
            empty.textContent = translations[currentLang]?.['cart.empty'] || translations['es']['cart.empty'];
            frag.appendChild(empty);
            if (miniCartTotal) miniCartTotal.textContent = '0 €';
          } else {
            let total = 0;
            cart.forEach((it, idx) => {
              const row = document.createElement('div');
              row.className = 'mini-cart-item';
              row.style.display = 'flex';
              row.style.gap = '10px';
              row.style.alignItems = 'center';

              const img = document.createElement('img');
              img.src = it.image || 'https://via.placeholder.com/80x80?text=Img';
              img.alt = it.name || 'Producto';
              img.style.width = '48px'; img.style.height = '48px'; img.style.objectFit = 'cover'; img.style.borderRadius = '8px';

              const meta = document.createElement('div');
              meta.style.flex = '1';
              meta.innerHTML = `<div style="font-weight:700">${it.name}</div><div style="color:var(--muted)">${it.price} x${it.qty||1}</div>`;

              const remove = document.createElement('button');
              remove.className = 'remove';
              remove.textContent = '✕';
              remove.title = 'Eliminar';
              remove.style.background = 'transparent';
              remove.style.border = 'none';
              remove.style.cursor = 'pointer';
              remove.addEventListener('click', (ev)=> { ev.stopPropagation(); cart.splice(idx,1); saveCart(cart); updateMiniCartUI(); updateCartPanelUI(); });

              row.appendChild(img);
              row.appendChild(meta);
              row.appendChild(remove);
              frag.appendChild(row);

              total += (it.priceNum || parsePriceToNumber(it.price)) * (it.qty || 1);
            });
            if (miniCartTotal) miniCartTotal.textContent = formatPriceNum(total);
          }
          // replace children (single reflow)
          miniCartItems.innerHTML = '';
          miniCartItems.appendChild(frag);
        } catch(e){ console.warn('updateMiniCartUI error', e); }
      }

      /* =========================
         CART PANEL UI rendering (rows, totals, vat)
         ========================= */
      function updateCartPanelUI(){
        ensureCartPanel();
        const panel = document.getElementById('cartPanel');
        if (!panel) return;
        const list = panel.querySelector('#cartPanelItems');
        const subtotalEl = panel.querySelector('#cartPanelSubtotal');
        const totalEl = panel.querySelector('#cartPanelTotal');
        const vatEl = panel.querySelector('#cartPanelVAT');
        const shippingEl = panel.querySelector('#cartPanelShipping');

        if (!list || !subtotalEl || !totalEl || !vatEl) return;

        // shipping label
        if (shippingEl) shippingEl.textContent = translations[currentLang]?.['shipping.free'] || translations['es']['shipping.free'];

        // clear list
        list.innerHTML = '';

        if (!cart || cart.length === 0) {
          const empty = document.createElement('div');
          empty.style.padding = '12px';
          empty.style.color = 'var(--muted)';
          empty.textContent = translations[currentLang]?.['cart.empty'] || translations['es']['cart.empty'];
          list.appendChild(empty);
          subtotalEl.textContent = '0 €';
          totalEl.textContent = '0 €';
          vatEl.textContent = '0 €';
          const vatSpan = panel.querySelector('[data-i18n="vat.label"]');
          if (vatSpan) vatSpan.textContent = (translations[currentLang]?.['vat.label'] || translations['es']['vat.label']).replace('{vat}', formatPriceNum(0));
          return;
        }

        // Build rows in fragment
        const frag = document.createDocumentFragment();
        let subtotal = 0;
        cart.forEach((it) => {
          const priceNum = (it.priceNum !== undefined) ? it.priceNum : parsePriceToNumber(it.price);
          const qty = it.qty || 1;
          const line = priceNum * qty;
          subtotal += line;

          const row = document.createElement('div');
          row.className = 'cart-row';
          row.style.display = 'flex';
          row.style.gap = '12px';
          row.style.alignItems = 'center';
          row.style.padding = '10px 0';
          row.style.borderBottom = '1px solid rgba(255,255,255,0.03)';

          const img = document.createElement('img');
          img.className = 'cart-row-img';
          img.src = it.image || 'https://via.placeholder.com/120';
          img.alt = (it.name||'Producto');
          img.style.width = '72px'; img.style.height = '72px'; img.style.objectFit = 'cover'; img.style.borderRadius = '8px'; img.style.flex = '0 0 72px';

          const info = document.createElement('div');
          info.className = 'cart-row-info';
          info.style.flex = '1 1 auto';
          info.style.minWidth = '0';
          info.innerHTML = `<div class="cart-row-name" style="font-weight:700;margin-bottom:6px;">${it.name || 'Producto'}</div>
                            <div class="cart-row-meta" style="color:var(--muted);font-size:0.95rem;">Cantidad: <strong>${qty}</strong></div>`;

          const priceEl = document.createElement('div');
          priceEl.className = 'cart-row-price';
          priceEl.style.flex = '0 0 auto';
          priceEl.style.fontWeight = '700';
          priceEl.style.marginLeft = '12px';
          priceEl.textContent = formatPriceNum(line);

          row.appendChild(img);
          row.appendChild(info);
          row.appendChild(priceEl);
          frag.appendChild(row);
        });

        list.appendChild(frag);

        const shipping = 0;
        const total = subtotal + shipping;
        const vatRate = 0.21;
        const vatAmount = Math.round((total - total / (1 + vatRate)) * 100) / 100;

        subtotalEl.textContent = formatPriceNum(subtotal);
        totalEl.textContent = formatPriceNum(total);
        vatEl.textContent = formatPriceNum(vatAmount);

        const vatSpan = panel.querySelector('[data-i18n="vat.label"]');
        if (vatSpan) vatSpan.textContent = (translations[currentLang]?.['vat.label'] || translations['es']['vat.label']).replace('{vat}', formatPriceNum(vatAmount));

        if (miniCartTotal) miniCartTotal.textContent = formatPriceNum(subtotal);
        if (cartCount) cartCount.textContent = cart.reduce((s,i)=>s+(i.qty||0),0);
      }

      /* =========================
         window.addToCart (exposed)
         ========================= */
      window.addToCart = function(product){
        if (!product || !product.id) return;
        const existing = cart.find(p => p.id === product.id);
        if (existing) existing.qty = (existing.qty||1) + 1;
        else {
          cart.push({
            id: product.id,
            name: product.name || 'Producto',
            price: product.price || '0 €',
            priceNum: parsePriceToNumber(product.price || '0'),
            qty: 1,
            image: product.image || ''
          });
        }
        saveCart(cart);
        updateMiniCartUI();
        updateCartPanelUI();

        // if miniCart exists, flash it; otherwise open panel
        if (miniCart) {
          miniCart.setAttribute('aria-hidden', 'false');
          setTimeout(()=> miniCart.setAttribute('aria-hidden', 'true'), 2200);
        } else {
          toggleCartPanel(true);
        }
      };

      /* =========================
         HANDLERS: cart button, document click
         ========================= */

      // NEW: Apple-like behavior:
      // - click normal => navigate to carrito.html
      // - hover / arrowdown => show mini-cart preview
      // - ctrl/meta/alt + click => show preview (fallback)
      function handleCartBtnClick(e){
        try {
          // If user held a modifier key, open preview instead of navigating (optional handy fallback)
          if (e && (e.metaKey || e.ctrlKey || e.altKey)) {
            if (miniCart) {
              const shown = miniCart.getAttribute('aria-hidden') === 'false';
              miniCart.setAttribute('aria-hidden', String(!shown));
              e.stopPropagation();
              return;
            }
            toggleCartPanel(true);
            e.stopPropagation();
            return;
          }
          // Default: navigate to full carrito page (like Apple)
          window.location.href = 'carrito.html';
        } catch(err){ console.warn('handleCartBtnClick error', err); }
      }

      if (cartBtn) cartBtn.addEventListener('click', handleCartBtnClick);
      else {
        // delegated fallback
        document.addEventListener('click', function delegated(ev){
          const b = ev.target.closest && ev.target.closest('#cartBtn');
          if (b) handleCartBtnClick(ev);
        });
      }

      // Show mini-cart on hover / focus for quick preview (doesn't prevent click navigation)
      if (cartBtn && miniCart) {
        // mouseenter shows preview
        cartBtn.addEventListener('mouseenter', () => {
          try { miniCart.setAttribute('aria-hidden','false'); } catch(e){}
        });
        // if the pointer leaves cartBtn and isn't over miniCart, hide after a small delay
        cartBtn.addEventListener('mouseleave', () => {
          setTimeout(() => {
            try {
              const overMini = miniCart.matches && miniCart.matches(':hover');
              if (!overMini) miniCart.setAttribute('aria-hidden','true');
            } catch(e){}
          }, 150);
        });
        // keep preview open while hovering miniCart
        miniCart.addEventListener('mouseenter', () => { try { miniCart.setAttribute('aria-hidden','false'); } catch(e){} });
        miniCart.addEventListener('mouseleave', () => { try { miniCart.setAttribute('aria-hidden','true'); } catch(e){} });

        // keyboard: arrow down opens preview
        cartBtn.addEventListener('keydown', (ev) => {
          if (ev.key === 'ArrowDown' || ev.key === 'Down') {
            try { miniCart.setAttribute('aria-hidden','false'); ev.preventDefault(); } catch(e){}
          }
        });
      }

      // close miniCart on outside click
      document.addEventListener('click', (e) => {
        try {
          if (!miniCart) return;
          if (cartBtn && !cartBtn.contains(e.target) && !miniCart.contains(e.target)) {
            miniCart.setAttribute('aria-hidden', 'true');
          }
        } catch(e){}
      });

      if (clearCartBtn) clearCartBtn.addEventListener('click', ()=> { cart = []; saveCart(cart); updateMiniCartUI(); updateCartPanelUI(); });
      if (checkoutBtn) checkoutBtn.addEventListener('click', ()=> { if (!cart || cart.length ===0) return alert(translations[currentLang]?.['cart.empty'] || translations['es']['cart.empty']); alert('Simulación de pago — artículos: ' + cart.reduce((s,i)=>s+(i.qty||0),0)); });

      // Make "Ver carrito" navigate to carrito.html (Apple-like), even if it's a <button>
      document.addEventListener('click', (ev) => {
        try {
          const el = ev.target;
          if (!el) return;
          const viewBtn = el.id === 'viewCartBtn' || (el.closest && el.closest('#viewCartBtn'));
          if (viewBtn) {
            // prefer full page navigation
            window.location.href = 'carrito.html';
          }
        } catch(e){}
      });

      /* =========================
         CARD interactions (idle) — no bloquear DOMContentLoaded
         ========================= */
      idle(() => {
        try {
          const cards = document.querySelectorAll && document.querySelectorAll('.card[data-product]');
          if (!cards || !cards.length) return;
          cards.forEach(card => {
            card.style.transition = card.style.transition || 'transform 0.22s ease';
            const onMove = (e) => {
              const rect = card.getBoundingClientRect();
              const cx = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
              const cy = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
              const x = cx - rect.left; const y = cy - rect.top;
              const moveX = (x / rect.width - 0.5) * 6; const moveY = (y / rect.height - 0.5) * 6;
              card.style.transform = `translateY(-8px) rotateX(${moveY}deg) rotateY(${moveX}deg)`;
            };
            const onLeave = () => card.style.transform = 'translateY(0) rotateX(0) rotateY(0)';
            card.addEventListener('mousemove', onMove);
            card.addEventListener('mouseleave', onLeave);
            card.addEventListener('touchstart', ()=> card.style.transform = 'translateY(-8px)');
            card.addEventListener('touchend', onLeave);
            card.addEventListener('click', (e) => {
              if (e.target.closest('button, a, input, textarea, select')) return;
              const pid = card.getAttribute('data-product');
              if (pid) window.location.href = `producto.html?id=${encodeURIComponent(pid)}`;
            });
          });
        } catch(e){ console.warn('cards init error', e); }
      });

      /* =========================
         LANGUAGE + THEME
         ========================= */
      let currentLang = localStorage.getItem(LANG_KEY) || 'es';
      function applyTranslations(lang){
        const map = translations[lang] || translations['es'];
        document.querySelectorAll('[data-i18n]').forEach(el => {
          const key = el.getAttribute('data-i18n');
          if (key && map[key]) el.textContent = map[key];
        });
        document.querySelectorAll('.btn-add').forEach(btn => { btn.textContent = map['btn.add'] || btn.textContent; });
        const label = document.getElementById('langLabel');
        const names = { es:'Español', en:'English', fr:'Français' };
        if (label) label.textContent = names[lang] || names['es'];
      }
      function setLanguage(lang){
        if (!translations[lang]) lang = 'es';
        currentLang = lang;
        try { localStorage.setItem(LANG_KEY, lang); } catch(e){}
        applyTranslations(lang);
        updateMiniCartUI();
        updateCartPanelUI();
      }
      // attach UI
      const langBtn = document.getElementById('langBtn');
      const langMenu = document.getElementById('langMenu');
      if (langBtn && langMenu) {
        langBtn.addEventListener('click', ()=> {
          const isHidden = langMenu.getAttribute('aria-hidden') === 'true' || langMenu.getAttribute('aria-hidden') === null;
          langMenu.setAttribute('aria-hidden', String(!isHidden));
          langBtn.setAttribute('aria-expanded', String(!isHidden));
        });
        // delegate click to items
        Array.from(langMenu.querySelectorAll('[data-lang]')).forEach(b => b.addEventListener('click', ()=> {
          const l = b.getAttribute('data-lang'); setLanguage(l);
          langMenu.setAttribute('aria-hidden','true'); if (langBtn) langBtn.setAttribute('aria-expanded','false');
        }));
        document.addEventListener('click', (ev) => {
          try { if (!langBtn.contains(ev.target) && !langMenu.contains(ev.target)) { langMenu.setAttribute('aria-hidden','true'); if (langBtn) langBtn.setAttribute('aria-expanded','false'); } } catch(e){}
        });
      }
      setLanguage(currentLang);

      const themeToggle = document.getElementById('themeToggle');
      if (localStorage.getItem(THEME_KEY) === 'light') document.documentElement.classList.add('light');
      if (themeToggle) themeToggle.addEventListener('click', ()=> {
        const isLight = document.documentElement.classList.toggle('light');
        try { localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark'); } catch(e){}
      });

      /* =========================
         REVEAL (IntersectionObserver) — idle for perf
         ========================= */
      idle(() => {
        try {
          const els = Array.from(document.querySelectorAll('.reveal'));
          if (!els.length) return;
          setTimeout(()=> els.slice(0,6).forEach(el => el.classList.add('visible')), 40);
          if ('IntersectionObserver' in window) {
            const obs = new IntersectionObserver((entries, o)=> {
              entries.forEach(en => {
                if (en.isIntersecting) { en.target.classList.add('visible'); o.unobserve(en.target); }
              });
            }, { threshold: 0.12 });
            els.forEach(el => { if (!el.classList.contains('visible')) obs.observe(el); });
          } else {
            els.forEach(el=> el.classList.add('visible'));
          }
        } catch(e){ console.warn('reveal init error', e); }
      });

      /* =========================
         CROSS-TAB sync y arranque inicial
         ========================= */
      window.addEventListener('storage', (ev) => {
        if (ev.key === CART_KEY) {
          cart = loadCart();
          updateMiniCartUI();
          updateCartPanelUI();
        }
      });

      // inicial updates
      updateMiniCartUI();
      ensureCartPanel();
      updateCartPanelUI();
      applyTranslations(currentLang);

      // helpful debug API
      window.__LIXBY = {
        getCart: () => JSON.parse(JSON.stringify(cart || [])),
        clearCart: () => { cart = []; saveCart(cart); updateMiniCartUI(); updateCartPanelUI(); }
      };

      // notify other modules
      window.dispatchEvent(new Event('cartUpdated'));

    } catch (err) {
      console.error('Error en script LIXBY:', err);
      // degrade gracefully
      try {
        const ns = document.querySelector('noscript');
        if (ns) ns.textContent = 'Ha ocurrido un error en el script. Mira la consola (F12 → Console).';
      } catch(e){}
    }
  });

})();

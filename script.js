// script.js — Versión completa: todo arreglado (header horizontal, reveal visible, mini-cart + panel robusto)
// Pega esto en tu script.js y recarga la página (Ctrl+F5) para evitar caché.

document.addEventListener("DOMContentLoaded", () => {
  try {
    /* =========================
       0) INJECT CSS FIXES (evita tocar HTML/CSS)
       - Fuerza header en una sola línea
       - Hace visibles las .reveal si el CSS las oculta
       - Ajustes de mini-cart / panel
       ========================= */
    (function injectFixStyles() {
      if (document.getElementById('lixby-fixes-css')) return;
      const css = `
        /* Force header layout horizontal & recto (override inline styles) */
        .nav { border-radius: 0 !important; box-shadow: none !important; }
        .nav-inner { display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 16px !important; max-width: 1200px; margin: 0 auto; min-height: 64px !important; }
        .nav-left { display:flex !important; align-items:center !important; gap:8px !important; flex: 0 0 auto !important; }
        #navLinks { display:flex !important; gap:18px !important; align-items:center !important; justify-content:center !important; flex: 1 1 auto !important; padding: 0 12px !important; white-space: nowrap !important; }
        .nav-right { display:flex !important; flex-direction: row !important; gap:10px !important; align-items:center !important; justify-content:flex-end !important; flex: 0 0 auto !important; }
        /* If any inline style tried column, override */
        .nav-right[style] { flex-direction: row !important; }

        /* Reveal fallback: si .reveal estuviera a opacity:0 por CSS */
        .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }

        /* Mini-cart safe placement */
        .mini-cart { right: 18px !important; top: 56px !important; width: 320px !important; box-sizing: border-box !important; }
        @media (max-width:720px){ .mini-cart { width: 92% !important; right: 8px !important; top: 56px !important; } }

        /* Cart panel/backdrop basics */
        .cart-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 210; display:none; }
        .cart-backdrop.open { display:block; }
        .cart-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 360px; transform: translateX(110%); transition: transform .28s ease; z-index: 220; pointer-events:auto; }
        .cart-panel.open { transform: translateX(0); }
        @media (max-width:720px){ .cart-panel { width: 92% !important; } }
      `;
      const s = document.createElement('style');
      s.id = 'lixby-fixes-css';
      s.textContent = css;
      document.head.appendChild(s);
    })();

    /* =========================
       1) Utilities y estado
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
       2) HEADER fixes runtime (por si hay reglas en línea que siguen colapsando)
       - fuerza visual horizontal y padding main
       ========================= */
    (function runtimeForceHeaderLayout(){
      const nav = document.querySelector('.nav');
      const navInner = document.querySelector('.nav-inner');
      const navRight = document.querySelector('.nav-right');
      const navLinks = document.getElementById('navLinks');

      if (nav) {
        nav.style.position = 'fixed';
        nav.style.left = '0';
        nav.style.right = '0';
        nav.style.top = '0';
        nav.style.padding = nav.style.padding || '10px 24px';
        nav.style.borderRadius = '0';
        nav.style.boxShadow = 'none';
      }
      if (navInner) {
        navInner.style.display = 'flex';
        navInner.style.alignItems = 'center';
        navInner.style.justifyContent = 'space-between';
        navInner.style.gap = '16px';
        navInner.style.maxWidth = '1200px';
        navInner.style.margin = '0 auto';
        navInner.style.minHeight = '64px';
      }
      if (navRight) {
        navRight.style.display = 'flex';
        navRight.style.flexDirection = 'row';
        navRight.style.gap = '10px';
        navRight.style.alignItems = 'center';
      }
      if (navLinks) {
        navLinks.style.display = 'flex';
        navLinks.style.gap = '18px';
        navLinks.style.alignItems = 'center';
        navLinks.style.justifyContent = 'center';
      }
      // asegurar padding-top para main
      const adjust = () => {
        const header = document.querySelector('.nav');
        if (!header) return;
        const pad = Math.round(header.getBoundingClientRect().height + 12);
        document.body.style.paddingTop = pad + 'px';
      };
      adjust();
      window.addEventListener('resize', adjust);
    })();

    /* =========================
       3) UI elements references (pueden no existir en todas las páginas)
       ========================= */
    const cartBtn = document.getElementById('cartBtn');           // botón principal del header
    const miniCart = document.getElementById('miniCart');         // popover pequeño
    const miniCartItems = document.getElementById('miniCartItems');
    const miniCartTotal = document.getElementById('miniCartTotal');
    const cartCount = document.getElementById('cartCount');       // badge
    const clearCartBtn = document.getElementById('clearCart');
    const checkoutBtn = document.getElementById('checkoutBtn');

    /* =========================
       4) CART PANEL (drawer) - se crea si no existe
       ========================= */
    function ensureCartPanel(){
      if (document.getElementById('cartPanel')) return;
      const panel = document.createElement('aside');
      panel.id = 'cartPanel';
      panel.className = 'cart-panel';
      panel.setAttribute('aria-hidden', 'true');
      panel.innerHTML = `
        <div class="cart-panel-inner glass" role="dialog" aria-label="Carrito">
          <div class="cart-header" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.04)">
            <strong data-i18n="cart.title">Carrito</strong>
            <div style="display:flex;gap:8px;align-items:center;">
              <button id="cartPanelClear" class="btn ghost" data-i18n="cart.clear">Vaciar</button>
              <button id="cartPanelClose" class="text-btn" aria-label="Cerrar">✕</button>
            </div>
          </div>
          <div id="cartPanelItems" class="cart-list" style="padding:12px;overflow:auto;flex:1;"></div>
          <div class="cart-footer" style="padding:12px;border-top:1px solid rgba(255,255,255,0.04);display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;"><div data-i18n="label.subtotal">Subtotal</div><div id="cartPanelSubtotal">0 €</div></div>
            <div style="display:flex;justify-content:space-between;align-items:center;"><div data-i18n="label.shipping">Envío</div><div id="cartPanelShipping">${translations['es']['shipping.free']}</div></div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:1.05rem;margin-top:8px;"><div data-i18n="label.your_total">Tu total:</div><div id="cartPanelTotal">0 €</div></div>
            <div style="font-size:0.92rem;color:var(--muted);margin-top:6px;"><span id="cartPanelVAT">0 €</span> <span data-i18n="vat.label">{vat}</span></div>
            <div style="display:flex;gap:8px;margin-top:8px;"><button id="cartPanelCheckout" class="btn primary" style="flex:1" data-i18n="continue.payment">Continuar con el pago</button></div>
          </div>
        </div>
      `;
      document.body.appendChild(panel);

      // backdrop (si no existe)
      let backdrop = document.getElementById('cartBackdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'cartBackdrop';
        backdrop.className = 'cart-backdrop';
        backdrop.setAttribute('aria-hidden','true');
        document.body.appendChild(backdrop);
      }

      // listeners
      panel.querySelector('#cartPanelClose')?.addEventListener('click', ()=> toggleCartPanel(false));
      panel.querySelector('#cartPanelClear')?.addEventListener('click', ()=> { cart = []; saveCart(cart); updateMiniCartUI(); updateCartPanelUI(); });
      panel.querySelector('#cartPanelCheckout')?.addEventListener('click', ()=> {
        if (!cart || cart.length === 0) return alert(translations[currentLang]['cart.empty'] || 'El carrito está vacío');
        alert('Simulación de checkout — artículos: ' + cart.reduce((s,i)=>s+(i.qty||0),0));
      });
      backdrop.addEventListener('click', ()=> toggleCartPanel(false));
      document.addEventListener('keydown', (ev)=> { if (ev.key === 'Escape') toggleCartPanel(false); });
    }

    function toggleCartPanel(open){
      ensureCartPanel();
      const panel = document.getElementById('cartPanel');
      const backdrop = document.getElementById('cartBackdrop');
      if (!panel) return;
      const show = (typeof open === 'boolean') ? open : !panel.classList.contains('open');
      panel.classList.toggle('open', show);
      panel.setAttribute('aria-hidden', String(!show));
      if (backdrop) {
        backdrop.classList.toggle('open', show);
        backdrop.setAttribute('aria-hidden', String(!show));
      }
      document.documentElement.style.overflow = show ? 'hidden' : '';
      if (show) updateCartPanelUI();
    }

    /* =========================
       5) MINI-CART (popover) render + helpers
       ========================= */
    function updateMiniCartUI(){
      try {
        if (cartCount) cartCount.textContent = cart.reduce((s,i)=>s+(i.qty||0),0);
        if (!miniCartItems) return;
        miniCartItems.innerHTML = '';
        if (!cart || cart.length === 0) {
          miniCartItems.innerHTML = `<div style="padding:8px;color:var(--muted)">${translations[currentLang]?.['cart.empty'] || translations['es']['cart.empty']}</div>`;
          if (miniCartTotal) miniCartTotal.textContent = '0 €';
          return;
        }
        let total = 0;
        cart.forEach((it, idx) => {
          const el = document.createElement('div');
          el.className = 'mini-cart-item';
          el.style.display = 'flex';
          el.style.gap = '10px';
          el.style.alignItems = 'center';

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

          el.appendChild(img);
          el.appendChild(meta);
          el.appendChild(remove);
          miniCartItems.appendChild(el);

          total += (it.priceNum || parsePriceToNumber(it.price)) * (it.qty || 1);
        });
        if (miniCartTotal) miniCartTotal.textContent = formatPriceNum(total);
      } catch(e){
        console.warn('updateMiniCartUI error', e);
      }
    }

    /* =========================
       6) CART PANEL render (filas, subtotal, IVA)
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

      if (shippingEl) shippingEl.textContent = translations[currentLang]?.['shipping.free'] || translations['es']['shipping.free'];

      list.innerHTML = '';
      if (!cart || cart.length === 0) {
        list.innerHTML = `<div style="padding:12px;color:var(--muted)">${translations[currentLang]?.['cart.empty'] || translations['es']['cart.empty']}</div>`;
        subtotalEl.textContent = '0 €';
        totalEl.textContent = '0 €';
        vatEl.textContent = '0 €';
        const vatSpan = panel.querySelector('[data-i18n="vat.label"]');
        if (vatSpan) vatSpan.textContent = (translations[currentLang]?.['vat.label'] || translations['es']['vat.label']).replace('{vat}', formatPriceNum(0));
        return;
      }

      let subtotal = 0;
      cart.forEach((it, idx) => {
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
        list.appendChild(row);
      });

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
       7) addToCart expuesto globalmente
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
      // mostrar miniCart brevemente si existe
      if (miniCart) {
        miniCart.setAttribute('aria-hidden', 'false');
        setTimeout(()=> miniCart.setAttribute('aria-hidden', 'true'), 2200);
      } else {
        // si no hay miniCart, abrir panel
        toggleCartPanel(true);
      }
    };

    /* =========================
       8) handlers: cartBtn, clicks globales, clear/checkout
       ========================= */
    function handleCartBtnClick(e){
      if (miniCart) {
        const shown = miniCart.getAttribute('aria-hidden') === 'false';
        miniCart.setAttribute('aria-hidden', String(!shown));
        e.stopPropagation();
        return;
      }
      toggleCartPanel(true);
    }

    if (cartBtn) cartBtn.addEventListener('click', handleCartBtnClick);
    else {
      // delegado: si el botón se inserta más tarde
      document.addEventListener('click', function delegated(ev){
        const b = ev.target.closest && ev.target.closest('#cartBtn');
        if (b) handleCartBtnClick(ev);
      });
    }

    // cerrar miniCart clic fuera
    document.addEventListener('click', (e)=>{
      try {
        if (!miniCart) return;
        if (cartBtn && !cartBtn.contains(e.target) && !miniCart.contains(e.target)) {
          miniCart.setAttribute('aria-hidden', 'true');
        }
      } catch(e){}
    });

    if (clearCartBtn) clearCartBtn.addEventListener('click', ()=> { cart = []; saveCart(cart); updateMiniCartUI(); updateCartPanelUI(); });
    if (checkoutBtn) checkoutBtn.addEventListener('click', ()=> { if (!cart || cart.length ===0) return alert(translations[currentLang]?.['cart.empty'] || translations['es']['cart.empty']); alert('Simulación de pago — artículos: ' + cart.reduce((s,i)=>s+(i.qty||0),0)); });

    // viewCartBtn dentro miniCart -> abrir panel (delegado)
    document.addEventListener('click', (ev) => {
      const el = ev.target;
      if (!el) return;
      if (el.id === 'viewCartBtn' || (el.closest && el.closest('#viewCartBtn'))) {
        toggleCartPanel(true);
      }
    });

    /* =========================
       9) tarjetas: click hacia ficha (si existen .card[data-product])
       ========================= */
    (function initCards() {
      try {
        const cards = document.querySelectorAll('.card[data-product]');
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
    })();

    /* =========================
       10) Language menu & theme persistence
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
    // attach language UI if exists
    const langBtn = document.getElementById('langBtn');
    const langMenu = document.getElementById('langMenu');
    if (langBtn && langMenu) {
      langBtn.addEventListener('click', ()=> {
        const isHidden = langMenu.getAttribute('aria-hidden') === 'true' || langMenu.getAttribute('aria-hidden') === null;
        langMenu.setAttribute('aria-hidden', String(!isHidden));
        langBtn.setAttribute('aria-expanded', String(!isHidden));
      });
      langMenu.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', ()=>{
        const l = b.getAttribute('data-lang'); setLanguage(l);
        langMenu.setAttribute('aria-hidden','true'); if (langBtn) langBtn.setAttribute('aria-expanded','false');
      }));
      document.addEventListener('click', (ev) => {
        try { if (!langBtn.contains(ev.target) && !langMenu.contains(ev.target)) { langMenu.setAttribute('aria-hidden','true'); if (langBtn) langBtn.setAttribute('aria-expanded','false'); } } catch(e){}
      });
    }
    setLanguage(currentLang);

    // theme toggle (persistente)
    const themeToggle = document.getElementById('themeToggle');
    if (localStorage.getItem(THEME_KEY) === 'light') document.documentElement.classList.add('light');
    if (themeToggle) themeToggle.addEventListener('click', ()=> {
      const isLight = document.documentElement.classList.toggle('light');
      try { localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark'); } catch(e){}
    });

    /* =========================
       11) Reveal animations (IntersectionObserver) — ahora SIEMPRE hace visibles si no hay JS
       ========================= */
    (function initReveal(){
      const els = Array.from(document.querySelectorAll('.reveal'));
      if (!els.length) return;
      // quick reveal first row for perceived load
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
    })();

    /* =========================
       12) Cross-tab sync y inicialización
       ========================= */
    window.addEventListener('storage', (ev) => {
      if (ev.key === CART_KEY) {
        cart = loadCart();
        updateMiniCartUI();
        updateCartPanelUI();
      }
    });

    // run initial UI updates
    updateMiniCartUI();
    ensureCartPanel();
    updateCartPanelUI();
    applyTranslations(currentLang);

    // dispatch event por compatibilidad
    window.dispatchEvent(new Event('cartUpdated'));

    /* =========================
       13) Expose helpers for debugging (opcional)
       ========================= */
    window.__LIXBY = {
      getCart: () => JSON.parse(JSON.stringify(cart || [])),
      clearCart: () => { cart = []; saveCart(cart); updateMiniCartUI(); updateCartPanelUI(); }
    };

  } catch (err) {
    console.error('Error en script LIXBY:', err);
    const ns = document.querySelector('noscript');
    if (ns) ns.textContent = 'Ha ocurrido un error en el script. Mira la consola (F12 → Console).';
  }
});

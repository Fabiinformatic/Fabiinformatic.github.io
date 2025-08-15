// =====================
// script.js — LIXBY (robusto, con panel de carrito integrado) — CORREGIDO
// =====================

document.addEventListener("DOMContentLoaded", () => {
  try {
    const CART_KEY = "lixby_cart_v1";
    const LANG_KEY = "lixby_lang";
    const THEME_KEY = "lixby_theme";

    // traducciones mínimas (tu objeto original)
    const translations = {
      es: {
        "nav.inicio": "Inicio",
        "nav.productos": "Productos",
        "nav.contacto": "Contáctanos",
        "nav.conocenos": "Conócenos",
        "btn.explorar": "Explorar",
        "btn.enviar": "Enviar",
        "cart.title": "Carrito",
        "cart.clear": "Vaciar",
        "cart.total": "Total:",
        "cart.checkout": "Pagar",
        "btn.add": "Añadir al carrito",
        "btn.added": "Añadido",
        "theme.toggle": "Cambiar tema",
        "cart.empty": "Tu carrito está vacío.",
        "view.cart": "Ver carrito",
        "close": "Cerrar",
        "continue.payment": "Continuar con el pago",
        "shipping.free": "GRATIS",
        "vat.label": "Incluye {vat} de IVA (21%)",
        "label.subtotal": "Subtotal",
        "label.shipping": "Envío",
        "label.your_total": "Tu total:"
      },
      en: {
        "nav.inicio": "Home",
        "nav.productos": "Products",
        "nav.contacto": "Contact",
        "nav.conocenos": "About",
        "btn.explorar": "Explore",
        "btn.enviar": "Send",
        "cart.title": "Cart",
        "cart.clear": "Clear",
        "cart.total": "Total:",
        "cart.checkout": "Checkout",
        "btn.add": "Add to cart",
        "btn.added": "Added",
        "theme.toggle": "Toggle theme",
        "cart.empty": "Your cart is empty.",
        "view.cart": "View cart",
        "close": "Close",
        "continue.payment": "Continue to payment",
        "shipping.free": "FREE",
        "vat.label": "Includes {vat} VAT (21%)",
        "label.subtotal": "Subtotal",
        "label.shipping": "Shipping",
        "label.your_total": "Your total:"
      },
      fr: {
        "nav.inicio": "Accueil",
        "nav.productos": "Produits",
        "nav.contacto": "Contact",
        "nav.conocenos": "À propos",
        "btn.explorar": "Explorer",
        "btn.enviar": "Envoyer",
        "cart.title": "Panier",
        "cart.clear": "Vider",
        "cart.total": "Total:",
        "cart.checkout": "Payer",
        "btn.add": "Ajouter au panier",
        "btn.added": "Ajouté",
        "theme.toggle": "Changer le thème",
        "cart.empty": "Votre panier est vide.",
        "view.cart": "Voir le panier",
        "close": "Fermer",
        "continue.payment": "Continuer le paiement",
        "shipping.free": "GRATUIT",
        "vat.label": "Inclut {vat} de TVA (21%)",
        "label.subtotal": "Sous-total",
        "label.shipping": "Livraison",
        "label.your_total": "Votre total :"
      }
    };

    // utilidades
    function parsePriceToNumber(priceStr) {
      if (priceStr === 0) return 0;
      if (!priceStr) return 0;
      // quita todo excepto dígitos, coma, punto y guión
      const num = String(priceStr).replace(/[^\d.,-]/g, "").replace(",", ".");
      return parseFloat(num) || 0;
    }
    function formatPriceNum(num) {
      // formateo simple con € (mantengo tu estilo)
      return (Math.round(num * 100) / 100) + "€";
    }
    function loadCart() {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch(e){ return []; }
    }
    function saveCart(cart) {
      try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch(e){}
    }

    // ajustar padding-top para que main no quede debajo del header
    function adjustBodyPaddingUnderHeader(){
      try {
        const header = document.querySelector('.nav');
        if (!header) return;
        const pad = Math.round(header.getBoundingClientRect().height + 12);
        document.body.style.paddingTop = pad + 'px';
      } catch(e){}
    }
    adjustBodyPaddingUnderHeader();
    window.addEventListener('resize', adjustBodyPaddingUnderHeader);

    // año
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // theme
    const themeToggle = document.getElementById("themeToggle");
    if (localStorage.getItem(THEME_KEY) === "light") document.documentElement.classList.add("light");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const isLight = document.documentElement.classList.toggle("light");
        try { localStorage.setItem(THEME_KEY, isLight ? "light" : "dark"); } catch(e){}
      });
    }

    // language
    let currentLang = localStorage.getItem(LANG_KEY) || 'es';
    function applyTranslations(lang){
      const map = translations[lang] || translations['es'];
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key && map[key]) el.textContent = map[key];
      });
      // actualizar botones dinámicos (si existen)
      document.querySelectorAll('.btn-add').forEach(btn => { btn.textContent = map['btn.add'] || btn.textContent; });
      const label = document.getElementById('langLabel');
      const names = { es: "Español", en: "English", fr: "Français" };
      if (label) label.textContent = names[lang] || names['es'];
    }
    function setLanguage(lang) {
      if (!translations[lang]) lang = 'es';
      currentLang = lang;
      try { localStorage.setItem(LANG_KEY, lang); } catch(e){}
      applyTranslations(lang);
      // si panel existe, actualizar sus textos
      updateCartPanelUI();
    }
    setLanguage(currentLang);

    // Mini-cart + cart panel
    let cart = loadCart();
    const cartBtn = document.getElementById("cartBtn");
    const miniCart = document.getElementById("miniCart");
    const miniCartItems = document.getElementById("miniCartItems");
    const miniCartTotal = document.getElementById("miniCartTotal");
    const cartCount = document.getElementById("cartCount");
    const clearCartBtn = document.getElementById("clearCart");
    const checkoutBtn = document.getElementById("checkoutBtn");

    // === panel de carrito dinámico (crea HTML si no existe) ===
    function ensureCartPanel(){
      if (document.getElementById('cartPanel')) return;
      const panel = document.createElement('aside');
      panel.id = 'cartPanel';
      panel.setAttribute('aria-hidden','true');
      panel.className = 'cart-panel';
      panel.innerHTML = `
        <div class="cart-panel-inner glass" role="dialog" aria-label="Carrito">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.04)">
            <strong data-i18n="cart.title">Carrito</strong>
            <div style="display:flex;gap:8px;align-items:center;">
              <button id="cartPanelClear" class="btn ghost" data-i18n="cart.clear" title="Vaciar">Vaciar</button>
              <button id="cartPanelClose" class="text-btn" aria-label="Cerrar">✕</button>
            </div>
          </div>
          <div id="cartPanelItems" style="padding:12px;max-height:56vh;overflow:auto;"></div>
          <div style="padding:12px;border-top:1px solid rgba(255,255,255,0.04);display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;"><div data-i18n="label.subtotal">Subtotal</div><div id="cartPanelSubtotal">0€</div></div>
            <div style="display:flex;justify-content:space-between;align-items:center;"><div data-i18n="label.shipping">Envío</div><div id="cartPanelShipping">${translations[currentLang]['shipping.free'] || 'GRATIS'}</div></div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:1.05rem;margin-top:8px;"><div data-i18n="label.your_total">Tu total:</div><div id="cartPanelTotal">0€</div></div>
            <div style="font-size:0.92rem;color:var(--muted);margin-top:6px;"><span id="cartPanelVAT">0€</span> <span data-i18n="vat.label">{vat}</span></div>
            <div style="display:flex;gap:8px;margin-top:8px;">
              <button id="cartPanelCheckout" class="btn primary" style="flex:1" data-i18n="continue.payment">${translations[currentLang]['continue.payment'] || 'Continuar con el pago'}</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(panel);

      // estilos mínimos si no los tienes
      if (!document.getElementById('cart-panel-styles')){
        const s = document.createElement('style');
        s.id = 'cart-panel-styles';
        s.textContent = `
          .cart-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 360px; transform: translateX(110%); transition: transform .28s ease; z-index: 220; display:flex; pointer-events:auto; }
          .cart-panel.open { transform: translateX(0); }
          .cart-panel .cart-panel-inner { width:100%; display:flex; flex-direction:column; box-sizing:border-box; height:100%; }
          @media(max-width:720px){ .cart-panel{ width:92%; } }
          .cart-panel .mini-item { display:flex; gap:10px; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.03); }
          .cart-panel .mini-item img{ width:56px; height:56px; object-fit:cover; border-radius:8px; }
          .cart-panel .text-btn { background:transparent; border:none; cursor:pointer; font-size:1rem; padding:6px; color:var(--muted); }
          .cart-panel .qty-control { display:flex; gap:6px; align-items:center; }
          #cartPanelItems .cart-row { display:flex; gap:12px; align-items:center; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.03); }
          #cartPanelItems .cart-row-img { width:72px; height:72px; object-fit:cover; border-radius:8px; flex:0 0 72px; }
          #cartPanelItems .cart-row-info { flex:1 1 auto; min-width:0; }
          #cartPanelItems .cart-row-name { font-weight:700; margin-bottom:6px; }
          #cartPanelItems .cart-row-meta { color:var(--muted); font-size:0.95rem; }
          #cartPanelItems .cart-row-price { flex:0 0 auto; font-weight:700; margin-left:12px; white-space:nowrap; }
        `;
        document.head.appendChild(s);
      }

      // eventos básicos del panel
      const closeBtn = panel.querySelector('#cartPanelClose');
      if (closeBtn) closeBtn.addEventListener('click', () => toggleCartPanel(false));
      const clearBtn = panel.querySelector('#cartPanelClear');
      if (clearBtn) clearBtn.addEventListener('click', () => { cart = []; saveCart(cart); updateMiniCartUI(); updateCartPanelUI(); });
      const checkoutBtnPanel = panel.querySelector('#cartPanelCheckout');
      if (checkoutBtnPanel) checkoutBtnPanel.addEventListener('click', () => {
        if (!cart || cart.length === 0) return alert(translations[currentLang]['cart.empty'] || 'El carrito está vacío');
        alert(`Simulación de checkout — artículos: ${cart.reduce((s,i)=>s+(i.qty||0),0)} — Total: ${panel.querySelector('#cartPanelTotal') ? panel.querySelector('#cartPanelTotal').textContent : ''}`);
      });

      // cerrar con Escape
      document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') toggleCartPanel(false); });
    }

    // toggle cart panel + backdrop
    function toggleCartPanel(open){
      ensureCartPanel();
      const panel = document.getElementById('cartPanel');
      const backdrop = document.getElementById('cartBackdrop');
      if (!panel) return;
      const show = (typeof open === 'boolean') ? open : !panel.classList.contains('open');
      panel.setAttribute('aria-hidden', String(!show));
      panel.classList.toggle('open', show);

      // backdrop handling (if exists in DOM)
      if (backdrop) {
        backdrop.classList.toggle('open', show);
        backdrop.setAttribute('aria-hidden', String(!show));
      } else {
        // crear backdrop si no existe (para accesibilidad y bloqueo scroll)
        if (show) {
          const b = document.createElement('div');
          b.id = 'cartBackdrop';
          b.className = 'cart-backdrop open';
          b.setAttribute('aria-hidden','false');
          b.style.position = 'fixed';
          b.style.inset = '0';
          b.style.background = 'rgba(0,0,0,0.45)';
          b.style.zIndex = '210';
          document.body.appendChild(b);
          b.addEventListener('click', ()=> toggleCartPanel(false));
        } else {
          const existing = document.getElementById('cartBackdrop');
          if (existing) existing.remove();
        }
      }

      // bloquear scroll cuando abierto
      if (show) document.documentElement.style.overflow = 'hidden';
      else document.documentElement.style.overflow = '';
      if (show) updateCartPanelUI();
    }

    // mini-cart render (pop)
    function updateMiniCartUI(){
      try {
        if (cartCount) cartCount.textContent = cart.reduce((s,i)=>s+(i.qty||0),0);
        if (!miniCartItems) return;
        miniCartItems.innerHTML = '';
        if (!cart || cart.length === 0) {
          miniCartItems.innerHTML = `<div style="padding:8px;color:var(--muted)">${translations[currentLang]['cart.empty']}</div>`;
          if (miniCartTotal) miniCartTotal.textContent = '0€';
          return;
        }
        let total = 0;
        cart.forEach((it, idx) => {
          const item = document.createElement('div');
          item.className = 'mini-cart-item';
          item.style.display = 'flex'; item.style.gap = '10px'; item.style.alignItems = 'center';
          const img = document.createElement('img');
          img.src = it.image || 'https://via.placeholder.com/80x80?text=Img';
          img.alt = it.name;
          img.style.width = '48px'; img.style.height = '48px'; img.style.objectFit = 'cover'; img.style.borderRadius = '8px';
          const meta = document.createElement('div');
          meta.style.flex = '1';
          meta.innerHTML = `<div style="font-weight:700">${it.name}</div><div style="color:var(--muted)">${it.price} x${it.qty||1}</div>`;
          const remove = document.createElement('button');
          remove.className = 'remove';
          remove.textContent = '✕';
          remove.style.background = 'transparent'; remove.style.border = 'none'; remove.style.cursor = 'pointer';
          remove.addEventListener('click', () => { cart.splice(idx,1); saveCart(cart); updateMiniCartUI(); updateCartPanelUI(); });
          item.appendChild(img); item.appendChild(meta); item.appendChild(remove);
          miniCartItems.appendChild(item);
          total += (it.priceNum || parsePriceToNumber(it.price)) * (it.qty || 1);
        });
        if (miniCartTotal) miniCartTotal.textContent = formatPriceNum(total);
      } catch(e){ console.warn('updateMiniCartUI error', e); }
    }

    // panel UI que renderiza filas + totales + IVA
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

      // actualizar textos traducibles del panel
      if (shippingEl) shippingEl.textContent = translations[currentLang]['shipping.free'] || shippingEl.textContent;

      list.innerHTML = '';
      if (!cart || cart.length === 0) {
        list.innerHTML = `<div style="padding:12px;color:var(--muted)">${translations[currentLang]['cart.empty']}</div>`;
        subtotalEl.textContent = '0€';
        totalEl.textContent = '0€';
        vatEl.textContent = '0€';
        // vat label
        const vatLabelSpan = panel.querySelector('[data-i18n="vat.label"]');
        if (vatLabelSpan) vatLabelSpan.textContent = translations[currentLang]['vat.label'].replace('{vat}', formatPriceNum(0));
        return;
      }
      let subtotal = 0;
      cart.forEach((it, idx) => {
        const priceNum = (it.priceNum !== undefined) ? it.priceNum : parsePriceToNumber(it.price);
        const qty = it.qty || 1;
        subtotal += priceNum * qty;
        const row = document.createElement('div');
        row.className = 'cart-row';
        row.innerHTML = `
          <img class="cart-row-img" src="${it.image || 'https://via.placeholder.com/120'}" alt="${(it.name||'Producto').replace(/"/g,'')}" />
          <div class="cart-row-info">
            <div class="cart-row-name">${it.name || 'Producto'}</div>
            <div class="cart-row-meta">Cantidad: <strong>${qty}</strong></div>
          </div>
          <div class="cart-row-price">${formatPriceNum(priceNum * qty)}</div>
        `;
        list.appendChild(row);
      });
      const shipping = 0;
      const total = subtotal + shipping;
      const vatRate = 0.21;
      const vatAmount = Math.round((total - total / (1 + vatRate)) * 100) / 100;
      subtotalEl.textContent = formatPriceNum(subtotal);
      totalEl.textContent = formatPriceNum(total);
      vatEl.textContent = formatPriceNum(vatAmount);
      // actualizar VAT label textual (ej: "Incluye 166,44 € de IVA (21%)")
      const vatLabelSpan = panel.querySelector('[data-i18n="vat.label"]');
      if (vatLabelSpan) {
        const tpl = translations[currentLang]['vat.label'] || translations['es']['vat.label'];
        vatLabelSpan.textContent = tpl.replace('{vat}', formatPriceNum(vatAmount));
      }
      // mini-cart total y contador
      if (miniCartTotal) miniCartTotal.textContent = formatPriceNum(subtotal);
      if (cartCount) cartCount.textContent = cart.reduce((s,i)=>s+(i.qty||0),0);
    }

    // Exponer addToCart para que fichas / index usen
    window.addToCart = function(product){
      if (!product || !product.id) return;
      const existing = cart.find(p => p.id === product.id);
      if (existing) existing.qty = (existing.qty||1) + 1;
      else cart.push({ id: product.id, name: product.name || "Producto", price: product.price || "0€", priceNum: parsePriceToNumber(product.price), qty: 1, image: product.image || "" });
      saveCart(cart);
      updateMiniCartUI();
      updateCartPanelUI();
      // mostrar mini-cart brevemente
      if (miniCart) { miniCart.setAttribute('aria-hidden','false'); setTimeout(()=>miniCart.setAttribute('aria-hidden','true'), 2200); }
    };

    // Robust cart button handling: toggle miniCart if present, otherwise open cartPanel
    function handleCartBtnClick(e) {
      try {
        if (miniCart) {
          const isShown = miniCart.getAttribute('aria-hidden') === 'false';
          miniCart.setAttribute('aria-hidden', String(!isShown));
          if (e && e.stopPropagation) e.stopPropagation();
          return;
        }
        // fallback: open cart panel drawer
        toggleCartPanel(true);
      } catch (err) {
        console.warn('handleCartBtnClick error', err);
        toggleCartPanel(true);
      }
    }

    // If cartBtn exists now, attach directly
    if (cartBtn) {
      cartBtn.addEventListener('click', handleCartBtnClick);
    } else {
      // attach delegated handler in case the element is added later
      document.addEventListener('click', function delegatedCartClick(ev){
        const target = ev.target;
        if (!target) return;
        const btn = (target.closest && target.closest('#cartBtn')) ? target.closest('#cartBtn') : null;
        if (btn) handleCartBtnClick(ev);
      });
    }

    // Close miniCart when clicking outside (only if miniCart exists)
    document.addEventListener('click', (e) => {
      try {
        if (!miniCart) return;
        if (cartBtn && !cartBtn.contains(e.target) && !miniCart.contains(e.target)) {
          miniCart.setAttribute('aria-hidden', 'true');
        }
      } catch(e){ /* silent */ }
    });

    // clear / checkout
    if (clearCartBtn) clearCartBtn.addEventListener('click', ()=> { cart = []; saveCart(cart); updateMiniCartUI(); updateCartPanelUI(); });
    if (checkoutBtn) checkoutBtn.addEventListener('click', ()=> { if (cart.length===0) return alert(translations[currentLang]['cart.empty']); alert(`Simulación checkout — artículos: ${cart.reduce((s,i)=>s+(i.qty||0),0)}`); });

    // viewCartBtn dentro del miniCart (puede no existir en todas las páginas)
    document.addEventListener('click', (ev) => {
      const el = ev.target;
      if (!el) return;
      if (el.id === 'viewCartBtn' || (el.closest && el.closest('#viewCartBtn'))) {
        toggleCartPanel(true);
      }
    });

    // init cart UIs
    updateMiniCartUI();
    ensureCartPanel();
    updateCartPanelUI();

    // tarjetas click (redirigen a ficha)
    try {
      const cardEls = Array.from(document.querySelectorAll(".card[data-product]"));
      cardEls.forEach(card => {
        card.style.transition = card.style.transition || "transform 0.22s ease";
        const onMove = (e) => {
          const rect = card.getBoundingClientRect();
          const cx = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
          const cy = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
          const x = cx - rect.left; const y = cy - rect.top;
          const moveX = (x / rect.width - 0.5) * 6; const moveY = (y / rect.height - 0.5) * 6;
          card.style.transform = `translateY(-8px) rotateX(${moveY}deg) rotateY(${moveX}deg)`;
        };
        const onLeave = () => card.style.transform = "translateY(0) rotateX(0) rotateY(0)";
        card.addEventListener("mousemove", onMove); card.addEventListener("mouseleave", onLeave);
        card.addEventListener("touchstart", ()=> card.style.transform = "translateY(-8px)");
        card.addEventListener("touchend", onLeave);
        card.addEventListener("click", (e) => {
          if (e.target.closest("button, a, input, textarea, select")) return;
          const pid = card.getAttribute("data-product");
          if (pid) window.location.href = `producto.html?id=${encodeURIComponent(pid)}`;
        });
      });
    } catch(e){ console.warn("cards init error", e); }

    // language menu interactions (if present)
    const langBtn = document.getElementById("langBtn");
    const langMenu = document.getElementById("langMenu");
    if (langBtn && langMenu) {
      langBtn.addEventListener("click", (e) => {
        const isHidden = langMenu.getAttribute('aria-hidden') === 'true' || langMenu.getAttribute('aria-hidden') === null;
        langMenu.setAttribute('aria-hidden', String(!isHidden));
        langBtn.setAttribute('aria-expanded', String(!isHidden));
      });
      langMenu.querySelectorAll("[data-lang]").forEach(b => {
        b.addEventListener("click", () => {
          const l = b.getAttribute("data-lang");
          setLanguage(l);
          langMenu.setAttribute("aria-hidden", "true");
          if (langBtn) langBtn.setAttribute("aria-expanded", "false");
          updateMiniCartUI();
          updateCartPanelUI();
        });
      });
      document.addEventListener("click", (ev) => {
        try {
          if (!langBtn.contains(ev.target) && !langMenu.contains(ev.target)) {
            langMenu.setAttribute('aria-hidden', 'true');
            if (langBtn) langBtn.setAttribute('aria-expanded', 'false');
          }
        } catch(e){}
      });
    }

    // aplicar traducciones globales (inicial)
    applyTranslations(currentLang);

    // ---------------------------
    // REVEAL / animaciones: si tienes .reveal en HTML, las hacemos visibles con IntersectionObserver
    // Así evitamos que toda la página quede ocultada por CSS (.reveal {opacity:0})
    // ---------------------------
    (function initReveal(){
      const revealEls = Array.from(document.querySelectorAll('.reveal'));
      if (!revealEls.length) return;
      // añadir visible inmediatamente para pantalla principal (suaviza con delay)
      setTimeout(()=> {
        revealEls.slice(0, 6).forEach(el => el.classList.add('visible'));
      }, 40);
      // observer para el resto
      if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver((entries, o) => {
          entries.forEach(en => {
            if (en.isIntersecting) {
              en.target.classList.add('visible');
              o.unobserve(en.target);
            }
          });
        }, { root: null, rootMargin: '0px', threshold: 0.12 });
        revealEls.forEach(el => {
          if (!el.classList.contains('visible')) obs.observe(el);
        });
      } else {
        // fallback: mostrar todo
        revealEls.forEach(el => el.classList.add('visible'));
      }
    })();

    // sincronizar cambios cross-tab (ej. otra pestaña actualiza el carrito)
    window.addEventListener('storage', (ev) => {
      if (ev.key === CART_KEY) {
        cart = loadCart();
        updateMiniCartUI();
        updateCartPanelUI();
      }
    });

    // expone un evento por si otras partes de la app quieren forzar re-render
    window.dispatchEvent(new Event('cartUpdated'));

  } catch (err) {
    console.error("Script principal fallo:", err);
    const ns = document.querySelector("noscript");
    if (ns) ns.innerText = "Ha ocurrido un error en el script. Abre la consola (F12 → Console) para ver detalles.";
  }
});

// =====================
// script.js — LIXBY (robusto, con panel de carrito)
// =====================

document.addEventListener("DOMContentLoaded", () => {
  try {
    const CART_KEY = "lixby_cart_v1";
    const LANG_KEY = "lixby_lang";
    const THEME_KEY = "lixby_theme";

    // traducciones mínimas
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
        "close": "Cerrar"
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
        "close": "Close"
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
        "close": "Fermer"
      }
    };

    // utilidades
    function parsePriceToNumber(priceStr) {
      if (!priceStr) return 0;
      const num = String(priceStr).replace(/[^\d.,-]/g, "").replace(",", ".");
      return parseFloat(num) || 0;
    }
    function formatPriceNum(num) {
      return (Math.round(num * 100) / 100) + "€";
    }
    function loadCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch(e){ return []; } }
    function saveCart(cart) { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch(e){} }

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
    const LANG_CURRENT = localStorage.getItem(LANG_KEY) || 'es';
    function applyTranslations(lang){
      const map = translations[lang] || translations['es'];
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key && map[key]) el.textContent = map[key];
      });
      // actualizar botones dinámicos (si existen)
      document.querySelectorAll('.btn-add').forEach(btn => { btn.textContent = map['btn.add'] || btn.textContent; });
    }
    applyTranslations(LANG_CURRENT);

    // Mini-cart + cart panel (persistente)
    let cart = loadCart();
    const cartBtn = document.getElementById("cartBtn");
    const miniCart = document.getElementById("miniCart");
    const miniCartItems = document.getElementById("miniCartItems");
    const miniCartTotal = document.getElementById("miniCartTotal");
    const cartCount = document.getElementById("cartCount");
    const clearCartBtn = document.getElementById("clearCart");
    const checkoutBtn = document.getElementById("checkoutBtn");

    // Crea panel de carrito (drawer) si no existe
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
            <button id="cartPanelClose" class="text-btn" aria-label="Cerrar">✕</button>
          </div>
          <div id="cartPanelItems" style="padding:12px;max-height:60vh;overflow:auto;"></div>
          <div style="padding:12px;border-top:1px solid rgba(255,255,255,0.04);display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;"><strong>Total</strong><span id="cartPanelTotal">0€</span></div>
            <div style="display:flex;gap:8px;">
              <button id="cartPanelCheckout" class="btn primary">Pagar</button>
              <button id="cartPanelClear" class="btn ghost">Vaciar</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(panel);

      // estilos-inject mínimos para el drawer
      if (!document.getElementById('cart-panel-styles')){
        const s = document.createElement('style');
        s.id = 'cart-panel-styles';
        s.textContent = `
          .cart-panel { position:fixed; top:0; right:0; bottom:0; width:360px; transform:translateX(110%); transition:transform .28s ease; z-index:220; display:flex; align-items:flex-end; pointer-events:auto; }
          .cart-panel.open { transform:translateX(0); }
          .cart-panel .cart-panel-inner { width:100%; height:100%; display:flex; flex-direction:column; box-sizing:border-box; }
          @media(max-width:720px){ .cart-panel{ width:92%; } }
          .cart-panel .mini-item { display:flex; gap:10px; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.03); }
          .cart-panel .mini-item img{ width:56px; height:56px; object-fit:cover; border-radius:8px; }
          .cart-panel .qty-control { display:flex; gap:6px; align-items:center; }
          .cart-panel .text-btn { background:transparent; border:none; cursor:pointer; font-size:1rem; padding:6px; }
        `;
        document.head.appendChild(s);
      }

      // eventos del panel
      document.getElementById('cartPanelClose').addEventListener('click', () => toggleCartPanel(false));
      document.getElementById('cartPanelClear').addEventListener('click', () => { cart = []; saveCart(cart); updateMiniCartUI(); updateCartPanelUI(); });
      document.getElementById('cartPanelCheckout').addEventListener('click', () => {
        if (cart.length === 0) return alert(translations[localStorage.getItem(LANG_KEY) || 'es']['cart.empty'] || 'El carrito está vacío');
        alert('Simulación de checkout — artículos: ' + cart.reduce((s,i)=>s + (i.qty||0), 0));
      });
      // cerrar con escape
      document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') toggleCartPanel(false); });
    }

    function toggleCartPanel(open){
      ensureCartPanel();
      const panel = document.getElementById('cartPanel');
      if (!panel) return;
      const show = (typeof open === 'boolean') ? open : (panel.classList.contains('open') === false);
      panel.setAttribute('aria-hidden', String(!show));
      panel.classList.toggle('open', show);
      if (show) updateCartPanelUI();
    }

    // render mini-cart (pequeño pop)
    function updateMiniCartUI(){
      try {
        if (cartCount) cartCount.textContent = cart.reduce((s,i)=>s+(i.qty||0),0);
        if (!miniCartItems) return;
        miniCartItems.innerHTML = '';
        if (cart.length === 0) {
          miniCartItems.innerHTML = `<div style="padding:8px;color:var(--muted)">${translations[localStorage.getItem(LANG_KEY)||'es']['cart.empty']}</div>`;
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

    // panel UI
    function updateCartPanelUI(){
      ensureCartPanel();
      const list = document.getElementById('cartPanelItems');
      const totalEl = document.getElementById('cartPanelTotal');
      if (!list || !totalEl) return;
      list.innerHTML = '';
      if (!cart || cart.length === 0) {
        list.innerHTML = `<div style="padding:12px;color:var(--muted)">${translations[localStorage.getItem(LANG_KEY)||'es']['cart.empty']}</div>`;
        totalEl.textContent = '0€';
        return;
      }
      let total = 0;
      cart.forEach((it, idx) => {
        const row = document.createElement('div');
        row.className = 'mini-item';
        row.innerHTML = `
          <img src="${it.image || 'https://via.placeholder.com/120'}" alt="${it.name}">
          <div style="flex:1">
            <div style="font-weight:700">${it.name}</div>
            <div style="color:var(--muted)">${it.price} × <span class="qty">${it.qty||1}</span></div>
            <div style="margin-top:6px;display:flex;gap:8px;align-items:center;">
              <div class="qty-control">
                <button class="dec text-btn" data-idx="${idx}">−</button>
                <button class="inc text-btn" data-idx="${idx}">+</button>
                <button class="remove text-btn" data-idx="${idx}">Eliminar</button>
              </div>
            </div>
          </div>
        `;
        list.appendChild(row);
        total += (it.priceNum || parsePriceToNumber(it.price)) * (it.qty || 1);
      });
      totalEl.textContent = formatPriceNum(total);

      // attach events
      list.querySelectorAll('.inc').forEach(b => b.addEventListener('click', (ev) => {
        const idx = Number(ev.currentTarget.getAttribute('data-idx'));
        if (!isNaN(idx) && cart[idx]) { cart[idx].qty = (cart[idx].qty||1)+1; saveCart(cart); updateCartPanelUI(); updateMiniCartUI(); }
      }));
      list.querySelectorAll('.dec').forEach(b => b.addEventListener('click', (ev) => {
        const idx = Number(ev.currentTarget.getAttribute('data-idx'));
        if (!isNaN(idx) && cart[idx]) { cart[idx].qty = Math.max(1,(cart[idx].qty||1)-1); saveCart(cart); updateCartPanelUI(); updateMiniCartUI(); }
      }));
      list.querySelectorAll('.remove').forEach(b => b.addEventListener('click', (ev) => {
        const idx = Number(ev.currentTarget.getAttribute('data-idx'));
        if (!isNaN(idx)) { cart.splice(idx,1); saveCart(cart); updateCartPanelUI(); updateMiniCartUI(); }
      }));
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

    // eventos básicos
    if (cartBtn && miniCart) {
      cartBtn.addEventListener('click', () => {
        const shown = miniCart.getAttribute('aria-hidden') === 'false';
        miniCart.setAttribute('aria-hidden', String(!shown));
      });
      document.addEventListener('click', (e) => {
        if (cartBtn && miniCart && !cartBtn.contains(e.target) && !miniCart.contains(e.target)) {
          miniCart.setAttribute('aria-hidden', 'true');
        }
      });
    }
    if (clearCartBtn) clearCartBtn.addEventListener('click', ()=> { cart = []; saveCart(cart); updateMiniCartUI(); updateCartPanelUI(); });
    if (checkoutBtn) checkoutBtn.addEventListener('click', ()=> { if (cart.length===0) return alert(translations[localStorage.getItem(LANG_KEY)||'es']['cart.empty']); alert(`Simulación checkout — artículos: ${cart.reduce((s,i)=>s+(i.qty||0),0)}`); });

    // viewCartBtn dentro del miniCart (pudo no estar en algunas páginas)
    document.addEventListener('click', (ev) => {
      const el = ev.target;
      if (el && (el.id === 'viewCartBtn' || el.closest && el.closest('#viewCartBtn'))) {
        toggleCartPanel(true);
      }
    });

    // init cart UIs
    updateMiniCartUI();
    ensureCartPanel();

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

    // aplicar traducciones globales
    applyTranslations(localStorage.getItem(LANG_KEY) || 'es');

  } catch (err) {
    console.error("Script principal fallo:", err);
    const ns = document.querySelector("noscript");
    if (ns) ns.innerText = "Ha ocurrido un error en el script. Abre la consola (F12 → Console) para ver detalles.";
  }
});

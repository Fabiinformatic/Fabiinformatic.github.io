// =====================
// script.js — LIXBY (robusto, corregido)
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
        "cart.empty": "Tu carrito está vacío."
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
        "cart.empty": "Your cart is empty."
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
        "cart.empty": "Votre panier est vide."
      }
    };

    // utilidades seguras
    function parsePriceToNumber(priceStr) {
      if (!priceStr) return 0;
      const num = String(priceStr).replace(/[^\d.,-]/g, "").replace(",", ".");
      return parseFloat(num) || 0;
    }
    function formatPriceNum(num) {
      return (Math.round(num * 100) / 100) + "€";
    }
    function loadCart() {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
    }
    function saveCart(cart) { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch(e){} }

    // año
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // theme persistente
    const themeToggle = document.getElementById("themeToggle");
    if (localStorage.getItem(THEME_KEY) === "light") document.documentElement.classList.add("light");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const isLight = document.documentElement.classList.toggle("light");
        try { localStorage.setItem(THEME_KEY, isLight ? "light" : "dark"); } catch(e){}
      });
    }

    // i18n: aplica traducciones para claves data-i18n
    function applyTranslations(lang) {
      try {
        const map = translations[lang] || translations["es"];
        document.querySelectorAll("[data-i18n]").forEach(el => {
          const key = el.getAttribute("data-i18n");
          if (key && map[key]) el.textContent = map[key];
        });
        // botones dinámicos (añadidos en fichas)
        document.querySelectorAll(".btn-add").forEach(btn => {
          btn.textContent = map["btn.add"] || btn.textContent;
        });
        // mini-cart texts
        document.querySelectorAll("[data-i18n='cart.title']").forEach(el => el.textContent = map["cart.title"] || el.textContent);
        document.querySelectorAll("[data-i18n='cart.clear']").forEach(el => el.textContent = map["cart.clear"] || el.textContent);
        document.querySelectorAll("[data-i18n='cart.checkout']").forEach(el => el.textContent = map["cart.checkout"] || el.textContent);

        // actualiza title en toggle tema si existe
        if (themeToggle) themeToggle.title = map["theme.toggle"] || themeToggle.title;
      } catch (e) {
        console.warn("applyTranslations error", e);
      }
    }
    // exponer por si la ficha necesita llamarlo
    window.applyTranslations = applyTranslations;

    function setLanguage(lang) {
      if (!translations[lang]) lang = "es";
      try { localStorage.setItem(LANG_KEY, lang); } catch(e){}
      const label = document.getElementById("langLabel");
      const names = { es: "Español", en: "English", fr: "Français" };
      if (label) label.textContent = names[lang] || names["es"];
      applyTranslations(lang);
    }

    // init language
    setLanguage(localStorage.getItem(LANG_KEY) || "es");

    // language menu interactions
    const langBtn = document.getElementById("langBtn");
    const langMenu = document.getElementById("langMenu");
    if (langBtn && langMenu) {
      langBtn.addEventListener("click", (e) => {
        const hidden = langMenu.getAttribute("aria-hidden") !== "false";
        langMenu.setAttribute("aria-hidden", String(!hidden));
        langBtn.setAttribute("aria-expanded", String(hidden));
      });
      langMenu.querySelectorAll("[data-lang]").forEach(b => {
        b.addEventListener("click", () => {
          const l = b.getAttribute("data-lang");
          setLanguage(l);
          langMenu.setAttribute("aria-hidden", "true");
          langBtn.setAttribute("aria-expanded", "false");
        });
      });
      document.addEventListener("click", (ev) => {
        if (!langBtn.contains(ev.target) && !langMenu.contains(ev.target)) {
          langMenu.setAttribute("aria-hidden", "true");
          langBtn.setAttribute("aria-expanded", "false");
        }
      });
    }

    // mini-cart
    let cart = loadCart();
    const cartBtn = document.getElementById("cartBtn");
    const miniCart = document.getElementById("miniCart");
    const miniCartItems = document.getElementById("miniCartItems");
    const miniCartTotal = document.getElementById("miniCartTotal");
    const cartCount = document.getElementById("cartCount");
    const clearCartBtn = document.getElementById("clearCart");
    const checkoutBtn = document.getElementById("checkoutBtn");

    function updateMiniCartUI() {
      try {
        if (cartCount) cartCount.textContent = cart.reduce((s,i)=>s+(i.qty||0),0);
        if (!miniCartItems) return;
        miniCartItems.innerHTML = "";
        if (cart.length === 0) {
          miniCartItems.innerHTML = `<div style="padding:8px;color:var(--muted)">${translations[localStorage.getItem(LANG_KEY) || "es"]["cart.empty"] || "Tu carrito está vacío."}</div>`;
          if (miniCartTotal) miniCartTotal.textContent = "0€";
          return;
        }
        let total = 0;
        cart.forEach((it, idx) => {
          const item = document.createElement("div");
          item.className = "mini-cart-item";
          item.style.display = "flex"; item.style.gap = "10px"; item.style.alignItems = "center";

          const img = document.createElement("img");
          img.src = it.image || "https://via.placeholder.com/80x80?text=Img";
          img.alt = it.name;
          img.style.width = "48px"; img.style.height = "48px"; img.style.objectFit = "cover"; img.style.borderRadius = "8px";

          const meta = document.createElement("div");
          meta.style.flex = "1";
          meta.innerHTML = `<div style="font-weight:700">${it.name}</div><div style="color:var(--muted)">${it.price} x${it.qty||1}</div>`;

          const remove = document.createElement("button");
          remove.className = "remove";
          remove.textContent = "✕";
          remove.style.background = "transparent"; remove.style.border = "none"; remove.style.cursor = "pointer";
          remove.addEventListener("click", () => { cart.splice(idx,1); saveCart(cart); updateMiniCartUI(); });

          item.appendChild(img); item.appendChild(meta); item.appendChild(remove);
          miniCartItems.appendChild(item);
          total += (it.priceNum || parsePriceToNumber(it.price)) * (it.qty || 1);
        });
        if (miniCartTotal) miniCartTotal.textContent = formatPriceNum(total);
      } catch (e) {
        console.warn("updateMiniCartUI error", e);
      }
    }

    if (cartBtn && miniCart) {
      cartBtn.addEventListener("click", () => {
        const shown = miniCart.getAttribute("aria-hidden") === "false";
        miniCart.setAttribute("aria-hidden", String(!shown));
      });
      document.addEventListener("click", (e) => {
        if (!cartBtn.contains(e.target) && !miniCart.contains(e.target)) {
          miniCart.setAttribute("aria-hidden", "true");
        }
      });
    }
    if (clearCartBtn) clearCartBtn.addEventListener("click", ()=> { cart = []; saveCart(cart); updateMiniCartUI(); });
    if (checkoutBtn) checkoutBtn.addEventListener("click", ()=> { if (cart.length===0) return alert("El carrito está vacío"); alert(`Simulación checkout — artículos: ${cart.reduce((s,i)=>s+(i.qty||0),0)}`); });

    // exponer addToCart para que la ficha pueda usarla
    window.addToCart = function(product) {
      if (!product || !product.id) return;
      const existing = cart.find(p => p.id === product.id);
      if (existing) existing.qty = (existing.qty||1) + 1;
      else cart.push({ id: product.id, name: product.name || "Producto", price: product.price || "0€", priceNum: parsePriceToNumber(product.price), qty: 1, image: product.image || "" });
      saveCart(cart);
      updateMiniCartUI();
      if (miniCart) { miniCart.setAttribute("aria-hidden","false"); setTimeout(()=>miniCart.setAttribute("aria-hidden","true"), 2200); }
    };

    updateMiniCartUI();

    // tarjeta tilt + click
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

    // asegurar que las traducciones se aplican después de posibles cambios dinámicos
    applyTranslations(localStorage.getItem(LANG_KEY) || "es");

  } catch (err) {
    console.error("Script principal fallo:", err);
    // No romper la página: mostramos un mensaje visible
    const ns = document.querySelector("noscript");
    if (ns) ns.innerText = "Ha ocurrido un error en el script. Abre la consola (F12 → Console) para ver detalles.";
  }
}); // DOMContentLoaded end

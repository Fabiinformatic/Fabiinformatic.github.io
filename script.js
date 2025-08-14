// =====================
// script.js — LIXBY (unificado y corregido)
// =====================

document.addEventListener("DOMContentLoaded", () => {
  /* ---------------------------
     Utilidades y constantes
     --------------------------- */
  const CART_KEY = "lixby_cart_v1";
  const LANG_KEY = "lixby_lang";
  const THEME_KEY = "lixby_theme";

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
      "btn.added": "Añadido"
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
      "btn.added": "Added"
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
      "btn.added": "Ajouté"
    }
  };

  /* ---------------------------
     Helpers (precio, storage)
     --------------------------- */
  function parsePriceToNumber(priceStr) {
    if (!priceStr) return 0;
    const num = priceStr.toString().replace(/[^\d.,-]/g, "").replace(",", ".");
    return parseFloat(num) || 0;
  }
  function formatPriceNum(num) {
    return (Math.round(num * 100) / 100) + "€";
  }
  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }
  function setLocalTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
  }
  function setLocalLang(lang) {
    localStorage.setItem(LANG_KEY, lang);
  }

  /* ---------------------------
     Año automático (index & producto)
     --------------------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------
     Smooth scroll para anchors internos
     --------------------------- */
  document.querySelectorAll('header nav a').forEach(link => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href") || "";
      if (href.startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const headerOffset = 60;
          const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }
    });
  });

  /* ---------------------------
     Theme toggle (persistente)
     --------------------------- */
  const themeToggle = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "light") document.documentElement.classList.add("light");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isLight = document.documentElement.classList.toggle("light");
      setLocalTheme(isLight ? "light" : "dark");
    });
  }

  /* ---------------------------
     I18N: selector básico + apply translations
     --------------------------- */
  const langBtn = document.getElementById("langBtn");
  const langMenu = document.getElementById("langMenu");
  const langLabel = document.getElementById("langLabel");
  const savedLang = localStorage.getItem(LANG_KEY) || "es";

  function applyTranslations(lang) {
    const mapping = translations[lang] || translations["es"];
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (mapping[key]) el.textContent = mapping[key];
    });
    // update add-to-cart buttons if present
    document.querySelectorAll(".btn-add").forEach(btn => {
      btn.textContent = mapping["btn.add"] || btn.textContent;
    });
  }
  function setLanguage(lang) {
    setLocalLang(lang);
    applyTranslations(lang);
    if (langLabel) {
      const names = { es: "Español", en: "English", fr: "Français" };
      langLabel.textContent = names[lang] || names["es"];
    }
    if (langMenu) langMenu.setAttribute("aria-hidden", "true");
    if (langBtn) langBtn.setAttribute("aria-expanded", "false");
  }
  setLanguage(savedLang);

  if (langBtn && langMenu) {
    langBtn.addEventListener("click", () => {
      const expanded = langBtn.getAttribute("aria-expanded") === "true";
      langBtn.setAttribute("aria-expanded", String(!expanded));
      langMenu.setAttribute("aria-hidden", String(expanded));
    });
    langMenu.querySelectorAll(".lang-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const l = btn.getAttribute("data-lang");
        setLanguage(l);
      });
    });
    // click fuera para cerrar
    document.addEventListener("click", (e) => {
      if (!langBtn.contains(e.target) && !langMenu.contains(e.target)) {
        if (langMenu) langMenu.setAttribute("aria-hidden", "true");
        if (langBtn) langBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------------------------
     Reveal: IntersectionObserver para .reveal
     --------------------------- */
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    }, { threshold: 0.1 });
    revealEls.forEach(el => io.observe(el));
  }

  /* ---------------------------
     Tarjetas: tilt / hover / click -> producto
     --------------------------- */
  const cards = Array.from(document.querySelectorAll(".card[data-product]"));
  cards.forEach(card => {
    card.style.transition = card.style.transition || "transform 0.22s ease";

    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const moveX = (x / rect.width - 0.5) * 6;
      const moveY = (y / rect.height - 0.5) * 6;
      card.style.transform = `translateY(-8px) rotateX(${moveY}deg) rotateY(${moveX}deg)`;
    };
    const onLeave = () => { card.style.transform = "translateY(0) rotateX(0) rotateY(0)"; };

    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
    card.addEventListener("touchstart", () => card.style.transform = "translateY(-8px)");
    card.addEventListener("touchend", onLeave);

    // click / keyboard access to go to product page
    card.addEventListener("click", (e) => {
      if (e.target.closest("button, a, input, textarea, select")) return;
      const pid = card.getAttribute("data-product");
      if (pid) window.location.href = `producto.html?id=${encodeURIComponent(pid)}`;
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.click(); }
    });
  });

  /* ---------------------------
     Logo behavior (reload on index, go to index on other pages)
     --------------------------- */
  const logo = document.querySelector(".brand");
  if (logo) {
    logo.style.cursor = "pointer";
    logo.addEventListener("click", () => {
      const path = window.location.pathname.toLowerCase();
      if (path.endsWith("/") || path.endsWith("index.html")) location.reload();
      else window.location.href = "index.html";
    });
  }

  /* ---------------------------
     MINI-CART: UI + logic (works if elements present)
     Exposes window.addToCart({id,name,price,image})
     --------------------------- */
  let cart = loadCart();
  const cartBtn = document.getElementById("cartBtn");
  const miniCart = document.getElementById("miniCart");
  const miniCartItems = document.getElementById("miniCartItems");
  const miniCartTotal = document.getElementById("miniCartTotal");
  const cartCount = document.getElementById("cartCount");
  const clearCartBtn = document.getElementById("clearCart");
  const checkoutBtn = document.getElementById("checkoutBtn");

  function updateMiniCartUI() {
    if (cartCount) {
      const totalQty = cart.reduce((s, i) => s + (i.qty || 0), 0);
      cartCount.textContent = totalQty;
    }
    if (!miniCartItems) return;
    miniCartItems.innerHTML = "";
    if (cart.length === 0) {
      miniCartItems.innerHTML = `<div style="padding:8px;color:var(--muted)">Tu carrito está vacío.</div>`;
      if (miniCartTotal) miniCartTotal.textContent = "0€";
      return;
    }
    let total = 0;
    cart.forEach((it, idx) => {
      const item = document.createElement("div");
      item.className = "mini-cart-item";
      item.style.display = "flex";
      item.style.gap = "10px";
      item.style.alignItems = "center";
      item.style.padding = "8px";
      item.style.borderRadius = "8px";

      const img = document.createElement("img");
      img.src = it.image || "https://via.placeholder.com/80x80?text=Img";
      img.alt = it.name;
      img.style.width = "44px";
      img.style.height = "44px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "6px";

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.innerHTML = `<div style="font-weight:700">${it.name}</div><div style="color:var(--muted)">${it.price} x${it.qty||1}</div>`;

      const remove = document.createElement("button");
      remove.className = "remove";
      remove.textContent = "✕";
      remove.title = "Eliminar";
      remove.style.background = "transparent";
      remove.style.border = "none";
      remove.style.cursor = "pointer";
      remove.addEventListener("click", () => {
        cart.splice(idx, 1);
        saveCart(cart);
        updateMiniCartUI();
      });

      item.appendChild(img);
      item.appendChild(meta);
      item.appendChild(remove);
      miniCartItems.appendChild(item);

      total += (it.priceNum || parsePriceToNumber(it.price)) * (it.qty || 1);
    });
    if (miniCartTotal) miniCartTotal.textContent = formatPriceNum(total);
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
  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", () => {
      cart = [];
      saveCart(cart);
      updateMiniCartUI();
    });
  }
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      if (cart.length === 0) return alert("El carrito está vacío");
      alert(`Simulación checkout — artículos: ${cart.reduce((s,i)=>s+(i.qty||0),0)} (demo).`);
    });
  }

  // función pública para añadir al carrito (usable por producto.html)
  window.addToCart = function (product) {
    // product: {id,name,price,image}
    if (!product || !product.id) return;
    const existing = cart.find(p => p.id === product.id);
    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name || "Producto",
        price: product.price || "0€",
        priceNum: parsePriceToNumber(product.price),
        qty: 1,
        image: product.image || ""
      });
    }
    saveCart(cart);
    updateMiniCartUI();
    // mostrar mini-cart brevemente
    if (miniCart) {
      miniCart.setAttribute("aria-hidden", "false");
      setTimeout(() => miniCart.setAttribute("aria-hidden", "true"), 2200);
    }
  };

  // inicializar mini-cart UI
  updateMiniCartUI();

  /* ---------------------------
     Render product page if present (keeps product rendering centralized)
     If you already have a producto.html that injects itself, this will not conflict.
     --------------------------- */
  (function renderProductIfNeeded() {
    const productDetailEl = document.getElementById("productDetail");
    if (!productDetailEl) return;

    // small dataset (if you maintain elsewhere keep them synchronized)
    const products = {
      "lixby-one": {
        id: "lixby-one",
        name: "Lixby One",
        description: "Ultraligero, potente y diseñado para la vida moderna. Perfecto para productividad y movilidad.",
        mini: 'Pantalla OLED 6.7", 120 Hz • SoC 5G • Cámara dual 50 MP + 8 MP • Batería 5.000 mAh',
        price: "349€",
        image: "https://cdn.grupoelcorteingles.es/SGFM/dctm/MEDIA03/202409/10/00194612201288____11__1200x1200.jpg",
        bom: [
          ["SoC 5G (Snapdragon 7s Gen 2 / Dimensity 8300) + PMIC", "45 – 55"],
          ["RAM 8 GB LPDDR5X", "18 – 22"],
          ["Almacenamiento UFS 3.1 256 GB", "20 – 25"],
          ["Pantalla OLED 6.7\" 120 Hz + táctil + vidrio", "32 – 38"],
          ["Cámaras (50 MP OIS + 8 MP UGA + 16 MP frontal)", "20 – 25"],
          ["Batería 5,000 mAh + BMS", "7 – 9"],
          ["Antenas + RF front-end (PA, filtros, switches)", "10 – 15"],
          ["Sensores (IMU, proximidad, luz, NFC)", "4 – 6"],
          ["Audio (altavoces, micros, motor háptico)", "5 – 7"],
          ["Chasis (aluminio) + trasera (policarbonato o vidrio)", "12 – 15"],
          ["PCB, pasivos y conectores", "8 – 10"],
          ["Ensamblaje y pruebas (EMS)", "6 – 8"],
          ["Embalaje + cargador/cable", "4 – 6"]
        ]
      },
      "lixby-one-plus": {
        id: "lixby-one-plus",
        name: "Lixby One Plus",
        description: "Teléfono de última generación con cámara de alta resolución y batería de larga duración.",
        mini: "Cámara profesional • Rendimiento equilibrado • Batería duradera",
        price: "659€",
        image: "https://media.ldlc.com/r1600/ld/products/00/06/16/66/LD0006166643_0006166668_0006166693.jpg"
      },
      "lixby-one-pro": {
        id: "lixby-one-pro",
        name: "Lixby One Pro",
        description: "Rendimiento y audio de alta fidelidad para creadores y audiófilos.",
        mini: "Audio premium • CPU/GPU potentes • Diseño robusto",
        price: "1099€",
        image: "https://m.media-amazon.com/images/I/61rriyfRKwL.jpg"
      }
    };

    // helper: proxied url (try proxy first to avoid hotlink blocks)
    function proxiedUrl(originalUrl) {
      const stripped = originalUrl.replace(/^https?:\/\//, "");
      return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}&w=1200`;
    }

    const params = new URLSearchParams(window.location.search);
    const raw = params.get("id");
    const id = raw ? decodeURIComponent(raw) : null;

    // quick links if no id
    const quickLinksEl = document.getElementById("quickLinks");
    if (!id) {
      productDetailEl.innerHTML = '<div style="padding:20px;">No se recibió ID. Usa uno de estos enlaces:</div>';
      if (quickLinksEl) quickLinksEl.style.display = "flex";
      return;
    }
    if (!products[id]) {
      productDetailEl.innerHTML = '<div style="padding:20px;"><h2>Producto no encontrado</h2><p>Vuelve a la <a href="index.html">tienda</a>.</p></div>';
      return;
    }

    const p = products[id];

    // Build image area with fallback proxied -> original -> placeholder
    const wrap = document.createElement("div");
    wrap.className = "image-wrap";
    const img = document.createElement("img");
    img.className = "product-image";
    img.alt = p.name;
    img.src = proxiedUrl(p.image);
    let triedOriginal = false, triedPlaceholder = false;
    img.onerror = function () {
      if (!triedOriginal) {
        triedOriginal = true;
        img.src = p.image;
      } else if (!triedPlaceholder) {
        triedPlaceholder = true;
        img.onerror = null;
        img.src = "https://via.placeholder.com/600x600?text=Sin+imagen";
      }
    };
    wrap.appendChild(img);

    // Build info area
    const info = document.createElement("div");
    info.className = "product-info";
    const title = document.createElement("h1"); title.textContent = p.name;
    const desc = document.createElement("p"); desc.textContent = p.description || "";
    const mini = document.createElement("div"); mini.className = "mini-note"; mini.textContent = p.mini || "";
    const price = document.createElement("div"); price.className = "price"; price.textContent = p.price;

    // Add-to-cart button
    const addBtn = document.createElement("button");
    addBtn.className = "btn-add";
    const langToUse = localStorage.getItem(LANG_KEY) || "es";
    addBtn.textContent = (translations[langToUse] && translations[langToUse]["btn.add"]) || "Añadir al carrito";
    addBtn.addEventListener("click", () => {
      window.addToCart({ id: p.id, name: p.name, price: p.price, image: p.image });
      addBtn.textContent = (translations[langToUse] && translations[langToUse]["btn.added"]) || "Añadido";
      setTimeout(() => addBtn.textContent = (translations[langToUse] && translations[langToUse]["btn.add"]) || "Añadir al carrito", 1200);
    });

    info.appendChild(title);
    if (desc.textContent) info.appendChild(desc);
    if (mini.textContent) info.appendChild(mini);
    info.appendChild(price);
    info.appendChild(addBtn);

    // render page
    productDetailEl.innerHTML = "";
    productDetailEl.appendChild(wrap);
    productDetailEl.appendChild(info);

    // BOM table for lixby-one
    if (id === "lixby-one" && Array.isArray(p.bom)) {
      const tableWrap = document.createElement("div");
      tableWrap.style.marginTop = "18px";
      const note = document.createElement("div");
      note.textContent = "Coste estimado de fabricación (BOM + ensamblaje)";
      note.style.fontWeight = "700";
      note.style.marginBottom = "8px";
      note.style.color = "var(--muted)";
      tableWrap.appendChild(note);

      const table = document.createElement("table");
      table.className = "bom";
      const thead = document.createElement("thead");
      thead.innerHTML = "<tr><th>Componente / Parte</th><th>Precio aprox. (€)</th></tr>";
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      p.bom.forEach(row => {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td"); td1.textContent = row[0];
        const td2 = document.createElement("td"); td2.textContent = row[1];
        tr.appendChild(td1); tr.appendChild(td2); tbody.appendChild(tr);
      });
      table.appendChild(tbody); tableWrap.appendChild(table); info.appendChild(tableWrap);
    }

    // detailed description block (already in info for lixby-one)
    if (id === "lixby-one") {
      const detail = document.createElement("div");
      detail.className = "detail-block";
      detail.innerHTML = `
        <h3>Descripción</h3>
        <p>El Lixby One es la combinación perfecta entre diseño y funcionalidad. Pensado para quienes buscan rendimiento, autonomía y una experiencia fotográfica versátil en un formato ligero.</p>
        <h3>Pantalla Increíble</h3>
        <p>Su pantalla OLED de 6.7" con tasa de refresco de 120 Hz ofrece colores vivos, negros profundos y una respuesta táctil ultrarrápida.</p>
        <h3>Rendimiento Potente</h3>
        <p>Equipado con un SoC de nueva generación (Snapdragon Gen 7), el Lixby One maneja multitarea exigente y juegos sin calentarse en exceso.</p>
        <h3>Sistema de Cámara Avanzado</h3>
        <p>Cuenta con una cámara principal de 50 MP con OIS y una secundaria ultra gran angular de 8 MP. Ideal para paisajes y retratos con buen detalle y rango dinámico.</p>
        <h3>Conectividad Ultra Rápida</h3>
        <p>5G, Wi-Fi 6 y Bluetooth de baja latencia para descargas rápidas y streaming sin cortes.</p>
        <h3>Diseño Elegante y Duradero</h3>
        <p>Chasis de aluminio, acabados mate y trasera opcional en vidrio, diseñado para un agarre cómodo y aspecto premium.</p>
        <h3>Batería de Larga Duración</h3>
        <p>Batería de 5000 mAh con gestión de energía que permite jornada completa incluso con uso intensivo.</p>
        <h3>Seguridad de Primera Clase</h3>
        <p>Lector de huellas integrado y cifrado a nivel hardware para proteger tus datos.</p>
        <h3>Innovación al Alcance de tu Mano</h3>
        <p>Funciones inteligentes y optimizaciones que mejoran la experiencia diaria sin complicaciones.</p>
        <h3>Características técnicas</h3>
        <ul>
          <li>SoC: Snapdragon / MediaTek (según versión)</li>
          <li>RAM: 8 GB LPDDR5X</li>
          <li>Almacenamiento: 256 GB UFS 3.1</li>
          <li>Pantalla: OLED 6.7" 120 Hz</li>
          <li>Cámaras: 50 MP (principal) + 8 MP (ultra gran angular) + 16 MP (frontal)</li>
          <li>Batería: 5.000 mAh</li>
          <li>Conectividad: 5G, Wi-Fi 6, Bluetooth</li>
        </ul>
        <h3>Seguridad general del producto</h3>
        <p>Certificaciones de seguridad y pruebas de calidad en producción.</p>
        <h3>Valoraciones del producto</h3>
        <div class="ratings"><div class="stars">⭐⭐⭐⭐☆ (4.2 / 5)</div><div class="review">"Gran pantalla y batería que dura todo el día." — Marta R.</div></div>
      `;
      info.appendChild(detail);
    }
  })();

});

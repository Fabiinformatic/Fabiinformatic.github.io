// =====================
// script.js — LIXBY (header compacto + i18n fix)
// =====================

document.addEventListener("DOMContentLoaded", () => {
  const CART_KEY = "lixby_cart_v1";
  const LANG_KEY = "lixby_lang";
  const THEME_KEY = "lixby_theme";

  // traducciones básicas (puedes ampliar)
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
      "theme.toggle": "Cambiar tema"
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
      "theme.toggle": "Toggle theme"
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
      "theme.toggle": "Changer le thème"
    }
  };

  // ---------- utilidades ----------
  function parsePriceToNumber(priceStr) {
    if (!priceStr) return 0;
    const num = priceStr.toString().replace(/[^\d.,-]/g, "").replace(",", ".");
    return parseFloat(num) || 0;
  }
  function formatPriceNum(num) {
    return (Math.round(num * 100) / 100) + "€";
  }
  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
  }
  function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

  // ---------- año en footer ----------
  const yearEl = document.getElementById("year"); if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- theme persistente ----------
  const themeToggle = document.getElementById("themeToggle");
  if (localStorage.getItem(THEME_KEY) === "light") document.documentElement.classList.add("light");
  if (themeToggle) {
    themeToggle.title = translations[localStorage.getItem(LANG_KEY) || "es"]?.["theme.toggle"] || "Cambiar tema";
    themeToggle.addEventListener("click", () => {
      const isLight = document.documentElement.classList.toggle("light");
      localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
    });
  }

  // ---------- i18n: aplicar traducciones ----------
  function applyTranslations(lang) {
    const map = translations[lang] || translations["es"];
    // elementos con data-i18n
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (map[key]) el.textContent = map[key];
    });
    // actualizar botones generados dinámicamente (.btn-add)
    document.querySelectorAll(".btn-add").forEach(btn => {
      btn.textContent = map["btn.add"] || btn.textContent;
    });
    // mini-cart texts (si existen)
    const cartTitle = document.querySelectorAll("[data-i18n='cart.title']");
    cartTitle.forEach(el => el.textContent = map["cart.title"] || el.textContent);
    const clearBtn = document.querySelectorAll("[data-i18n='cart.clear']");
    clearBtn.forEach(el => el.textContent = map["cart.clear"] || el.textContent);
    const checkoutBtn = document.querySelectorAll("[data-i18n='cart.checkout']");
    checkoutBtn.forEach(el => el.textContent = map["cart.checkout"] || el.textContent);
    // theme toggle title
    if (themeToggle) themeToggle.title = map["theme.toggle"] || themeToggle.title;
  }

  function setLanguage(lang) {
    if (!translations[lang]) lang = "es";
    localStorage.setItem(LANG_KEY, lang);
    // actualizar etiqueta visible (si existe)
    const label = document.getElementById("langLabel");
    if (label) {
      const names = { es: "Español", en: "English", fr: "Français" };
      label.textContent = names[lang] || names["es"];
    }
    applyTranslations(lang);
  }

  // init lang from storage
  setLanguage(localStorage.getItem(LANG_KEY) || "es");

  // listeners del menu de idioma (robusto)
  const langBtn = document.getElementById("langBtn");
  const langMenu = document.getElementById("langMenu");
  if (langBtn && langMenu) {
    langBtn.addEventListener("click", (e) => {
      const isOpen = langMenu.getAttribute("aria-hidden") === "false";
      langMenu.setAttribute("aria-hidden", String(isOpen)); // toggle: if open -> true (close), if closed -> false (open)
      langBtn.setAttribute("aria-expanded", String(!isOpen));
    });
    // cualquier botón dentro con data-lang cambiará idioma
    langMenu.querySelectorAll("[data-lang]").forEach(b => {
      b.addEventListener("click", (ev) => {
        const l = b.getAttribute("data-lang");
        setLanguage(l);
        langMenu.setAttribute("aria-hidden", "true");
        langBtn.setAttribute("aria-expanded", "false");
      });
    });
    // cerrar al pulsar fuera
    document.addEventListener("click", (ev) => {
      if (!langBtn.contains(ev.target) && !langMenu.contains(ev.target)) {
        langMenu.setAttribute("aria-hidden", "true");
        langBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ---------- mini-cart (igual que antes) ----------
  let cart = loadCart();
  const cartBtn = document.getElementById("cartBtn");
  const miniCart = document.getElementById("miniCart");
  const miniCartItems = document.getElementById("miniCartItems");
  const miniCartTotal = document.getElementById("miniCartTotal");
  const cartCount = document.getElementById("cartCount");
  const clearCartBtn = document.getElementById("clearCart");
  const checkoutBtn = document.getElementById("checkoutBtn");

  function updateMiniCartUI() {
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

  // ---------- tarjetas (tilt + click) ----------
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

  // ---------- product page render (if present) ----------
  (function renderProductIfNeeded() {
    const productDetailEl = document.getElementById("productDetail"); if (!productDetailEl) return;
    // dataset (sin cambios)
    const products = {
      "lixby-one": { id:"lixby-one", name:"Lixby One", description:"Ultraligero, potente y diseñado para la vida moderna. Perfecto para productividad y movilidad.", mini:'Pantalla OLED 6.7", 120 Hz • SoC 5G • Cámara dual 50 MP + 8 MP • Batería 5.000 mAh', price:"349€", image:"https://cdn.grupoelcorteingles.es/SGFM/dctm/MEDIA03/202409/10/00194612201288____11__1200x1200.jpg", bom:[["SoC 5G (Snapdragon 7s Gen 2 / Dimensity 8300) + PMIC","45 – 55"],["RAM 8 GB LPDDR5X","18 – 22"],["Almacenamiento UFS 3.1 256 GB","20 – 25"],["Pantalla OLED 6.7\" 120 Hz + táctil + vidrio","32 – 38"],["Cámaras (50 MP OIS + 8 MP UGA + 16 MP frontal)","20 – 25"],["Batería 5,000 mAh + BMS","7 – 9"],["Antenas + RF front-end (PA, filtros, switches)","10 – 15"],["Sensores (IMU, proximidad, luz, NFC)","4 – 6"],["Audio (altavoces, micros, motor háptico)","5 – 7"],["Chasis (aluminio) + trasera (policarbonato o vidrio)","12 – 15"],["PCB, pasivos y conectores","8 – 10"],["Ensamblaje y pruebas (EMS)","6 – 8"],["Embalaje + cargador/cable","4 – 6"]] },
      "lixby-one-plus": { id:"lixby-one-plus", name:"Lixby One Plus", description:"Teléfono de última generación con cámara de alta resolución y batería de larga duración.", mini:"Cámara profesional • Rendimiento equilibrado • Batería duradera", price:"659€", image:"https://media.ldlc.com/r1600/ld/products/00/06/16/66/LD0006166643_0006166668_0006166693.jpg" },
      "lixby-one-pro": { id:"lixby-one-pro", name:"Lixby One Pro", description:"Rendimiento y audio de alta fidelidad para creadores y audiófilos.", mini:"Audio premium • CPU/GPU potentes • Diseño robusto", price:"1099€", image:"https://m.media-amazon.com/images/I/61rriyfRKwL.jpg" }
    };

    function proxiedUrl(orig) { const stripped = orig.replace(/^https?:\/\//, ""); return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}&w=1200`; }

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const quickLinksEl = document.getElementById("quickLinks");
    if (!id) { productDetailEl.innerHTML = '<div style="padding:20px;">No se recibió ID. Usa uno de estos enlaces:</div>'; if (quickLinksEl) quickLinksEl.style.display="flex"; return; }
    if (!products[id]) { productDetailEl.innerHTML = '<div style="padding:20px;"><h2>Producto no encontrado</h2><p>Vuelve a la <a href="index.html">tienda</a>.</p></div>'; return; }

    const p = products[id];
    const wrap = document.createElement("div"); wrap.className = "image-wrap";
    const img = document.createElement("img"); img.className = "product-image"; img.alt = p.name; img.src = proxiedUrl(p.image);
    let triedOrig=false, triedPlaceholder=false;
    img.onerror = function(){ if(!triedOrig){ triedOrig=true; img.src=p.image; } else if(!triedPlaceholder){ triedPlaceholder=true; img.onerror=null; img.src='https://via.placeholder.com/600x600?text=Sin+imagen'; } };
    wrap.appendChild(img);

    const info = document.createElement("div"); info.className="product-info";
    const title = document.createElement("h1"); title.textContent = p.name;
    const desc = document.createElement("p"); desc.textContent = p.description || "";
    const mini = document.createElement("div"); mini.className="mini-note"; mini.textContent = p.mini || "";
    const price = document.createElement("div"); price.className="price"; price.textContent = p.price;

    const addBtn = document.createElement("button");
    addBtn.className = "btn-add";
    const langNow = localStorage.getItem(LANG_KEY) || "es";
    addBtn.textContent = (translations[langNow] && translations[langNow]["btn.add"]) || "Añadir al carrito";
    addBtn.addEventListener("click", () => { window.addToCart({ id: p.id, name: p.name, price: p.price, image: p.image }); addBtn.textContent = (translations[langNow] && translations[langNow]["btn.added"]) || "Añadido"; setTimeout(()=> addBtn.textContent = (translations[langNow] && translations[langNow]["btn.add"]) || "Añadir al carrito", 1100); });

    info.appendChild(title); if(desc.textContent) info.appendChild(desc); if(mini.textContent) info.appendChild(mini); info.appendChild(price); info.appendChild(addBtn);
    productDetailEl.innerHTML=""; productDetailEl.appendChild(wrap); productDetailEl.appendChild(info);

    // BOM
    if (id === "lixby-one" && Array.isArray(p.bom)) {
      const tableWrap = document.createElement("div"); tableWrap.style.marginTop="18px";
      const note = document.createElement("div"); note.textContent="Coste estimado de fabricación (BOM + ensamblaje)"; note.style.fontWeight="700"; note.style.marginBottom="8px"; note.style.color="var(--muted)";
      tableWrap.appendChild(note);
      const table = document.createElement("table"); table.className="bom";
      const thead = document.createElement("thead"); thead.innerHTML = "<tr><th>Componente / Parte</th><th>Precio aprox. (€)</th></tr>"; table.appendChild(thead);
      const tbody = document.createElement("tbody");
      p.bom.forEach(row => { const tr=document.createElement("tr"); const td1=document.createElement("td"); td1.textContent=row[0]; const td2=document.createElement("td"); td2.textContent=row[1]; tr.appendChild(td1); tr.appendChild(td2); tbody.appendChild(tr); });
      table.appendChild(tbody); tableWrap.appendChild(table); info.appendChild(tableWrap);
    }
  })();

  // final: reaplicar traducciones (por si cambiamos html dinámicamente)
  applyTranslations(localStorage.getItem(LANG_KEY) || "es");

}); // DOMContentLoaded end

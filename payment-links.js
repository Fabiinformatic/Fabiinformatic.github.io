// payment-links.js
// Mapa de enlaces (añade aquí más entradas cuando tengas más links)
(function(global){
  'use strict';

  const MAP = [
    // Lixby One Air - Black
    { product: 'one air', brand:'lixby', color: 'black', storage: '128', url: 'https://buy.stripe.com/fZu3cufIXcsZ069c0Uffy00' },
    { product: 'one air', brand:'lixby', color: 'black', storage: '256', url: 'https://buy.stripe.com/00w4gy0O364BdWZ4ysffy01' },
    { product: 'one air', brand:'lixby', color: 'black', storage: '512', url: 'https://buy.stripe.com/4gM3cu7cr0Kh5qt9SMffy02' },

    // Lixby One Air - White
    { product: 'one air', brand:'lixby', color: 'white', storage: '128', url: 'https://buy.stripe.com/8x2cN454jakRf130icffy03' },
    { product: 'one air', brand:'lixby', color: 'white', storage: '256', url: 'https://buy.stripe.com/8x25kC54jdx3dWZaWQffy04' },
    { product: 'one air', brand:'lixby', color: 'white', storage: '512', url: 'https://buy.stripe.com/6oU14m68n50xdWZghaffy05' },

    // Lixby One - Blue
    { product: 'one', brand:'lixby', color: 'blue', storage: '128', url: 'https://buy.stripe.com/dRmeVc8gvcsZ9GJ8OIffy06' },
    { product: 'one', brand:'lixby', color: 'blue', storage: '256', url: 'https://buy.stripe.com/14A6oG54jdx3g57fd6ffy07' },
    { product: 'one', brand:'lixby', color: 'blue', storage: '512', url: 'https://buy.stripe.com/4gM8wOgN1eB7bOR7KEffy08' },
    { product: 'one', brand:'lixby', color: 'blue', storage: '1024', url: 'https://buy.stripe.com/8x27sK54j1Ol6uxfd6ffy09' } // 1TB -> 1024
  ];

  function norm(s){
    if (!s) return '';
    return String(s).toLowerCase()
      .replace(/\u00f1/g,'n')
      .replace(/[áàäâ]/g,'a').replace(/[éèëê]/g,'e').replace(/[íìïî]/g,'i').replace(/[óòöô]/g,'o').replace(/[úùüû]/g,'u')
      .replace(/[^a-z0-9]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  // intenta extraer storage en números: "128", "1tb" -> "1024"
  function normalizeStorage(s){
    if (!s) return '';
    s = String(s).toLowerCase();
    if (s.match(/1tb|1024/)) return '1024';
    const m = s.match(/(\d{2,4})/);
    return m ? m[1] : s.replace(/[^0-9]/g,'');
  }

  // Construye el 'texto candidato' a partir del item
  function buildCandidate(item){
    // soporta varios formatos de item: { sku, name, color, storage } o { name: "Lixby One Air - Black - 128GB" }
    let parts = [];
    if (item.sku) parts.push(item.sku);
    if (item.name) parts.push(item.name);
    if (item.color) parts.push(item.color);
    if (item.storage) parts.push(String(item.storage));
    // si price/description contienen texto relevante, agregarlos
    if (item.description) parts.push(item.description);
    return norm(parts.join(' '));
  }

  function matchByItem(item){
    const candidate = buildCandidate(item);
    if (!candidate) return null;

    // Try SKU exact match first (if you include sku in MAP in future)
    // Now try match where all of product+color+storage are contained
    for (const row of MAP){
      const prod = norm(row.product);
      const color = norm(row.color);
      const storage = normalizeStorage(row.storage);

      const prodMatch = candidate.indexOf(prod) !== -1;
      const colorMatch = color ? (candidate.indexOf(color) !== -1) : true;
      const storageMatch = storage ? (candidate.indexOf(storage) !== -1 || candidate.indexOf(storage + 'gb') !== -1) : true;

      if (prodMatch && colorMatch && storageMatch) return row.url;
    }

    // fallback: try looser match (product + storage OR product + color)
    for (const row of MAP){
      const prod = norm(row.product);
      const color = norm(row.color);
      const storage = normalizeStorage(row.storage);

      const prodMatch = candidate.indexOf(prod) !== -1;
      const colorMatch = color ? (candidate.indexOf(color) !== -1) : false;
      const storageMatch = storage ? (candidate.indexOf(storage) !== -1) : false;

      if (prodMatch && (colorMatch || storageMatch)) return row.url;
    }

    return null;
  }

  // Public API
  global.getPaymentLinkForItem = function(item){
    return matchByItem(item) || null;
  };

  global.getPaymentLinkForCart = function(cart){
    if (!Array.isArray(cart) || cart.length === 0) return null;
    // if single item, try match
    if (cart.length === 1) {
      return matchByItem(cart[0]) || null;
    }
    // if multiple items, check if all map to the same URL
    const urls = cart.map(i => matchByItem(i)).filter(Boolean);
    if (urls.length === cart.length) {
      const uniq = Array.from(new Set(urls));
      if (uniq.length === 1) return uniq[0];
    }
    // no single-link representation for whole cart
    return null;
  };

  // helper to add entries programmatically if needed
  global._LIXBY_PAYMENT_MAP = MAP;

})(window);

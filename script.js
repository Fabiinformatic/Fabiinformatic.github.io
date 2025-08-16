// auth-ui.js  (cargar después de auth-firebase.js)
// Versión corregida y robusta: preview mini-cart on hover, click abre panel,
// fallback de cuenta usando localStorage (foto invitado), y suscripciones seguras.
(function(){
  'use strict';

  // evita cargarse dos veces
  if (window.__LIXBY_AUTH_UI_LOADED) {
    console.warn('auth-ui ya cargado');
    return;
  }
  window.__LIXBY_AUTH_UI_LOADED = true;

  // helpers
  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => document.getElementById(id);

  function safeJSONParse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch(e){ return null; }
  }

  // constantes
  const GUEST_IMG = 'https://ohsobserver.com/wp-content/uploads/2022/12/Guest-user.png';
  const CART_KEY = 'lixby_cart_v1';
  const ACCOUNT_KEY = 'lixby_user';

  // selectores (pueden no existir en todas las páginas)
  let accountBtn = byId('accountBtn'); // may be replaced dynamically
  const brand = document.querySelector('.brand');
  const navRight = document.querySelector('.nav-right');

  // crea o actualiza el bloque accountHolder (accesible y keyboard-friendly)
  function ensureAccountHolder() {
    let holder = byId('accountHolder');
    if (holder) return holder;

    holder = document.createElement('div');
    holder.id = 'accountHolder';
    holder.className = 'account-holder';
    holder.setAttribute('role', 'region');
    holder.setAttribute('aria-label', 'Cuenta');
    holder.style.display = 'inline-flex';
    holder.style.alignItems = 'center';
    holder.style.gap = '8px';

    // avatar button (toggle menu)
    const avatarBtn = document.createElement('button');
    avatarBtn.id = 'headerAvatarBtn';
    avatarBtn.className = 'icon-btn';
    avatarBtn.setAttribute('aria-haspopup', 'true');
    avatarBtn.setAttribute('aria-expanded', 'false');
    avatarBtn.style.display = 'inline-flex';
    avatarBtn.style.alignItems = 'center';
    avatarBtn.style.gap = '8px';
    avatarBtn.style.background = 'transparent';
    avatarBtn.style.border = 'none';
    avatarBtn.style.cursor = 'pointer';
    avatarBtn.type = 'button';

    const avatarImg = document.createElement('img');
    avatarImg.id = 'headerAvatar';
    avatarImg.alt = 'Avatar de usuario';
    avatarImg.width = 36;
    avatarImg.height = 36;
    avatarImg.style.width = '36px';
    avatarImg.style.height = '36px';
    avatarImg.style.borderRadius = '8px';
    avatarImg.style.objectFit = 'cover';
    avatarImg.style.display = 'block';

    const nameSpan = document.createElement('span');
    nameSpan.id = 'headerName';
    nameSpan.style.color = 'var(--muted)';
    nameSpan.style.fontWeight = 600;

    avatarBtn.appendChild(avatarImg);
    avatarBtn.appendChild(nameSpan);

    // menu: acciones (ver cuenta, cerrar sesión)
    const menu = document.createElement('div');
    menu.id = 'accountMenu';
    menu.className = 'account-menu glass';
    menu.style.position = 'absolute';
    menu.style.minWidth = '200px';
    menu.style.right = '18px';
    menu.style.top = '64px';
    menu.style.display = 'none';
    menu.style.flexDirection = 'column';
    menu.style.padding = '8px';
    menu.setAttribute('role','menu');

    const viewAccount = document.createElement('button');
    viewAccount.id = 'viewAccountBtn';
    viewAccount.className = 'btn ghost';
    viewAccount.textContent = 'Mi cuenta';
    viewAccount.setAttribute('role','menuitem');
    viewAccount.type = 'button';

    const signOutBtn = document.createElement('button');
    signOutBtn.id = 'headerSignOut';
    signOutBtn.className = 'btn ghost';
    signOutBtn.textContent = 'Cerrar sesión';
    signOutBtn.setAttribute('role','menuitem');
    signOutBtn.type = 'button';

    // append
    menu.appendChild(viewAccount);
    menu.appendChild(signOutBtn);

    // wrapper combines avatarBtn + menu
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.appendChild(avatarBtn);
    wrapper.appendChild(menu);

    holder.appendChild(wrapper);

    // insert into nav-right (si no existe, append al body como fallback)
    if (navRight) {
      // insert before theme toggle if exists
      const themeToggle = byId('themeToggle');
      if (themeToggle) navRight.insertBefore(holder, themeToggle);
      else navRight.appendChild(holder);
    } else {
      document.body.appendChild(holder);
    }

    // interactions
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAccountMenu();
    });
    // close on outside click
    document.addEventListener('click', (ev) => {
      const menuEl = byId('accountMenu');
      const btnEl = byId('headerAvatarBtn');
      if (!menuEl || !btnEl) return;
      if (!menuEl.contains(ev.target) && !btnEl.contains(ev.target)) hideAccountMenu();
    });
    // keyboard accessibility
    avatarBtn.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggleAccountMenu(); }
      if (ev.key === 'ArrowDown') { ev.preventDefault(); focusFirstMenuItem(); }
    });

    viewAccount.addEventListener('click', (e) => {
      e.preventDefault();
      hideAccountMenu();
      window.location.href = 'cuenta.html';
    });

    signOutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAccountMenu();
      try {
        // prefer appAuth signOut if provided
        if (window.appAuth && typeof window.appAuth.signOut === 'function') {
          await window.appAuth.signOut();
          // appAuth.onAuthState should update header via subscribeAuth
        } else if (window.appAuth && window.appAuth._rawAuth && typeof window.appAuth._rawAuth.signOut === 'function') {
          await window.appAuth._rawAuth.signOut();
        } else {
          // fallback: clear localStorage snapshot and dispatch change event
          try { localStorage.removeItem(ACCOUNT_KEY); } catch(e){}
          // notify other parts
          try { window.dispatchEvent(new Event('authChanged')); } catch(e){}
          // refresh UI
          renderHeaderUser(null);
          // optionally navigate to home
          try { window.location.href = 'index.html'; } catch(e){}
        }
      } catch (err) {
        console.warn('Sign-out failed', err);
        try { alert('Error cerrando sesión. Revisa la consola.'); } catch(e){}
      }
    });

    return holder;
  }

  function toggleAccountMenu() {
    const menu = byId('accountMenu');
    const btn = byId('headerAvatarBtn');
    if (!menu || !btn) return;
    const open = menu.style.display !== 'flex';
    menu.style.display = open ? 'flex' : 'none';
    btn.setAttribute('aria-expanded', String(open));
    if (open) focusFirstMenuItem();
  }
  function hideAccountMenu() {
    const menu = byId('accountMenu');
    const btn = byId('headerAvatarBtn');
    if (!menu || !btn) return;
    menu.style.display = 'none';
    btn.setAttribute('aria-expanded','false');
  }
  function focusFirstMenuItem() {
    const menu = byId('accountMenu');
    if (!menu) return;
    const first = menu.querySelector('[role="menuitem"]');
    if (first && typeof first.focus === 'function') first.focus();
  }

  // Render header UI (avatar + menu). userObj puede ser null
  function renderHeaderUser(userObj) {
    try {
      // if null -> restore accountBtn
      if (!userObj) {
        // remove holder if present
        const holder = byId('accountHolder');
        if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
        // restore original accountBtn if exists or recreate fallback
        if (!accountBtn) {
          // try to find a button in nav-right with label Cuenta
          accountBtn = byId('accountBtn') || (navRight && navRight.querySelector('button[aria-label="Mi cuenta"], .btn.ghost'));
        }
        if (accountBtn) {
          accountBtn.style.display = '';
          try { accountBtn.textContent = 'Cuenta'; accountBtn.setAttribute('aria-haspopup','true'); } catch(e){}
          // ensure accountBtn opens cuenta.html as fallback
          accountBtn.onclick = function(e){ e.preventDefault(); window.location.href = 'cuenta.html'; };
        } else if (navRight) {
          // create fallback account button
          const fallback = document.createElement('button');
          fallback.id = 'accountBtn';
          fallback.className = 'btn ghost';
          fallback.type = 'button';
          fallback.textContent = 'Cuenta';
          fallback.addEventListener('click', () => window.location.href = 'cuenta.html');
          navRight.insertBefore(fallback, navRight.firstChild);
          accountBtn = fallback;
        }
        if (brand) brand.textContent = 'LIXBY';
        return;
      }

      // ensure accountBtn hidden (we replace it with holder)
      if (accountBtn) accountBtn.style.display = 'none';

      const holder = ensureAccountHolder();
      const avatarImg = byId('headerAvatar');
      const nameSpan = byId('headerName');

      const displayName = userObj.name || (userObj.email ? userObj.email.split('@')[0] : 'Usuario');
      // if userObj explicitly anonymous OR lacks photoURL use guest image
      const photo = (userObj.isAnonymous || !userObj.photoURL) ? (userObj.photoURL || GUEST_IMG) : userObj.photoURL;

      if (avatarImg) {
        avatarImg.src = photo;
        avatarImg.alt = `${displayName} — avatar`;
      }
      if (nameSpan) {
        nameSpan.textContent = displayName;
      }
      if (brand) {
        // brand shows first name if available
        brand.textContent = (userObj.name ? (userObj.name.split(' ')[0]) : 'LIXBY');
      }
    } catch (e) {
      console.warn('renderHeaderUser error', e);
    }
  }

  // Account panel for cuenta.html (uses appAuth.updateProfileExtra as in your auth-firebase)
  function renderAccountPanel(user) {
    // Only render if account panel container present or on cuenta.html
    const isCuentaPage = location.pathname.endsWith('cuenta.html') || !!byId('accountPanel');
    if (!isCuentaPage) return;

    // prefer container with #accountPanel else insert into main
    let container = byId('accountPanel');
    if (!container) {
      const main = document.querySelector('main') || document.body;
      container = document.createElement('div');
      container.id = 'accountPanel';
      main.prepend(container);
    }

    // minimal safe values
    const fn = (user && (user.firstName || user.name && user.name.split(' ')[0])) ? (user.firstName || user.name.split(' ')[0]) : '';
    const ln = (user && user.lastName) ? user.lastName : '';
    const dob = (user && user.dob) ? user.dob : '';

    container.innerHTML = `
      <div class="account-profile glass" style="max-width:980px;margin:28px auto;padding:18px;border-radius:12px;display:flex;gap:16px;align-items:flex-start;">
        <div style="flex:0 0 84px;">
          <div class="avatar" id="profileAvatar" style="width:84px;height:84px;border-radius:12px;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--muted)">${(fn||'U').charAt(0).toUpperCase()}</div>
        </div>
        <div style="flex:1">
          <h2>Mi cuenta</h2>
          <div class="profile-row" style="display:flex;gap:10px;margin-top:6px;">
            <input id="pf_firstName" placeholder="Nombre" value="${escapeHtml(fn)}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);"/>
            <input id="pf_lastName" placeholder="Apellidos" value="${escapeHtml(ln)}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);"/>
          </div>
          <div style="margin-top:10px;">
            <input id="pf_dob" type="date" placeholder="Fecha de nacimiento" value="${escapeHtml(dob)}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);"/>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
            <button id="btnSaveProfile" class="btn primary">Guardar</button>
            <button id="btnCancelProfile" class="btn ghost">Cancelar</button>
          </div>
          <div id="profileMsg" style="margin-top:8px;color:var(--muted);font-size:0.95rem"></div>
        </div>
      </div>
    `;

    // attach handlers
    const btnSave = byId('btnSaveProfile');
    const btnCancel = byId('btnCancelProfile');
    const profileMsg = byId('profileMsg');

    if (btnCancel) btnCancel.addEventListener('click', () => { location.reload(); });

    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        const firstName = (byId('pf_firstName')||{}).value || '';
        const lastName = (byId('pf_lastName')||{}).value || '';
        const dobVal = (byId('pf_dob')||{}).value || '';
        profileMsg.textContent = 'Guardando...';
        try {
          if (!window.appAuth || typeof window.appAuth.updateProfileExtra !== 'function') throw new Error('updateProfileExtra no disponible');
          await window.appAuth.updateProfileExtra({ firstName, lastName, dob: dobVal });
          profileMsg.textContent = 'Guardado ✔';
          // update header name locally
          const local = safeJSONParse(localStorage.getItem(ACCOUNT_KEY)) || {};
          local.firstName = firstName || local.firstName;
          local.lastName = lastName || local.lastName;
          local.dob = dobVal || local.dob;
          try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(local)); } catch(e){/*ignore*/}

          // try to update header immediately
          renderHeaderUser({ uid: (local.uid||''), name: (firstName ? (firstName + (lastName ? ' ' + lastName : '')) : local.name || local.firstName), email: local.email, photoURL: local.photoURL });
        } catch (err) {
          console.error('Guardar perfil', err);
          profileMsg.textContent = 'Error al guardar. Revisa consola.';
        }
      });
    }
  }

  function escapeHtml(str){
    if (str === undefined || str === null) return '';
    return String(str).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]); });
  }

  // Read minimal local snapshot
  function getLocalUserSnapshot() {
    return safeJSONParse(localStorage.getItem(ACCOUNT_KEY));
  }

  // Subscribe to auth state; prefer appAuth.onAuthState but fallback to localStorage + events
  function subscribeAuth() {
    // primary: appAuth API
    if (window.appAuth && typeof window.appAuth.onAuthState === 'function') {
      try {
        window.appAuth.onAuthState((u) => {
          // u may be null or user object as provided by appAuth
          const local = getLocalUserSnapshot();
          const toShow = u || local || null;
          renderHeaderUser(toShow);
          renderAccountPanel(toShow || {});
        });
        return;
      } catch (e) {
        console.warn('appAuth.onAuthState failed, using fallback', e);
      }
    }

    // fallback: use localStorage snapshot and listen for authChanged/storage events
    const local = getLocalUserSnapshot();
    renderHeaderUser(local);
    renderAccountPanel(local || {});

    // listen for storage changes from other tabs
    window.addEventListener('storage', (ev) => {
      if (ev.key === ACCOUNT_KEY) {
        const newUser = safeJSONParse(ev.newValue);
        renderHeaderUser(newUser);
        renderAccountPanel(newUser || {});
      }
    });

    // custom event to notify changes within same tab
    window.addEventListener('authChanged', () => {
      const u = getLocalUserSnapshot();
      renderHeaderUser(u);
      renderAccountPanel(u || {});
    });
  }

  // inicializar en DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', subscribeAuth);
  } else {
    subscribeAuth();
  }

  /* ============================================================
     Mini-cart hover preview + click-open panel (global fallback)
     - Safe: no errors if elements missing
     - Renders using localStorage 'lixby_cart_v1' when no global handlers
     ============================================================ */

  function readCartFromStorage() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch(e){ return []; }
  }

  function formatPriceLocale(n) {
    try {
      const v = Math.round((Number(n)||0)*100)/100;
      // use Intl if available for consistency
      if (window.Intl && typeof Intl.NumberFormat === 'function') {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);
      }
      return v.toFixed(2).replace('.',',') + '€';
    } catch(e){ return String(n); }
  }

  function renderMiniCartPreviewInto(miniCartEl) {
    if (!miniCartEl) return;
    // if page already provides updateMiniCartUI, call it and exit
    if (typeof window.updateMiniCartUI === 'function') {
      try { window.updateMiniCartUI(); return; } catch(e){ /* continue */ }
    }

    const itemsContainer = miniCartEl.querySelector('#miniCartItems') || miniCartEl.querySelector('.mini-cart-items') || miniCartEl;
    const totalEl = miniCartEl.querySelector('#miniCartTotal') || miniCartEl.querySelector('.mini-cart-total');

    if (!itemsContainer) return;
    const cart = readCartFromStorage();
    itemsContainer.innerHTML = '';

    if (!cart || cart.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '8px';
      empty.style.color = 'var(--muted)';
      empty.textContent = 'Tu carrito está vacío.';
      itemsContainer.appendChild(empty);
      if (totalEl) totalEl.textContent = formatPriceLocale(0);
      return;
    }

    const frag = document.createDocumentFragment();
    let total = 0;
    cart.forEach((it, idx) => {
      const row = document.createElement('div');
      row.className = 'mini-cart-item';
      row.style.display = 'flex';
      row.style.gap = '10px';
      row.style.alignItems = 'center';
      row.style.padding = '8px';
      row.style.borderRadius = '8px';

      const img = document.createElement('img');
      img.src = it.image || 'https://via.placeholder.com/80x80?text=Img';
      img.alt = it.name || 'Producto';
      img.style.width = '44px';
      img.style.height = '44px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '6px';
      img.loading = 'lazy';
      img.decoding = 'async';

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.style.flex = '1';
      const name = document.createElement('div');
      name.style.fontWeight = '700';
      name.textContent = it.name || 'Producto';
      const sub = document.createElement('div');
      sub.style.color = 'var(--muted)';
      const priceNum = (it.priceNum !== undefined && it.priceNum !== null) ? Number(it.priceNum) : (typeof it.price === 'string' ? parseFloat(String(it.price).replace(/[^\d.,]/g,'').replace(',','.')) : Number(it.price)||0);
      sub.textContent = `${formatPriceLocale(priceNum)} × ${it.qty || 1}`;
      meta.appendChild(name);
      meta.appendChild(sub);

      const rem = document.createElement('button');
      rem.className = 'remove';
      rem.textContent = '✕';
      rem.style.background = 'transparent';
      rem.style.border = 'none';
      rem.style.cursor = 'pointer';
      rem.style.color = 'var(--muted)';
      rem.type = 'button';
      rem.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const c = readCartFromStorage();
        c.splice(idx,1);
        try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch(e){}
        // re-render
        renderMiniCartPreviewInto(miniCartEl);
        // notify other listeners
        try { window.dispatchEvent(new Event('cartUpdated')); } catch(e){}
      });

      row.appendChild(img);
      row.appendChild(meta);
      row.appendChild(rem);
      frag.appendChild(row);

      total += priceNum * Number(it.qty||1);
    });

    itemsContainer.appendChild(frag);
    if (totalEl) totalEl.textContent = formatPriceLocale(total);
  }

  // inicializa listeners de hover/click para mini-cart y panel
  function initCartHoverAndAccountListeners() {
    const cartBtnEl = byId('cartBtn') || document.querySelector('.cart-wrapper .icon-btn');
    const cartWrapper = document.querySelector('.cart-wrapper') || (cartBtnEl && cartBtnEl.parentElement);
    const miniCartEl = byId('miniCart') || document.querySelector('.mini-cart');
    const cartPanel = byId('cartPanel') || document.querySelector('.cart-panel');
    const cartBackdrop = byId('cartBackdrop') || document.querySelector('.cart-backdrop');

    let hideTimer = null;

    function showMini() {
      if (!miniCartEl) return;
      renderMiniCartPreviewInto(miniCartEl);
      try { miniCartEl.setAttribute('aria-hidden','false'); } catch(e){}
      miniCartEl.style.display = 'flex';
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    }
    function hideMiniSoon(delay = 250) {
      if (!miniCartEl) return;
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        try { miniCartEl.setAttribute('aria-hidden','true'); } catch(e){}
        miniCartEl.style.display = '';
      }, delay);
    }

    if (cartWrapper) {
      cartWrapper.addEventListener('mouseenter', showMini);
      cartWrapper.addEventListener('mouseleave', () => hideMiniSoon(220));
      cartWrapper.addEventListener('focusin', showMini);
      cartWrapper.addEventListener('focusout', () => hideMiniSoon(220));
    } else if (cartBtnEl) {
      cartBtnEl.addEventListener('mouseenter', showMini);
      cartBtnEl.addEventListener('mouseleave', () => hideMiniSoon(220));
      cartBtnEl.addEventListener('focus', showMini);
      cartBtnEl.addEventListener('blur', () => hideMiniSoon(220));
    }

    if (miniCartEl) {
      miniCartEl.addEventListener('mouseenter', () => { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } });
      miniCartEl.addEventListener('mouseleave', () => hideMiniSoon(220));
    }

    if (cartBtnEl) {
      cartBtnEl.addEventListener('click', (ev) => {
        ev.preventDefault();
        // If page has cart panel element -> open it
        if (cartPanel) {
          // open panel
          cartPanel.classList.add('open');
          if (cartBackdrop) cartBackdrop.classList.add('open');
          try { cartPanel.setAttribute('aria-hidden','false'); if (cartBackdrop) cartBackdrop.setAttribute('aria-hidden','false'); } catch(e){}
          // hide mini preview
          if (miniCartEl) { miniCartEl.setAttribute('aria-hidden','true'); miniCartEl.style.display = ''; }
        } else {
          // navigate to carrito.html as fallback
          const p = (location.pathname || '').split('/').pop();
          if (p && p.indexOf('carrito') !== -1) {
            const bag = document.getElementById('bag') || document.querySelector('.bag-list');
            if (bag) bag.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.location.href = 'carrito.html';
          }
        }
      });
    }

    if (cartBackdrop && cartPanel) {
      cartBackdrop.addEventListener('click', () => {
        cartPanel.classList.remove('open');
        cartBackdrop.classList.remove('open');
        try { cartPanel.setAttribute('aria-hidden','true'); cartBackdrop.setAttribute('aria-hidden','true'); } catch(e){}
      });
    }

    const cClose = byId('cartPanelClose');
    if (cClose && cartPanel) {
      cClose.addEventListener('click', () => {
        cartPanel.classList.remove('open');
        if (cartBackdrop) cartBackdrop.classList.remove('open');
        try { cartPanel.setAttribute('aria-hidden','true'); if (cartBackdrop) cartBackdrop.setAttribute('aria-hidden','true'); } catch(e){}
      });
    }

    // keep preview up-to-date across tabs
    window.addEventListener('storage', (ev) => {
      if (ev.key === CART_KEY) {
        if (miniCartEl && miniCartEl.getAttribute('aria-hidden') === 'false') renderMiniCartPreviewInto(miniCartEl);
        if (typeof window.updateMiniCartUI === 'function') {
          try { window.updateMiniCartUI(); } catch(e){}
        }
      }
      if (ev.key === ACCOUNT_KEY) {
        if (typeof window.updateMiniCartUI === 'function') {
          try { window.updateMiniCartUI(); } catch(e){}
        }
        // auth change: update header
        const u = safeJSONParse(ev.newValue);
        renderHeaderUser(u);
      }
    });

    // custom event
    window.addEventListener('cartUpdated', () => {
      if (miniCartEl && miniCartEl.getAttribute('aria-hidden') === 'false') renderMiniCartPreviewInto(miniCartEl);
      if (typeof window.updateMiniCartUI === 'function') {
        try { window.updateMiniCartUI(); } catch(e){}
      }
    });

    // fallback for account button click: if not handled by auth module, go to cuenta.html
    // (re-query because accountBtn may be replaced)
    function wireFallbackAccountBtn() {
      accountBtn = byId('accountBtn') || accountBtn;
      if (!accountBtn) return;
      // remove any previous fallback to avoid duplicating handlers
      accountBtn.addEventListener('click', (e) => {
        // if appAuth exists and likely handles sign-in, do nothing and let it handle.
        const local = getLocalUserSnapshot();
        if (!local && !window.appAuth) {
          // open auth overlay if present
          const authOverlay = document.getElementById('authOverlay');
          if (authOverlay) {
            try { authOverlay.style.display = 'block'; authOverlay.setAttribute('aria-hidden','false'); } catch(e){}
            return;
          }
          // otherwise navigate to cuenta.html (login page)
          window.location.href = 'cuenta.html';
        } else {
          // if local user exists, try to render header to ensure consistent UI
          if (local) renderHeaderUser(local);
        }
      }, { passive: true });
    }
    wireFallbackAccountBtn();

    // Esc key closes both
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (cartPanel && cartPanel.classList.contains('open')) {
          cartPanel.classList.remove('open');
          if (cartBackdrop) cartBackdrop.classList.remove('open');
        }
        if (miniCartEl) {
          try { miniCartEl.setAttribute('aria-hidden','true'); } catch(e){}
          miniCartEl.style.display = '';
        }
      }
    });
  }

  // correr init cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartHoverAndAccountListeners);
  } else {
    initCartHoverAndAccountListeners();
  }

  // expone algunas utilidades para otras partes de la app
  window.__LIXBY_AUTH_UI = {
    renderHeaderUser,
    renderAccountPanel,
    ensureAccountHolder,
    formatPriceLocale: formatPriceLocale,
    renderMiniCartPreviewInto
  };

})();

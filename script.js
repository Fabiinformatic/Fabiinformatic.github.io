// auth-ui.js  (cargar después de auth-firebase.js)
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

  // selectores (pueden no existir en todas las páginas)
  const accountBtn = byId('accountBtn');
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
    holder.style.position = 'relative'; // para el menú posicionado respecto a este

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
    avatarBtn.style.padding = '6px';
    avatarBtn.setAttribute('title','Cuenta');

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
    avatarImg.src = 'https://via.placeholder.com/64x64?text=U';

    const nameSpan = document.createElement('span');
    nameSpan.id = 'headerName';
    nameSpan.style.color = 'var(--muted)';
    nameSpan.style.fontWeight = 600;
    nameSpan.style.fontSize = '0.95rem';

    avatarBtn.appendChild(avatarImg);
    avatarBtn.appendChild(nameSpan);

    // menu: acciones (ver cuenta, cerrar sesión)
    const menu = document.createElement('div');
    menu.id = 'accountMenu';
    menu.className = 'account-menu glass';
    // posición absoluta relativa a holder
    menu.style.position = 'absolute';
    menu.style.minWidth = '200px';
    menu.style.right = '0';
    menu.style.top = 'calc(100% + 8px)';
    menu.style.display = 'none';
    menu.style.flexDirection = 'column';
    menu.style.padding = '8px';
    menu.style.boxShadow = '0 8px 30px rgba(0,0,0,0.35)';
    menu.style.zIndex = 9999;
    menu.setAttribute('role','menu');
    menu.setAttribute('aria-hidden','true');

    const viewAccount = document.createElement('button');
    viewAccount.id = 'viewAccountBtn';
    viewAccount.className = 'btn ghost';
    viewAccount.textContent = 'Mi cuenta';
    viewAccount.setAttribute('role','menuitem');
    viewAccount.style.textAlign = 'left';

    const signOutBtn = document.createElement('button');
    signOutBtn.id = 'headerSignOut';
    signOutBtn.className = 'btn ghost';
    signOutBtn.textContent = 'Cerrar sesión';
    signOutBtn.setAttribute('role','menuitem');
    signOutBtn.style.textAlign = 'left';

    // append
    menu.appendChild(viewAccount);
    menu.appendChild(signOutBtn);

    // wrapper combina avatarBtn + menu
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
      // fallback: intenta poner dentro del header .nav si existe
      const headerNav = document.querySelector('.nav .nav-right');
      if (headerNav) headerNav.appendChild(holder);
      else document.body.appendChild(holder);
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

    // close on Escape key
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') hideAccountMenu();
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
        // flexible signOut depending on how auth is exposed (mantener compatibilidad)
        if (window.appAuth && typeof window.appAuth.signOut === 'function') {
          await window.appAuth.signOut();
        } else if (window.appAuth && window.appAuth._rawAuth && typeof window.appAuth._rawAuth.signOut === 'function') {
          await window.appAuth._rawAuth.signOut();
        } else if (window.firebase && window.firebase.auth && typeof window.firebase.auth === 'function') {
          // posible compat shim (si se expone firebase global)
          try { await window.firebase.auth().signOut(); } catch(e){ /* continue to fallback */ }
        } else {
          // last resort: limpiar datos locales y recargar a inicio
          try { localStorage.removeItem('lixby_user'); } catch(e){}
          location.href = 'index.html';
        }
      } catch (err) {
        console.warn('Sign-out failed', err);
        alert('Error cerrando sesión. Revisa la consola.');
      }
    });

    // ensure menu items are focusable and keyboard-friendly
    menu.querySelectorAll('[role="menuitem"]').forEach(item => {
      item.tabIndex = 0;
      item.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowDown') { ev.preventDefault(); focusNextMenuItem(ev.target); }
        if (ev.key === 'ArrowUp') { ev.preventDefault(); focusPrevMenuItem(ev.target); }
        if (ev.key === 'Escape') hideAccountMenu();
      });
    });

    // touch friendly: tap outside handled by document click listener above

    return holder;
  }

  function toggleAccountMenu() {
    const menu = byId('accountMenu');
    const btn = byId('headerAvatarBtn');
    if (!menu || !btn) return;
    const open = menu.style.display !== 'flex';
    menu.style.display = open ? 'flex' : 'none';
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    btn.setAttribute('aria-expanded', String(open));
    if (open) {
      // compute if menu fits below, otherwise show above
      repositionMenuIfNeeded(menu);
      focusFirstMenuItem();
    }
  }
  function hideAccountMenu() {
    const menu = byId('accountMenu');
    const btn = byId('headerAvatarBtn');
    if (!menu || !btn) return;
    menu.style.display = 'none';
    menu.setAttribute('aria-hidden','true');
    btn.setAttribute('aria-expanded','false');
  }
  function focusFirstMenuItem() {
    const menu = byId('accountMenu');
    if (!menu) return;
    const first = menu.querySelector('[role="menuitem"]');
    if (first && typeof first.focus === 'function') first.focus();
  }
  function focusNextMenuItem(current) {
    const menu = byId('accountMenu');
    if (!menu) return;
    const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
    const idx = items.indexOf(current);
    const next = items[(idx + 1) % items.length];
    if (next) next.focus();
  }
  function focusPrevMenuItem(current) {
    const menu = byId('accountMenu');
    if (!menu) return;
    const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
    const idx = items.indexOf(current);
    const prev = items[(idx - 1 + items.length) % items.length];
    if (prev) prev.focus();
  }

  // reposition menu if it would overflow viewport (show above if needed)
  function repositionMenuIfNeeded(menuEl) {
    try {
      if (!menuEl) return;
      const rect = menuEl.getBoundingClientRect();
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      // if bottom overflow, try positioning above
      if (rect.bottom > viewportH && rect.height + 16 < (menuEl.parentElement ? menuEl.parentElement.getBoundingClientRect().top : 0)) {
        menuEl.style.top = 'auto';
        menuEl.style.bottom = 'calc(100% + 8px)';
        menuEl.style.right = '0';
      } else {
        menuEl.style.bottom = 'auto';
        menuEl.style.top = 'calc(100% + 8px)';
      }
    } catch(e){ /* silent */ }
  }

  // Render header UI (avatar + menu). userObj puede ser null
  function renderHeaderUser(userObj) {
    // si no hay nav, no hacer nada
    try {
      // if null -> restore accountBtn
      if (!userObj) {
        // remove holder if present
        const holder = byId('accountHolder');
        if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
        if (accountBtn) { 
          accountBtn.style.display = ''; 
          try { accountBtn.textContent = 'Cuenta'; accountBtn.setAttribute('aria-haspopup','true'); } catch(e){}
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
      const initial = (displayName && displayName.length) ? displayName.charAt(0).toUpperCase() : 'U';
      const photo = userObj.photoURL || (`https://via.placeholder.com/64x64?text=${encodeURIComponent(initial)}`);

      if (avatarImg) {
        avatarImg.src = photo;
        avatarImg.alt = `${displayName} — avatar`;
      }
      if (nameSpan) {
        nameSpan.textContent = displayName;
      }
      if (brand) {
        try { brand.textContent = (userObj.name ? (userObj.name.split(' ')[0]) : 'LIXBY'); } catch(e) { brand.textContent = 'LIXBY'; }
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
    const fn = (user && (user.firstName || user.name && user.name.split(' ')[0])) ? (user.firstName || (user.name && user.name.split(' ')[0])) : '';
    const ln = (user && user.lastName) ? user.lastName : '';
    const dob = (user && user.dob) ? user.dob : '';

    container.innerHTML = `
      <div class="account-profile glass" style="max-width:980px;margin:28px auto;padding:18px;border-radius:12px;display:flex;gap:16px;align-items:flex-start;">
        <div style="flex:0 0 84px;">
          <div class="avatar" style="width:84px;height:84px;border-radius:12px;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--muted)">${(fn||'U').charAt(0).toUpperCase()}</div>
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
          const local = safeJSONParse(localStorage.getItem('lixby_user')) || {};
          local.firstName = firstName || local.firstName;
          local.lastName = lastName || local.lastName;
          local.dob = dobVal || local.dob;
          try { localStorage.setItem('lixby_user', JSON.stringify(local)); } catch(e){/*ignore*/}

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
    return safeJSONParse(localStorage.getItem('lixby_user'));
  }

  // Subscribe to auth state; prefer appAuth.onAuthState but fallback to localStorage
  function subscribeAuth() {
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
    // fallback to reading local snapshot once
    const local = getLocalUserSnapshot();
    renderHeaderUser(local);
    renderAccountPanel(local || {});
  }

  // inicializar en DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', subscribeAuth);
  } else {
    subscribeAuth();
  }

})();

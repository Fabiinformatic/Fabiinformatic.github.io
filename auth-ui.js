// auth-ui.js  (cargar después de auth-firebase.js)
(function(){
  if (!window.appAuth || typeof window.appAuth.onAuthState !== 'function') {
    console.warn('appAuth no está listo aún. Asegúrate de cargar auth-firebase.js antes.');
  }

  // selectores
  const accountBtn = document.getElementById('accountBtn');
  const brand = document.querySelector('.brand');

  function renderHeaderUser(userObj) {
    // userObj puede ser null o { uid, name, email, photoURL }
    if (!userObj) {
      if (accountBtn) { accountBtn.style.display = ''; accountBtn.textContent = 'Cuenta'; }
      if (brand) brand.textContent = 'LIXBY';
      return;
    }

    // mostrar avatar en header y botón Cerrar sesión
    if (accountBtn) {
      // crear pequeño contenedor con avatar y menu "Cerrar sesión"
      accountBtn.style.display = 'none'; // escondemos el botón original
      let holder = document.getElementById('accountHolder');
      if (!holder) {
        holder = document.createElement('div');
        holder.id = 'accountHolder';
        holder.style.display = 'inline-flex';
        holder.style.alignItems = 'center';
        holder.style.gap = '8px';
        holder.style.marginLeft = '8px';
        holder.style.cursor = 'pointer';
        const avatar = document.createElement('img');
        avatar.id = 'headerAvatar';
        avatar.src = userObj.photoURL || 'https://via.placeholder.com/64x64?text='+encodeURIComponent((userObj.name||'U').charAt(0));
        avatar.style.width = '36px';
        avatar.style.height = '36px';
        avatar.style.borderRadius = '8px';
        avatar.style.objectFit = 'cover';
        const nameSpan = document.createElement('span');
        nameSpan.id = 'headerName';
        nameSpan.textContent = userObj.name || (userObj.email ? userObj.email.split('@')[0] : 'Usuario');
        nameSpan.style.color = 'var(--muted)';
        const signOutBtn = document.createElement('button');
        signOutBtn.textContent = 'Cerrar sesión';
        signOutBtn.className = 'btn ghost';
        signOutBtn.addEventListener('click', ()=> {
          if (window.appAuth && window.appAuth.signOut) window.appAuth.signOut();
        });

        holder.appendChild(avatar);
        holder.appendChild(nameSpan);
        holder.appendChild(signOutBtn);
        // insert in header right before theme toggle
        const navRight = document.querySelector('.nav-right');
        if (navRight) navRight.insertBefore(holder, navRight.firstChild);
      } else {
        // actualizar
        const avatar = document.getElementById('headerAvatar');
        if (avatar) avatar.src = userObj.photoURL || 'https://via.placeholder.com/64x64?text=' + encodeURIComponent((userObj.name||'U').charAt(0));
        const nameSpan = document.getElementById('headerName');
        if (nameSpan) nameSpan.textContent = userObj.name || (userObj.email ? userObj.email.split('@')[0] : 'Usuario');
      }
    }
    if (brand) brand.textContent = userObj.name ? userObj.name.split(' ')[0] : 'LIXBY';
  }

  // account page: render form for name, lastName, dob
  function renderAccountPanel(user) {
    // only run if cuenta.html or a container exists
    const container = document.getElementById('accountPanel') || document.getElementById('productDetail') /*fallback*/;
    if (!container) return;
    // build minimal profile UI
    container.innerHTML = `
      <div class="account-profile glass" style="padding:18px;border-radius:12px;">
        <div class="avatar">${(user && user.name)? user.name.charAt(0).toUpperCase() : 'U'}</div>
        <div class="fields">
          <h2>Mi cuenta</h2>
          <div class="profile-row">
            <input id="pf_firstName" placeholder="Nombre" value="${(user && user.name)? (user.name.split(' ')[0] || '') : ''}">
            <input id="pf_lastName" placeholder="Apellidos" value="${(user && user.lastName)? user.lastName : ''}">
          </div>
          <div class="profile-row">
            <input id="pf_dob" type="date" placeholder="Fecha de nacimiento" value="${(user && user.dob)? user.dob : ''}">
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">
            <button id="btnSaveProfile" class="btn primary">Guardar</button>
            <button id="btnCancelProfile" class="btn ghost">Cancelar</button>
          </div>
          <div id="profileMsg" style="margin-top:8px;color:var(--muted);font-size:0.95rem"></div>
        </div>
      </div>
    `;

    const btnSave = document.getElementById('btnSaveProfile');
    const btnCancel = document.getElementById('btnCancelProfile');
    if (btnCancel) btnCancel.addEventListener('click', ()=> { /* simple reload or cancel */ location.reload(); });

    if (btnSave) btnSave.addEventListener('click', async () => {
      const firstName = (document.getElementById('pf_firstName')||{}).value || '';
      const lastName = (document.getElementById('pf_lastName')||{}).value || '';
      const dob = (document.getElementById('pf_dob')||{}).value || '';
      const msg = document.getElementById('profileMsg');
      msg.textContent = 'Guardando...';
      try {
        if (!window.appAuth || !window.appAuth.updateProfileExtra) throw new Error('updateProfileExtra no disponible');
        await window.appAuth.updateProfileExtra({ firstName, lastName, dob });
        msg.textContent = 'Guardado ✔';
      } catch (err) {
        console.error('Guardar perfil', err);
        msg.textContent = 'Error al guardar. Revisa consola.';
      }
    });
  }

  // read minimal local snapshot if exists
  function getLocalUserSnapshot() {
    try {
      const raw = localStorage.getItem('lixby_user');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  // subscribe to auth changes using appAuth.onAuthState if existe
  const subscribe = () => {
    if (window.appAuth && typeof window.appAuth.onAuthState === 'function') {
      window.appAuth.onAuthState((u) => {
        // u puede ser null o { uid, name, email, photoURL } segun lo exponga tu auth script
        // fallback a local snapshot
        const local = getLocalUserSnapshot();
        const userToShow = u || local;
        renderHeaderUser(userToShow);
        // si estamos en la página cuenta, renderizar panel
        if (location.pathname.endsWith('cuenta.html') || document.getElementById('accountPanel') ) {
          renderAccountPanel(userToShow || {});
        }
      });
    } else {
      // fallback: usar localStorage
      const local = getLocalUserSnapshot();
      renderHeaderUser(local);
      if (location.pathname.endsWith('cuenta.html') || document.getElementById('accountPanel')) renderAccountPanel(local || {});
    }
  };

  // iniciar
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', subscribe);
  else subscribe();
})();

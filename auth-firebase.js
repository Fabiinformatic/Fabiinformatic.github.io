// auth-firebase.js  (coloca en la raíz, cargar como <script type="module" src="/auth-firebase.js">)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
  signOut as fbSignOut
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

// --- CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyDMcDeBKSGqf9ZEexQAIM-9u6GLaQEnLcs",
  authDomain: "lixby-e0344.firebaseapp.com",
  projectId: "lixby-e0344",
  storageBucket: "lixby-e0344.firebasestorage.app",
  messagingSenderId: "671722866179",
  appId: "1:671722866179:web:65868eca5146942b507036",
  measurementId: "G-09SQL30MS8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// simple id helper
const $ = (id) => document.getElementById(id);

// storage helpers
function shouldShowWelcome() { try { return !localStorage.getItem('lixby_seen_welcome'); } catch(e){ return true; } }
function hideWelcomePermanently(){ try { localStorage.setItem('lixby_seen_welcome','1'); } catch(e){} }
function saveLocalUser(user){ if(!user){ localStorage.removeItem('lixby_user'); return; } const u = { uid:user.uid, name: user.displayName || (user.email? user.email.split('@')[0] : 'Usuario'), email: user.email||'', photoURL: user.photoURL||'' }; try{ localStorage.setItem('lixby_user', JSON.stringify(u)); }catch(e){ console.warn(e); } }

// update header UI (avatar + sign out)
function updateHeader(user) {
  const accountBtn = $('accountBtn');
  let holder = document.getElementById('accountHolder');

  if (user) {
    // create holder if not exists
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'accountHolder';
      holder.style.display = 'inline-flex';
      holder.style.alignItems = 'center';
      holder.style.gap = '8px';

      const avatar = document.createElement('img');
      avatar.id = 'headerAvatar';
      avatar.alt = 'avatar';
      avatar.style.width = '36px';
      avatar.style.height = '36px';
      avatar.style.borderRadius = '8px';
      avatar.style.objectFit = 'cover';
      avatar.src = user.photoURL || `https://via.placeholder.com/64x64?text=${encodeURIComponent((user.name||'U').charAt(0))}`;

      const name = document.createElement('span');
      name.id = 'headerName';
      name.style.color = 'var(--muted)';
      name.textContent = user.name || (user.email ? user.email.split('@')[0] : 'Usuario');

      const signOutBtn = document.createElement('button');
      signOutBtn.id = 'headerSignOut';
      signOutBtn.className = 'btn ghost';
      signOutBtn.textContent = 'Cerrar sesión';
      signOutBtn.addEventListener('click', async () => {
        try { await appAuth.signOut(); } catch(e){ console.warn(e); }
      });

      holder.appendChild(avatar);
      holder.appendChild(name);
      holder.appendChild(signOutBtn);

      const navRight = document.querySelector('.nav-right');
      if (navRight) {
        // insert before themeToggle if present
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) navRight.insertBefore(holder, themeToggle);
        else navRight.appendChild(holder);
      }
    } else {
      // update content
      const avatar = document.getElementById('headerAvatar');
      const nameEl = document.getElementById('headerName');
      if (avatar) avatar.src = user.photoURL || avatar.src;
      if (nameEl) nameEl.textContent = user.name || nameEl.textContent;
    }
    if (accountBtn) accountBtn.style.display = 'none';
  } else {
    // remove holder if exists
    if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
    if (accountBtn) accountBtn.style.display = '';
  }
}

// Upsert user doc
async function upsertUserProfile(user, extra = {}) {
  if (!user || !user.uid) return;
  try {
    const ref = doc(db, 'users', user.uid);
    const snapshot = await getDoc(ref);
    const base = {
      uid: user.uid,
      name: user.displayName || null,
      email: user.email || null,
      photoURL: user.photoURL || null,
      provider: user.providerData && user.providerData[0] && user.providerData[0].providerId,
      createdAt: snapshot.exists() ? snapshot.data().createdAt : new Date().toISOString()
    };
    await setDoc(ref, { ...base, ...extra }, { merge: true });
  } catch (e) {
    console.warn('upsertUserProfile error', e);
  }
}

// PUBLIC: updateProfileExtra
async function updateProfileExtra(extra = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  const ref = doc(db, 'users', user.uid);
  await setDoc(ref, { profile: extra, updatedAt: new Date().toISOString() }, { merge: true });
  // sync localStorage minimal
  try {
    const raw = localStorage.getItem('lixby_user');
    const local = raw ? JSON.parse(raw) : {};
    local.firstName = extra.firstName || local.firstName;
    local.lastName = extra.lastName || local.lastName;
    local.dob = extra.dob || local.dob;
    localStorage.setItem('lixby_user', JSON.stringify(local));
  } catch(e){ console.warn(e); }
  return true;
}

// Render account page (if on cuenta.html)
async function renderAccountPageIfNeeded(user) {
  const isCuenta = location.pathname.endsWith('cuenta.html') || document.getElementById('accountPanel');
  if (!isCuenta) return;
  // target container
  let target = document.getElementById('accountPanel');
  if (!target) {
    // create a panel in main if not exists
    target = document.createElement('div');
    target.id = 'accountPanel';
    const main = document.querySelector('main') || document.body;
    main.prepend(target);
  }
  // load profile from Firestore
  let profile = {};
  if (user && user.uid) {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        profile = (data.profile) ? data.profile : { firstName: data.name ? data.name.split(' ')[0] : '', lastName: '', dob: data.dob || '' };
      }
    } catch(e) { console.warn('load profile', e); }
  } else {
    // try localStorage fallback
    try {
      const raw = localStorage.getItem('lixby_user');
      if (raw) profile = JSON.parse(raw);
    } catch(e){}
  }

  // render minimal form (white card)
  target.innerHTML = `
    <div class="account-profile" style="max-width:980px;margin:28px auto;">
      <div class="avatar">${(user && user.displayName) ? user.displayName.charAt(0).toUpperCase() : 'U'}</div>
      <div class="fields">
        <h2>Mi cuenta</h2>
        <div class="profile-row">
          <input id="pf_firstName" placeholder="Nombre" value="${profile.firstName || ''}">
          <input id="pf_lastName" placeholder="Apellidos" value="${profile.lastName || ''}">
        </div>
        <div class="profile-row">
          <input id="pf_dob" type="date" placeholder="Fecha de nacimiento" value="${profile.dob || ''}">
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
  if (btnCancel) btnCancel.addEventListener('click', ()=> { location.reload(); });
  if (btnSave) btnSave.addEventListener('click', async () => {
    const firstName = (document.getElementById('pf_firstName') || {}).value || '';
    const lastName = (document.getElementById('pf_lastName') || {}).value || '';
    const dob = (document.getElementById('pf_dob') || {}).value || '';
    const msg = document.getElementById('profileMsg');
    msg.textContent = 'Guardando...';
    try {
      await updateProfileExtra({ firstName, lastName, dob });
      // also update displayName on auth profile (optional)
      try {
        // NOTE: updating Firebase Auth displayName requires updateProfile from auth; omitted to avoid extra imports.
      } catch(e){}
      msg.textContent = 'Guardado ✔';
    } catch(err) {
      console.error(err);
      msg.textContent = 'Error al guardar. Revisa consola.';
    }
  });
}

// oauth error handler
function oauthErrorHandler(err, providerName) {
  console.error(`${providerName} sign-in error`, err);
  if (err && err.code === 'auth/unauthorized-domain') {
    alert('Error: dominio no autorizado para OAuth. Añade tu dominio en Firebase Console → Authentication → Authorized domains (ej: fabiinformatic.github.io).');
  } else {
    alert(err && err.message ? err.message : String(err));
  }
}

// sign in flows
async function doPopupSignIn(provider, providerName) {
  try {
    const res = await signInWithPopup(auth, provider);
    saveLocalUser(res.user);
    await upsertUserProfile(res.user);
    updateHeader({ uid: res.user.uid, name: res.user.displayName || res.user.email, email: res.user.email, photoURL: res.user.photoURL });
    hideAuthOverlaySafe();
    // redirect to cuenta.html when logging in from homepage
    const path = window.location.pathname;
    if (path === '/' || path.endsWith('/index.html') || path.endsWith('index.html')) {
      window.location.href = 'cuenta.html';
    }
    return res.user;
  } catch (err) {
    oauthErrorHandler(err, providerName);
    throw err;
  }
}

// show/hide overlay helpers (safe)
function showAuthOverlaySafe() {
  const overlay = $('authOverlay');
  const authClose = $('authClose');
  if (!overlay) return;
  overlay.style.display = 'block';
  overlay.setAttribute('aria-hidden', 'false');
  try { document.documentElement.style.overflow = 'hidden'; } catch(e){}
  setTimeout(()=> authClose && authClose.focus(), 60);
}
function hideAuthOverlaySafe() {
  const overlay = $('authOverlay');
  const accountBtn = $('accountBtn');
  if (!overlay) return;
  try { if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur(); } catch(e){}
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  try { document.documentElement.style.overflow = ''; } catch(e){}
  setTimeout(()=> { try{ accountBtn && accountBtn.focus(); }catch(e){} }, 30);
}

// init UI listeners
function initAuthUI() {
  const overlay = $('authOverlay');
  const authBackdrop = $('authBackdrop');
  const authClose = $('authClose');
  const btnGoogle = $('btnGoogle');
  const btnGitHub = $('btnGitHub');
  const btnEmailSignIn = $('btnEmailSignIn');
  const btnEmailSignUp = $('btnEmailSignUp');
  const btnAnonymous = $('btnAnonymous');
  const emailInput = $('authEmail');
  const passInput = $('authPass');
  const accountBtn = $('accountBtn');

  if (accountBtn) accountBtn.addEventListener('click', (e)=> { e.preventDefault(); showAuthOverlaySafe(); });
  if (authClose) authClose.addEventListener('click', ()=> { hideAuthOverlaySafe(); hideWelcomePermanently(); });
  if (authBackdrop) authBackdrop.addEventListener('click', ()=> { hideAuthOverlaySafe(); hideWelcomePermanently(); });

  if (btnGoogle) btnGoogle.addEventListener('click', ()=> doPopupSignIn(googleProvider, 'Google').catch(()=>{}));
  if (btnGitHub) btnGitHub.addEventListener('click', ()=> doPopupSignIn(githubProvider, 'GitHub').catch(()=>{}));

  if (btnEmailSignIn) btnEmailSignIn.addEventListener('click', async ()=> {
    const email = (emailInput && emailInput.value || '').trim();
    const pass = (passInput && passInput.value || '').trim();
    if (!email || !pass) return alert('Introduce email y contraseña');
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      saveLocalUser(res.user);
      await upsertUserProfile(res.user);
      updateHeader({ uid: res.user.uid, name: res.user.displayName || res.user.email, email: res.user.email, photoURL: res.user.photoURL });
      hideAuthOverlaySafe();
      const path = window.location.pathname;
      if (path === '/' || path.endsWith('/index.html') || path.endsWith('index.html')) {
        window.location.href = 'cuenta.html';
      }
    } catch (err) {
      console.error('email sign-in', err);
      const code = err && err.code;
      if (code === 'auth/user-not-found') {
        if (confirm('Cuenta no encontrada. ¿Deseas crearla con esas credenciales?')) {
          try {
            const reg = await createUserWithEmailAndPassword(auth, email, pass);
            saveLocalUser(reg.user);
            await upsertUserProfile(reg.user);
            updateHeader({ uid: reg.user.uid, name: reg.user.displayName || reg.user.email, email: reg.user.email, photoURL: reg.user.photoURL });
            hideAuthOverlaySafe();
            window.location.href = 'cuenta.html';
          } catch (regErr) { console.error('Registro falló', regErr); alert(regErr && regErr.message ? regErr.message : String(regErr)); }
        }
      } else {
        alert(err && err.message ? err.message : String(err));
      }
    }
  });

  if (btnEmailSignUp) btnEmailSignUp.addEventListener('click', async ()=> {
    const email = (emailInput && emailInput.value || '').trim();
    const pass = (passInput && passInput.value || '').trim();
    if (!email || !pass) return alert('Introduce email y contraseña');
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      saveLocalUser(res.user);
      await upsertUserProfile(res.user);
      updateHeader({ uid: res.user.uid, name: res.user.displayName || res.user.email, email: res.user.email, photoURL: res.user.photoURL });
      hideAuthOverlaySafe();
      window.location.href = 'cuenta.html';
    } catch (err) { console.error('email signup', err); alert(err && err.message ? err.message : String(err)); }
  });

  if (btnAnonymous) btnAnonymous.addEventListener('click', async ()=> {
    try {
      const res = await signInAnonymously(auth);
      saveLocalUser(res.user);
      await upsertUserProfile(res.user, { anonymous: true });
      updateHeader({ uid: res.user.uid, name: 'Invitado', email: '', photoURL: '' });
      hideAuthOverlaySafe();
      // no redirect for anonymous by default (you can change)
    } catch (err) {
      console.error('anonymous sign-in', err);
      if (err && err.code === 'auth/admin-restricted-operation') {
        alert('El inicio como invitado no está habilitado. Habilítalo en Firebase Console → Authentication → Sign-in method → Anonymous.');
      } else {
        alert(err && err.message ? err.message : String(err));
      }
    }
  });

  // ESC to close
  document.addEventListener('keydown', (e)=> {
    const overlay = $('authOverlay');
    if (e.key === 'Escape' && overlay && overlay.getAttribute('aria-hidden') === 'false') hideAuthOverlaySafe();
  });
}

// onAuthState sync
onAuthStateChanged(auth, async (user) => {
  if (user) {
    saveLocalUser(user);
    updateHeader({ uid: user.uid, name: user.displayName || (user.email? user.email.split('@')[0] : 'Usuario'), email: user.email, photoURL: user.photoURL });
    // if on cuenta.html render form
    await renderAccountPageIfNeeded(user);
  } else {
    localStorage.removeItem('lixby_user');
    updateHeader(null);
    if (shouldShowWelcome()) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ()=> setTimeout(showAuthOverlaySafe, 300));
      } else {
        setTimeout(showAuthOverlaySafe, 300);
      }
    }
  }
});

// public API
window.appAuth = {
  signInWithGoogle: () => doPopupSignIn(googleProvider, 'Google'),
  signInWithGitHub: () => doPopupSignIn(githubProvider, 'GitHub'),
  signInWithEmail: async (email, password) => {
    if (!email || !password) throw new Error('email+password required');
    const res = await signInWithEmailAndPassword(auth, email, password);
    saveLocalUser(res.user);
    await upsertUserProfile(res.user);
    updateHeader({ uid: res.user.uid, name: res.user.displayName || res.user.email, email: res.user.email, photoURL: res.user.photoURL });
    return res.user;
  },
  createUserWithEmail: async (email, password) => {
    if (!email || !password) throw new Error('email+password required');
    const res = await createUserWithEmailAndPassword(auth, email, password);
    saveLocalUser(res.user);
    await upsertUserProfile(res.user);
    updateHeader({ uid: res.user.uid, name: res.user.displayName || res.user.email, email: res.user.email, photoURL: res.user.photoURL });
    return res.user;
  },
  signInAnonymously: async () => {
    const res = await signInAnonymously(auth);
    saveLocalUser(res.user);
    await upsertUserProfile(res.user, { anonymous: true });
    updateHeader({ uid: res.user.uid, name: 'Invitado', email:'', photoURL:'' });
    return res.user;
  },
  signOut: async () => {
    try { await fbSignOut(auth); } catch(e){ console.warn(e); }
    localStorage.removeItem('lixby_seen_welcome'); localStorage.removeItem('lixby_user');
    try { location.href = 'index.html'; } catch(e){}
  },
  onAuthState: (cb) => onAuthStateChanged(auth, (u) => cb(u ? { uid:u.uid, name:u.displayName || (u.email? u.email.split('@')[0] : 'Usuario'), email: u.email, photoURL: u.photoURL } : null)),
  updateProfileExtra,
  _rawAuth: auth
};

// init UI when DOM ready
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAuthUI);
else initAuthUI();

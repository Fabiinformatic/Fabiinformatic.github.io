// auth-firebase-minimal.js
// Módulo ES — inicializa Firebase y expone window.appAuth + modal auth UI
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
  signOut as fbSignOut,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, orderBy, query } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

/* ====== CONFIG (usa tu config) ====== */
const firebaseConfig = {
  apiKey: "AIzaSyDMcDeBKSGqf9ZEexQAIM-9u6GLaQEnLcs",
  authDomain: "lixby-e0344.firebaseapp.com",
  projectId: "lixby-e0344",
  storageBucket: "lixby-e0344.firebasestorage.app",
  messagingSenderId: "671722866179",
  appId: "1:671722866179:web:65868eca5146942b507036",
  measurementId: "G-09SQL30MS8"
};

/* defensive init */
let app;
try { app = (getApps && getApps().length) ? getApp() : initializeApp(firebaseConfig); }
catch(e) { try { app = initializeApp(firebaseConfig); } catch(e2) { console.error('Firebase init failed', e2); } }

const auth = getAuth(app);
const db = getFirestore(app);

/* Providers */
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

/* Small helpers */
const $id = (id) => document.getElementById(id);
function safeJSONParse(raw){ try { return raw ? JSON.parse(raw) : null; } catch(e){ return null; } }
function escapeHtml(str){ if (str === undefined || str === null) return ''; return String(str).replace(/[&<>"]+/g, (m)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]||m)); }

/* Local snapshot helpers */
function saveLocalUser(userObj){
  try{
    if (!userObj) { localStorage.removeItem('lixby_user'); return; }
    const u = { uid: userObj.uid, name: userObj.displayName || (userObj.email ? userObj.email.split('@')[0] : null), email: userObj.email || null, photoURL: userObj.photoURL || null, isAnonymous: !!userObj.isAnonymous };
    localStorage.setItem('lixby_user', JSON.stringify(u));
  }catch(e){ console.warn('saveLocalUser', e); }
}
function clearLocalUser(){ try{ localStorage.removeItem('lixby_user'); }catch(e){} }

/* ============ Minimal CSS for modal ============ */
const MINIMAL_CSS = `
/* injected by auth-firebase-minimal.js */
.lixby-glass{ background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,255,255,0.96)); color:#07101a; backdrop-filter: blur(6px) saturate(120%); border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;}
.lixby-overlay{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px; background: rgba(0,0,0,0.45); }
.lixby-panel{ width:520px; max-width:96vw; padding:20px; box-shadow: 0 24px 60px rgba(2,6,12,0.48); border-radius:12px; background:#fff; color:#07101a; }
.lixby-title{ font-size:1.25rem; font-weight:800; margin:0 0 8px; }
.lixby-sub{ color: #6b7280; margin-bottom:12px; }
.row-top{ display:flex; gap:10px; justify-content:center; margin-bottom:14px; }
.lixby-btn{ display:inline-flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; cursor:pointer; border:1px solid rgba(0,0,0,0.06); background:#fff; font-weight:700; }
.lixby-btn .icon{ width:18px; height:18px; display:inline-block; }
.lixby-primary{ display:block; width:100%; margin:8px 0; padding:12px; font-size:1rem; border-radius:10px; background:linear-gradient(180deg,#2f8cff,#1a6fe0); color:white; border:0; font-weight:800; }
.lixby-secondary{ display:block; width:100%; margin:8px 0; padding:12px; font-size:1rem; border-radius:10px; background:transparent; border:1px solid rgba(0,0,0,0.08); color:#07101a; font-weight:700; }
.lixby-ghost{ background:transparent; border:none; color:#6b7280; text-align:center; margin-top:8px; display:block; }
.lixby-divider{ display:flex; align-items:center; gap:12px; color:#9ca3af; margin:8px 0; }
.lixby-divider hr{ flex:1; height:1px; border:0; background:#e6e9ef; opacity:0.6; }
.lixby-msg{ margin-top:8px; color:#ef4444; font-weight:600; min-height:18px; }
.lixby-close{ position:absolute; right:18px; top:14px; background:transparent; border:0; font-size:18px; cursor:pointer; color:#374151; }
`;

/* inject css once */
function injectCSS(){
  if (document.getElementById('lixby-minimal-css')) return;
  const s = document.createElement('style'); s.id = 'lixby-minimal-css'; s.textContent = MINIMAL_CSS; document.head.appendChild(s);
}

/* ============ Create overlay with exact layout requested ============ */
function createAuthOverlay(){
  if ($id('lixbyAuthOverlay')) return;
  injectCSS();

  const googleSVG = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="#EA4335" d="M21.6 12.227c0-.74-.066-1.449-.191-2.136H12v4.048h5.4c-.233 1.254-1.01 2.316-2.155 3.03v2.52h3.48c2.036-1.876 3.23-4.64 3.23-7.462z"/><path fill="#34A853" d="M12 22c2.43 0 4.467-.8 5.956-2.17l-3.48-2.52c-.968.647-2.208 1.03-3.476 1.03-2.673 0-4.935-1.802-5.744-4.22H2.664v2.64C4.137 19.95 7.78 22 12 22z"/><path fill="#4A90E2" d="M6.256 13.12A6.997 6.997 0 0 1 6 12c0-.414.042-.817.122-1.2V8.16H2.664A9.997 9.997 0 0 0 2 12c0 1.66.397 3.226 1.096 4.64l3.16-3.52z"/><path fill="#FBBC05" d="M12 6.0c1.318 0 2.5.452 3.43 1.34l2.57-2.57C16.47 2.98 14.43 2 12 2 7.78 2 4.137 4.05 2.664 8.16L6 9.36C6.865 7.16 9.327 6 12 6z"/></svg>`;
  const githubSVG = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.18c0 4.5 2.87 8.32 6.84 9.66.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.56 2.36 1.11 2.94.85.09-.66.35-1.11.64-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05A9.24 9.24 0 0 1 12 6.8c.85.004 1.71.115 2.5.34 1.9-1.32 2.74-1.05 2.74-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.81-4.57 5.07.36.3.68.9.68 1.82 0 1.31-.01 2.36-.01 2.68 0 .26.18.59.69.49A10.2 10.2 0 0 0 22 12.18C22 6.58 17.52 2 12 2z"/></svg>`;

  const overlay = document.createElement('div');
  overlay.id = 'lixbyAuthOverlay';
  overlay.className = 'lixby-overlay';
  overlay.setAttribute('aria-hidden','true');

  overlay.innerHTML = `
    <div class="lixby-panel l ixby-glass" role="dialog" aria-modal="true" aria-labelledby="lixbyAuthTitle">
      <button class="lixby-close" id="lixbyCloseBtn" aria-label="Cerrar">✕</button>
      <h3 id="lixbyAuthTitle" class="lixby-title">Bienvenido a LIXBY</h3>
      <div class="lixby-sub">Inicia sesión para acceder a tu cuenta, pedidos y favoritos.</div>

      <div class="row-top" aria-hidden="false">
        <button id="lixbyGoogle" class="lixby-btn" type="button">${googleSVG}<span>Iniciar con Google</span></button>
        <button id="lixbyGithub" class="lixby-btn" type="button">${githubSVG}<span>Iniciar con GitHub</span></button>
      </div>

      <button id="lixbyGoLogin" class="lixby-primary" type="button">Iniciar sesión</button>

      <div class="lixby-divider" aria-hidden="true"><hr /><div>o</div><hr /></div>

      <button id="lixbyGoRegister" class="lixby-secondary" type="button">Registrarse</button>

      <button id="lixbyAnon" class="lixby-ghost" type="button">Continuar como invitado</button>

      <div id="lixbyAuthMsg" class="lixby-msg" role="status" aria-live="polite"></div>
    </div>
  `;

  // fix small accidental class spacing
  overlay.querySelector('.lixby-panel').className = overlay.querySelector('.lixby-panel').className.replace(' l ',' ');

  document.body.appendChild(overlay);

  // handlers
  $id('lixbyCloseBtn').addEventListener('click', hideAuthOverlay);
  $id('lixbyGoogle').addEventListener('click', async () => {
    showMsg('Abriendo proveedor Google…');
    try { await doPopupSignIn(googleProvider,'Google'); } catch(e){ showMsg(makeFriendlyOAuthError(e,'Google')); }
  });
  $id('lixbyGithub').addEventListener('click', async () => {
    showMsg('Abriendo proveedor GitHub…');
    try { await doPopupSignIn(githubProvider,'GitHub'); } catch(e){ showMsg(makeFriendlyOAuthError(e,'GitHub')); }
  });
  $id('lixbyGoLogin').addEventListener('click', ()=> { hideAuthOverlay(); location.href = 'login.html'; });
  $id('lixbyGoRegister').addEventListener('click', ()=> { hideAuthOverlay(); location.href = 'register.html'; });
  $id('lixbyAnon').addEventListener('click', async ()=>{ showMsg('Entrando como invitado…'); try{ const res = await signInAnonymously(auth); handleSignIn(res.user,true); }catch(err){ showMsg(err && err.message ? err.message : String(err)); } });
}

/* user friendly oauth errors */
function makeFriendlyOAuthError(err, providerName){
  if (!err) return 'Error de autenticación.';
  const code = err.code || '';
  if (code === 'auth/unauthorized-domain') return `${providerName}: Dominio no autorizado. Añádelo en Firebase Console → Authentication → Sign-in method → Authorized domains.`;
  if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') return `${providerName}: Ventana emergente bloqueada o cerrada. Permite ventanas emergentes y vuelve a intentarlo.`;
  if (code === 'auth/account-exists-with-different-credential') return `${providerName}: Ya existe una cuenta con ese correo utilizando otro proveedor.`;
  return err.message || String(err);
}

function showMsg(txt){ const el = $id('lixbyAuthMsg'); if (el) el.textContent = txt; else console.warn('msg:',txt); }
function showAuthOverlay(){ const o = $id('lixbyAuthOverlay'); if (!o) createAuthOverlay(); const overlay = $id('lixbyAuthOverlay'); overlay.style.display='flex'; overlay.setAttribute('aria-hidden','false'); try{ document.documentElement.style.overflow='hidden'; }catch(e){} if ($id('lixbyAuthMsg')) $id('lixbyAuthMsg').textContent=''; }
function hideAuthOverlay(){ const overlay = $id('lixbyAuthOverlay'); if (!overlay) return; overlay.style.display='none'; overlay.setAttribute('aria-hidden','true'); try{ document.documentElement.style.overflow=''; }catch(e){} }

/* ============ Firestore upsert ============ */
async function upsertUserProfile(user, extra={}){
  if (!user || !user.uid) return;
  try{
    const ref = doc(db,'users',user.uid);
    const snapshot = await getDoc(ref);
    const base = { uid:user.uid, name:user.displayName||null, email:user.email||null, photoURL:user.photoURL||null, provider:user.providerData && user.providerData[0] && user.providerData[0].providerId || null, createdAt: snapshot.exists() ? snapshot.data().createdAt : new Date().toISOString() };
    await setDoc(ref, { ...base, ...extra }, { merge:true });
  }catch(e){ console.warn('upsertUserProfile', e); }
}

/* ============ Handle sign-in unified ============ */
async function handleSignIn(user, anonymous=false){
  if (!user) return;
  saveLocalUser(user);
  try{ await upsertUserProfile(user, anonymous?{anonymous:true}:{}) }catch(e){}
  updateHeaderSafe(user);
  hideAuthOverlay();
  const path = location.pathname;
  if (path === '/' || path.endsWith('/index.html') || path.endsWith('/')) location.href = 'cuenta.html';
}

/* ============ OAUTH helpers ============ */
function oauthErrorHandler(err, providerName){ console.error(`${providerName} sign-in error`, err); showMsg(makeFriendlyOAuthError(err,providerName)); }
async function doPopupSignIn(provider, providerName){ try{ const res = await signInWithPopup(auth, provider); handleSignIn(res.user); window.dispatchEvent(new CustomEvent('lixby:auth:signin',{ detail: { uid: res.user.uid, provider: providerName } })); return res.user; }catch(err){ oauthErrorHandler(err, providerName); throw err; } }

/* ============ Public API ============ */
window.appAuth = {
  signInWithGoogle: () => doPopupSignIn(googleProvider,'Google'),
  signInWithGitHub: () => doPopupSignIn(githubProvider,'GitHub'),
  signInWithEmail: async (email,password)=>{ if(!email||!password) throw new Error('email+password required'); const res = await signInWithEmailAndPassword(auth,email,password); saveLocalUser(res.user); await upsertUserProfile(res.user); updateHeaderSafe(res.user); return res.user; },
  createUserWithEmail: async (email,password, extraProfile={})=>{ if(!email||!password) throw new Error('email+password required'); const res = await createUserWithEmailAndPassword(auth,email,password); saveLocalUser(res.user); await upsertUserProfile(res.user, extraProfile); updateHeaderSafe(res.user); return res.user; },
  signInAnonymously: async ()=>{ const res = await signInAnonymously(auth); saveLocalUser(res.user); await upsertUserProfile(res.user,{anonymous:true}); updateHeaderSafe({ uid: res.user.uid, displayName:'Invitado', email:'', photoURL:''}); return res.user; },
  signOut: async ()=>{ try{ await fbSignOut(auth); }catch(e){ console.warn(e); } try{ localStorage.removeItem('lixby_seen_welcome'); localStorage.removeItem('lixby_user'); }catch(e){} try{ location.href='index.html'; }catch(e){} },
  onAuthState: (cb)=>{ if(typeof cb!=='function') return ()=>{}; const unsub = onAuthStateChanged(auth,(u)=>{ cb(u ? { uid:u.uid, name:u.displayName || (u.email? u.email.split('@')[0] : null), email:u.email, photoURL:u.photoURL, isAnonymous: u.isAnonymous } : null); }); return unsub; },
  updateProfileExtra: async (extra={})=>{ const u = auth.currentUser; if(!u) throw new Error('No authenticated user'); try{ const ref = doc(db,'users',u.uid); await setDoc(ref,{ profile: extra, updatedAt: new Date().toISOString() },{ merge:true }); // persist local snapshot
      try{ const raw = localStorage.getItem('lixby_user'); const local = raw? JSON.parse(raw): {}; local.firstName = extra.firstName || local.firstName; local.lastName = extra.lastName || local.lastName; local.dob = extra.dob || local.dob; local.phone = extra.phone || local.phone; local.shipping = extra.shipping || local.shipping; localStorage.setItem('lixby_user', JSON.stringify(local)); }catch(e){} return true; }catch(e){ console.error('updateProfileExtra err', e); throw e; } },
  resetPassword: async (email)=>{ if(!email) throw new Error('email required'); try { await sendPasswordResetEmail(auth, email); return true; } catch(e) { throw e; } },
  _rawAuth: auth,
  _rawDb: db
};

/* ============ Header + account UI (ensure presence) ============ */
function ensureHeader(){
  if ($id('lixbyHeader')) return $id('lixbyHeader');
  injectCSS();
  const header = document.createElement('div'); header.id = 'lixbyHeader'; header.className = 'lixby-header';
  header.style.display = 'flex'; header.style.alignItems = 'center'; header.style.justifyContent = 'space-between'; header.style.gap='12px'; header.style.padding='10px 18px';
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;cursor:pointer;" id="lixby_logo">
      <img src="https://i.imgur.com/dOCYmkx.jpeg" alt="Lixby" style="width:36px;height:36px;border-radius:8px;object-fit:cover"/>
      <div style="font-weight:800;font-size:1rem;">LIXBY</div>
    </div>
    <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
      <button id="lixbyAccountBtn" class="lixby-btn" type="button">Cuenta</button>
    </div>
  `;
  document.body.prepend(header);
  $id('lixbyAccountBtn').addEventListener('click', ()=> showAuthOverlay());
  $id('lixby_logo').addEventListener('click', ()=> location.href = 'index.html');
  return header;
}

function updateHeaderSafe(user){
  ensureHeader();
  const prev = $id('lixbyAccountHolder'); if (prev) prev.remove();
  if (!user){ return; }
  const holder = document.createElement('div'); holder.id = 'lixbyAccountHolder'; holder.className = 'lixby-header';
  const name = escapeHtml(user.displayName || (user.email? user.email.split('@')[0] : 'Usuario'));
  const photo = user.photoURL ? escapeHtml(user.photoURL) : `https://via.placeholder.com/64x64?text=${encodeURIComponent((name||'U').charAt(0))}`;
  holder.innerHTML = `
    <img style="width:44px;height:44px;border-radius:10px;object-fit:cover" src="${photo}" alt="avatar">
    <div style="display:flex;flex-direction:column;align-items:flex-end;">
      <div style="font-weight:700">${name}</div>
      <div style="display:flex;gap:8px;margin-top:6px;">
        <button id="lixbyViewAccount" class="lixby-btn" type="button">Mi cuenta</button>
        <button id="lixbySignOut" class="lixby-btn" type="button">Cerrar sesión</button>
      </div>
    </div>
  `;
  const header = $id('lixbyHeader'); header.appendChild(holder);
  $id('lixbyViewAccount').addEventListener('click', ()=> { location.href='cuenta.html'; });
  $id('lixbySignOut').addEventListener('click', async ()=>{ try{ await fbSignOut(auth); clearLocalUser(); location.href='index.html'; }catch(e){ console.warn(e); } });
}

/* ============ Account panel (cuenta.html) ============ */
// (keeps previous implementation — renders additional info when on cuenta.html)
async function renderAccountPageIfNeeded(user){
  const isCuenta = location.pathname.endsWith('cuenta.html') || !!$id('accountPanel');
  if (!isCuenta) return;
  const main = document.querySelector('main') || document.body;
  let target = $id('accountPanel'); if (!target){ target = document.createElement('div'); target.id='accountPanel'; main.prepend(target); }
  let profile = {};
  if (user && user.uid){
    try{ const snap = await getDoc(doc(db,'users',user.uid)); if (snap.exists()){ const d = snap.data(); profile = d.profile || { firstName: d.name? d.name.split(' ')[0] : '', lastName:'', dob: d.dob || '' }; profile.email = d.email || user.email; } }
    catch(e){ console.warn('load profile', e); }
  } else {
    profile = safeJSONParse(localStorage.getItem('lixby_user')) || {};
  }

  const fn = escapeHtml(profile.firstName||profile.name||'');
  const ln = escapeHtml(profile.lastName||'');
  const dob = escapeHtml(profile.dob||'');
  const email = escapeHtml(profile.email || (user && user.email) || '');
  target.innerHTML = '';
  const panel = document.createElement('div'); panel.className='lixby-glass'; panel.style.padding='18px'; panel.style.maxWidth='1100px'; panel.style.margin='28px auto';
  panel.innerHTML = `
    <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">
      <div style="flex:0 0 120px;">
        <div style="width:120px;height:120px;border-radius:14px;background:rgba(0,0,0,0.04);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:28px">${(fn||'U').charAt(0).toUpperCase()}</div>
      </div>
      <div style="flex:1;min-width:260px;">
        <h2>Información personal</h2>
        <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap">
          <input id="pf_firstName" placeholder="Nombre" class="lixby-input" value="${fn}">
          <input id="pf_lastName" placeholder="Apellidos" class="lixby-input" value="${ln}">
        </div>
        <div style="margin-top:10px;display:flex;gap:10px;align-items:center;">
          <label for="pf_dob" style="min-width:120px">Fecha de nacimiento</label>
          <input id="pf_dob" type="date" class="lixby-input" value="${dob}" />
        </div>
        <div style="margin-top:10px;">
          <label style="display:block;font-weight:700">Correo</label>
          <div class="lixby-small">${email || '<span style="color:rgba(0,0,0,0.6)">No definido</span>'}</div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
          <button id="btnSaveProfile" class="lixby-btn" type="button">Guardar</button><button id="btnCancelProfile" class="lixby-btn" type="button">Cancelar</button>
        </div>
        <div id="profileMsg" class="lixby-small" style="margin-top:8px"></div>
      </div>
    </div>

    <hr style="margin:18px 0;border:none;border-top:1px solid rgba(0,0,0,0.06)" />

    <div style="display:grid;grid-template-columns:1fr 360px;gap:18px;">
      <div>
        <h3>Información de envíos</h3>
        <div id="shippingInfo" class="lixby-small" style="margin-top:8px">Cargando...</div>

        <h3 style="margin-top:18px">Pedidos recientes</h3>
        <div id="ordersList" style="margin-top:8px"></div>
      </div>

      <aside>
        <h3>Favoritos</h3>
        <div id="favsList" style="margin-top:8px"></div>
      </aside>
    </div>
  `;

  target.appendChild(panel);

  // handlers
  $id('btnCancelProfile').addEventListener('click', ()=> location.reload());
  $id('btnSaveProfile').addEventListener('click', async ()=>{ 
    const firstName = ($id('pf_firstName')||{}).value || '';
    const lastName = ($id('pf_lastName')||{}).value || '';
    const dobVal = ($id('pf_dob')||{}).value || '';
    const msg = $id('profileMsg'); if (msg) msg.textContent='Guardando...';
    try{ if (!window.appAuth || typeof window.appAuth.updateProfileExtra !== 'function') throw new Error('updateProfileExtra no disponible'); await window.appAuth.updateProfileExtra({ firstName, lastName, dob: dobVal }); if (msg) msg.textContent='Guardado ✔';
      const local = safeJSONParse(localStorage.getItem('lixby_user')) || {}; local.firstName = firstName || local.firstName; local.lastName = lastName || local.lastName; local.dob = dobVal || local.dob; try{ localStorage.setItem('lixby_user', JSON.stringify(local)); }catch(e){}
      updateHeaderSafe({ displayName: (firstName ? (firstName + (lastName? ' '+lastName:'')) : local.name), email: local.email, photoURL: local.photoURL });
    }catch(e){ console.error('save profile', e); if (msg) msg.textContent='Error al guardar. Revisa consola.'; }
  });

  // load shipping/orders/favs (same as previous; kept defensive)
  try{
    if (user && user.uid){
      const uref = doc(db,'users',user.uid);
      const snap = await getDoc(uref);
      const udata = snap.exists() ? snap.data() : {};
      const shipping = udata.shipping || null;
      const shipEl = $id('shippingInfo');
      if (shipping){
        shipEl.innerHTML = `<div>${escapeHtml(shipping.address||'')}<br>${escapeHtml(shipping.city||'')} ${escapeHtml(shipping.postal||'')}<br>${escapeHtml(shipping.country||'')}</div>`;
      } else {
        shipEl.innerHTML = `<div class="lixby-small">No hay dirección de envío registrada. <a href="#" id="addShipping" style="color:inherit;text-decoration:underline">Añadir dirección</a></div>`;
        $id('addShipping')?.addEventListener('click', (e)=>{ e.preventDefault(); promptAddShipping(user.uid); });
      }

      // orders list
      const ordersListEl = $id('ordersList');
      ordersListEl.innerHTML = 'Cargando pedidos…';
      try{
        const col = collection(db,'users',user.uid,'orders');
        const q = query(col, orderBy('createdAt','desc'));
        const snapOrders = await getDocs(q);
        if (snapOrders.empty) {
          ordersListEl.innerHTML = '<div class="lixby-small">No tienes pedidos recientes.</div>';
        } else {
          const frag = document.createDocumentFragment();
          snapOrders.forEach(os => {
            const o = os.data();
            const el = document.createElement('div');
            el.style.padding='10px';
            el.style.border='1px solid rgba(0,0,0,0.04)';
            el.style.borderRadius='8px';
            el.style.marginBottom='8px';
            el.innerHTML = `<div style="font-weight:700">${escapeHtml(o.title || ('Pedido ' + os.id))}</div>
                            <div class="lixby-small">Fecha: ${o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</div>
                            <div class="lixby-small">Estado: ${escapeHtml(o.status || 'Pendiente')}</div>`;
            frag.appendChild(el);
          });
          ordersListEl.innerHTML = '';
          ordersListEl.appendChild(frag);
        }
      }catch(e){ ordersListEl.innerHTML = '<div class="lixby-small">No se pudieron cargar pedidos.</div>'; console.warn(e); }

      // favorites
      const favsEl = $id('favsList');
      favsEl.innerHTML = 'Cargando…';
      try{
        const favCol = collection(db,'users',user.uid,'favorites');
        const favSnap = await getDocs(favCol);
        if (favSnap.empty) {
          favsEl.innerHTML = '<div class="lixby-small">No hay favoritos.</div>';
        } else {
          const fragF = document.createDocumentFragment();
          favSnap.forEach(fs => {
            const f = fs.data();
            const item = document.createElement('div');
            item.style.display='flex';
            item.style.alignItems='center';
            item.style.justifyContent='space-between';
            item.style.gap='8px';
            item.style.padding='8px';
            item.innerHTML = `<div style="display:flex;gap:8px;align-items:center">
                                <img src="${escapeHtml(f.image||'https://via.placeholder.com/56')}" alt="${escapeHtml(f.name||'')}" style="width:56px;height:56px;object-fit:cover;border-radius:8px">
                                <div><div style="font-weight:700">${escapeHtml(f.name||'Producto')}</div><div class="lixby-small">${escapeHtml(f.price || '')}</div></div>
                              </div>
                              <div style="display:flex;flex-direction:column;gap:6px">
                                <button class="lixby-btn" data-id="${fs.id}" data-action="view">Ver</button>
                                <button class="lixby-btn" data-id="${fs.id}" data-action="remove">Eliminar</button>
                              </div>`;
            fragF.appendChild(item);
          });
          favsEl.innerHTML = '';
          favsEl.appendChild(fragF);
          // attach handlers (view/remove)
          favsEl.querySelectorAll('button').forEach(b => {
            const action = b.getAttribute('data-action');
            const id = b.getAttribute('data-id');
            if (action === 'view') b.addEventListener('click', ()=> { const pid = b.getAttribute('data-id'); location.href = 'producto.html?id='+encodeURIComponent(pid); });
            if (action === 'remove') b.addEventListener('click', async ()=> {
              if (!confirm('Eliminar favorito?')) return;
              try{ const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js'); await deleteDoc(doc(db,'users',user.uid,'favorites',id)); renderAccountPageIfNeeded(user);
              }catch(e){ console.warn(e); alert('No se pudo eliminar favorito'); }
            });
          });
        }
      }catch(e){ favsEl.innerHTML = '<div class="lixby-small">No se pudieron cargar favoritos.</div>'; console.warn(e); }
    }
  }catch(e){ console.warn('renderAccountPageIfNeeded err', e); }

  async function promptAddShipping(uid){
    const address = prompt('Dirección (Calle, número):');
    if (!address) return;
    const city = prompt('Ciudad:') || '';
    const postal = prompt('Código postal:') || '';
    const country = prompt('País:') || '';
    try{ await setDoc(doc(db,'users',uid), { shipping:{ address, city, postal, country }, updatedAt: new Date().toISOString() }, { merge:true }); alert('Dirección guardada'); renderAccountPageIfNeeded({ uid }); }catch(e){ console.warn(e); alert('No se pudo guardar dirección'); }
  }
}

/* ============ Init / subscribe auth state ============ */
function init(){
  createAuthOverlay();
  ensureHeader();
  onAuthStateChanged(auth, async (user) => {
    if (user){ try{ saveLocalUser(user); updateHeaderSafe(user); await renderAccountPageIfNeeded(user); window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ uid:user.uid, signedIn:true } })); }catch(e){ console.warn(e); } }
    else{ clearLocalUser(); updateHeaderSafe(null); const shouldShow = !localStorage.getItem('lixby_seen_welcome'); if (shouldShow) setTimeout(()=> showAuthOverlay(), 400); window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ signedIn:false } })); }
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

export {}; // módulo

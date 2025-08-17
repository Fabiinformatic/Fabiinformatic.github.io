// auth-firebase-minimal.js
// ES module. Inclúyelo como: <script type="module" src="auth-firebase-minimal.js"></script>

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
  signOut as fbSignOut,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, orderBy, query } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

/* ====== CONFIG - usa tu config ====== */
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

/* helpers */
const $id = (id) => document.getElementById(id);
function safeJSONParse(raw){ try { return raw ? JSON.parse(raw) : null; } catch(e){ return null; } }
function escapeHtml(str){ if (str === undefined || str === null) return ''; return String(str).replace(/[&<>"]+/g, (m)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]||m)); }
function isEmail(v){ return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function mapErrorMessage(code, fallback){
  const map = {
    'auth/invalid-email': 'Correo inválido.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/email-already-in-use': 'El correo ya está registrado.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/popup-blocked': 'El navegador bloqueó la ventana emergente. Se abrirá en la misma pestaña.',
    'auth/popup-closed-by-user': 'La ventana emergente fue cerrada. Intenta de nuevo.',
    'auth/cancelled-popup-request': 'Solicitud de popup cancelada. Intentando método alternativo...',
    'auth/unauthorized-domain': 'Dominio no autorizado para OAuth. Añádelo en Firebase Console.',
    'auth/operation-not-allowed': 'Método de acceso no permitido. Habilítalo en Firebase Console.'
  };
  return map[code] || fallback || 'Error al procesar la solicitud.';
}

/* Local snapshot helpers */
function saveLocalUser(userObj){
  try{
    if (!userObj) { localStorage.removeItem('lixby_user'); return; }
    const u = { uid: userObj.uid, name: userObj.displayName || (userObj.email ? userObj.email.split('@')[0] : null), email: userObj.email || null, photoURL: userObj.photoURL || null, isAnonymous: !!userObj.isAnonymous, firstName: null, lastName: null, dob: null };
    localStorage.setItem('lixby_user', JSON.stringify(u));
  }catch(e){ console.warn('saveLocalUser', e); }
}
function clearLocalUser(){ try{ localStorage.removeItem('lixby_user'); }catch(e){} }

/* UI helpers: modal styles/message area */
function enforceModalStylesIfPresent(){
  try {
    const authModal = $id('authModal');
    const authOverlay = $id('authOverlay');
    const authBackdrop = $id('authBackdrop');

    if (authOverlay) {
      authOverlay.style.setProperty('z-index', '9998', 'important');
      if (authBackdrop) {
        authBackdrop.style.background = 'rgba(0,0,0,0.45)';
        authBackdrop.style.backdropFilter = 'blur(4px)';
      } else {
        authOverlay.style.background = 'rgba(0,0,0,0.45)';
      }
    }
    if (authModal) {
      authModal.style.background = '#ffffff';
      authModal.style.color = '#07101a';
      authModal.style.boxShadow = '0 24px 60px rgba(2,6,12,0.48)';
      authModal.style.border = '0';
      authModal.style.borderRadius = '12px';
      authModal.style.padding = authModal.style.padding || '20px';
    }
  } catch(e) { /* no crítico */ }
}
function ensureModalMessageArea(){
  const authModal = $id('authModal');
  if (!authModal) return null;
  let msg = authModal.querySelector('.lixby-auth-msg');
  if (!msg) {
    msg = document.createElement('div');
    msg.className = 'lixby-auth-msg';
    msg.style.marginTop = '12px';
    msg.style.padding = '10px';
    msg.style.borderRadius = '8px';
    msg.style.background = '#ffffff';
    msg.style.color = '#07101a';
    msg.style.fontWeight = '700';
    msg.style.display = 'none';
    msg.style.border = '1px solid rgba(0,0,0,0.06)';
    authModal.appendChild(msg);
  }
  return msg;
}
function showModalMessage(text, autoHideMs){
  const msg = ensureModalMessageArea();
  if (!msg) { console.log('MSG:', text); return; }
  msg.textContent = text;
  msg.style.display = 'block';
  if (autoHideMs && autoHideMs > 0) {
    setTimeout(()=> { try { msg.style.display = 'none'; } catch(e){} }, autoHideMs);
  }
}

/* upsert user profile safe */
async function upsertUserProfile(user, extra={}){
  if (!user || !user.uid) return;
  try{
    const ref = doc(db,'users',user.uid);
    const snapshot = await getDoc(ref);
    const base = { uid:user.uid, name:user.displayName||null, email:user.email||null, photoURL:user.photoURL||null, provider:user.providerData && user.providerData[0] && user.providerData[0].providerId || null, createdAt: snapshot.exists() ? snapshot.data().createdAt : new Date().toISOString() };
    await setDoc(ref, { ...base, ...extra }, { merge:true });
  }catch(e){ console.warn('upsertUserProfile', e); }
}

/* Handle sign-in uniformly */
async function handleSignIn(user, { anonymous=false, redirectToIndex=true, showCongrats=true } = {}){
  if (!user) return;
  saveLocalUser(user);
  try{ await upsertUserProfile(user, anonymous?{anonymous:true}:{}) }catch(e){}
  updateHeaderSafe(user);
  if (showCongrats) showModalMessage('Felicidades — has iniciado sesión', 1200);
  // hide overlay + redirect
  setTimeout(()=> {
    hideAuthOverlay();
    if (redirectToIndex) try { location.href = 'index.html'; } catch(e){}
  }, 900);
}

/* popup/redirect OAuth with fallback */
let popupInProgress = false;
async function doOAuthSignInWithFallback(provider, providerName){
  // disable concurrent popups
  if (popupInProgress) return;
  popupInProgress = true;
  try{
    // first attempt: popup
    try {
      const res = await signInWithPopup(auth, provider);
      await handleSignIn(res.user, { anonymous:false, redirectToIndex:true, showCongrats:true });
      window.dispatchEvent(new CustomEvent('lixby:auth:signin',{ detail: { uid: res.user.uid, provider: providerName } }));
      return res.user;
    } catch (errPopup) {
      // If popup fails for reasons often related to cross-origin or blocked popups,
      // fallback to redirect flow.
      const code = errPopup && errPopup.code;
      console.warn('Popup failed:', code, errPopup);
      // If error is a popup-related one, do redirect
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/unauthorized-domain') {
        showModalMessage(mapErrorMessage(code, 'Popup falló. Usando método alternativo...'), 2200);
        try {
          await signInWithRedirect(auth, provider);
          // redirect will unload page; getRedirectResult is handled in init()
          return null;
        } catch (errRedirect) {
          console.error('redirect fallback failed', errRedirect);
          showModalMessage(mapErrorMessage(errRedirect && errRedirect.code, 'No fue posible iniciar sesión con OAuth'), 4000);
          throw errRedirect;
        }
      } else {
        // other kinds of errors: show message
        showModalMessage(mapErrorMessage(code, errPopup && errPopup.message), 4000);
        throw errPopup;
      }
    }
  } finally {
    popupInProgress = false;
  }
}

/* wire modal controls & inputs, with robust try/catch */
function wireExistingModalButtons(){
  const btnGoogle = $id('btnGoogle');
  const btnGithub = $id('btnGitHub');
  const btnEmailSignIn = $id('btnEmailSignIn');
  const btnEmailSignUp = $id('btnEmailSignUp');
  const btnAnonymous = $id('btnAnonymous');
  const authClose = $id('authClose');
  const authOverlay = $id('authOverlay');
  const authBackdrop = $id('authBackdrop');

  enforceModalStylesIfPresent();
  ensureModalMessageArea();

  if (btnGoogle) {
    btnGoogle.addEventListener('click', async (e) => {
      try { e.preventDefault(); btnGoogle.disabled = true; await doOAuthSignInWithFallback(googleProvider, 'Google'); }
      catch(err){ console.warn('Google sign-in error', err); }
      finally { try{ btnGoogle.disabled = false; }catch(e){} }
    });
  }
  if (btnGithub) {
    btnGithub.addEventListener('click', async (e) => {
      try { e.preventDefault(); btnGithub.disabled = true; await doOAuthSignInWithFallback(githubProvider, 'GitHub'); }
      catch(err){ console.warn('GitHub sign-in error', err); }
      finally { try{ btnGithub.disabled = false; }catch(e){} }
    });
  }

  if (btnEmailSignIn) {
    btnEmailSignIn.addEventListener('click', async (ev) => {
      try {
        ev.preventDefault();
        btnEmailSignIn.disabled = true;
        const email = ($id('authEmail')||{}).value || '';
        const pass = ($id('authPass')||{}).value || '';
        if (!isEmail(email)) { showModalMessage('Introduce un correo válido', 2500); return; }
        if (!pass || pass.length < 6) { showModalMessage('La contraseña debe tener al menos 6 caracteres', 2500); return; }
        const res = await signInWithEmailAndPassword(auth, email, pass);
        await handleSignIn(res.user, { anonymous:false, redirectToIndex:true, showCongrats:true });
      } catch (err) {
        console.warn('email signIn err', err);
        showModalMessage(mapErrorMessage(err && err.code, err && err.message), 4000);
      } finally {
        try{ btnEmailSignIn.disabled = false; }catch(e){}
      }
    });
  }

  if (btnEmailSignUp) {
    btnEmailSignUp.addEventListener('click', async (ev) => {
      try {
        ev.preventDefault();
        btnEmailSignUp.disabled = true;
        const email = ($id('authEmail')||{}).value || '';
        const pass = ($id('authPass')||{}).value || '';
        if (!isEmail(email)) { showModalMessage('Introduce un correo válido', 2500); return; }
        if (!pass || pass.length < 6) { showModalMessage('La contraseña debe tener al menos 6 caracteres', 2500); return; }
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        saveLocalUser(res.user);
        try { await upsertUserProfile(res.user); } catch(e){ console.warn(e); }
        showModalMessage('Felicidades — has creado una cuenta. Redirigiendo a iniciar sesión...', 2000);
        setTimeout(()=> { hideAuthOverlay(); try{ location.href = 'login.html'; }catch(e){} }, 2000);
      } catch (err) {
        console.warn('signup err', err);
        showModalMessage(mapErrorMessage(err && err.code, err && err.message), 4000);
      } finally {
        try{ btnEmailSignUp.disabled = false; }catch(e){}
      }
    });
  }

  if (btnAnonymous) {
    btnAnonymous.addEventListener('click', async (ev) => {
      try {
        ev.preventDefault(); btnAnonymous.disabled = true;
        const res = await signInAnonymously(auth);
        await handleSignIn(res.user, { anonymous:true, redirectToIndex:true, showCongrats:true });
      } catch(err){ console.warn('anon err', err); showModalMessage('No se pudo entrar como invitado', 2000); }
      finally { try{ btnAnonymous.disabled = false; }catch(e){} }
    });
  }

  if (authClose) {
    authClose.addEventListener('click', () => {
      hideAuthOverlay();
      try { localStorage.setItem('lixby_seen_welcome','1'); } catch(e){}
    });
  }
  if (authBackdrop) {
    authBackdrop.addEventListener('click', () => { hideAuthOverlay(); });
  }
  if (authOverlay) {
    authOverlay.addEventListener('click', (ev) => { if (ev.target === authOverlay) hideAuthOverlay(); });
  }
}

/* show/hide overlay */
function showAuthOverlay(){
  enforceModalStylesIfPresent();
  const overlay = $id('authOverlay');
  const modal = $id('authModal');
  const backdrop = $id('authBackdrop');
  if (overlay && modal) {
    overlay.style.display = 'block';
    overlay.setAttribute('aria-hidden','false');
    if (backdrop) backdrop.style.display = 'block';
    try{ document.documentElement.style.overflow='hidden'; } catch(e){}
    setTimeout(()=> {
      const first = $id('authEmail') || $id('btnGoogle') || $id('btnAnonymous');
      if (first && typeof first.focus === 'function') try{ first.focus(); }catch(e){}
    }, 80);
    return;
  }
  // No modal in page: create fallback (minimal)
  createFallbackOverlay();
}
function hideAuthOverlay(){
  const overlay = $id('authOverlay');
  const backdrop = $id('authBackdrop');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden','true');
  }
  if (backdrop) backdrop.style.display = 'none';
  const fb = $id('lixbyAuthOverlayFallback');
  if (fb) fb.style.display = 'none';
  try{ document.documentElement.style.overflow=''; } catch(e){}
}

/* fallback overlay helper (minimal; used only if your HTML doesn't include authModal) */
function createFallbackOverlay(){
  if ($id('lixbyAuthOverlayFallback')) return;
  const overlay = document.createElement('div');
  overlay.id = 'lixbyAuthOverlayFallback';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = 9999;
  overlay.style.background = 'rgba(0,0,0,0.45)';
  overlay.innerHTML = `
    <div style="background:#fff;color:#07101a;padding:20px;border-radius:12px;max-width:420px;width:100;">
      <h3 style="margin:0 0 8px">Acceso</h3>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button id="fb_google" style="padding:10px;border-radius:10px">Iniciar con Google</button>
        <button id="fb_github" style="padding:10px;border-radius:10px">Iniciar con GitHub</button>
        <input id="fb_email" placeholder="Correo" style="padding:10px;border-radius:8px;border:1px solid #ddd" />
        <input id="fb_pass" placeholder="Contraseña" type="password" style="padding:10px;border-radius:8px;border:1px solid #ddd" />
        <div style="display:flex;gap:8px">
          <button id="fb_signin" style="flex:1;padding:10px;border-radius:10px">Iniciar sesión</button>
          <button id="fb_signup" style="flex:1;padding:10px;border-radius:10px">Registrarse</button>
        </div>
        <div style="text-align:center"><button id="fb_anon" style="padding:8px;border-radius:8px">Entrar como invitado</button></div>
        <div id="fb_msg" style="color:#333;font-weight:600;margin-top:6px"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  // wire fallback
  $id('fb_google')?.addEventListener('click', ()=> doOAuthSignInWithFallback(googleProvider,'Google').catch(()=>{}));
  $id('fb_github')?.addEventListener('click', ()=> doOAuthSignInWithFallback(githubProvider,'GitHub').catch(()=>{}));
  $id('fb_signin')?.addEventListener('click', async ()=>{
    const e = $id('fb_email') ? $id('fb_email').value : '';
    const p = $id('fb_pass') ? $id('fb_pass').value : '';
    if (!isEmail(e)) { $id('fb_msg').textContent = 'Correo inválido'; return; }
    if (!p || p.length < 6) { $id('fb_msg').textContent = 'Contraseña débil'; return; }
    try { await signInWithEmailAndPassword(auth,e,p); } catch(err){ $id('fb_msg').textContent = mapErrorMessage(err && err.code, err && err.message); }
  });
  $id('fb_signup')?.addEventListener('click', async ()=>{
    const e = $id('fb_email') ? $id('fb_email').value : '';
    const p = $id('fb_pass') ? $id('fb_pass').value : '';
    if (!isEmail(e)) { $id('fb_msg').textContent = 'Correo inválido'; return; }
    if (!p || p.length < 6) { $id('fb_msg').textContent = 'Contraseña débil (>=6)'; return; }
    try { await createUserWithEmailAndPassword(auth,e,p); $id('fb_msg').textContent='Felicidades — cuenta creada'; setTimeout(()=> location.href='login.html', 2000); } catch(err){ $id('fb_msg').textContent = mapErrorMessage(err && err.code, err && err.message); }
  });
  $id('fb_anon')?.addEventListener('click', async ()=> { try{ await signInAnonymously(auth); }catch(e){ console.warn(e); }});
}

/* Minimal header/account update (existing logic reused) */
function ensureHeader(){
  if ($id('lixbyHeader')) return $id('lixbyHeader');
  injectCSSForHeader();
  const accountContainer = document.getElementById('accountContainer');
  if (accountContainer) {
    if (!$id('lixbyAccountBtn')) {
      const btn = document.createElement('button');
      btn.id = 'lixbyAccountBtn';
      btn.className = 'lixby-btn';
      btn.type = 'button';
      btn.textContent = 'Cuenta';
      btn.addEventListener('click', () => showAuthOverlay());
      accountContainer.appendChild(btn);
    }
    return accountContainer;
  }
  const header = document.createElement('div');
  header.id = 'lixbyHeader';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.gap = '12px';
  header.style.padding = '10px 18px';
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
  $id('lixbyAccountBtn')?.addEventListener('click', ()=> showAuthOverlay());
  $id('lixby_logo')?.addEventListener('click', ()=> location.href = 'index.html');
  return header;
}
function injectCSSForHeader(){
  if ($id('lixby-minimal-css')) return;
  const MINIMAL_CSS = `
    .lixby-glass{ background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); backdrop-filter: blur(10px) saturate(120%); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color:inherit; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto;}
    .lixby-btn{ display:inline-flex; align-items:center; gap:8px; padding:10px 12px; border-radius:10px; cursor:pointer; border:1px solid rgba(255,255,255,0.04); background:transparent; font-weight:700; }
  `;
  const s = document.createElement('style'); s.id = 'lixby-minimal-css'; s.textContent = MINIMAL_CSS; document.head.appendChild(s);
}
function updateHeaderSafe(user){
  ensureHeader();
  const prev = $id('lixbyAccountHolder'); if (prev) prev.remove();
  if (!user){ return; }
  const holder = document.createElement('div'); holder.id = 'lixbyAccountHolder'; holder.style.display='flex'; holder.style.alignItems='center'; holder.style.gap='12px';
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
  $id('lixbyViewAccount')?.addEventListener('click', ()=> { location.href='cuenta.html'; });
  $id('lixbySignOut')?.addEventListener('click', async ()=>{ try{ await fbSignOut(auth); clearLocalUser(); window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ signedIn:false } })); location.href='index.html'; }catch(e){ console.warn(e); } });
}

/* Account page renderer (kept similar) */
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
        <div style="width:120px;height:120px;border-radius:14px;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:28px">${(fn||'U').charAt(0).toUpperCase()}</div>
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
          <div class="lixby-small">${email || '<span style="color:rgba(255,255,255,0.6)">No definido</span>'}</div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
          <button id="btnSaveProfile" class="lixby-btn" type="button">Guardar</button><button id="btnCancelProfile" class="lixby-btn" type="button">Cancelar</button>
        </div>
        <div id="profileMsg" class="lixby-small" style="margin-top:8px"></div>
      </div>
    </div>

    <hr style="margin:18px 0;border:none;border-top:1px solid rgba(255,255,255,0.04)" />

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

  $id('btnCancelProfile')?.addEventListener('click', ()=> location.reload());
  $id('btnSaveProfile')?.addEventListener('click', async ()=>{ 
    const firstName = ($id('pf_firstName')||{}).value || '';
    const lastName = ($id('pf_lastName')||{}).value || '';
    const dobVal = ($id('pf_dob')||{}).value || '';
    const msg = $id('profileMsg'); if (msg) msg.textContent='Guardando...';
    try{ if (!window.appAuth || typeof window.appAuth.updateProfileExtra !== 'function') throw new Error('updateProfileExtra no disponible'); await window.appAuth.updateProfileExtra({ firstName, lastName, dob: dobVal }); if (msg) msg.textContent='Guardado ✔';
      const local = safeJSONParse(localStorage.getItem('lixby_user')) || {}; local.firstName = firstName || local.firstName; local.lastName = lastName || local.lastName; local.dob = dobVal || local.dob; try{ localStorage.setItem('lixby_user', JSON.stringify(local)); }catch(e){}
      updateHeaderSafe({ displayName: (firstName ? (firstName + (lastName? ' '+lastName:'')) : local.name), email: local.email, photoURL: local.photoURL });
    }catch(e){ console.error('save profile', e); if (msg) msg.textContent='Error al guardar. Revisa consola.'; }
  });

  // ... orders/favs loading remains same as previous (omitted for brevity here)
}

/* Init / getRedirectResult and subscribe */
async function init(){
  try{
    // if user came via redirect, try to handle
    try {
      const redirectRes = await getRedirectResult(auth);
      if (redirectRes && redirectRes.user) {
        // handle sign-in success from redirect
        await handleSignIn(redirectRes.user, { anonymous:false, redirectToIndex:true, showCongrats:true });
      }
    } catch (redirErr) {
      // redirect may throw when no result found: ignore but log
      if (redirErr && redirErr.code) console.warn('getRedirectResult err', redirErr.code);
    }

    // wire UI if it exists
    try { wireExistingModalButtons(); } catch(e) { console.warn('wireExistingModalButtons failed', e); }

    onAuthStateChanged(auth, async (user) => {
      if (user){
        try{ saveLocalUser(user); updateHeaderSafe(user); await renderAccountPageIfNeeded(user); window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ uid:user.uid, signedIn:true } })); }
        catch(e){ console.warn(e); }
      } else {
        clearLocalUser();
        updateHeaderSafe(null);
        const shouldShow = !localStorage.getItem('lixby_seen_welcome');
        if (shouldShow) setTimeout(()=> showAuthOverlay(), 300);
        window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ signedIn:false } }));
      }
    });
  } catch(e){
    console.error('init auth module err', e);
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

/* expose API */
window.appAuth = {
  signInWithGoogle: () => doOAuthSignInWithFallback(googleProvider,'Google'),
  signInWithGitHub: () => doOAuthSignInWithFallback(githubProvider,'GitHub'),
  signInWithEmail: async (email,password)=>{ if(!email||!password) throw new Error('email+password required'); if (!isEmail(email)) throw new Error('email invalid'); if (password.length<6) throw new Error('weak password'); try{ const res = await signInWithEmailAndPassword(auth,email,password); saveLocalUser(res.user); await upsertUserProfile(res.user); updateHeaderSafe(res.user); return res.user; }catch(e){ throw e; } },
  createUserWithEmail: async (email,password, extraProfile={})=>{ if(!email||!password) throw new Error('email+password required'); if (!isEmail(email)) throw new Error('email invalid'); if (password.length<6) throw new Error('weak password'); const res = await createUserWithEmailAndPassword(auth,email,password); saveLocalUser(res.user); await upsertUserProfile(res.user, extraProfile); updateHeaderSafe(res.user); return res.user; },
  signInAnonymously: async ()=>{ const res = await signInAnonymously(auth); saveLocalUser(res.user); await upsertUserProfile(res.user,{anonymous:true}); updateHeaderSafe({ uid: res.user.uid, displayName:'Invitado', email:'', photoURL:''}); return res.user; },
  signOut: async ()=>{ try{ await fbSignOut(auth); }catch(e){ console.warn(e); } try{ localStorage.removeItem('lixby_seen_welcome'); localStorage.removeItem('lixby_user'); }catch(e){} try{ location.href='index.html'; }catch(e){} },
  onAuthState: (cb)=>{ if(typeof cb!=='function') return ()=>{}; const unsub = onAuthStateChanged(auth,(u)=>{ cb(u ? { uid:u.uid, name:u.displayName || (u.email? u.email.split('@')[0] : null), email:u.email, photoURL:u.photoURL, isAnonymous: u.isAnonymous } : null); }); return unsub; },
  updateProfileExtra: async (extra={})=>{ const u = auth.currentUser; if(!u) throw new Error('No authenticated user'); try{ const ref = doc(db,'users',u.uid); await setDoc(ref,{ profile: extra, updatedAt: new Date().toISOString() },{ merge:true }); try{ const raw = localStorage.getItem('lixby_user'); const local = raw? JSON.parse(raw): {}; local.firstName = extra.firstName || local.firstName; local.lastName = extra.lastName || local.lastName; local.dob = extra.dob || local.dob; localStorage.setItem('lixby_user', JSON.stringify(local)); }catch(e){} return true; }catch(e){ console.error('updateProfileExtra err', e); throw e; } },
  resetPassword: async (email)=>{ if(!email) throw new Error('email required'); try { await sendPasswordResetEmail(auth, email); return true; } catch(e) { throw e; } },
  _rawAuth: auth,
  _rawDb: db
};

export {};

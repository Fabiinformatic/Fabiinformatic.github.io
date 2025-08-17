// auth-firebase-minimal.js
// ES module — inclúyelo con: <script type="module" src="auth-firebase-minimal.js"></script>

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  onAuthStateChanged,
  signOut as fbSignOut,
  RecaptchaVerifier,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  getMultiFactorResolver,
  multiFactor,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

/* ===== CONFIG ===== */
const firebaseConfig = {
  apiKey: "AIzaSyDMcDeBKSGqf9ZEexQAIM-9u6GLaQEnLcs",
  authDomain: "lixby-e0344.firebaseapp.com",
  projectId: "lixby-e0344",
  storageBucket: "lixby-e0344.firebasestorage.app",
  messagingSenderId: "671722866179",
  appId: "1:671722866179:web:65868eca5146942b507036",
  measurementId: "G-09SQL30MS8"
};

/* Init firebase defensivo */
let app;
try { app = (getApps && getApps().length) ? getApp() : initializeApp(firebaseConfig); }
catch(e) { try { app = initializeApp(firebaseConfig); } catch(e2) { console.error('Firebase init failed', e2); } }

const auth = getAuth(app);
const db = getFirestore(app);

/* Providers */
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

/* Keys for localStorage */
const LS_USER = 'lixby_user';
const LS_AUTH_DISMISSED = 'lixby_auth_dismissed';
const LS_COOKIES = 'lixby_cookies_accepted';
const LS_PW_CODES = 'lixby_pw_reset_codes';         // { email:{code,expires} }
const LS_LOCAL_PW = 'lixby_local_passwords';        // fallback local pw store (email->password) for demo

/* Utils */
const $id = id => document.getElementById(id);
function escapeHtml(s){ if(!s && s!==0) return ''; return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function showConsolePretty(err){ console.warn(err && err.code ? `${err.code} ${err.message||''}` : err); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function parseSafeName(u){ return (u && (u.displayName || (u.email? u.email.split('@')[0] : 'Usuario'))) || 'Usuario'; }

function getStoredJSON(key){ try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch(e){ return {}; } }
function setStoredJSON(key, obj){ try { localStorage.setItem(key, JSON.stringify(obj)); } catch(e){} }

function saveLocalUser(user){
  try{
    if (!user) { localStorage.removeItem(LS_USER); return; }
    const u = { uid:user.uid, name:user.displayName || (user.email? user.email.split('@')[0] : 'Usuario'), email:user.email||null, photoURL:user.photoURL||null, isAnonymous: !!user.isAnonymous };
    localStorage.setItem(LS_USER, JSON.stringify(u));
  }catch(e){ console.warn(e); }
}
function loadLocalUser(){ try { return JSON.parse(localStorage.getItem(LS_USER)); } catch(e) { return null; } }
function clearLocalUser(){ try{ localStorage.removeItem(LS_USER); }catch(e){} }

function mapError(code, fallback='Error') {
  const M = {
    'auth/popup-blocked':'Popup bloqueado. El navegador ha bloqueado la ventana de autenticación.',
    'auth/popup-closed-by-user':'Has cerrado la ventana emergente.',
    'auth/cancelled-popup-request':'Solicitud de popup cancelada.',
    'auth/unauthorized-domain':'Dominio no autorizado para OAuth.',
    'auth/operation-not-allowed':'Método de acceso no permitido.',
    'auth/invalid-phone-number':'Número de teléfono inválido.',
    'auth/missing-phone-number':'Falta número de teléfono.',
    'auth/too-many-requests':'Demasiadas solicitudes. Intenta más tarde.',
    'auth/user-disabled':'Cuenta deshabilitada.',
    'auth/email-already-in-use':'El correo ya está en uso.',
    'auth/invalid-email':'Correo inválido.',
    'auth/weak-password':'La contraseña es demasiado débil.',
    'auth/wrong-password':'Contraseña incorrecta.',
    'auth/user-not-found':'No existe una cuenta con ese correo.'
  };
  return M[code] || fallback || code;
}

/* ------------------
   Password reset helpers
   - send by Firebase (link)
   - fallback: generate code (local) for test/demo
   - verify and confirm local code -> store new password in LS_LOCAL_PW map
   - signInWithEmailLocal will check LS_LOCAL_PW first (demo)
   ------------------ */

function generate6Code(){ return String(Math.floor(Math.random()*900000)+100000); }

async function resetPassword(email, opts={method:'link_and_code'}) {
  // opts.method: 'link' | 'code' | 'link_and_code'
  if (!email) throw new Error('Email requerido.');
  const result = { sentEmail:false, code:null, method:opts.method || 'link_and_code' };
  // 1) try to send Firebase reset link (production)
  try {
    // Continue URL should point to your reset-password page where you'll call confirmPasswordReset.
    const actionCodeSettings = { url: location.origin + '/reset-password.html', handleCodeInApp: false };
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    result.sentEmail = true;
  } catch(err) {
    console.warn('sendPasswordResetEmail failed', err);
    // do not throw: we'll still offer fallback code
    result.sentEmail = false;
  }

  // 2) create a fallback code (always create for demo)
  try {
    const code = generate6Code();
    const codes = getStoredJSON(LS_PW_CODES) || {};
    codes[email.toLowerCase()] = { code, expires: Date.now() + (15*60*1000) }; // 15 min
    setStoredJSON(LS_PW_CODES, codes);
    result.code = code;
    // For testing convenience also log it (and return it). In production you would NOT reveal it.
    console.info('LIXBY pw-reset fallback code for', email, code);
  } catch(e){ console.warn('pw fallback save err', e); }

  return result;
}

function verifyResetCodeLocal(email, code) {
  if (!email || !code) return false;
  const codes = getStoredJSON(LS_PW_CODES) || {};
  const rec = codes[email.toLowerCase()];
  if (!rec) return false;
  if (rec.expires < Date.now()) { delete codes[email.toLowerCase()]; setStoredJSON(LS_PW_CODES, codes); return false; }
  return String(rec.code) === String(code).trim();
}

async function confirmPasswordResetLocal(email, code, newPassword) {
  if (!verifyResetCodeLocal(email, code)) throw new Error('Código inválido o caducado.');
  if (!newPassword || String(newPassword).length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  // store locally (demo only). For production rely on Firebase confirmPasswordReset with oobCode.
  const pwmap = getStoredJSON(LS_LOCAL_PW) || {};
  pwmap[email.toLowerCase()] = { password: String(newPassword), updatedAt: new Date().toISOString() };
  setStoredJSON(LS_LOCAL_PW, pwmap);
  // remove used code
  const codes = getStoredJSON(LS_PW_CODES) || {};
  delete codes[email.toLowerCase()];
  setStoredJSON(LS_PW_CODES, codes);
  return true;
}

/* Wrapper for Firebase confirm using oobCode (when user clicks link) */
async function confirmPasswordResetFirebase(oobCode, newPassword) {
  if (!oobCode || !newPassword) throw new Error('Código y nueva contraseña requeridos.');
  try {
    // validate code first
    await verifyPasswordResetCode(auth, oobCode);
    await confirmPasswordReset(auth, oobCode, newPassword);
    return true;
  } catch(err) {
    console.error('confirmPasswordResetFirebase err', err);
    throw new Error(mapError(err && err.code, err && err.message || 'Error al confirmar contraseña.'));
  }
}

/* ------------------
   SignIn / Create user with email/password (extended)
   - signInWithEmailLocal checks local fallback pw map for demo first
   ------------------ */

async function createUserWithEmailLocal(email, password, extra = {}, opts = { sendVerification: true }) {
  try {
    if (!email || !password) throw new Error('Email y contraseña requeridos.');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;
    try {
      const displayName = extra.firstName ? `${extra.firstName} ${extra.lastName||''}`.trim() : (user.displayName || null);
      if (displayName) await updateProfile(user, { displayName });
    } catch(updateErr){ console.warn('updateProfile err', updateErr); }
    await upsertUserProfile(user, extra);
    if (opts && opts.sendVerification) {
      try { await sendEmailVerification(user); } catch(e){ console.warn('sendEmailVerification failed', e); }
    }
    saveLocalUser(user);
    try { await fbSignOut(auth); } catch(e){}
    // CORRECT: set dismissed flag in one line
    localStorage.setItem(LS_AUTH_DISMISSED, 'true'); // fallback in case UI expects no modal
    return { ok: true, uid: user.uid, email: user.email };
  } catch (err) {
    console.error('createUserWithEmailLocal err', err);
    throw new Error(mapError(err && err.code, err && err.message || 'Error creando cuenta.'));
  }
}

async function signInWithEmailLocal(email, password) {
  // FIRST: check local fallback passwords (demo)
  try {
    const pwmap = getStoredJSON(LS_LOCAL_PW) || {};
    const rec = pwmap[email.toLowerCase()];
    if (rec && rec.password === String(password)) {
      // create a fake minimal user and save locally (demo)
      const fakeUser = { uid: 'local-' + email.toLowerCase(), displayName: (email.split('@')[0]||'Usuario'), email: email, photoURL: null, isAnonymous: false };
      saveLocalUser(fakeUser);
      localStorage.setItem(LS_AUTH_DISMISSED, 'true');
      return fakeUser;
    }
  } catch(e){ /* ignore fallback check errors */ }

  // otherwise use Firebase (production)
  try {
    const res = await signInWithEmailAndPassword(auth, email, password);
    saveLocalUser(res.user);
    localStorage.setItem(LS_AUTH_DISMISSED, 'true');
    return res.user;
  } catch (err) {
    console.error('signInWithEmailLocal err', err);
    throw new Error(mapError(err && err.code, err && err.message || 'Error iniciando sesión.'));
  }
}

/* --------------------------
   Cookie banner (si no aceptado)
   -------------------------- */
(function ensureCookieBanner(){
  try {
    if (localStorage.getItem(LS_COOKIES) === 'true') return;
    if (document.getElementById('lixbyCookieBanner')) return;
    const style = document.createElement('style');
    style.id = 'lixby-cookie-style';
    style.textContent = `
      #lixbyCookieBanner { position: fixed; left: 12px; right: 12px; bottom: 12px; max-width:1100px; margin:0 auto; z-index:2147483646; display:flex; gap:12px; align-items:center; justify-content:space-between; padding:12px 14px; border-radius:10px; box-shadow:0 12px 30px rgba(2,6,12,0.4); background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.04); font-size:0.95rem; color:var(--text); }
      #lixbyCookieBanner .actions { display:flex; gap:8px; }
      #lixbyCookieBanner button { padding:8px 10px; border-radius:8px; cursor:pointer; border:1px solid rgba(255,255,255,0.04); background:transparent; color:var(--text); }
      #lixbyCookieBanner button.primary { background: linear-gradient(180deg,var(--accent), color-mix(in oklab, var(--accent) 60%, #fff 40%)); color:#00121a; border:none; }
      @media(max-width:700px){ #lixbyCookieBanner{ flex-direction:column; align-items:flex-start; } }
    `;
    document.head.appendChild(style);
    const banner = document.createElement('div');
    banner.id = 'lixbyCookieBanner';
    banner.innerHTML = `<div><strong>LIXBY</strong><div style="color:var(--muted);margin-top:4px">Usamos cookies para mejorar la experiencia. Puedes aceptar o configurar preferencias.</div></div>`;
    const actions = document.createElement('div'); actions.className = 'actions';
    const btnConfig = document.createElement('button'); btnConfig.textContent = 'Configurar';
    const btnAccept = document.createElement('button'); btnAccept.textContent = 'Aceptar'; btnAccept.className = 'primary';
    actions.appendChild(btnConfig); actions.appendChild(btnAccept);
    banner.appendChild(actions);
    banner.addEventListener('keydown', (e)=>{ if (e.key==='Escape') banner.remove(); });
    document.body.appendChild(banner);
    btnAccept.addEventListener('click', ()=> { try{ localStorage.setItem(LS_COOKIES,'true'); }catch(e){} banner.remove(); });
    btnConfig.addEventListener('click', ()=> { alert('Configurar cookies — placeholder.'); try{ localStorage.setItem(LS_COOKIES,'true'); }catch(e){} banner.remove(); });
  } catch(e){ console.warn('cookie banner err', e); }
})();

/* ------------------------------
   Modal markup + styles (single)
   ------------------------------ */
function injectMinimalAuthStyles(){
  if (document.getElementById('lixby-auth-min-css')) return;
  const s = document.createElement('style');
  s.id = 'lixby-auth-min-css';
  s.textContent = `
    .lixby-overlay{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.38); z-index:999999; }
    .lixby-modal{ background:#fff; color:#07101a; width:420px; max-width:94%; border-radius:14px; padding:18px; box-shadow:0 18px 48px rgba(2,6,12,0.38); font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto; position:relative; }
    .lixby-title{ font-size:1.05rem; font-weight:700; margin:0 0 8px; }
    .lixby-sub{ color:#556; font-size:0.95rem; margin:0 0 14px; }
    .lixby-row{ display:flex; gap:10px; margin-top:8px; }
    .lixby-btn{ display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:12px; border:1px solid rgba(0,0,0,0.06); background:#fff; cursor:pointer; font-weight:700; color:#07101a; width:100%; justify-content:center; box-shadow: none; }
    .lixby-btn img.icon { width:18px; height:18px; object-fit:contain; display:block; }
    .lixby-divider{ display:flex; align-items:center; gap:12px; margin:12px 0; color:#888; }
    .lixby-divider::before,.lixby-divider::after{ content:''; height:1px; background:#eee; flex:1; border-radius:2px; opacity:0.6; }
    .lixby-actions{ display:flex; gap:10px; margin-top:12px; }
    .lixby-link-btn{ background:transparent; color:#07101a; border:1px solid rgba(0,0,0,0.04); border-radius:12px; padding:9px 12px; cursor:pointer; font-weight:700; }
    .lixby-small{ font-size:0.92rem; color:#445; margin-top:8px; text-align:center; }
    .lixby-close{ position:absolute; right:14px; top:10px; background:transparent; border:0; cursor:pointer; color:#334; font-weight:700; }
    #recaptcha-container { display:inline-block; }
    .lixby-input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid #e6e6e6; margin-top:8px; box-sizing:border-box; }
    .lixby-error { color:#b91c1c; font-size:0.9rem; margin-top:6px; }
    .lixby-ghost { background:transparent; border:1px solid rgba(0,0,0,0.06); border-radius:10px; padding:9px 12px; cursor:pointer; }
  `;
  document.head.appendChild(s);
}

function createAuthModalIfMissing(){
  if ($id('lixbyAuthOverlay')) return;
  injectMinimalAuthStyles();
  const overlay = document.createElement('div');
  overlay.id = 'lixbyAuthOverlay';
  overlay.className = 'lixby-overlay';
  overlay.setAttribute('aria-hidden','true');
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="lixby-modal" role="dialog" aria-modal="true" aria-labelledby="lixTitle">
      <button class="lixby-close" id="lixClose" aria-label="Cerrar">✕</button>
      <h3 id="lixTitle" class="lixby-title">Acceso a Lixby</h3>
      <div class="lixby-sub">Inicia sesión con tu cuenta</div>

      <div style="display:flex;flex-direction:column;gap:10px">
        <button id="btnGoogle" class="lixby-btn" title="Iniciar sesión con Google" aria-label="Iniciar con Google">
          <img class="icon" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><path fill='%23EA4335' d='M44 24.2c0-1.6-.2-3.1-.6-4.5H24v8.6h11.9c-.5 2.8-2.3 5.1-4.9 6.7v5.5h8c4.7-4.3 7.5-10.7 7.5-16.3z'/><path fill='%2344AA53' d='M24 44c6 0 11-2.2 14.7-5.9l-7.1-5.1c-2 1.3-4.5 2.1-7.6 2.1-5.8 0-10.8-3.8-12.6-9.1H4v5.7C7.6 39.9 15.3 44 24 44z'/><path fill='%234A90E2' d='M9.4 27.9A17.9 17.9 0 0 1 8 24c0-0.8.1-1.6.3-2.4L4 16.9C2.6 19.9 1.9 22.9 1.9 25.9c0 3 0.6 5.8 1.9 8.2l6-6.2z'/><path fill='%23FBBC05' d='M24 8c3.6 0 6.9 1.2 9.5 3.4l6.9-6.9C35 2 29.8 0 24 0 15.3 0 7.6 4.1 4 12.6l6 4.3C13.2 11.9 18.2 8 24 8z'/></svg>" alt="G">
          <span>Iniciar con Google</span>
        </button>

        <button id="btnGitHub" class="lixby-btn" title="Iniciar sesión con GitHub" aria-label="Iniciar con GitHub">
          <img class="icon" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='%23000' d='M12 2C6.48 2 2 6.58 2 12.18c0 4.5 2.87 8.32 6.84 9.66.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.56 2.36 1.11 2.94.85.09-.66.35-1.11.64-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05A9.24 9.24 0 0 1 12 6.8c.85.004 1.71.115 2.5.34 1.9-1.32 2.74-1.05 2.74-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.81-4.57 5.07.36.3.68.9.68 1.82 0 1.31-.01 2.36-.01 2.68 0 .26.18.59.69.49A10.2 10.2 0 0 0 22 12.18C22 6.58 17.52 2 12 2z'/></svg>" alt="GH">
          <span>Iniciar con GitHub</span>
        </button>

        <div class="lixby-divider">o</div>

        <div style="display:flex;flex-direction:column;gap:8px">
          <input id="emailField" class="lixby-input" placeholder="Correo electrónico" type="email" autocomplete="username" />
          <input id="passwordField" class="lixby-input" placeholder="Contraseña" type="password" autocomplete="current-password" />
          <div style="display:flex;gap:8px;justify-content:space-between;align-items:center">
            <button id="emailSignInBtn" class="lixby-ghost">Entrar</button>
            <button id="emailRecoverBtn" class="lixby-ghost">¿Olvidaste la contraseña?</button>
          </div>
          <div id="lixAuthErr" class="lixby-error" aria-live="polite"></div>
        </div>

        <div class="lixby-divider">o</div>

        <div class="lixby-actions">
          <button id="goLogin" class="lixby-link-btn">Iniciar sesión</button>
          <button id="goRegister" class="lixby-link-btn">Registrarse</button>
        </div>

        <button id="btnAnonymous" class="lixby-btn" style="margin-top:6px">Entrar como invitado</button>

        <div id="lixMsg" class="lixby-small" aria-live="polite"></div>
        <div id="recaptcha-container" style="display:none"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // wire close and quick navigation; set dismissed when explicitly closed or guest
  $id('lixClose')?.addEventListener('click', ()=> { localStorage.setItem(LS_AUTH_DISMISSED, 'true'); hideAuthOverlay(); });
  $id('goLogin')?.addEventListener('click', ()=> { hideAuthOverlay(); location.href = 'login.html'; });
  $id('goRegister')?.addEventListener('click', ()=> { hideAuthOverlay(); location.href = 'register.html'; });
  $id('btnAnonymous')?.addEventListener('click', async (e)=> { e.preventDefault(); localStorage.setItem(LS_AUTH_DISMISSED, 'true'); await doAnonymousSignIn(); });

  // wire local email sign-in flows
  $id('emailSignInBtn')?.addEventListener('click', async (e)=> {
    try {
      const em = ($id('emailField')||{}).value.trim();
      const pw = ($id('passwordField')||{}).value;
      $id('lixAuthErr') && ($id('lixAuthErr').textContent = '');
      if (!em) { $id('lixAuthErr').textContent = 'Introduce tu correo.'; return; }
      if (!pw) { $id('lixAuthErr').textContent = 'Introduce la contraseña.'; return; }
      if (!window.appAuth || typeof window.appAuth.signInWithEmail !== 'function') throw new Error('Función de login no disponible');
      const user = await window.appAuth.signInWithEmail(em, pw);
      $id('lixMsg') && ($id('lixMsg').textContent = 'Sesión iniciada ✔');
      await sleep(700);
      hideAuthOverlay();
    } catch(err) {
      console.error(err);
      $id('lixAuthErr') && ($id('lixAuthErr').textContent = err && err.message ? err.message : 'Error iniciando sesión.');
    }
  });

  $id('emailRecoverBtn')?.addEventListener('click', (e)=> {
    hideAuthOverlay();
    location.href = 'forgot-password.html';
  });
}

/* show/hide modal with safety checks */
function showAuthOverlay(){
  // never show if user signed in or dismissed previously
  if (auth.currentUser) return;
  if (localStorage.getItem(LS_AUTH_DISMISSED) === 'true') return;
  createAuthModalIfMissing();
  const o = $id('lixbyAuthOverlay');
  if(!o) return;
  o.setAttribute('aria-hidden','false');
  o.style.display='flex';
  // block scroll
  try{ document.documentElement.style.overflow='hidden'; }catch(e){}
  // focus first interactive
  setTimeout(()=> { const btn = o.querySelector('button'); if (btn) btn.focus(); }, 80);
}
function hideAuthOverlay(){
  const o = $id('lixbyAuthOverlay');
  if(!o) return;
  o.setAttribute('aria-hidden','true');
  o.style.display='none';
  try{ document.documentElement.style.overflow=''; }catch(e){}
}

/* small modal helper */
function setModalMsg(txt, autoHideMs=3000){
  const el = $id('lixMsg'); if(!el) return;
  el.textContent = txt || '';
  if (autoHideMs) { setTimeout(()=> { if(el) el.textContent=''; }, autoHideMs); }
}

/* --------------------------
   OAuth popup with fallback
   -------------------------- */
let oauthLock = false;
async function doPopupSignInWithFallback(provider){
  if (oauthLock) return;
  oauthLock = true;
  try {
    try {
      const res = await signInWithPopup(auth, provider);
      if (res && res.user) {
        saveLocalUser(res.user);
        // mark dismissed so modal won't reappear
        localStorage.setItem(LS_AUTH_DISMISSED, 'true');
        setModalMsg('Has iniciado sesión correctamente',1200);
        await sleep(600);
        hideAuthOverlay();
      }
    } catch(err) {
      showConsolePretty(err);
      const code = err && err.code;
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/unauthorized-domain') {
        setModalMsg('Intentando método alternativo...',1500);
        await signInWithRedirect(auth, provider);
      } else if (code === 'auth/multi-factor-auth-required') {
        throw err;
      } else {
        setModalMsg(mapError(code, err && err.message),4000);
        throw err;
      }
    }
  } finally { oauthLock = false; }
}

/* Anonymous */
async function doAnonymousSignIn(){
  try {
    $id('btnAnonymous') && ($id('btnAnonymous').disabled = true);
    const res = await signInAnonymously(auth);
    saveLocalUser(res.user);
    localStorage.setItem(LS_AUTH_DISMISSED, 'true');
    setModalMsg('Entrando como invitado...',1000);
    await sleep(700);
    hideAuthOverlay();
  } catch(err) {
    showConsolePretty(err);
    setModalMsg('No se pudo entrar como invitado',3000);
  } finally {
    try{ $id('btnAnonymous') && ($id('btnAnonymous').disabled = false); }catch(e){}
  }
}

/* --------------------------
   reCAPTCHA / Phone MFA helpers
   -------------------------- */
let recaptchaVerifierInstance = null;
function ensureRecaptcha(){
  if (recaptchaVerifierInstance) return recaptchaVerifierInstance;
  try{
    recaptchaVerifierInstance = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
    recaptchaVerifierInstance.render().catch(()=>{/* ignore render errs */});
    return recaptchaVerifierInstance;
  }catch(e){ console.warn('recaptcha init err', e); return null; }
}

async function enrollPhoneMultiFactor(displayNameForFactor = 'Teléfono'){
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No hay usuario autenticado para inscribir segundo factor');
    const mfaUser = multiFactor(user);
    const session = await mfaUser.getSession();
    const phoneNumber = prompt('Introduce tu número con prefijo internacional (ej. +34123456789):');
    if (!phoneNumber) { setModalMsg('Inscripción cancelada'); return; }
    const rec = ensureRecaptcha();
    const phoneAuthProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneAuthProvider.verifyPhoneNumber({ phoneNumber, session }, rec);
    const code = prompt('Introduce el código SMS recibido:');
    if (!code) { setModalMsg('Código no introducido.'); return; }
    const cred = PhoneAuthProvider.credential(verificationId, code);
    const assertion = PhoneMultiFactorGenerator.assertion(cred);
    await mfaUser.enroll(assertion, displayNameForFactor);
    setModalMsg('Segundo factor añadido ✔', 2500);
  } catch(err) {
    showConsolePretty(err);
    setModalMsg(err && err.message ? err.message : 'Error al inscribir segundo factor', 4000);
    try{ if (recaptchaVerifierInstance && typeof recaptchaVerifierInstance.clear === 'function') recaptchaVerifierInstance.clear(); }catch(e){}
  }
}

async function handleMultiFactorRequired(error){
  try{
    if (!error || !error.code) { throw error || new Error('Unknown MFA error'); }
    if (error.code !== 'auth/multi-factor-auth-required') { throw error; }
    const resolver = getMultiFactorResolver(auth, error);
    const hints = resolver.hints || [];
    let phoneHintIndex = hints.findIndex(h=> h && h.factorId === PhoneMultiFactorGenerator.FACTOR_ID);
    if (phoneHintIndex === -1 && hints.length>0) phoneHintIndex = 0;
    if (phoneHintIndex === -1) { setModalMsg('No hay factores disponibles para MFA'); return; }
    const hint = hints[phoneHintIndex];
    const rec = ensureRecaptcha();
    const phoneAuthProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneAuthProvider.verifyPhoneNumber({ multiFactorHint: hint, session: resolver.session }, rec);
    const code = prompt(`Se ha enviado un SMS al ${hint.phoneNumber || 'tu teléfono'}. Introduce el código:`);
    if (!code) { setModalMsg('Código no introducido.'); return; }
    const cred = PhoneAuthProvider.credential(verificationId, code);
    const assertion = PhoneMultiFactorGenerator.assertion(cred);
    const userCredential = await resolver.resolveSignIn(assertion);
    saveLocalUser(userCredential.user);
    localStorage.setItem(LS_AUTH_DISMISSED, 'true');
    setModalMsg('Acceso completado ✔', 1200);
    await sleep(700);
    hideAuthOverlay();
  } catch(err) {
    showConsolePretty(err);
    setModalMsg(err && err.message ? err.message : 'Error en MFA', 4000);
    try{ if (recaptchaVerifierInstance && typeof recaptchaVerifierInstance.clear === 'function') recaptchaVerifierInstance.clear(); }catch(e){}
  }
}

/* --------------------------
   Wire modal buttons
   -------------------------- */
function wireModalButtons(){
  createAuthModalIfMissing();
  $id('btnGoogle')?.addEventListener('click', async (e)=> {
    e && e.preventDefault();
    try { await doPopupSignInWithFallback(googleProvider); }
    catch(err){ if (err && err.code === 'auth/multi-factor-auth-required') await handleMultiFactorRequired(err); else setModalMsg(mapError(err && err.code, err && err.message)); }
  });
  $id('btnGitHub')?.addEventListener('click', async (e)=> {
    e && e.preventDefault();
    try { await doPopupSignInWithFallback(githubProvider); }
    catch(err){ if (err && err.code === 'auth/multi-factor-auth-required') await handleMultiFactorRequired(err); else setModalMsg(mapError(err && err.code, err && err.message)); }
  });
}

/* --------------------------
   Firestore safe upsert for profile
   -------------------------- */
async function upsertUserProfile(user, extra={}) {
  try {
    if (!user || !user.uid) return;
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    const base = { uid: user.uid, name: user.displayName || null, email: user.email || null, photoURL: user.photoURL || null, provider: (user.providerData && user.providerData[0] && user.providerData[0].providerId) || null, createdAt: snap.exists() ? snap.data().createdAt : new Date().toISOString() };
    await setDoc(ref, { ...base, ...extra }, { merge: true });
  } catch(e){ console.warn('upsertUserProfile err', e); }
}

/* --------------------------
   Header & account area
   -------------------------- */
function findAccountContainer(){
  // 1) existing #accountContainer
  const byId = $id('accountContainer');
  if (byId) return byId;
  // 2) nav .nav-right (if exists) -> create a slot div at end
  const navRight = document.querySelector('.nav .nav-right, .nav-right');
  if (navRight) {
    let slot = navRight.querySelector('.lixby-account-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'lixby-account-slot';
      slot.style.display = 'inline-flex';
      slot.style.alignItems = 'center';
      slot.style.gap = '8px';
      navRight.appendChild(slot);
    }
    return slot;
  }
  // 3) fallback: prepend a small header container at top
  let fallback = document.getElementById('lixbyHeaderContainer');
  if (!fallback) {
    fallback = document.createElement('div');
    fallback.id = 'lixbyHeaderContainer';
    fallback.style.width = '100%';
    fallback.style.display = 'flex';
    fallback.style.justifyContent = 'flex-end';
    fallback.style.padding = '6px 12px';
    document.body.prepend(fallback);
  }
  return fallback;
}

function renderAccountUI(user){
  const slot = findAccountContainer();
  if (!slot) return;
  slot.innerHTML = ''; // replace
  if (!user) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn ghost';
    btn.textContent = 'Cuenta';
    btn.addEventListener('click', ()=> showAuthOverlay());
    slot.appendChild(btn);
    return;
  }
  const name = escapeHtml(parseSafeName(user));
  const photo = user.photoURL || `https://via.placeholder.com/64?text=${encodeURIComponent(name.charAt(0)||'U')}`;
  // Build account element that links to cuenta.html
  const a = document.createElement('a');
  a.href = 'cuenta.html';
  a.style.display = 'inline-flex';
  a.style.alignItems = 'center';
  a.style.gap = '8px';
  a.style.textDecoration = 'none';
  a.style.color = 'inherit';
  a.innerHTML = `<img src="${photo}" alt="avatar" style="width:36px;height:36px;border-radius:8px;object-fit:cover"><div style="display:flex;flex-direction:column"><div style="font-weight:700">${name}</div><div style="font-size:0.85rem;color:var(--muted)">Mi cuenta</div></div>`;
  slot.appendChild(a);
}

/* --------------------------
   Extra helper API: updateProfileExtra (used by account page)
   -------------------------- */
async function updateProfileExtra(extra = {}) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No autenticado');
    // Update Firebase profile displayName if provided
    try {
      const displayName = extra.firstName ? `${extra.firstName} ${extra.lastName||''}`.trim() : (extra.displayName || null);
      if (displayName) await updateProfile(user, { displayName });
    } catch(e){ console.warn('updateProfile displayName err', e); }
    // persist to Firestore
    await upsertUserProfile(user, extra);
    return true;
  } catch(e) {
    console.warn('updateProfileExtra err', e);
    throw e;
  }
}

/* --------------------------
   Init: redirect result, listeners
   -------------------------- */
async function init(){
  // try redirect result (OAuth)
  try {
    const rr = await getRedirectResult(auth);
    if (rr && rr.user) {
      saveLocalUser(rr.user);
      localStorage.setItem(LS_AUTH_DISMISSED, 'true');
      setModalMsg('Inicio por redirect completado',1000);
      await sleep(700);
      hideAuthOverlay();
    }
  } catch(e) {
    if (e && e.code === 'auth/multi-factor-auth-required') {
      await handleMultiFactorRequired(e);
    } else {
      console.warn('getRedirectResult err', e);
    }
  }

  // create modal & wire buttons
  createAuthModalIfMissing();
  wireModalButtons();

  // Attach auth state observer (main source of truth)
  onAuthStateChanged(auth, async (user) => {
    try {
      if (user) {
        // persist & update UI once signed in
        saveLocalUser(user);
        localStorage.setItem(LS_AUTH_DISMISSED, 'true'); // ensure modal won't reopen
        renderAccountUI(user);
        await upsertUserProfile(user);
        hideAuthOverlay();
      } else {
        // signed out: clear local snapshot and render anonymous account button
        clearLocalUser();
        renderAccountUI(null);
        // do NOT auto-show the modal repeatedly
      }
    } catch(err) { console.warn('onAuthStateChanged handler err', err); }
  });

  // hydrate header from local snapshot quickly
  try {
    const cached = loadLocalUser();
    if (cached && cached.name) renderAccountUI(cached);
    else renderAccountUI(null);
  } catch(e){ renderAccountUI(null); }

  // minor accessibility: allow ESC to close modal
  document.addEventListener('keydown', (e)=> {
    if (e.key === 'Escape') {
      const ov = $id('lixbyAuthOverlay');
      if (ov && ov.style.display === 'flex') { localStorage.setItem(LS_AUTH_DISMISSED, 'true'); hideAuthOverlay(); }
    }
  });

  // Expose API
  window.lixbyAuth = {
    show: showAuthOverlay,
    hide: hideAuthOverlay,
    enrollPhoneMFA: enrollPhoneMultiFactor,
    ensureRecaptcha,
    signInWithGoogle: () => doPopupSignInWithFallback(googleProvider),
    signInWithGitHub: () => doPopupSignInWithFallback(githubProvider),
    signInAnonymously: () => doAnonymousSignIn(),
    signOut: async ()=> { try { await fbSignOut(auth); clearLocalUser(); localStorage.removeItem(LS_AUTH_DISMISSED); renderAccountUI(null); } catch(e) { console.warn(e); } },
    _rawAuth: auth,
    _rawDb: db
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

/// --- EXPOSED API (important) ---
window.appAuth = window.appAuth || {};
window.appAuth.resetPassword = resetPassword;                         // (email, opts) -> {sentEmail, code}
window.appAuth.verifyResetCodeLocal = verifyResetCodeLocal;           // (email, code) -> bool
window.appAuth.confirmPasswordResetLocal = confirmPasswordResetLocal; // (email,code,newPassword) -> true
window.appAuth.confirmPasswordResetFirebase = confirmPasswordResetFirebase; // (oobCode,newPassword) -> true
window.appAuth.createUserWithEmail = (email,pw,extra,opts) => createUserWithEmailLocal(email,pw,extra,opts);
window.appAuth.signInWithEmail = (email,pw) => signInWithEmailLocal(email,pw);
window.appAuth.updateProfileExtra = (extra) => updateProfileExtra(extra);

// Also keep signInWithGoogle, signInWithGitHub, signInAnonymously, signOut exposed
window.appAuth.signInWithGoogle = () => doPopupSignInWithFallback(googleProvider);
window.appAuth.signInWithGitHub = () => doPopupSignInWithFallback(githubProvider);
window.appAuth.signInAnonymously = () => doAnonymousSignIn();
window.appAuth.signOut = async ()=> { try { await fbSignOut(auth); clearLocalUser(); localStorage.removeItem(LS_AUTH_DISMISSED); renderAccountUI(null); } catch(e){ console.warn(e); } };

// Backwards compat aliases
window.lixbyAuth = window.lixbyAuth || window.appAuth;

export {};

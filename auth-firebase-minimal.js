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
  multiFactor
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, orderBy, query } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

/* ===== CONFIG - reemplaza con la tuya si hace falta ===== */
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

/* Utils */
const $id = id => document.getElementById(id);
function escapeHtml(s){ if(!s && s!==0) return ''; return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function isEmail(v){ return typeof v==='string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function showConsolePretty(err){ console.warn(err && err.code ? `${err.code} ${err.message||''}` : err); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

/* Simple local snapshot */
function saveLocalUser(user){
  try{
    if (!user) { localStorage.removeItem('lixby_user'); return; }
    const u = { uid:user.uid, name:user.displayName || (user.email? user.email.split('@')[0] : 'Usuario'), email:user.email||null, photoURL:user.photoURL||null, isAnonymous: !!user.isAnonymous };
    localStorage.setItem('lixby_user', JSON.stringify(u));
  }catch(e){ console.warn(e); }
}
function clearLocalUser(){ try{ localStorage.removeItem('lixby_user'); }catch(e){} }

/* Small error mapping for user messages */
function mapError(code, fallback='Error') {
  const M = {
    'auth/popup-blocked':'Popup bloqueado. El navegador ha impedido abrir ventanas emergentes.',
    'auth/popup-closed-by-user':'Popup cerrado por el usuario.',
    'auth/cancelled-popup-request':'Solicitud de popup cancelada.',
    'auth/unauthorized-domain':'Dominio no autorizado para OAuth (añádelo en Firebase Console).',
    'auth/operation-not-allowed':'Método de acceso no permitido (activar en Firebase Console).',
    'auth/invalid-phone-number':'Número de teléfono inválido.',
    'auth/missing-phone-number':'Falta número de teléfono.',
    'auth/too-many-requests':'Demasiadas solicitudes. Intenta más tarde.',
    'auth/user-disabled':'Cuenta deshabilitada.'
  };
  return M[code] || fallback || code;
}

/* Inject minimal styles for the modal (white + black, rounded, Apple-like minimal) */
function injectMinimalAuthStyles(){
  if (document.getElementById('lixby-auth-min-css')) return;
  const s = document.createElement('style');
  s.id = 'lixby-auth-min-css';
  s.textContent = `
    /* minimal modal */
    .lixby-overlay{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.38); z-index:9999; }
    .lixby-modal{ background:#fff; color:#07101a; width:420px; max-width:94%; border-radius:14px; padding:18px; box-shadow:0 18px 48px rgba(2,6,12,0.38); font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto; }
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
  `;
  document.head.appendChild(s);
}

/* Create the minimal modal (if the page doesn't have one) */
function createAuthModalIfMissing(){
  if ($id('lixbyAuthOverlay')) return;
  injectMinimalAuthStyles();
  const overlay = document.createElement('div');
  overlay.id = 'lixbyAuthOverlay';
  overlay.className = 'lixby-overlay';
  overlay.setAttribute('aria-hidden','true');
  overlay.innerHTML = `
    <div class="lixby-modal" role="dialog" aria-modal="true" aria-labelledby="lixTitle">
      <button class="lixby-close" id="lixClose" aria-label="Cerrar">✕</button>
      <h3 id="lixTitle" class="lixby-title">Acceso a Lixby</h3>
      <div class="lixby-sub">Inicia sesión con tu cuenta</div>

      <div style="display:flex;flex-direction:column;gap:10px">
        <button id="btnGoogle" class="lixby-btn" title="Iniciar sesión con Google">
          <img class="icon" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><path fill='%23EA4335' d='M44 24.2c0-1.6-.2-3.1-.6-4.5H24v8.6h11.9c-.5 2.8-2.3 5.1-4.9 6.7v5.5h8c4.7-4.3 7.5-10.7 7.5-16.3z'/><path fill='%2344AA53' d='M24 44c6 0 11-2.2 14.7-5.9l-7.1-5.1c-2 1.3-4.5 2.1-7.6 2.1-5.8 0-10.8-3.8-12.6-9.1H4v5.7C7.6 39.9 15.3 44 24 44z'/><path fill='%234A90E2' d='M9.4 27.9A17.9 17.9 0 0 1 8 24c0-0.8.1-1.6.3-2.4L4 16.9C2.6 19.9 1.9 22.9 1.9 25.9c0 3 0.6 5.8 1.9 8.2l6-6.2z'/><path fill='%23FBBC05' d='M24 8c3.6 0 6.9 1.2 9.5 3.4l6.9-6.9C35 2 29.8 0 24 0 15.3 0 7.6 4.1 4 12.6l6 4.3C13.2 11.9 18.2 8 24 8z'/></svg>" alt="G">
          <span>Iniciar con Google</span>
        </button>

        <button id="btnGitHub" class="lixby-btn" title="Iniciar sesión con GitHub">
          <img class="icon" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='%23000' d='M12 2C6.48 2 2 6.58 2 12.18c0 4.5 2.87 8.32 6.84 9.66.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.56 2.36 1.11 2.94.85.09-.66.35-1.11.64-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05A9.24 9.24 0 0 1 12 6.8c.85.004 1.71.115 2.5.34 1.9-1.32 2.74-1.05 2.74-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.81-4.57 5.07.36.3.68.9.68 1.82 0 1.31-.01 2.36-.01 2.68 0 .26.18.59.69.49A10.2 10.2 0 0 0 22 12.18C22 6.58 17.52 2 12 2z'/></svg>" alt="GH">
          <span>Iniciar con GitHub</span>
        </button>

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

  $id('lixClose')?.addEventListener('click', hideAuthOverlay);
  $id('goLogin')?.addEventListener('click', ()=> { hideAuthOverlay(); location.href = 'login.html'; });
  $id('goRegister')?.addEventListener('click', ()=> { hideAuthOverlay(); location.href = 'register.html'; });
}

/* show/hide */
function showAuthOverlay(){ createAuthModalIfMissing(); const o = $id('lixbyAuthOverlay'); if(!o) return; o.setAttribute('aria-hidden','false'); o.style.display='flex'; try{ document.documentElement.style.overflow='hidden' }catch(e){} }
function hideAuthOverlay(){ const o = $id('lixbyAuthOverlay'); if(!o) return; o.setAttribute('aria-hidden','true'); o.style.display='none'; try{ document.documentElement.style.overflow='' }catch(e){} }

/* Modal message */
function setModalMsg(txt, autoHideMs=3000){
  const el = $id('lixMsg'); if(!el) return;
  el.textContent = txt || '';
  if (autoHideMs) { setTimeout(()=> { if(el) el.textContent=''; }, autoHideMs); }
}

/* OAuth sign-in with popup + redirect fallback */
let oauthLock = false;
async function doPopupSignInWithFallback(provider, providerName){
  if (oauthLock) return;
  oauthLock = true;
  try {
    try {
      const res = await signInWithPopup(auth, provider);
      if (res && res.user) {
        saveLocalUser(res.user);
        setModalMsg('Felicidades — has iniciado sesión',1200);
        await sleep(800);
        hideAuthOverlay();
        location.href = 'index.html';
      }
    } catch(err) {
      // If popup blocked or COOP issues, fallback to redirect
      showConsolePretty(err);
      const code = err && err.code;
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/unauthorized-domain') {
        setModalMsg(mapError(code,'Usando método alternativo...'),2000);
        await signInWithRedirect(auth, provider);
        // redirect flow will continue on getRedirectResult in init()
      } else {
        setModalMsg(mapError(code, err && err.message),4000);
        throw err;
      }
    }
  } finally { oauthLock = false; }
}

/* Anónimo */
async function doAnonymousSignIn(){
  try {
    $id('btnAnonymous').disabled = true;
    const res = await signInAnonymously(auth);
    saveLocalUser(res.user);
    setModalMsg('Entrando como invitado...',1000);
    await sleep(800);
    hideAuthOverlay();
    location.href = 'index.html';
  } catch(err) {
    showConsolePretty(err);
    setModalMsg('No se pudo entrar como invitado',3000);
  } finally {
    try{ $id('btnAnonymous').disabled = false; } catch(e){}
  }
}

/* --- reCAPTCHA & Phone MFA helpers --- */
let recaptchaVerifierInstance = null;
function ensureRecaptcha(){
  if (recaptchaVerifierInstance) return recaptchaVerifierInstance;
  // invisible reCAPTCHA bound to the #recaptcha-container element
  try{
    recaptchaVerifierInstance = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible'
    });
    // Render immediately so widget available
    recaptchaVerifierInstance.render().catch(()=>{/* ignore render errors */});
    return recaptchaVerifierInstance;
  }catch(e){ console.warn('recaptcha init err', e); return null; }
}

/* Enrolar teléfono como segundo factor para currentUser */
async function enrollPhoneMultiFactor(displayNameForFactor = 'Teléfono'){
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No hay usuario autenticado para inscribir segundo factor');
    setModalMsg('Obteniendo sesión MFA...', 2000);
    const mfaUser = multiFactor(user);
    const session = await mfaUser.getSession(); // MultiFactorSession
    // pedir número de teléfono (prompt para beta rápida; reemplaza por UI bonita si quieres)
    const phoneNumber = prompt('Introduce tu número con prefijo internacional (ej. +34123456789):');
    if (!phoneNumber) { setModalMsg('Inscripción cancelada'); return; }
    const rec = ensureRecaptcha();
    const phoneAuthProvider = new PhoneAuthProvider(auth);
    // phoneInfoOptions: { phoneNumber, session }
    const verificationId = await phoneAuthProvider.verifyPhoneNumber({ phoneNumber, session }, rec);
    const code = prompt('Introduce el código SMS que has recibido:');
    if (!code) { setModalMsg('Código no introducido. Inscripción cancelada.'); return; }
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

/* Resolver sign-in cuando el primer factor requiere MFA (web) */
async function handleMultiFactorRequired(error){
  try{
    if (!error || !error.code) { throw error || new Error('Unknown MFA error'); }
    if (error.code !== 'auth/multi-factor-auth-required') { throw error; }
    const resolver = getMultiFactorResolver(auth, error);
    // Si hay hints, buscamos el primero de tipo phone
    const hints = resolver.hints || [];
    let phoneHintIndex = hints.findIndex(h=> h && h.factorId === PhoneMultiFactorGenerator.FACTOR_ID);
    // Si no hay phone, pedir al usuario que elija; aquí elegimos el primero de la lista
    if (phoneHintIndex === -1 && hints.length>0) phoneHintIndex = 0;
    if (phoneHintIndex === -1) { setModalMsg('No hay factores disponibles para MFA'); return; }
    const hint = hints[phoneHintIndex];
    // Inicia reCAPTCHA y envío SMS
    const rec = ensureRecaptcha();
    const phoneAuthProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneAuthProvider.verifyPhoneNumber({ multiFactorHint: hint, session: resolver.session }, rec);
    const code = prompt(`Se ha enviado un SMS al ${hint.phoneNumber || 'tu teléfono'}. Introduce el código:`);
    if (!code) { setModalMsg('Código no introducido.'); return; }
    const cred = PhoneAuthProvider.credential(verificationId, code);
    const assertion = PhoneMultiFactorGenerator.assertion(cred);
    // resuelve el signIn
    const userCredential = await resolver.resolveSignIn(assertion);
    // sign-in completado
    saveLocalUser(userCredential.user);
    setModalMsg('Acceso completado ✔', 1200);
    await sleep(800);
    hideAuthOverlay();
    location.href = 'index.html';
  } catch(err) {
    showConsolePretty(err);
    setModalMsg(err && err.message ? err.message : 'Error en MFA', 4000);
    try{ if (recaptchaVerifierInstance && typeof recaptchaVerifierInstance.clear === 'function') recaptchaVerifierInstance.clear(); }catch(e){}
  }
}

/* Wire up created modal buttons and auth flows */
function wireModalButtons(){
  createAuthModalIfMissing();
  // Google
  $id('btnGoogle')?.addEventListener('click', async (e)=> {
    e.preventDefault();
    try { await doPopupSignInWithFallback(googleProvider,'Google'); }
    catch(err){ 
      // special case: if MFA required from popup/redirect, handle in init via getRedirectResult or here if error thrown
      if (err && err.code === 'auth/multi-factor-auth-required') await handleMultiFactorRequired(err);
      else setModalMsg(mapError(err && err.code, err && err.message)); 
    }
  });
  // GitHub
  $id('btnGitHub')?.addEventListener('click', async (e)=> {
    e.preventDefault();
    try { await doPopupSignInWithFallback(githubProvider,'GitHub'); }
    catch(err){
      if (err && err.code === 'auth/multi-factor-auth-required') await handleMultiFactorRequired(err);
      else setModalMsg(mapError(err && err.code, err && err.message));
    }
  });
  // Anonymous
  $id('btnAnonymous')?.addEventListener('click', async (e)=>{
    e.preventDefault();
    await doAnonymousSignIn();
  });
  // recaptcha container is already in modal markup
}

/* Firestore upsert for user profile (safe merge) */
async function upsertUserProfile(user, extra={}){
  try{
    if (!user || !user.uid) return;
    const ref = doc(db,'users',user.uid);
    const snap = await getDoc(ref);
    const base = { uid:user.uid, name:user.displayName||null, email:user.email||null, photoURL:user.photoURL||null, provider: (user.providerData && user.providerData[0] && user.providerData[0].providerId) || null, createdAt: snap.exists() ? snap.data().createdAt : new Date().toISOString() };
    await setDoc(ref, { ...base, ...extra }, { merge:true });
  }catch(e){ console.warn('upsertUserProfile err', e); }
}

/* Header/account minimal */
function ensureHeader(){
  if ($id('lixbyHeader')) return $id('lixbyHeader');
  const header = document.createElement('div');
  header.id = 'lixbyHeader';
  header.style.display='flex'; header.style.alignItems='center'; header.style.justifyContent='space-between';
  header.style.padding='10px 18px'; header.style.gap='12px';
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;cursor:pointer" id="lix_logo">
      <img src="https://i.imgur.com/dOCYmkx.jpeg" style="width:36px;height:36px;border-radius:8px;object-fit:cover">
      <div style="font-weight:800">LIXBY</div>
    </div>
    <div style="margin-left:auto">
      <button id="lixOpenAuth" style="padding:8px 12px;border-radius:10px;border:1px solid rgba(0,0,0,0.06);background:#fff;color:#07101a;font-weight:700">Cuenta</button>
    </div>
  `;
  document.body.prepend(header);
  $id('lixOpenAuth')?.addEventListener('click', ()=> showAuthOverlay());
  $id('lix_logo')?.addEventListener('click', ()=> location.href='index.html');
  return header;
}
function updateHeaderSafe(user){
  ensureHeader();
  const prev = $id('lixbyAccountHolder'); if(prev) prev.remove();
  if (!user) return;
  const holder = document.createElement('div'); holder.id='lixbyAccountHolder';
  holder.style.display='flex'; holder.style.alignItems='center'; holder.style.gap='10px';
  const name = escapeHtml(user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario'));
  const avatar = user.photoURL ? user.photoURL : `https://via.placeholder.com/64?text=${encodeURIComponent(name.charAt(0)||'U')}`;
  holder.innerHTML = `<img src="${avatar}" style="width:44px;height:44px;border-radius:10px;object-fit:cover"><div style="display:flex;flex-direction:column;align-items:flex-end"><div style="font-weight:700">${name}</div><div style="display:flex;gap:6px;margin-top:6px"><button id="viewAcc" style="padding:6px 8px;border-radius:8px;border:1px solid rgba(0,0,0,0.06);background:#fff">Mi cuenta</button><button id="signOutBtn" style="padding:6px 8px;border-radius:8px;border:1px solid rgba(0,0,0,0.06);background:#fff">Cerrar</button></div></div>`;
  $id('lixbyHeader').appendChild(holder);
  $id('viewAcc')?.addEventListener('click', ()=> location.href='cuenta.html');
  $id('signOutBtn')?.addEventListener('click', async ()=> { try { await fbSignOut(auth); clearLocalUser(); location.href='index.html'; } catch(e){ console.warn(e); } });
}

/* INIT: handle redirect result (OAuth redirect) and auth state */
async function init(){
  // handle redirect result if present
  try {
    const rr = await getRedirectResult(auth);
    if (rr && rr.user) {
      // Successful sign in via redirect
      saveLocalUser(rr.user);
      setModalMsg('Inicio mediante redirect completado',1000);
      await sleep(700);
      hideAuthOverlay();
      location.href='index.html';
    }
  } catch(e) {
    // If redirect failed due to MFA requirement, e may be multi-factor error
    if (e && e.code === 'auth/multi-factor-auth-required') {
      await handleMultiFactorRequired(e);
    } else {
      console.warn('getRedirectResult err', e);
    }
  }

  // create modal & wire
  createAuthModalIfMissing();
  wireModalButtons();

  // Subscribe auth state changes
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try{ saveLocalUser(user); updateHeaderSafe(user); await upsertUserProfile(user); } catch(e){ console.warn(e); }
    } else {
      updateHeaderSafe(null);
      // show overlay the first time (optional)
      const seen = localStorage.getItem('lixby_seen_welcome');
      if (!seen) { setTimeout(()=> showAuthOverlay(), 300); localStorage.setItem('lixby_seen_welcome','1'); }
    }
  });

  // expose functions to window for manual testing & UI custom pages
  window.lixbyAuth = {
    show: showAuthOverlay,
    hide: hideAuthOverlay,
    enrollPhoneMFA: enrollPhoneMultiFactor,
    ensureRecaptcha
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

/* Expose simple API (programático) */
window.appAuth = {
  signInWithGoogle: () => doPopupSignInWithFallback(googleProvider,'Google'),
  signInWithGitHub: () => doPopupSignInWithFallback(githubProvider,'GitHub'),
  signInAnonymously: () => doAnonymousSignIn(),
  enrollPhoneMFA: (displayName) => enrollPhoneMultiFactor(displayName),
  signOut: async ()=> { try{ await fbSignOut(auth); clearLocalUser(); location.href='index.html'; } catch(e){ console.warn(e); } },
  _rawAuth: auth,
  _rawDb: db
};

export {};

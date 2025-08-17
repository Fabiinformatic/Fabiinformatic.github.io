// auth-firebase-minimal.js
// ES module. Inclúyelo como: <script type="module" src="auth-firebase-minimal.js"></script>

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

// ===== CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyDMcDeBKSGqf9ZEexQAIM-9u6GLaQEnLcs",
  authDomain: "lixby-e0344.firebaseapp.com",
  projectId: "lixby-e0344",
  storageBucket: "lixby-e0344.firebasestorage.app",
  messagingSenderId: "671722866179",
  appId: "1:671722866179:web:65868eca5146942b507036",
  measurementId: "G-09SQL30MS8"
};

let app;
try { app = (getApps && getApps().length) ? getApp() : initializeApp(firebaseConfig); }
catch(e) { try { app = initializeApp(firebaseConfig); } catch(e2) { console.error('Firebase init failed', e2); } }

const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

const $id = (id) => document.getElementById(id);
function safeJSONParse(raw){ try { return raw ? JSON.parse(raw) : null; } catch(e){ return null; } }
function escapeHtml(str){ if (str === undefined || str === null) return ''; return String(str).replace(/[&<>"]+/g, (m)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]||m)); }

function saveLocalUser(userObj){
  try{
    if (!userObj) { localStorage.removeItem('lixby_user'); return; }
    const u = { uid: userObj.uid, name: userObj.displayName || (userObj.email ? userObj.email.split('@')[0] : null), email: userObj.email || null, photoURL: userObj.photoURL || null, isAnonymous: !!userObj.isAnonymous, firstName: null, lastName: null, dob: null };
    localStorage.setItem('lixby_user', JSON.stringify(u));
  }catch(e){ console.warn('saveLocalUser', e); }
}
function clearLocalUser(){ try{ localStorage.removeItem('lixby_user'); }catch(e){} }

/* Ensure modal styling is visible and consistent (only if user provided modal exists) */
function enforceModalStylesIfPresent(){
  try {
    const authModal = $id('authModal');
    const authOverlay = $id('authOverlay');
    const authBackdrop = $id('authBackdrop');

    if (authOverlay) {
      // ensure overlay is display:block when shown and has a dark backdrop
      authOverlay.style.setProperty('z-index', '9998', 'important');
      if (authBackdrop) {
        authBackdrop.style.background = 'rgba(0,0,0,0.45)';
        authBackdrop.style.backdropFilter = 'blur(4px)';
      } else {
        // if no backdrop element, ensure overlay itself has background to block interactions
        authOverlay.style.background = 'rgba(0,0,0,0.45)';
      }
    }

    if (authModal) {
      // Force the modal content to white background & black text for contrast,
      // but only inline so we don't change your stylesheet files.
      authModal.style.background = '#ffffff';
      authModal.style.color = '#07101a';
      authModal.style.boxShadow = '0 24px 60px rgba(2,6,12,0.48)';
      authModal.style.border = '0';
      authModal.style.borderRadius = '12px';
      authModal.style.padding = authModal.style.padding || '20px';
    }
  } catch(e) { /* non-crítico */ }
}

/* Message area helper (ensures white background + black text and visible) */
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

/* Fallback overlay (only used if alpha modal isn't present) */
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
    <div style="background:#fff;color:#07101a;padding:20px;border-radius:12px;max-width:420px;width:100%;">
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
  const safe = (fn)=> { try{ fn(); }catch(e){ console.warn('fallback wire err', e);} };
  safe(()=> $id('fb_google').addEventListener('click', ()=> doPopupSignIn(googleProvider,'Google')));
  safe(()=> $id('fb_github').addEventListener('click', ()=> doPopupSignIn(githubProvider,'GitHub')));
  safe(()=> $id('fb_signin').addEventListener('click', async ()=>{
    const e = $id('fb_email') ? $id('fb_email').value : '';
    const p = $id('fb_pass') ? $id('fb_pass').value : '';
    try { await signInWithEmailAndPassword(auth,e,p); } catch(err){ $id('fb_msg').textContent = String(err.message||err); }
  }));
  safe(()=> $id('fb_signup').addEventListener('click', async ()=>{
    const e = $id('fb_email') ? $id('fb_email').value : '';
    const p = $id('fb_pass') ? $id('fb_pass').value : '';
    try { await createUserWithEmailAndPassword(auth,e,p); $id('fb_msg').textContent='Felicidades — cuenta creada'; setTimeout(()=> location.href='login.html', 2000); } catch(err){ $id('fb_msg').textContent = String(err.message||err); }
  }));
  safe(()=> $id('fb_anon').addEventListener('click', async ()=> { try{ await signInAnonymously(auth); }catch(e){ console.warn(e); }}));
}

/* show/hide using user's modal if present, fallback otherwise */
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
    // focus first element
    setTimeout(()=> {
      const first = $id('authEmail') || $id('btnGoogle') || $id('btnAnonymous');
      if (first && typeof first.focus === 'function') try{ first.focus(); }catch(e){}
    }, 80);
    return;
  }
  // fallback
  createFallbackOverlay();
  const fb = $id('lixbyAuthOverlayFallback');
  if (fb) fb.style.display = 'flex';
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

/* Firestore upsert */
async function upsertUserProfile(user, extra={}){
  if (!user || !user.uid) return;
  try{
    const ref = doc(db,'users',user.uid);
    const snapshot = await getDoc(ref);
    const base = { uid:user.uid, name:user.displayName||null, email:user.email||null, photoURL:user.photoURL||null, provider:user.providerData && user.providerData[0] && user.providerData[0].providerId || null, createdAt: snapshot.exists() ? snapshot.data().createdAt : new Date().toISOString() };
    await setDoc(ref, { ...base, ...extra }, { merge:true });
  }catch(e){ console.warn('upsertUserProfile', e); }
}

async function handleSignIn(user, { anonymous=false, redirectToIndex=true, showCongrats=true } = {}){
  if (!user) return;
  saveLocalUser(user);
  try{ await upsertUserProfile(user, anonymous?{anonymous:true}:{}) }catch(e){}
  window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ uid:user.uid, signedIn:true } }));
  if (showCongrats) {
    // ensure modal msg area is visible and styled
    showModalMessage('Felicidades — has iniciado sesión', 1200);
  }
  // hide overlay and redirect after short delay
  setTimeout(()=> {
    hideAuthOverlay();
    if (redirectToIndex) try { location.href = 'index.html'; } catch(e){}
  }, 900);
}

/* OAuth popup helper */
function oauthErrorHandler(err, providerName){ console.error(`${providerName} sign-in error`, err); const code = err && err.code; if (code === 'auth/unauthorized-domain') alert('Dominio no autorizado para OAuth. Añádelo en Firebase Console.'); else if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') alert('Popup bloqueado o cerrado. Permite ventanas emergentes.'); else alert(err && err.message ? err.message : String(err)); }
async function doPopupSignIn(provider, providerName){
  try{
    const res = await signInWithPopup(auth, provider);
    await handleSignIn(res.user, { anonymous:false, redirectToIndex:true, showCongrats:true });
    window.dispatchEvent(new CustomEvent('lixby:auth:signin',{ detail: { uid: res.user.uid, provider: providerName } }));
    return res.user;
  }catch(err){
    oauthErrorHandler(err, providerName);
    throw err;
  }
}

/* Wire to user's modal buttons (if present) */
function wireExistingModalButtons(){
  // get elements safely
  const btnGoogle = $id('btnGoogle');
  const btnGithub = $id('btnGitHub');
  const btnEmailSignIn = $id('btnEmailSignIn');
  const btnEmailSignUp = $id('btnEmailSignUp');
  const btnAnonymous = $id('btnAnonymous');
  const authClose = $id('authClose');
  const authOverlay = $id('authOverlay');
  const authBackdrop = $id('authBackdrop');

  // ensure message area
  ensureModalMessageArea();
  enforceModalStylesIfPresent();

  if (btnGoogle) {
    btnGoogle.addEventListener('click', async () => { try { await doPopupSignIn(googleProvider, 'Google'); } catch(e){} });
  }
  if (btnGithub) {
    btnGithub.addEventListener('click', async () => { try { await doPopupSignIn(githubProvider, 'GitHub'); } catch(e){} });
  }

  if (btnEmailSignIn) {
    btnEmailSignIn.addEventListener('click', async () => {
      const email = ($id('authEmail')||{}).value || '';
      const pass = ($id('authPass')||{}).value || '';
      if (!email || !pass) { showModalMessage('Introduce email y contraseña', 2000); return; }
      try {
        const res = await signInWithEmailAndPassword(auth, email, pass);
        await handleSignIn(res.user, { anonymous:false, redirectToIndex:true, showCongrats:true });
      } catch(err){
        console.warn('email signIn err', err);
        showModalMessage(err && err.message ? err.message : 'Error al iniciar sesión', 3000);
      }
    });
  }

  if (btnEmailSignUp) {
    btnEmailSignUp.addEventListener('click', async () => {
      const email = ($id('authEmail')||{}).value || '';
      const pass = ($id('authPass')||{}).value || '';
      if (!email || !pass) { showModalMessage('Introduce email y contraseña', 2000); return; }
      try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        saveLocalUser(res.user);
        try { await upsertUserProfile(res.user); } catch(e){ console.warn(e); }
        // message and redirect to login.html after 2s
        showModalMessage('Felicidades — has creado una cuenta. Redirigiendo a inicio de sesión...', 2000);
        setTimeout(()=> { hideAuthOverlay(); try{ location.href = 'login.html'; }catch(e){} }, 2000);
      } catch(err){
        console.warn('signup err', err);
        showModalMessage(err && err.message ? err.message : 'Error al registrarse', 4000);
      }
    });
  }

  if (btnAnonymous) {
    btnAnonymous.addEventListener('click', async () => {
      try {
        const res = await signInAnonymously(auth);
        await handleSignIn(res.user, { anonymous:true, redirectToIndex:true, showCongrats:true });
      } catch(err){
        console.warn('anon err', err); showModalMessage('No se pudo entrar como invitado', 2500);
      }
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

  // defensive: if overlay element itself is clicked (not backdrop), close
  if (authOverlay) {
    authOverlay.addEventListener('click', (ev) => {
      if (ev.target === authOverlay) hideAuthOverlay();
    });
  }
}

/* Sign-out helper */
async function signOutAndRedirect(){
  try { await fbSignOut(auth); } catch(e){ console.warn(e); }
  try{ localStorage.removeItem('lixby_user'); }catch(e){}
  window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ signedIn:false } }));
  try { location.href = 'index.html'; } catch(e){}
}

/* Init */
function init(){
  // wire but safely
  try { wireExistingModalButtons(); } catch(e){ console.warn('wireExistingModalButtons failed', e); }
  onAuthStateChanged(auth, async (user) => {
    if (user){
      try{
        saveLocalUser(user);
        window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ uid:user.uid, signedIn:true } }));
      }catch(e){ console.warn(e); }
    } else {
      window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ signedIn:false } }));
      const seen = localStorage.getItem('lixby_seen_welcome');
      if (!seen) { setTimeout(()=> { try { showAuthOverlay(); } catch(e){} }, 300); }
    }
  });

  // expose safe API
  window.appAuth = window.appAuth || {};
  Object.assign(window.appAuth, {
    signInWithGoogle: () => doPopupSignIn(googleProvider,'Google'),
    signInWithGitHub: () => doPopupSignIn(githubProvider,'GitHub'),
    signInWithEmail: async (email,password)=>{ if(!email||!password) throw new Error('email+password required'); const res = await signInWithEmailAndPassword(auth,email,password); saveLocalUser(res.user); await upsertUserProfile(res.user); window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ uid:res.user.uid, signedIn:true } })); return res.user; },
    createUserWithEmail: async (email,password, extraProfile={})=>{ if(!email||!password) throw new Error('email+password required'); const res = await createUserWithEmailAndPassword(auth,email,password); saveLocalUser(res.user); await upsertUserProfile(res.user, extraProfile); window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ uid:res.user.uid, signedIn:true } })); return res.user; },
    signInAnonymously: async ()=>{ const res = await signInAnonymously(auth); saveLocalUser(res.user); await upsertUserProfile(res.user,{anonymous:true}); window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ uid:res.user.uid, signedIn:true } })); return res.user; },
    signOut: async ()=>{ await signOutAndRedirect(); },
    resetPassword: async (email)=>{ if(!email) throw new Error('email required'); try { await sendPasswordResetEmail(auth, email); return true; } catch(e) { throw e; } },
    _rawAuth: auth,
    _rawDb: db
  });

  window.lixby = window.lixby || {};
  window.lixby.authSignOut = signOutAndRedirect;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

export {};

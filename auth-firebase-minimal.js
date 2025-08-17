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

// =========== CONFIG ===========
// Usa tu configuración (la que compartiste antes)
const firebaseConfig = {
  apiKey: "AIzaSyDMcDeBKSGqf9ZEexQAIM-9u6GLaQEnLcs",
  authDomain: "lixby-e0344.firebaseapp.com",
  projectId: "lixby-e0344",
  storageBucket: "lixby-e0344.firebasestorage.app",
  messagingSenderId: "671722866179",
  appId: "1:671722866179:web:65868eca5146942b507036",
  measurementId: "G-09SQL30MS8"
};

// defensive init
let app;
try { app = (getApps && getApps().length) ? getApp() : initializeApp(firebaseConfig); }
catch(e) { try { app = initializeApp(firebaseConfig); } catch(e2) { console.error('Firebase init failed', e2); } }

const auth = getAuth(app);
const db = getFirestore(app);

// Providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// helpers
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

// show/hide existing modal (we DON'T replace user's modal markup)
function showAuthOverlay(){
  const overlay = $id('authOverlay');
  if (overlay) {
    overlay.style.display = 'block';
    overlay.setAttribute('aria-hidden','false');
    // focus first field if present
    setTimeout(()=> {
      const first = $id('authEmail') || $id('btnGoogle') || $id('btnAnonymous');
      if (first && typeof first.focus === 'function') first.focus();
    }, 80);
    return;
  }
  // fallback: create small overlay (only if page doesn't have one)
  createFallbackOverlay();
  showAuthOverlay();
}
function hideAuthOverlay(){
  const overlay = $id('authOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden','true');
    try{ document.documentElement.style.overflow = ''; }catch(e){}
  }
  // also hide fallback if exists
  const fallback = $id('lixbyAuthOverlayFallback');
  if (fallback) fallback.style.display = 'none';
}

// create a fallback modal only if page doesn't contain one (rare)
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
  document.getElementById('fb_google').addEventListener('click', ()=> doPopupSignIn(googleProvider,'Google'));
  document.getElementById('fb_github').addEventListener('click', ()=> doPopupSignIn(githubProvider,'GitHub'));
  document.getElementById('fb_signin').addEventListener('click', async ()=>{
    const e = document.getElementById('fb_email').value||'';
    const p = document.getElementById('fb_pass').value||'';
    try { await signInWithEmailAndPassword(auth,e,p); } catch(err){ document.getElementById('fb_msg').textContent = String(err.message||err); }
  });
  document.getElementById('fb_signup').addEventListener('click', async ()=>{
    const e = document.getElementById('fb_email').value||'';
    const p = document.getElementById('fb_pass').value||'';
    try { await createUserWithEmailAndPassword(auth,e,p); document.getElementById('fb_msg').textContent='Felicidades — cuenta creada'; setTimeout(()=> location.href='login.html', 2000); } catch(err){ document.getElementById('fb_msg').textContent = String(err.message||err); }
  });
  document.getElementById('fb_anon').addEventListener('click', async ()=> { try{ await signInAnonymously(auth); }catch(e){ console.warn(e); }});
}

// utility: show an inline message area inside user's modal (create if missing)
function ensureModalMessageArea(){
  const authModal = $id('authModal');
  if (!authModal) return null;
  let msg = authModal.querySelector('.lixby-auth-msg');
  if (!msg) {
    msg = document.createElement('div');
    msg.className = 'lixby-auth-msg';
    // styling minimal to conform with your white modal: black text on translucent bg
    msg.style.marginTop = '12px';
    msg.style.padding = '10px';
    msg.style.borderRadius = '8px';
    msg.style.background = 'rgba(255,255,255,0.94)';
    msg.style.color = '#07101a';
    msg.style.fontWeight = '700';
    msg.style.display = 'none';
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
    setTimeout(()=> { msg.style.display = 'none'; }, autoHideMs);
  }
}

// ========== Firestore upsert (safe) ==========
async function upsertUserProfile(user, extra={}){
  if (!user || !user.uid) return;
  try{
    const ref = doc(db,'users',user.uid);
    const snapshot = await getDoc(ref);
    const base = { uid:user.uid, name:user.displayName||null, email:user.email||null, photoURL:user.photoURL||null, provider:user.providerData && user.providerData[0] && user.providerData[0].providerId || null, createdAt: snapshot.exists() ? snapshot.data().createdAt : new Date().toISOString() };
    await setDoc(ref, { ...base, ...extra }, { merge:true });
  }catch(e){ console.warn('upsertUserProfile', e); }
}

// ========== unified sign-in handling ==========
async function handleSignIn(user, { anonymous=false, redirectToIndex=true, showCongrats=true } = {}){
  if (!user) return;
  saveLocalUser(user);
  try{ await upsertUserProfile(user, anonymous?{anonymous:true}:{}) }catch(e){}
  // update header UI if present (emit event so header script picks it up)
  window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ uid:user.uid, signedIn:true } }));
  // show message and redirect
  if (showCongrats) {
    showModalMessage('Felicidades — has iniciado sesión', 1200);
  }
  hideAuthOverlay();
  if (redirectToIndex) {
    setTimeout(()=> { location.href = 'index.html'; }, 900);
  }
}

// ========== OAuth popup helper ==========
function oauthErrorHandler(err, providerName){ console.error(`${providerName} sign-in error`, err); const code = err && err.code; if (code === 'auth/unauthorized-domain') alert('Dominio no autorizado para OAuth. Añádelo en Firebase Console.'); else if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') alert('Popup bloqueado o cerrado. Permite ventanas emergentes.'); else alert(err && err.message ? err.message : String(err)); }
async function doPopupSignIn(provider, providerName){
  try{
    const res = await signInWithPopup(auth, provider);
    await handleSignIn(res.user, { anonymous:false, redirectToIndex:true, showCongrats:true });
    // also dispatch event with provider info
    window.dispatchEvent(new CustomEvent('lixby:auth:signin',{ detail: { uid: res.user.uid, provider: providerName } }));
    return res.user;
  }catch(err){
    oauthErrorHandler(err, providerName);
    throw err;
  }
}

// ========== Wire to your existing modal buttons ==========
function wireExistingModalButtons(){
  const btnGoogle = $id('btnGoogle');
  const btnGithub = $id('btnGitHub'); // note: in HTML id is btnGitHub (capital H)
  const btnEmailSignIn = $id('btnEmailSignIn');
  const btnEmailSignUp = $id('btnEmailSignUp');
  const btnAnonymous = $id('btnAnonymous');
  const authClose = $id('authClose');
  const authOverlay = $id('authOverlay');
  const authBackdrop = $id('authBackdrop');

  // ensure message area exists
  ensureModalMessageArea();

  if (btnGoogle) {
    btnGoogle.addEventListener('click', async (e) => {
      try { await doPopupSignIn(googleProvider, 'Google'); } catch(e) {}
    });
  }
  if (btnGithub) {
    btnGithub.addEventListener('click', async (e) => {
      try { await doPopupSignIn(githubProvider, 'GitHub'); } catch(e) {}
    });
  }

  if (btnEmailSignIn) {
    btnEmailSignIn.addEventListener('click', async (e) => {
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
    btnEmailSignUp.addEventListener('click', async (e) => {
      const email = ($id('authEmail')||{}).value || '';
      const pass = ($id('authPass')||{}).value || '';
      if (!email || !pass) { showModalMessage('Introduce email y contraseña', 2000); return; }
      // create account, then: show success message under create button, wait 2s, go to login.html
      try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        // save bronze-profile and local snapshot
        saveLocalUser(res.user);
        try { await upsertUserProfile(res.user); } catch(e){ console.warn(e); }
        // show message exactly as you requested and redirect to login.html after 2s
        showModalMessage('Felicidades — has creado una cuenta. Redirigiendo a inicio de sesión...', 2000);
        // hide overlay visually but keep message for the delay
        setTimeout(()=> {
          hideAuthOverlay();
          location.href = 'login.html';
        }, 2000);
      } catch(err){
        console.warn('signup err', err);
        showModalMessage(err && err.message ? err.message : 'Error al registrarse', 4000);
      }
    });
  }

  if (btnAnonymous) {
    btnAnonymous.addEventListener('click', async (e) => {
      try {
        const res = await signInAnonymously(auth);
        await handleSignIn(res.user, { anonymous:true, redirectToIndex:true, showCongrats:true });
      } catch(err){
        console.warn('anon err', err); showModalMessage('No se pudo entrar como invitado', 2500);
      }
    });
  }

  if (authClose) {
    authClose.addEventListener('click', (e) => {
      hideAuthOverlay();
      try { localStorage.setItem('lixby_seen_welcome','1'); } catch(e){}
    });
  }

  // close clicking the backdrop (if present)
  if (authBackdrop) {
    authBackdrop.addEventListener('click', (e)=> { hideAuthOverlay(); });
  }

  // Ensure overlay is hidden on navigation or sign-in success (prevents stuck transparent overlay)
  window.addEventListener('beforeunload', ()=> hideAuthOverlay());
}

// ========== Header sync & account UI events ==========
// The page already has an account script that listens to the custom event
// "lixby:auth:changed". We still dispatch events on auth changes above.
// Provide a signOut helper that header buttons can use:
async function signOutAndRedirect(){
  try { await fbSignOut(auth); } catch(e){ console.warn(e); }
  try{ localStorage.removeItem('lixby_user'); }catch(e){}
  window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ signedIn:false } }));
  location.href = 'index.html';
}

// ========== Init & onAuthState ==========
function init(){
  // wire modal buttons if present; if not, the fallback will be used when calling showAuthOverlay()
  wireExistingModalButtons();

  onAuthStateChanged(auth, async (user) => {
    if (user){
      try{
        saveLocalUser(user);
        window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ uid:user.uid, signedIn:true } }));
        // update account page if present
        // if user signed-in and currently on root, close overlay and redirect to cuenta if desired
        // but per your request we redirect to index.html on sign-in => already handled in handleSignIn
      }catch(e){ console.warn(e); }
    }else{
      // not signed in: ensure header shows logged-out state and show modal once (unless user has seen)
      window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ signedIn:false } }));
      const seen = localStorage.getItem('lixby_seen_welcome');
      if (!seen) {
        // show welcome auth overlay briefly after load
        setTimeout(()=> { showAuthOverlay(); }, 300);
      }
    }
  });

  // Expose helper on window
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

  // make signOut available globally for header logic (if your header binds to it)
  window.lixby = window.lixby || {};
  window.lixby.authSignOut = signOutAndRedirect;
}

// run init when DOM ready
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

// Export nothing (module annotation)
export {};

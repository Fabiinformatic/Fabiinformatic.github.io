/* auth-firebase-minimal.js
   Single-file minimal Firebase auth + minimal Apple-like glass UI
   - ES module; load in page with: <script type="module" src="/auth-firebase-minimal.js"></script>
   - Keeps Firebase imports from gstatic (client-side config still public)
   - Exposes window.appAuth (same API) and renders a compact, accessible header + glass overlay
   - Security/quality fixes applied: escaping injected HTML, consistent try/catch, no innerHTML from untrusted data
   - Injects compact CSS for "liquid glass" look. 

   Notes:
   - This file intentionally inlines minimal CSS and UI markup to keep integration single-file.
   - For production, extract CSS to a stylesheet, limit authorized domains in Firebase console, and enforce Firestore rules.
*/

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
  signOut as fbSignOut
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

/* ========================
   CONFIG
   ======================== */
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
catch(e) {
  console.warn('firebase init fallback', e);
  try { app = initializeApp(firebaseConfig); } catch(err) { console.error('firebase init failed', err); }
}
const auth = getAuth(app);
const db = getFirestore(app);

/* Providers */
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

/* Small util helpers */
const $id = (id) => document.getElementById(id);
function safeJSONParse(raw){ try { return raw ? JSON.parse(raw) : null; } catch(e){ return null; } }
function escapeHtml(str){ if (str === undefined || str === null) return ''; return String(str).replace(/[&<>"]+/g, (m)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]||m)); }

/* Local snapshot helpers */
function saveLocalUser(userObj){
  try{
    if (!userObj) { localStorage.removeItem('lixby_user'); return; }
    const u = { uid: userObj.uid, name: userObj.displayName || (userObj.email ? userObj.email.split('@')[0] : null), email: userObj.email || null, photoURL: userObj.photoURL || null };
    localStorage.setItem('lixby_user', JSON.stringify(u));
  }catch(e){ console.warn('saveLocalUser', e); }
}
function clearLocalUser(){ try{ localStorage.removeItem('lixby_user'); }catch(e){} }

/* ========================
   Minimal glass CSS + small layout
   ======================== */
const MINIMAL_CSS = `
:root{ --glass-bg: rgba(255,255,255,0.06); --glass-border: rgba(255,255,255,0.08); --muted: rgba(255,255,255,0.85); --accent: rgba(255,255,255,0.95); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
.lixby-glass{ background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); backdrop-filter: blur(10px) saturate(120%); border: 1px solid var(--glass-border); border-radius: 12px; color:var(--muted); }
.lixby-header{ display:flex; align-items:center; gap:12px; padding:8px 12px; }
.lixby-avatar{ width:40px; height:40px; border-radius:10px; object-fit:cover; flex:0 0 40px; }
.lixby-name{ font-weight:600; font-size:0.95rem; }
.lixby-btn{ background:transparent; border:1px solid transparent; padding:8px 10px; border-radius:10px; cursor:pointer; font-weight:600; }
.lixby-overlay{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:9999; }
.lixby-panel{ width:360px; max-width:92vw; padding:18px; }
.lixby-row{ display:flex; gap:8px; margin-top:10px; }
.lixby-input{ width:100%; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.04); background:transparent; color:var(--muted); }
.lixby-small{ font-size:0.9rem; color:rgba(255,255,255,0.7); margin-top:8px; }
`;

function injectCSS(){
  if (document.getElementById('lixby-minimal-css')) return;
  const s = document.createElement('style'); s.id = 'lixby-minimal-css'; s.textContent = MINIMAL_CSS; document.head.appendChild(s);
}

/* ========================
   UI creation (minimal)
   ======================== */
function createAuthOverlay(){
  if ($id('lixbyAuthOverlay')) return;
  injectCSS();
  const overlay = document.createElement('div'); overlay.id = 'lixbyAuthOverlay'; overlay.className = 'lixby-overlay'; overlay.setAttribute('aria-hidden','true'); overlay.style.display='none';
  overlay.innerHTML = `
    <div class="lixby-panel lixby-glass" role="dialog" aria-modal="true" aria-labelledby="lixbyAuthTitle">
      <h3 id="lixbyAuthTitle">Iniciar sesión</h3>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
        <button id="lixbyGoogle" class="lixby-btn">Iniciar con Google</button>
        <button id="lixbyGithub" class="lixby-btn">Iniciar con GitHub</button>
        <div class="lixby-row" style="flex-direction:column;">
          <input id="lixbyEmail" class="lixby-input" placeholder="Email" type="email" autocomplete="email">
          <input id="lixbyPass" class="lixby-input" placeholder="Contraseña" type="password" autocomplete="current-password">
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px;">
            <button id="lixbySignIn" class="lixby-btn">Entrar</button>
            <button id="lixbySignUp" class="lixby-btn">Crear</button>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px;">
          <button id="lixbyAnon" class="lixby-btn">Entrar como invitado</button>
          <button id="lixbyClose" class="lixby-btn">Cerrar</button>
        </div>
        <div id="lixbyAuthMsg" class="lixby-small"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  // attach handlers
  $id('lixbyClose').addEventListener('click', ()=> hideAuthOverlay());
  $id('lixbyGoogle').addEventListener('click', ()=> doPopupSignIn(googleProvider,'Google').catch(()=>{}));
  $id('lixbyGithub').addEventListener('click', ()=> doPopupSignIn(githubProvider,'GitHub').catch(()=>{}));
  $id('lixbySignIn').addEventListener('click', async ()=> {
    const email = ($id('lixbyEmail')||{}).value.trim();
    const pass = ($id('lixbyPass')||{}).value;
    if (!email || !pass){ showMsg('Introduce email y contraseña'); return; }
    try{
      const res = await signInWithEmailAndPassword(auth,email,pass);
      handleSignIn(res.user);
    }catch(err){
      if (err && err.code === 'auth/user-not-found'){
        if (confirm('Cuenta no encontrada. ¿Crear nueva?')){
          try{ const reg = await createUserWithEmailAndPassword(auth,email,pass); handleSignIn(reg.user); }catch(e){ showMsg(e.message||String(e)); }
        }
      } else showMsg(err.message||String(err));
    }
  });
  $id('lixbySignUp').addEventListener('click', async ()=>{
    const email = ($id('lixbyEmail')||{}).value.trim();
    const pass = ($id('lixbyPass')||{}).value;
    if (!email || !pass){ showMsg('Introduce email y contraseña'); return; }
    try{ const res = await createUserWithEmailAndPassword(auth,email,pass); handleSignIn(res.user); }catch(err){ showMsg(err.message||String(err)); }
  });
  $id('lixbyAnon').addEventListener('click', async ()=>{ try{ const res = await signInAnonymously(auth); handleSignIn(res.user, true); }catch(err){ showMsg(err.message||String(err)); } });
}
function showMsg(txt){ const el = $id('lixbyAuthMsg'); if (el) el.textContent = txt; }
function showAuthOverlay(){ const o = $id('lixbyAuthOverlay'); if (!o) createAuthOverlay(); const overlay = $id('lixbyAuthOverlay'); overlay.style.display='flex'; overlay.setAttribute('aria-hidden','false'); try{ document.documentElement.style.overflow='hidden'; }catch(e){} }
function hideAuthOverlay(){ const overlay = $id('lixbyAuthOverlay'); if (!overlay) return; overlay.style.display='none'; overlay.setAttribute('aria-hidden','true'); try{ document.documentElement.style.overflow=''; }catch(e){} }

/* ========================
   Firestore upsert (safe)
   ======================== */
async function upsertUserProfile(user, extra={}){
  if (!user || !user.uid) return;
  try{
    const ref = doc(db,'users',user.uid);
    const snapshot = await getDoc(ref);
    const base = { uid:user.uid, name:user.displayName||null, email:user.email||null, photoURL:user.photoURL||null, provider:user.providerData && user.providerData[0] && user.providerData[0].providerId || null, createdAt: snapshot.exists() ? snapshot.data().createdAt : new Date().toISOString() };
    await setDoc(ref, { ...base, ...extra }, { merge:true });
  }catch(e){ console.warn('upsertUserProfile', e); }
}

/* ========================
   Handle sign-in unified
   ======================== */
async function handleSignIn(user, anonymous=false){
  if (!user) return;
  saveLocalUser(user);
  try{ await upsertUserProfile(user, anonymous?{anonymous:true}:{}) }catch(e){}
  updateHeaderSafe(user);
  hideAuthOverlay();
  // redirect to cuenta if on index
  const path = location.pathname;
  if (path === '/' || path.endsWith('/index.html')) location.href = 'cuenta.html';
}

/* ========================
   Header + account UI (minimal)
   ======================== */
function ensureHeader(){
  if ($id('lixbyHeader')) return $id('lixbyHeader');
  injectCSS();
  const header = document.createElement('div'); header.id = 'lixbyHeader'; header.className = 'lixby-header';
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="font-weight:700;font-size:1.05rem;">LIXBY</div>
    </div>
    <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
      <button id="lixbyAccountBtn" class="lixby-btn">Cuenta</button>
    </div>
  `;
  document.body.prepend(header);
  $id('lixbyAccountBtn').addEventListener('click', ()=> showAuthOverlay());
  return header;
}

function updateHeaderSafe(user){
  ensureHeader();
  // remove existing holder
  const prev = $id('lixbyAccountHolder'); if (prev) prev.remove();
  if (!user){ return; }
  const holder = document.createElement('div'); holder.id = 'lixbyAccountHolder'; holder.className = 'lixby-header';
  const name = escapeHtml(user.displayName || (user.email? user.email.split('@')[0] : 'Usuario'));
  const photo = user.photoURL ? escapeHtml(user.photoURL) : `https://via.placeholder.com/64x64?text=${encodeURIComponent(name.charAt(0)||'U')}`;
  holder.innerHTML = `
    <img class="lixby-avatar" src="${photo}" alt="avatar">
    <div style="display:flex;flex-direction:column;align-items:flex-end;">
      <div class="lixby-name">${name}</div>
      <div style="display:flex;gap:8px;margin-top:6px;">
        <button id="lixbyViewAccount" class="lixby-btn">Mi cuenta</button>
        <button id="lixbySignOut" class="lixby-btn">Cerrar sesión</button>
      </div>
    </div>
  `;
  const header = $id('lixbyHeader'); header.appendChild(holder);
  $id('lixbyViewAccount').addEventListener('click', ()=> { location.href='cuenta.html'; });
  $id('lixbySignOut').addEventListener('click', async ()=>{ try{ await fbSignOut(auth); clearLocalUser(); location.href='index.html'; }catch(e){ console.warn(e); } });
}

/* ========================
   Account panel (safe render)
   ======================== */
async function renderAccountPageIfNeeded(user){
  const isCuenta = location.pathname.endsWith('cuenta.html') || !!$id('accountPanel');
  if (!isCuenta) return;
  const main = document.querySelector('main') || document.body;
  let target = $id('accountPanel'); if (!target){ target = document.createElement('div'); target.id='accountPanel'; main.prepend(target); }
  // load profile from firestore if logged
  let profile = {};
  if (user && user.uid){
    try{ const snap = await getDoc(doc(db,'users',user.uid)); if (snap.exists()){ const d = snap.data(); profile = d.profile || { firstName: d.name? d.name.split(' ')[0] : '', lastName:'', dob: d.dob || '' }; } }
    catch(e){ console.warn('load profile', e); }
  } else {
    profile = safeJSONParse(localStorage.getItem('lixby_user')) || {};
  }
  const fn = escapeHtml(profile.firstName||profile.name||'');
  const ln = escapeHtml(profile.lastName||'');
  const dob = escapeHtml(profile.dob||'');
  target.innerHTML = '';
  const panel = document.createElement('div'); panel.className='lixby-glass'; panel.style.padding='18px'; panel.style.maxWidth='880px'; panel.style.margin='28px auto';
  panel.innerHTML = `
    <div style="display:flex;gap:16px;align-items:flex-start;">
      <div style="flex:0 0 84px;"><div class="lixby-avatar" style="width:84px;height:84px;border-radius:12px">${(fn||'U').charAt(0).toUpperCase()}</div></div>
      <div style="flex:1">
        <h2>Mi cuenta</h2>
        <div style="display:flex;gap:10px;margin-top:6px;"><input id="pf_firstName" placeholder="Nombre" class="lixby-input" value="${fn}"><input id="pf_lastName" placeholder="Apellidos" class="lixby-input" value="${ln}"></div>
        <div style="margin-top:10px;"><input id="pf_dob" type="date" class="lixby-input" value="${dob}"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;"><button id="btnSaveProfile" class="lixby-btn">Guardar</button><button id="btnCancelProfile" class="lixby-btn">Cancelar</button></div>
        <div id="profileMsg" class="lixby-small"></div>
      </div>
    </div>
  `;
  target.appendChild(panel);
  $id('btnCancelProfile').addEventListener('click', ()=> location.reload());
  $id('btnSaveProfile').addEventListener('click', async ()=>{
    const firstName = ($id('pf_firstName')||{}).value || '';
    const lastName = ($id('pf_lastName')||{}).value || '';
    const dobVal = ($id('pf_dob')||{}).value || '';
    const msg = $id('profileMsg'); if (msg) msg.textContent='Guardando...';
    try{ if (!window.appAuth || typeof window.appAuth.updateProfileExtra !== 'function') throw new Error('updateProfileExtra no disponible'); await window.appAuth.updateProfileExtra({ firstName, lastName, dob: dobVal }); if (msg) msg.textContent='Guardado ✔';
      // update local header
      const local = safeJSONParse(localStorage.getItem('lixby_user')) || {}; local.firstName = firstName || local.firstName; local.lastName = lastName || local.lastName; local.dob = dobVal || local.dob; try{ localStorage.setItem('lixby_user', JSON.stringify(local)); }catch(e){}
      updateHeaderSafe({ displayName: (firstName ? (firstName + (lastName? ' '+lastName:'')) : local.name), email: local.email, photoURL: local.photoURL });
    }catch(e){ console.error('save profile', e); if (msg) msg.textContent='Error al guardar. Revisa consola.'; }
  });
}

/* ========================
   OAUTH helpers
   ======================== */
function oauthErrorHandler(err, providerName){ console.error(`${providerName} sign-in error`, err); const code = err && err.code; if (code === 'auth/unauthorized-domain') alert('Dominio no autorizado para OAuth. Añádelo en Firebase Console.'); else if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') alert('Popup bloqueado o cerrado. Permite ventanas emergentes.'); else alert(err && err.message ? err.message : String(err)); }
async function doPopupSignIn(provider, providerName){ try{ const res = await signInWithPopup(auth, provider); handleSignIn(res.user); window.dispatchEvent(new CustomEvent('lixby:auth:signin',{ detail: { uid: res.user.uid, provider: providerName } })); return res.user; }catch(err){ oauthErrorHandler(err, providerName); throw err; } }

/* ========================
   Public API
   ======================== */
window.appAuth = {
  signInWithGoogle: () => doPopupSignIn(googleProvider,'Google'),
  signInWithGitHub: () => doPopupSignIn(githubProvider,'GitHub'),
  signInWithEmail: async (email,password)=>{ if(!email||!password) throw new Error('email+password required'); const res = await signInWithEmailAndPassword(auth,email,password); saveLocalUser(res.user); await upsertUserProfile(res.user); updateHeaderSafe(res.user); return res.user; },
  createUserWithEmail: async (email,password)=>{ if(!email||!password) throw new Error('email+password required'); const res = await createUserWithEmailAndPassword(auth,email,password); saveLocalUser(res.user); await upsertUserProfile(res.user); updateHeaderSafe(res.user); return res.user; },
  signInAnonymously: async ()=>{ const res = await signInAnonymously(auth); saveLocalUser(res.user); await upsertUserProfile(res.user,{anonymous:true}); updateHeaderSafe({ uid: res.user.uid, displayName:'Invitado', email:'', photoURL:''}); return res.user; },
  signOut: async ()=>{ try{ await fbSignOut(auth); }catch(e){ console.warn(e); } try{ localStorage.removeItem('lixby_seen_welcome'); localStorage.removeItem('lixby_user'); }catch(e){} try{ location.href='index.html'; }catch(e){} },
  onAuthState: (cb)=>{ if(typeof cb!=='function') return ()=>{}; const unsub = onAuthStateChanged(auth,(u)=>{ cb(u ? { uid:u.uid, name:u.displayName || (u.email? u.email.split('@')[0] : null), email:u.email, photoURL:u.photoURL } : null); }); return unsub; },
  updateProfileExtra: async (extra={})=>{
    const u = auth.currentUser; if(!u) throw new Error('No authenticated user'); try{ const ref = doc(db,'users',u.uid); await setDoc(ref,{ profile: extra, updatedAt: new Date().toISOString() },{ merge:true }); // persist local snapshot
      try{ const raw = localStorage.getItem('lixby_user'); const local = raw? JSON.parse(raw): {}; local.firstName = extra.firstName || local.firstName; local.lastName = extra.lastName || local.lastName; local.dob = extra.dob || local.dob; localStorage.setItem('lixby_user', JSON.stringify(local)); }catch(e){}
      return true; }catch(e){ console.error('updateProfileExtra err', e); throw e; }
  },
  _rawAuth: auth
};

/* ========================
   Sync / init UI
   ======================== */
function init(){ createAuthOverlay(); ensureHeader(); // subscribe
  onAuthStateChanged(auth, async (user)=>{
    if (user){ try{ saveLocalUser(user); updateHeaderSafe(user); await renderAccountPageIfNeeded(user); window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ uid:user.uid, signedIn:true } })); }catch(e){ console.warn(e); } }
    else{ clearLocalUser(); updateHeaderSafe(null); const shouldShow = !localStorage.getItem('lixby_seen_welcome'); if (shouldShow) setTimeout(()=> showAuthOverlay(), 300); window.dispatchEvent(new CustomEvent('lixby:auth:changed',{ detail:{ signedIn:false } })); }
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

export {}; // module

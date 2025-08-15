// auth-firebase.js  (coloca en la raíz, cargar como <script type="module" src="auth-firebase.js">)
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
  signOut
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

// --- TU CONFIG (usa la que generaste en Firebase) ---
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

// UI elements (defensivo: verifica existencia)
const overlay = document.getElementById('authOverlay');
const authBackdrop = document.getElementById('authBackdrop');
const authClose = document.getElementById('authClose');
const btnGoogle = document.getElementById('btnGoogle');
const btnGitHub = document.getElementById('btnGitHub');
const btnEmailSignIn = document.getElementById('btnEmailSignIn');
const btnEmailSignUp = document.getElementById('btnEmailSignUp');
const btnAnonymous = document.getElementById('btnAnonymous');
const emailInput = document.getElementById('authEmail');
const passInput = document.getElementById('authPass');
const accountBtn = document.getElementById('accountBtn');

// helpers
function shouldShowWelcome() { try { return !localStorage.getItem('lixby_seen_welcome'); } catch(e){ return true; } }
function hideWelcomePermanently(){ try { localStorage.setItem('lixby_seen_welcome','1'); } catch(e){} }
function moveFocusOut(){ try{ if(document.activeElement && typeof document.activeElement.blur==='function') document.activeElement.blur(); }catch(e){}; }

function showAuthOverlay(){
  if(!overlay) return;
  overlay.style.display = 'block';
  overlay.setAttribute('aria-hidden','false');
  document.documentElement.style.overflow = 'hidden';
  setTimeout(()=> authClose && authClose.focus(), 60);
}
function hideAuthOverlay(){
  if(!overlay) return;
  moveFocusOut();
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden','true');
  document.documentElement.style.overflow = '';
  setTimeout(()=> { try{ accountBtn && accountBtn.focus(); }catch(e){} }, 30);
}

// save local minimal snapshot
function saveLocalUser(user){
  if(!user){ localStorage.removeItem('lixby_user'); return; }
  const u = { uid: user.uid, name: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario'), email: user.email||'', photoURL: user.photoURL||'' };
  try { localStorage.setItem('lixby_user', JSON.stringify(u)); } catch(e){ console.warn(e); }
}

// upsert user doc in Firestore (non-blocking errors)
async function upsertUserProfile(user, extra = {}){
  if(!user || !user.uid) return;
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
  } catch(e){
    console.warn('upsertUserProfile error', e);
  }
}

// event wiring (defensivo)
if (accountBtn) accountBtn.addEventListener('click', (e)=> { e.preventDefault(); showAuthOverlay(); });
if (authClose) authClose.addEventListener('click', ()=> { hideAuthOverlay(); hideWelcomePermanently(); });
if (authBackdrop) authBackdrop.addEventListener('click', ()=> { hideAuthOverlay(); hideWelcomePermanently(); });

// ESC to close
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay && overlay.getAttribute('aria-hidden') === 'false') { hideAuthOverlay(); } });

// signIn helpers with clearer error messages
async function doPopupSignIn(provider, name) {
  try {
    const res = await signInWithPopup(auth, provider);
    saveLocalUser(res.user);
    await upsertUserProfile(res.user);
    hideAuthOverlay();
    // redirect if you want: window.location.href = 'cuenta.html';
  } catch(err) {
    console.error(name + ' sign-in', err);
    if (err && err.code === 'auth/unauthorized-domain') {
      alert('Error: dominio no autorizado para OAuth. Añade tu dominio en Firebase Console → Authentication → Authorized domains (ej: fabiinformatic.github.io).');
    } else {
      alert(err.message || String(err));
    }
  }
}

if (btnGoogle) btnGoogle.addEventListener('click', ()=> doPopupSignIn(googleProvider,'Google'));
if (btnGitHub) btnGitHub.addEventListener('click', ()=> doPopupSignIn(githubProvider,'GitHub'));

if (btnEmailSignIn) btnEmailSignIn.addEventListener('click', async ()=>{
  const email = (emailInput && emailInput.value||'').trim();
  const pass = (passInput && passInput.value||'').trim();
  if(!email || !pass) return alert('Introduce email y contraseña');
  try {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    saveLocalUser(res.user);
    await upsertUserProfile(res.user);
    hideAuthOverlay();
  } catch(err){
    console.error('email sign-in', err);
    if (err && err.code === 'auth/user-not-found') {
      if (confirm('Cuenta no encontrada. ¿Deseas crearla con esas credenciales?')) {
        try {
          const reg = await createUserWithEmailAndPassword(auth, email, pass);
          saveLocalUser(reg.user);
          await upsertUserProfile(reg.user);
          hideAuthOverlay();
        } catch(e2){ console.error('Registro falló', e2); alert(e2.message || String(e2)); }
      }
    } else {
      alert(err.message || String(err));
    }
  }
});

if (btnEmailSignUp) btnEmailSignUp.addEventListener('click', async ()=>{
  const email = (emailInput && emailInput.value||'').trim();
  const pass = (passInput && passInput.value||'').trim();
  if(!email || !pass) return alert('Introduce email y contraseña');
  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    saveLocalUser(res.user);
    await upsertUserProfile(res.user);
    hideAuthOverlay();
  } catch(err){ console.error('email signup', err); alert(err.message || String(err)); }
});

if (btnAnonymous) btnAnonymous.addEventListener('click', async ()=>{
  try {
    const res = await signInAnonymously(auth);
    saveLocalUser(res.user);
    await upsertUserProfile(res.user, { anonymous: true });
    hideAuthOverlay();
  } catch(err){
    console.error('anonymous sign-in', err);
    if (err && err.code === 'auth/admin-restricted-operation') {
      alert('El inicio como invitado no está habilitado. Habilítalo en Firebase Console → Authentication → Sign-in method → Anonymous.');
    } else {
      alert(err.message || String(err));
    }
  }
});

// sync auth state -> header / storage
onAuthStateChanged(auth, (user) => {
  if (user) {
    saveLocalUser(user);
    const brand = document.querySelector('.brand');
    if (brand) {
      if (user.email) brand.textContent = user.email.split('@')[0];
      else if (user.displayName) brand.textContent = user.displayName.split(' ')[0];
      else if (user.isAnonymous) brand.textContent = 'Invitado';
    }
  } else {
    localStorage.removeItem('lixby_user');
    if (shouldShowWelcome()) setTimeout(()=> showAuthOverlay(), 300);
  }
});

// expose small API
window.appAuth = {
  signInWithGoogle: ()=> doPopupSignIn(googleProvider,'Google'),
  signInWithGitHub: ()=> doPopupSignIn(githubProvider,'GitHub'),
  signInWithEmail: (e,p)=> (btnEmailSignIn ? btnEmailSignIn.click() : null),
  signOut: async ()=> { try{ await signOut(auth); localStorage.removeItem('lixby_seen_welcome'); location.href='index.html'; } catch(e){ console.warn(e);} },
  onAuthState: (cb)=> onAuthStateChanged(auth, (u)=> cb(u? { uid:u.uid, name:u.displayName||u.email||'Usuario', email:u.email, photoURL:u.photoURL }: null) ),
  _rawAuth: auth
};

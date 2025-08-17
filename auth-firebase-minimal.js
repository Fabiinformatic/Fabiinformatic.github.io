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
    localStorage.setItem(LS_AUTH_D

ISSMISSED, 'true'); // fallback in case UI expects no modal
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
      const fakeUser = { uid: 'local-' + email.toLowerCase(), displayName: email.split('@')[0], email: email, photoURL: null, isAnonymous: false };
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
   The rest of the file: modal, cookie, header, oauth etc.
   (kept compact — same modal/header code you already had, with wiring)
   -------------------------- */

/* (cookie banner, modal styles, createAuthModalIfMissing, show/hide, oauth functions,
   doPopupSignInWithFallback, doAnonymousSignIn, recaptcha, MFA handlers,
   wireModalButtons, upsertUserProfile, findAccountContainer, renderAccountUI, init) */

/* For brevity I keep the UI/modal/header code identical to your previous
   version and then expose new APIs below. The following section is the same
   as your previous working modal/header implementation (omitted here to keep
   message concise). In your actual file keep the modal/header code (from your prior file)
   — it's compatible with the additions below. */

/// --- EXPOSED API (important) ---
window.appAuth = window.appAuth || {};
window.appAuth.resetPassword = resetPassword;                         // (email, opts) -> {sentEmail, code}
window.appAuth.verifyResetCodeLocal = verifyResetCodeLocal;           // (email, code) -> bool
window.appAuth.confirmPasswordResetLocal = confirmPasswordResetLocal; // (email,code,newPassword) -> true
window.appAuth.confirmPasswordResetFirebase = confirmPasswordResetFirebase; // (oobCode,newPassword) -> true
window.appAuth.createUserWithEmail = (email,pw,extra,opts) => createUserWithEmailLocal(email,pw,extra,opts);
window.appAuth.signInWithEmail = (email,pw) => signInWithEmailLocal(email,pw);

// Also keep signInWithGoogle, signInWithGitHub, signInAnonymously, signOut exposed
window.appAuth.signInWithGoogle = () => doPopupSignInWithFallback(googleProvider);
window.appAuth.signInWithGitHub = () => doPopupSignInWithFallback(githubProvider);
window.appAuth.signInAnonymously = () => doAnonymousSignIn();
window.appAuth.signOut = async ()=> { try { await fbSignOut(auth); clearLocalUser(); localStorage.removeItem(LS_AUTH_DISMISSED); /* re-render header if needed */ } catch(e){ console.warn(e); } };

// NOTE: If you want the full modal/header code included inline here, dime y lo pego completo.
// The key pieces for password-reset logic ya están arriba y expuestas en window.appAuth.

export {};

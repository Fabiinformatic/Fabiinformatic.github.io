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
  signOut as fbSignOut
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

// --- CONFIG: usa la que generaste en Firebase ---
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

// Helper: selector perezoso
const $ = (id) => document.getElementById(id);

// UX / storage helpers
function shouldShowWelcome() {
  try { return !localStorage.getItem('lixby_seen_welcome'); } catch (e) { return true; }
}
function hideWelcomePermanently() {
  try { localStorage.setItem('lixby_seen_welcome', '1'); } catch (e) {}
}
function saveLocalUser(user) {
  if (!user) { localStorage.removeItem('lixby_user'); return; }
  const u = {
    uid: user.uid,
    name: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario'),
    email: user.email || '',
    photoURL: user.photoURL || ''
  };
  try { localStorage.setItem('lixby_user', JSON.stringify(u)); } catch (e) { console.warn(e); }
}

// Upsert user doc (no bloquear UI si falla)
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

// Mostrar/ocultar overlay de forma segura
function showAuthOverlay() {
  const overlay = $('authOverlay');
  const authClose = $('authClose');
  if (!overlay) return;
  overlay.style.display = 'block';
  overlay.setAttribute('aria-hidden', 'false');
  document.documentElement.style.overflow = 'hidden';
  setTimeout(() => { try { authClose && authClose.focus(); } catch (e) {} }, 60);
}
function hideAuthOverlay() {
  const overlay = $('authOverlay');
  const accountBtn = $('accountBtn');
  if (!overlay) return;
  try { if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur(); } catch(e) {}
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  document.documentElement.style.overflow = '';
  setTimeout(() => { try { accountBtn && accountBtn.focus(); } catch(e) {} }, 30);
}

// Errores OAuth importantes
function oauthErrorHandler(err, providerName) {
  console.error(`${providerName} sign-in error`, err);
  if (err && err.code === 'auth/unauthorized-domain') {
    alert('Error: dominio no autorizado para OAuth. Añade tu dominio en Firebase Console → Authentication → Authorized domains (ej: fabiinformatic.github.io).');
  } else {
    alert(err && err.message ? err.message : String(err));
  }
}

// Flujos de inicio de sesión
async function doPopupSignIn(provider, providerName) {
  try {
    const res = await signInWithPopup(auth, provider);
    saveLocalUser(res.user);
    await upsertUserProfile(res.user);
    hideAuthOverlay();
    return res.user;
  } catch (err) {
    oauthErrorHandler(err, providerName);
    throw err;
  }
}

// Inicializa listeners de UI (se ejecuta en DOMContentLoaded)
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

  if (accountBtn) accountBtn.addEventListener('click', (e) => { e.preventDefault(); showAuthOverlay(); });
  if (authClose) authClose.addEventListener('click', () => { hideAuthOverlay(); hideWelcomePermanently(); });
  if (authBackdrop) authBackdrop.addEventListener('click', () => { hideAuthOverlay(); hideWelcomePermanently(); });

  if (btnGoogle) btnGoogle.addEventListener('click', () => doPopupSignIn(googleProvider, 'Google').catch(() => {}));
  if (btnGitHub) btnGitHub.addEventListener('click', () => doPopupSignIn(githubProvider, 'GitHub').catch(() => {}));

  if (btnEmailSignIn) btnEmailSignIn.addEventListener('click', async () => {
    const email = (emailInput && emailInput.value || '').trim();
    const pass = (passInput && passInput.value || '').trim();
    if (!email || !pass) return alert('Introduce email y contraseña');
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      saveLocalUser(res.user);
      await upsertUserProfile(res.user);
      hideAuthOverlay();
    } catch (err) {
      console.error('email sign-in', err);
      const code = err && err.code;
      if (code === 'auth/user-not-found') {
        if (confirm('Cuenta no encontrada. ¿Deseas crearla con esas credenciales?')) {
          try {
            const reg = await createUserWithEmailAndPassword(auth, email, pass);
            saveLocalUser(reg.user);
            await upsertUserProfile(reg.user);
            hideAuthOverlay();
          } catch (regErr) {
            console.error('Registro falló', regErr);
            alert(regErr && regErr.message ? regErr.message : String(regErr));
          }
        }
      } else {
        alert(err && err.message ? err.message : String(err));
      }
    }
  });

  if (btnEmailSignUp) btnEmailSignUp.addEventListener('click', async () => {
    const email = (emailInput && emailInput.value || '').trim();
    const pass = (passInput && passInput.value || '').trim();
    if (!email || !pass) return alert('Introduce email y contraseña');
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      saveLocalUser(res.user);
      await upsertUserProfile(res.user);
      hideAuthOverlay();
    } catch (err) {
      console.error('email signup', err);
      alert(err && err.message ? err.message : String(err));
    }
  });

  if (btnAnonymous) btnAnonymous.addEventListener('click', async () => {
    try {
      const res = await signInAnonymously(auth);
      saveLocalUser(res.user);
      await upsertUserProfile(res.user, { anonymous: true });
      hideAuthOverlay();
    } catch (err) {
      console.error('anonymous sign-in', err);
      if (err && err.code === 'auth/admin-restricted-operation') {
        alert('El inicio como invitado no está habilitado. Habilítalo en Firebase Console → Authentication → Sign-in method → Anonymous.');
      } else {
        alert(err && err.message ? err.message : String(err));
      }
    }
  });

  // ESC para cerrar
  document.addEventListener('keydown', (e) => {
    const overlayEl = $('authOverlay');
    if (e.key === 'Escape' && overlayEl && overlayEl.getAttribute('aria-hidden') === 'false') hideAuthOverlay();
  });
}

// Sync auth state -> header + storage
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
    if (shouldShowWelcome()) {
      // espera DOM ready para no mostrar overlay antes de que exista
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(showAuthOverlay, 300));
      } else {
        setTimeout(showAuthOverlay, 300);
      }
    }
  }
});

// API público
window.appAuth = {
  signInWithGoogle: () => doPopupSignIn(googleProvider, 'Google'),
  signInWithGitHub: () => doPopupSignIn(githubProvider, 'GitHub'),
  signInWithEmail: async (email, password) => {
    if (!email || !password) throw new Error('email+password required');
    const res = await signInWithEmailAndPassword(auth, email, password);
    saveLocalUser(res.user);
    await upsertUserProfile(res.user);
    return res.user;
  },
  createUserWithEmail: async (email, password) => {
    if (!email || !password) throw new Error('email+password required');
    const res = await createUserWithEmailAndPassword(auth, email, password);
    saveLocalUser(res.user);
    await upsertUserProfile(res.user);
    return res.user;
  },
  signInAnonymously: async () => {
    const res = await signInAnonymously(auth);
    saveLocalUser(res.user);
    await upsertUserProfile(res.user, { anonymous: true });
    return res.user;
  },
  signOut: async () => {
    try { await fbSignOut(auth); } catch (e) { console.warn(e); }
    localStorage.removeItem('lixby_seen_welcome');
    localStorage.removeItem('lixby_user');
    try { location.href = 'index.html'; } catch (e) {}
  },
  onAuthState: (cb) => onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, name: u.displayName || u.email || 'Usuario', email: u.email, photoURL: u.photoURL } : null)),
  _rawAuth: auth
};

// Inicializa listeners de UI cuando DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthUI);
} else {
  initAuthUI();
}

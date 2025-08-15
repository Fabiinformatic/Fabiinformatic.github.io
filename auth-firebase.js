// auth-firebase.js  (pegar en /auth-firebase.js o insertar como <script type="module">)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

/*
  REEMPLAZA ESTE OBJETO CON TU CONFIG DE FIREBASE (lo copias desde Project settings -> General -> Your apps -> SDK snippet)
  Ejemplo de campos: apiKey, authDomain, projectId, appId, etc.
*/
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  appId: "TU_APP_ID",
  // ... otros campos si existieran
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const providerGoogle = new GoogleAuthProvider();
const providerGitHub = new GithubAuthProvider();

// Helper: store minimal user snapshot in localStorage (no tokens)
function saveLocalUser(user) {
  if (!user) { localStorage.removeItem('lixby_user'); return; }
  const u = {
    uid: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Usuario',
    email: user.email || '',
    photoURL: user.photoURL || '',
  };
  localStorage.setItem('lixby_user', JSON.stringify(u));
}

// Expose appAuth API (usado por el modal y la página de cuenta)
window.appAuth = {
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, providerGoogle);
      saveLocalUser(result.user);
      // close modal if exists
      const w = document.getElementById('welcomeOverlay');
      if (w) { w.classList.remove('show'); w.setAttribute('aria-hidden','true'); }
      // redirect to account page
      window.location.href = 'cuenta.html';
    } catch (err) {
      console.error('Google sign-in error', err);
      alert('Error al iniciar sesión con Google: ' + (err.message || err));
    }
  },

  signInWithGitHub: async () => {
    try {
      const result = await signInWithPopup(auth, providerGitHub);
      saveLocalUser(result.user);
      const w = document.getElementById('welcomeOverlay');
      if (w) { w.classList.remove('show'); w.setAttribute('aria-hidden','true'); }
      window.location.href = 'cuenta.html';
    } catch (err) {
      console.error('GitHub sign-in error', err);
      alert('Error al iniciar sesión con GitHub: ' + (err.message || err));
    }
  },

  signInWithEmail: async (email, password) => {
    try {
      // intenta iniciar sesión
      await signInWithEmailAndPassword(auth, email, password);
      const u = auth.currentUser;
      saveLocalUser(u);
      const w = document.getElementById('welcomeOverlay');
      if (w) { w.classList.remove('show'); w.setAttribute('aria-hidden','true'); }
      window.location.href = 'cuenta.html';
    } catch (err) {
      // si no existe, intentamos crear cuenta (UX simple)
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          saveLocalUser(cred.user);
          const w = document.getElementById('welcomeOverlay');
          if (w) { w.classList.remove('show'); w.setAttribute('aria-hidden','true'); }
          window.location.href = 'cuenta.html';
        } catch (err2) {
          console.error('Registro falló', err2);
          alert('No se pudo registrar: ' + (err2.message || err2));
        }
      } else {
        console.error('Email sign-in error', err);
        alert('Error al iniciar sesión: ' + (err.message || err));
      }
    }
  },

  signOut: async () => {
    try {
      await fbSignOut(auth);
    } catch(e) {
      console.warn('Firebase signOut error', e);
    }
    localStorage.removeItem('lixby_user');
    // optionally clean other session keys
    window.location.href = 'index.html';
  },

  onAuthState: (cb) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const u = { uid: user.uid, name: user.displayName || user.email.split('@')[0], email: user.email, photoURL: user.photoURL };
        saveLocalUser(user);
        cb(u);
      } else {
        localStorage.removeItem('lixby_user');
        cb(null);
      }
    });
  },

  // for debugging
  _rawAuth: auth
};

// Sync: si el usuario ya tiene sesión en Firebase guarda el snapshot local
onAuthStateChanged(auth, (user) => { if (user) saveLocalUser(user); });

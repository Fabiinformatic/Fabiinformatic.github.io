// auth-firebase.js  (pegar en /auth-firebase.js o insertar como <script type="module">)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

/*
  REEMPLAZA ESTE OBJETO CON TU CONFIG DE FIREBASE (Project settings -> General -> Your apps -> SDK snippet)
  Ejemplo de campos: apiKey, authDomain, projectId, appId, measurementId, etc.
*/
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  appId: "TU_APP_ID",
  // ... otros campos si los tienes
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const providerGoogle = new GoogleAuthProvider();
const providerGitHub = new GithubAuthProvider();

// Helper: guarda snapshot público y mínimo en localStorage (no guardes tokens)
function saveLocalUser(user) {
  if (!user) {
    localStorage.removeItem('lixby_user');
    return;
  }
  const u = {
    uid: user.uid,
    name: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario'),
    email: user.email || '',
    photoURL: user.photoURL || ''
  };
  try {
    localStorage.setItem('lixby_user', JSON.stringify(u));
  } catch (e) {
    console.warn('No se pudo guardar local user', e);
  }
}

// Cerrar modal welcome si existe
function closeWelcomeOverlay() {
  const w = document.getElementById('welcomeOverlay');
  if (w) {
    w.classList.remove('show');
    w.setAttribute('aria-hidden', 'true');
  }
}

// Expose appAuth API (usado por modal y cuenta.html)
window.appAuth = {
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, providerGoogle);
      saveLocalUser(result.user);
      closeWelcomeOverlay();
      window.location.href = 'cuenta.html';
      return true;
    } catch (err) {
      console.error('Google sign-in error', err);
      alert('Error al iniciar sesión con Google: ' + (err?.message || err));
      return false;
    }
  },

  signInWithGitHub: async () => {
    try {
      const result = await signInWithPopup(auth, providerGitHub);
      saveLocalUser(result.user);
      closeWelcomeOverlay();
      window.location.href = 'cuenta.html';
      return true;
    } catch (err) {
      console.error('GitHub sign-in error', err);
      alert('Error al iniciar sesión con GitHub: ' + (err?.message || err));
      return false;
    }
  },

  /**
   * signInWithEmail(email, password)
   * - intenta iniciar sesión
   * - si user-not-found => crea nueva cuenta automáticamente
   * - si wrong-password => informa al usuario
   */
  signInWithEmail: async (email, password) => {
    if (!email || !password) {
      alert('Introduce correo y contraseña.');
      return false;
    }

    try {
      // intenta iniciar sesión
      await signInWithEmailAndPassword(auth, email, password);
      const u = auth.currentUser;
      if (u) saveLocalUser(u);
      closeWelcomeOverlay();
      window.location.href = 'cuenta.html';
      return true;
    } catch (err) {
      console.warn('signInWithEmail error', err);
      const code = err?.code || '';

      if (code === 'auth/user-not-found') {
        // Opcional: confirmar al usuario si quiere crear cuenta
        const crear = confirm('No existe una cuenta con ese correo. ¿Deseas crear una cuenta con esas credenciales?');
        if (!crear) return false;
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          saveLocalUser(cred.user);
          closeWelcomeOverlay();
          window.location.href = 'cuenta.html';
          return true;
        } catch (err2) {
          console.error('Registro falló', err2);
          alert('No se pudo registrar: ' + (err2?.message || err2));
          return false;
        }
      } else if (code === 'auth/wrong-password') {
        alert('Contraseña incorrecta. Si no recuerdas tu contraseña, utiliza "Olvidé mi contraseña".');
        return false;
      } else if (code === 'auth/invalid-email') {
        alert('Correo no válido. Revisa el formato.');
        return false;
      } else {
        alert('Error al iniciar sesión: ' + (err?.message || err));
        return false;
      }
    }
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase signOut error', e);
    }
    localStorage.removeItem('lixby_user');
    // limpia llaves adicionales si las usas
    // localStorage.removeItem('otra_llave');
    window.location.href = 'index.html';
  },

  onAuthState: (cb) => {
    // cb recibe usuario normalizado o null
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const u = {
          uid: user.uid,
          name: user.displayName || (user.email ? user.email.split('@')[0] : ''),
          email: user.email || '',
          photoURL: user.photoURL || ''
        };
        saveLocalUser(user);
        try { cb(u); } catch (e) { console.error('onAuthState cb error', e); }
      } else {
        localStorage.removeItem('lixby_user');
        try { cb(null); } catch (e) { console.error('onAuthState cb error', e); }
      }
    });
  },

  // debugging / advanced
  _rawAuth: auth
};

// Si ya hay sesión al cargar la página sincronizamos snapshot local
onAuthStateChanged(auth, (user) => {
  if (user) saveLocalUser(user);
});

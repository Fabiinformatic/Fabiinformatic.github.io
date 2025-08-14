// Configuración de Firebase
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROJECT_ID.firebaseapp.com",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_PROJECT_ID.appspot.com",
    messagingSenderId: "TU_MESSAGING_ID",
    appId: "TU_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Elementos del DOM
const firstTime = document.getElementById('first-time');
const loginForm = document.getElementById('login-form');
const userInfo = document.getElementById('user-info');
const userName = document.getElementById('user-name');

const guestBtn = document.getElementById('guest-btn');
const loginBtn = document.getElementById('login-btn');
const emailSignup = document.getElementById('email-signup');
const emailLogin = document.getElementById('email-login');
const googleLogin = document.getElementById('google-login');
const githubLogin = document.getElementById('github-login');
const logoutBtn = document.getElementById('logout-btn');

// Función mostrar usuario
function showUser(user) {
    firstTime.style.display = 'none';
    loginForm.style.display = 'none';
    userInfo.style.display = 'block';
    userName.textContent = user.displayName || user.email || "Invitado";
}

// Función logout
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        userInfo.style.display = 'none';
        firstTime.style.display = 'block';
    });
});

// Entrar como invitado
guestBtn.addEventListener('click', () => {
    auth.signInAnonymously()
        .then((userCredential) => showUser(userCredential.user))
        .catch((error) => console.log(error.message));
});

// Mostrar login/registro
loginBtn.addEventListener('click', () => {
    firstTime.style.display = 'none';
    loginForm.style.display = 'block';
});

// Crear cuenta con correo
emailSignup.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => showUser(userCredential.user))
        .catch((error) => alert(error.message));
});

// Login con correo
emailLogin.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => showUser(userCredential.user))
        .catch((error) => alert(error.message));
});

// Login con Google
googleLogin.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => showUser(result.user))
        .catch((error) => alert(error.message));
});

// Login con GitHub
githubLogin.addEventListener('click', () => {
    const provider = new firebase.auth.GithubAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => showUser(result.user))
        .catch((error) => alert(error.message));
});

// Detectar si ya está logueado
auth.onAuthStateChanged(user => {
    if(user) {
        showUser(user);
    }
});

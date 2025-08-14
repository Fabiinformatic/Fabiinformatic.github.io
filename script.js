// CONFIGURACIÓN FIREBASE
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

// ELEMENTOS DEL DOM
const authModal = document.getElementById('auth-modal');
const loginBtnHeader = document.getElementById('login-btn-header');
const closeModal = document.querySelector('.close');
const emailSignup = document.getElementById('email-signup');
const emailLogin = document.getElementById('email-login');
const googleLogin = document.getElementById('google-login');
const githubLogin = document.getElementById('github-login');
const guestBtn = document.getElementById('guest-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const userName = document.getElementById('user-name');

// MOSTRAR MODAL
loginBtnHeader.addEventListener('click', () => {
    authModal.style.display = 'block';
});
closeModal.addEventListener('click', () => {
    authModal.style.display = 'none';
});
window.addEventListener('click', (e) => {
    if (e.target == authModal) authModal.style.display = 'none';
});

// FUNCIONES AUTH
function showUser(user){
    userInfo.style.display = 'block';
    authModal.style.display = 'none';
    userName.textContent = user.displayName || user.email || "Invitado";
}

// CREAR CUENTA CON EMAIL
emailSignup.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => showUser(userCredential.user))
        .catch(error => alert(error.message));
});

// LOGIN CON EMAIL
emailLogin.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => showUser(userCredential.user))
        .catch(error => alert(error.message));
});

// LOGIN CON GOOGLE
googleLogin.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(result => showUser(result.user))
        .catch(error => alert(error.message));
});

// LOGIN CON GITHUB
githubLogin.addEventListener('click', () => {
    const provider = new firebase.auth.GithubAuthProvider();
    auth.signInWithPopup(provider)
        .then(result => showUser(result.user))
        .catch(error => alert(error.message));
});

// ENTRAR COMO INVITADO
guestBtn.addEventListener('click', () => {
    auth.signInAnonymously()
        .then(userCredential => showUser(userCredential.user))
        .catch(error => alert(error.message));
});

// CERRAR SESIÓN
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        userInfo.style.display = 'none';
    });
});

// DETECTAR SESIÓN ACTIVA
auth.onAuthStateChanged(user => {
    if(user) showUser(user);
});

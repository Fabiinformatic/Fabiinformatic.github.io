// Firebase
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_AUTH_DOMAIN",
    databaseURL: "https://controlando-los-cielos-b-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_STORAGE_BUCKET",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Modal
window.addEventListener('load', () => {
    const modal = document.getElementById('welcomeModal');
    if(!localStorage.getItem('visited')) {
        modal.style.display = 'flex';
        localStorage.setItem('visited', 'true');
    }
});
function closeModal() {
    document.getElementById('welcomeModal').style.display = 'none';
}

// Formulario
document.getElementById('sendBtn').addEventListener('click', () => {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    const successMsg = document.getElementById('successMsg');

    if(name === '' || email === '' || message === '') {
        alert('Todos los campos son obligatorios');
        return;
    }

    const newContact = database.ref('contactos').push();
    newContact.set({ name, email, message, timestamp: Date.now() })
        .then(() => {
            successMsg.textContent = '¡Gracias por tu mensaje!';
            document.getElementById('name').value = '';
            document.getElementById('email').value = '';
            document.getElementById('message').value = '';
        })
        .catch(err => alert('Error al enviar: ' + err.message));
});

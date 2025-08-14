import { initializeApp } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://TU_PROYECTO.firebaseio.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TUSENDERID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export function guardarMensaje(nombre, email, mensaje) {
  const mensajesRef = ref(db, "mensajes");
  const nuevoMensaje = push(mensajesRef);
  return set(nuevoMensaje, {
    nombre,
    email,
    mensaje,
    fecha: new Date().toISOString()
  });
}

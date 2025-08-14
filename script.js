import { guardarMensaje } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  const welcomeOverlay = document.getElementById("welcome-overlay");
  const guestBtn = document.getElementById("guest-btn");
  const mainContent = document.getElementById("main-content");
  const contactForm = document.getElementById("contact-form");
  const statusMsg = document.getElementById("form-status");

  // Entrar como invitado
  guestBtn.addEventListener("click", () => {
    welcomeOverlay.style.display = "none";
    mainContent.classList.remove("hidden");
  });

  // Formulario de contacto
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();

    if (!name || !email || !message) {
      statusMsg.style.color = "red";
      statusMsg.textContent = "Por favor completa todos los campos.";
      return;
    }

    try {
      await guardarMensaje(name, email, message);
      statusMsg.style.color = "green";
      statusMsg.textContent = "✅ Mensaje enviado correctamente.";
      contactForm.reset();
    } catch (error) {
      statusMsg.style.color = "red";
      statusMsg.textContent = "❌ Error al enviar el mensaje.";
      console.error(error);
    }
  });
});

// Espera a que cargue la página
document.addEventListener("DOMContentLoaded", () => {
  const welcomeOverlay = document.getElementById("welcomeOverlay");
  const guestBtn = document.getElementById("guestBtn");
  const loginBtn = document.getElementById("loginBtn");
  const mainContent = document.getElementById("mainContent");
  const contactForm = document.getElementById("contactForm");
  const successMessage = document.getElementById("successMessage");

  // Inicialmente oculta el contenido principal
  mainContent.classList.add("hidden");

  // Función para mostrar el contenido principal
  function showMainContent() {
    welcomeOverlay.style.display = "none";
    mainContent.classList.remove("hidden");
  }

  // Botón "Entrar como invitado"
  guestBtn.addEventListener("click", () => {
    showMainContent();
    console.log("Entraste como invitado");
  });

  // Botón "Iniciar sesión / Registrarse"
  loginBtn.addEventListener("click", () => {
    showMainContent();
    console.log("Ventana de login / registro (por implementar)");
  });

  // Enviar formulario de contacto
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    successMessage.style.display = "block";
    contactForm.reset();
    setTimeout(() => successMessage.style.display = "none", 3000);
    console.log("Formulario enviado");
  });
});

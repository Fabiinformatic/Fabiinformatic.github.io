document.addEventListener("DOMContentLoaded", () => {
  // Elementos
  const welcomeOverlay = document.getElementById("welcomeOverlay");
  const guestBtn = document.getElementById("guestBtn");
  const loginBtn = document.getElementById("loginBtn");
  const loginModal = document.getElementById("loginModal");
  const closeLogin = document.getElementById("closeLogin");
  const mainContent = document.getElementById("mainContent");

  // Ocultar contenido principal al cargar
  mainContent.classList.add("hidden");

  // Entrar como invitado
  guestBtn.addEventListener("click", () => {
    welcomeOverlay.style.display = "none";
    mainContent.classList.remove("hidden");
  });

  // Abrir ventana de login/registro
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
  });

  // Cerrar ventana de login/registro
  closeLogin.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  // Simulación de login con Google
  document.getElementById("googleLogin").addEventListener("click", () => {
    alert("Login con Google (simulado)");
    loginModal.classList.add("hidden");
    welcomeOverlay.style.display = "none";
    mainContent.classList.remove("hidden");
  });

  // Simulación de login con GitHub
  document.getElementById("githubLogin").addEventListener("click", () => {
    alert("Login con GitHub (simulado)");
    loginModal.classList.add("hidden");
    welcomeOverlay.style.display = "none";
    mainContent.classList.remove("hidden");
  });

  // Simulación de login con correo electrónico
  document.getElementById("emailLogin").addEventListener("click", () => {
    alert("Login con correo electrónico (simulado)");
    loginModal.classList.add("hidden");
    welcomeOverlay.style.display = "none";
    mainContent.classList.remove("hidden");
  });
});

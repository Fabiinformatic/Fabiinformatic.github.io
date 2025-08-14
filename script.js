// Año automático en footer
document.getElementById("year").textContent = new Date().getFullYear();

// Tema claro/oscuro
const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("light");
});

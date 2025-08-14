// Año automático en footer
document.getElementById("year").textContent = new Date().getFullYear();

// Scroll suave
document.querySelectorAll("[data-scroll-to]").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute("data-scroll-to"));
    if (target) target.scrollIntoView({ behavior: "smooth" });
  });
});

// Tema claro/oscuro
const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("light");
});

// Toast de productos
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

document.querySelectorAll(".add").forEach(btn => {
  btn.addEventListener("click", () => {
    const name = btn.getAttribute("data-name");
    showToast(`Añadido: ${name}`);
  });
});

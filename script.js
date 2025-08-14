// =====================
// script.js — LIXBY
// =====================

// Año automático en el footer
document.getElementById("year").textContent = new Date().getFullYear();

// =====================
// Scroll suave al hacer clic en los enlaces del menú
// =====================
document.querySelectorAll('header nav a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const targetId = link.getAttribute('href');
    const target = document.querySelector(targetId);
    if (target) {
      window.scrollTo({
        top: target.offsetTop - 60, // Ajusta según altura del header
        behavior: 'smooth'
      });
    }
  });
});

// =====================
// Tema claro/oscuro
// =====================
const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("light");
});

// =====================
// Animaciones al aparecer en pantalla
// =====================
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, { threshold: 0.1 });

// Observa todos los elementos con clase "reveal"
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// =====================
// Menú hamburguesa para móviles (si lo añades en HTML)
// =====================
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");

if (hamburger) {
  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    hamburger.classList.toggle("active");
  });
}

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
        top: target.offsetTop - 60,
        behavior: 'smooth'
      });
    }
  });
});

// =====================
// Tema claro/oscuro
// =====================
const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.documentElement.classList.toggle("light");
  });
}

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

// =====================
// Click en el logo para reiniciar la página
// =====================
const logo = document.querySelector(".brand");
if (logo) {
  logo.style.cursor = "pointer";
  logo.addEventListener("click", () => {
    location.reload();
  });
}

// =====================
// Efecto Apple — Tarjetas flotantes al mover el ratón
// =====================
const cards = document.querySelectorAll('.card');

cards.forEach(card => {
  card.style.transition = "transform 0.2s ease";
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const moveX = (x / rect.width - 0.5) * 10;
    const moveY = (y / rect.height - 0.5) * 10;
    card.style.transform = `translateY(-8px) rotateX(${moveY}deg) rotateY(${moveX}deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0) rotateX(0) rotateY(0)';
  });
});

// =====================
// Click en tarjetas para ir a detalle del producto
// =====================
cards.forEach(card => {
  card.addEventListener('click', () => {
    const productId = card.getAttribute('data-product');
    if (productId) {
      window.location.href = `producto.html?id=${productId}`;
    }
  });
});

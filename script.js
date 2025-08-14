// =====================
// script.js — LIXBY (corregido)
// =====================

document.addEventListener("DOMContentLoaded", () => {
  // Año automático en el footer (si existe)
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // =====================
  // Scroll suave al hacer clic en los enlaces del menú
  // =====================
  document.querySelectorAll('header nav a').forEach(link => {
    link.addEventListener('click', e => {
      // enlaces que apuntan a secciones internas
      const href = link.getAttribute('href') || '';
      if (href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          window.scrollTo({
            top: target.offsetTop - 60, // ajustar si el header cambia
            behavior: 'smooth'
          });
        }
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
  // Animaciones al aparecer en pantalla (reveal)
  // =====================
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    }, { threshold: 0.1 });

    revealEls.forEach(el => observer.observe(el));
  }

  // =====================
  // Menú hamburguesa (opcional)
  // =====================
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("open");
      hamburger.classList.toggle("active");
      // accesibilidad
      hamburger.setAttribute("aria-expanded", hamburger.classList.contains("active"));
    });
  }

  // =====================
  // Click en el logo para reiniciar la página
  // =====================
  const logo = document.querySelector(".brand");
  if (logo) {
    logo.style.cursor = "pointer";
    logo.addEventListener("click", (e) => {
      // si estás en producto.html volver al index, si estás en index recarga
      const isIndex = /index\.html?$/.test(window.location.pathname) || window.location.pathname.endsWith('/');
      if (isIndex) {
        location.reload();
      } else {
        window.location.href = "index.html";
      }
    });
  }

  // =====================
  // Efecto Apple — movimiento suave según ratón (y móvil: reset)
  // =====================
  const cards = Array.from(document.querySelectorAll('.card'));
  cards.forEach(card => {
    // transición por defecto (si no está en CSS)
    card.style.transition = card.style.transition || "transform 0.2s ease";

    // mousemove: rota levemente y mantiene translateY para hover
    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
      const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const moveX = (x / rect.width - 0.5) * 8;  // ajustar intensidad
      const moveY = (y / rect.height - 0.5) * 8;
      // sube ligeramente y rota
      card.style.transform = `translateY(-8px) rotateX(${moveY}deg) rotateY(${moveX}deg)`;
    };

    const onLeave = () => {
      card.style.transform = 'translateY(0) rotateX(0) rotateY(0)';
    };

    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);

    // soporte táctil: al tocar mostramos el hover (pero sin rotación continua)
    card.addEventListener('touchstart', (ev) => {
      card.style.transform = 'translateY(-8px)';
    }, { passive: true });
    card.addEventListener('touchend', onLeave, { passive: true });
  });

  // =====================
  // Click en tarjetas para ir a detalle del producto
  // =====================
  // aseguramos que solo las tarjetas con data-product actúen
  document.querySelectorAll('.card[data-product]').forEach(card => {
    // cursor clickable
    card.style.cursor = "pointer";

    // evitar que elementos internos (p ej. un botón futuro) bloqueen el click:
    card.addEventListener('click', (e) => {
      // si se hizo click sobre un control (botón, enlace) no redirigimos
      const ctrl = e.target.closest('button, a, input, textarea, select');
      if (ctrl && ctrl !== card) return;

      const productId = card.getAttribute('data-product');
      if (productId) {
        // url encode por si contiene caracteres especiales
        const id = encodeURIComponent(productId);
        window.location.href = `producto.html?id=${id}`;
      }
    });

    // también soporte para toque (por si el click no se dispara en algunos móviles)
    card.addEventListener('touchend', (e) => {
      const productId = card.getAttribute('data-product');
      if (productId) {
        const id = encodeURIComponent(productId);
        // breve timeout para evitar conflicto con scroll
        setTimeout(() => window.location.href = `producto.html?id=${id}`, 50);
      }
    }, { passive: true });
  });

}); // DOMContentLoaded

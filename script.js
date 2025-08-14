// =====================
// script.js — LIXBY (corregido)
// =====================

document.addEventListener("DOMContentLoaded", () => {
  // Año automático en footer (index y producto)
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Scroll suave (solo anchors internos)
  document.querySelectorAll('header nav a').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          window.scrollTo({ top: target.offsetTop - 60, behavior: 'smooth' });
        }
      }
    });
  });

  // Tema claro/oscuro
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.documentElement.classList.toggle("light");
    });
  }

  // Reveal (aparecer animado)
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1 });
    revealEls.forEach(el => io.observe(el));
  }

  // Efecto tarjetas (ratón / touch)
  const cards = Array.from(document.querySelectorAll('.card[data-product]'));
  cards.forEach(card => {
    card.style.transition = card.style.transition || "transform 0.22s ease";

    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
      const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const moveX = (x / rect.width - 0.5) * 6; // intensidad reducida
      const moveY = (y / rect.height - 0.5) * 6;
      card.style.transform = `translateY(-8px) rotateX(${moveY}deg) rotateY(${moveX}deg)`;
    };

    const onLeave = () => { card.style.transform = 'translateY(0) rotateX(0) rotateY(0)'; };

    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);

    // touch behavior: on touch show elevated card; follow not required
    card.addEventListener('touchstart', () => card.style.transform = 'translateY(-8px)');
    card.addEventListener('touchend', onLeave);
  });

  // Click en tarjetas -> producto.html?id=...
  document.querySelectorAll('.card[data-product]').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      // si el click fue en algún control interno, no redirigimos
      if (e.target.closest('button, a, input, textarea, select')) return;
      const pid = card.getAttribute('data-product');
      if (pid) {
        window.location.href = `producto.html?id=${encodeURIComponent(pid)}`;
      }
    });

    // soporte touch fallback
    card.addEventListener('touchend', (e) => {
      const pid = card.getAttribute('data-product');
      if (pid) setTimeout(() => window.location.href = `producto.html?id=${encodeURIComponent(pid)}`, 60);
    }, { passive: true });
  });

  // Logo: recarga en index, vuelve en otras páginas
  const logo = document.querySelector('.brand');
  if (logo) {
    logo.style.cursor = 'pointer';
    logo.addEventListener('click', () => {
      const path = window.location.pathname.toLowerCase();
      if (path.endsWith('/') || path.endsWith('index.html')) location.reload();
      else window.location.href = 'index.html';
    });
  }
});

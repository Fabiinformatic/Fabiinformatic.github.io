// script.js

// Navegación suave al hacer clic en el menú
document.querySelectorAll('nav a').forEach(enlace => {
  enlace.addEventListener('click', e => {
    e.preventDefault();
    const destino = document.querySelector(enlace.getAttribute('href'));
    if (destino) {
      window.scrollTo({
        top: destino.offsetTop - 80, // para evitar tapar con el header fijo
        behavior: 'smooth'
      });
    }
  });
});

// Mensaje emergente al hacer clic en productos
document.querySelectorAll('.producto').forEach(producto => {
  producto.addEventListener('click', () => {
    const nombre = producto.querySelector('h3').textContent;
    alert(`Has seleccionado: ${nombre}.\nPróximamente podrás comprarlo en Lixby.`);
  });
});

// Ejemplo de cambio de color en hover usando JS (opcional)
document.querySelectorAll('.producto').forEach(prod => {
  prod.addEventListener('mouseenter', () => {
    prod.style.boxShadow = '0 12px 30px rgba(0, 113, 227, 0.2)';
  });
  prod.addEventListener('mouseleave', () => {
    prod.style.boxShadow = '0 8px 20px rgba(0,0,0,0.05)';
  });
});

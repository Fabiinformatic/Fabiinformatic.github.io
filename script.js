document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.getElementById("contact-form");
  const statusMsg = document.getElementById("form-status");

  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();

    if (!name || !email || !message) {
      statusMsg.style.color = "red";
      statusMsg.textContent = "Por favor completa todos los campos.";
      return;
    }

    // Aquí luego agregamos Firebase
    statusMsg.style.color = "green";
    statusMsg.textContent = "✅ Mensaje enviado (simulado)";
    contactForm.reset();
  });
});

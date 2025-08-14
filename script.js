// Inicializar EmailJS
(function() {
    emailjs.init("xsKpaFjbRsS95AK3i"); // tu Public Key
})();

// Enviar formulario
document.getElementById("contactForm").addEventListener("submit", function(event) {
    event.preventDefault();

    emailjs.send("service_tagcpgm", "template_l1e0go2", {
        name: document.querySelector('input[name="name"]').value,
        email: document.querySelector('input[name="email"]').value,
        message: document.querySelector('textarea[name="message"]').value
    })
    .then(function(response) {
        console.log("Éxito!", response.status, response.text);
        document.getElementById("contactForm").style.display = "none";
        document.getElementById("successMessage").style.display = "block";
    }, function(error) {
        console.log("Error...", error);
        alert("Hubo un error al enviar el formulario. Intenta de nuevo.");
    });
});

// Scroll al contacto
function scrollToContact() {
    document.getElementById("contacto").scrollIntoView({ behavior: 'smooth' });
}

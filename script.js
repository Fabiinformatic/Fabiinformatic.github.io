// Inicializar EmailJS
(function(){
    emailjs.init("TU_PUBLIC_KEY_AQUI"); // Reemplaza con tu Public Key
})();

const form = document.getElementById('contactForm');
const successMessage = document.getElementById('successMessage');

form.addEventListener('submit', function(event) {
    event.preventDefault();

    emailjs.sendForm('TU_SERVICE_ID', 'TU_TEMPLATE_ID', this)
        .then(function() {
            // Mostrar mensaje animado
            successMessage.style.display = 'block';
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 5000);
            form.reset();
        }, function(error) {
            alert('Ocurrió un error al enviar el mensaje. Intenta de nuevo.');
            console.error('EmailJS Error:', error);
        });
});

function scrollToContact() {
    document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });
}

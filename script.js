emailjs.init("TU_USER_ID"); 

const contactForm = document.getElementById("contactForm");
const successMessage = document.getElementById("successMessage");

contactForm.addEventListener("submit", function(e) {
  e.preventDefault();

  emailjs.sendForm('service_tagcpgm', 'template_tagcpgm', this)
    .then(() => {
      contactForm.style.display = "none";
      successMessage.style.display = "block";
    }, (error) => {
      alert("Hubo un error al enviar el formulario: " + error.text);
    });
});

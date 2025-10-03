// Lixby Chatbot Widget v1 — OpenAI compatible (requiere endpoint en tu server.js)
(function(){
  // --- Configuración ---
  const ENDPOINT = '/api/chat'; // tu endpoint backend que conecta con OpenAI
  const BOT_NAME = 'Lixby IA';
  const BOT_AVATAR = '🤖';
  const USER_AVATAR = '🧑';
  // --- Elementos ---
  const widget = document.getElementById('lixbyChatbot');
  const btnOpen = document.getElementById('lixbyChatbotOpen');
  const btnClose = document.getElementById('lixbyChatbotClose');
  const body = document.getElementById('lixbyChatbotBody');
  const form = document.getElementById('lixbyChatbotForm');
  const input = document.getElementById('lixbyChatbotInput');
  // --- Estado ---
  let chatHistory = [];

  // --- Funciones de UI ---
  function scrollToBottom(){ body.scrollTop = body.scrollHeight; }
  function addMsg(who, text){
    const el = document.createElement('div');
    el.className = 'lixby-chatbot-msg' + (who === 'user' ? ' user' : '');
    el.innerHTML = `<div class="bubble" tabindex="0">${text || '&nbsp;'}</div>`;
    body.appendChild(el);
    scrollToBottom();
  }
  function setLoading(loading=true){
    let loader = document.getElementById('lixbyChatbotLoader');
    if(loading){
      if(!loader){
        loader = document.createElement('div');
        loader.id = 'lixbyChatbotLoader';
        loader.className = 'lixby-chatbot-msg';
        loader.innerHTML = `<div class="bubble" aria-live="polite"><span class="loader-dot">...</span></div>`;
        body.appendChild(loader);
        scrollToBottom();
      }
    } else {
      if(loader) loader.remove();
    }
  }
  function resetChat(){
    body.innerHTML = '';
    chatHistory = [];
    addMsg('bot', '¡Hola! Soy Lixby IA 🤖.<br>Puedes preguntarme dudas sobre tu dispositivo, soporte o uso general.');
  }

  // --- Lógica de apertura/cierre ---
  function openWidget(){
    widget.style.display = 'flex';
    btnOpen.style.display = 'none';
    resetChat();
    input.focus();
  }
  function closeWidget(){
    widget.style.display = 'none';
    btnOpen.style.display = 'block';
  }
  btnOpen.onclick = openWidget;
  btnClose.onclick = closeWidget;

  // --- Enviar pregunta ---
  form.onsubmit = async function(e){
    e.preventDefault();
    const q = (input.value || '').trim();
    if(!q) return;
    addMsg('user', q);
    chatHistory.push({role:'user', content: q});
    input.value = '';
    setLoading(true);

    try {
      // Llama a tu backend/endpoint que conecta con OpenAI
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory })
      });
      if(!res.ok) throw new Error('Error del servidor IA');
      const data = await res.json();
      const answer = data.answer || data.choices?.[0]?.message?.content || 'Lo siento, no tengo respuesta en este momento.';
      chatHistory.push({role: 'assistant', content: answer});
      setLoading(false);
      addMsg('bot', answer);
    } catch(err) {
      setLoading(false);
      addMsg('bot', 'Ocurrió un error al contactar con la IA. Por favor, inténtalo más tarde.');
    }
  };

  // --- Inicializa botón flotante si está oculto ---
  if(btnOpen) btnOpen.style.display = 'block';

  // Accesibilidad: abrir con Ctrl+Alt+C
  document.addEventListener('keydown', function(e){
    if(e.ctrlKey && e.altKey && e.key.toLowerCase()==='c'){ openWidget(); }
  });

  // Cierra el chat con ESC
  document.addEventListener('keydown', function(e){
    if(e.key==='Escape' && widget.style.display==='flex'){ closeWidget(); }
  });
})();

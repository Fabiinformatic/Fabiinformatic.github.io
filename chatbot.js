// Chatbot Widget — OpenAI compatible (requiere endpoint en tu server)
/* Incluye:
   - Historial en sessionStorage
   - Mensaje de bienvenida contextual
   - Metadatos de contexto (URL, título, hora, selección de producto si está)
   - Manejo de errores y accesibilidad
*/
(function(){
  // --- Configuración ---
  const ENDPOINT = '/api/chat'; // tu endpoint backend que conecta con OpenAI
  const BOT_NAME = 'Lixby IA';
  const STORAGE_KEY = 'chat_session_v1';

  // --- Elementos ---
  const widget   = document.getElementById('chatbot');
  const btnOpen  = document.getElementById('chatbotOpen');
  const btnClose = document.getElementById('chatbotClose');
  const body     = document.getElementById('chatbotBody');
  const form     = document.getElementById('chatbotForm');
  const input    = document.getElementById('chatbotInput');
  const btnSend  = document.getElementById('chatbotSend');

  if (!widget || !body || !form || !input) {
    console.warn("⚠️ Chatbot: faltan elementos HTML requeridos (widget, body, form o input)");
    return;
  }

  // --- Estado ---
  let chatHistory = loadSession() || [];

  // --- Utilidades ---
  function sanitizeHtml(s){
    const div = document.createElement('div');
    div.textContent = String(s || '');
    return div.innerHTML.replace(/\n/g, '<br>');
  }
  function scrollToBottom(){ body.scrollTop = body.scrollHeight; }
  function addMsg(who, html){
    const el = document.createElement('div');
    el.className = 'chatbot-msg' + (who === 'user' ? ' user' : '');
    el.innerHTML = `<div class="bubble" tabindex="0">${html || '&nbsp;'}</div>`;
    body.appendChild(el);
    scrollToBottom();
  }
  function setLoading(loading=true){
    let loader = document.getElementById('chatbotLoader');
    if(loading){
      if(!loader){
        loader = document.createElement('div');
        loader.id = 'chatbotLoader';
        loader.className = 'chatbot-msg';
        loader.innerHTML = `<div class="bubble" aria-live="polite"><span class="loader-dot">Pensando…</span></div>`;
        body.appendChild(loader);
        scrollToBottom();
      }
    } else {
      if(loader) loader.remove();
    }
  }
  function saveSession(){ try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory)); } catch(e){} }
  function loadSession(){ try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){ return []; } }

  // --- Contexto básico ---
  function buildContext(){
    const product = (document.getElementById('t-product') || {}).value || '';
    const kbOpenItems = Array.from(document.querySelectorAll('.kb-item[open] summary'))
                             .map(s=>s.textContent.trim())
                             .slice(0,4);
    return {
      page: location.pathname,
      title: document.title,
      timestamp: new Date().toISOString(),
      product: product || undefined,
      kb_focus: kbOpenItems,
    };
  }

  // --- Mensaje de bienvenida / Historial ---
  function ensureWelcome(){
    body.innerHTML = '';
    if (chatHistory.length === 0) {
      addMsg('bot', `¡Hola! Soy ${BOT_NAME} 🤖.<br>Puedo ayudarte con dudas de soporte, garantía y uso de tu dispositivo. Cuéntame, ¿qué ocurre?`);
    } else {
      chatHistory.forEach(m => addMsg(m.role === 'user' ? 'user' : 'bot', sanitizeHtml(m.content)));
    }
  }

  // --- Abrir / Cerrar ---
  function openWidget(){
    widget.style.display = 'flex';
    if(btnOpen) btnOpen.style.display = 'none';
    ensureWelcome();
    if(input) input.focus();
  }
  function closeWidget(){
    widget.style.display = 'none';
    if(btnOpen) {
      btnOpen.style.display = 'block';
      try { btnOpen.focus(); } catch(e){}
    }
  }
  if (btnOpen) btnOpen.onclick = openWidget;
  if (btnClose) btnClose.onclick = closeWidget;

  // --- Enviar mensaje ---
  async function sendMessage(q){
    const content = String(q || '').trim();
    if(!content) return;

    addMsg('user', sanitizeHtml(content));
    chatHistory.push({role:'user', content});
    saveSession();
    input.value = '';
    setLoading(true);

    const payload = {
      messages: chatHistory,
      metadata: buildContext()
    };

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('Error del servidor IA');
      const data = await res.json();
      const answer = data.answer || data.choices?.[0]?.message?.content || 'Lo siento, no tengo respuesta en este momento.';
      chatHistory.push({role: 'assistant', content: answer});
      saveSession();
      setLoading(false);
      addMsg('bot', sanitizeHtml(answer));
    } catch(err) {
      console.error("Chatbot error:", err);
      setLoading(false);
      addMsg('bot', '⚠️ Ocurrió un error al contactar con la IA. Por favor, inténtalo más tarde.');
    }
  }

  // --- Eventos ---
  if (form) {
    form.onsubmit = function(e){
      e.preventDefault();
      sendMessage(input.value);
    };
  }
  if (btnSend) {
    btnSend.onclick = function(e){
      e.preventDefault();
      sendMessage(input.value);
    };
  }

  // Accesibilidad: Ctrl+Alt+C abre, ESC cierra
  document.addEventListener('keydown', function(e){
    if(e.ctrlKey && e.altKey && e.key.toLowerCase()==='c'){ openWidget(); }
    if(e.key==='Escape' && widget.style.display==='flex'){ closeWidget(); }
  });

  // Inicializa
  if(btnOpen) btnOpen.style.display = 'block';
})();

<script>
// Lixby Chatbot Widget v3.1 — con "Dudas principales"
(function(){
  // --- Configuración ---
  const ENDPOINT = '/api/chat';
  const BOT_NAME = 'Lixby IA';
  const STORAGE_KEY = 'lixby_chat_session_v1';

  // --- Elementos ---
  const widget   = document.getElementById('lixbyChatbot');
  const btnOpen  = document.getElementById('lixbyChatbotOpen');
  const btnClose = document.getElementById('lixbyChatbotClose');
  const body     = document.getElementById('lixbyChatbotBody');
  const form     = document.getElementById('lixbyChatbotForm');
  const input    = document.getElementById('lixbyChatbotInput');

  if (!widget || !body || !form || !input) {
    console.warn("⚠️ Chatbot: faltan elementos HTML requeridos");
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
    el.className = 'lixby-chatbot-msg' + (who === 'user' ? ' user' : '');
    el.innerHTML = `<div class="bubble" tabindex="0">${html || '&nbsp;'}</div>`;
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

  // Contexto básico
  function buildContext(){
    return {
      page: location.pathname,
      title: document.title,
      timestamp: new Date().toISOString(),
    };
  }

  // Mensaje de bienvenida + botones de dudas principales
  function ensureWelcome(){
    body.innerHTML = '';
    if (chatHistory.length === 0) {
      addMsg('bot', '¡Hola! Soy Lixby IA 🤖.<br>Elige una duda principal o escríbeme directamente:');
      addQuickButtons();
    } else {
      chatHistory.forEach(m => addMsg(m.role === 'user' ? 'user' : 'bot', sanitizeHtml(m.content)));
    }
  }

  // Botones de dudas rápidas
  function addQuickButtons(){
    const quicks = ["Garantía", "Problemas de pago", "Configurar mi cuenta", "Hablar con soporte"];
    const wrap = document.createElement('div');
    wrap.className = 'quick-buttons';
    quicks.forEach(q=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quick-btn';
      b.textContent = q;
      b.onclick = ()=> sendMessage(q);
      wrap.appendChild(b);
    });
    body.appendChild(wrap);
    scrollToBottom();
  }

  // --- Lógica de apertura/cierre ---
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
      btnOpen.focus();
    }
  }
  if (btnOpen) btnOpen.onclick = openWidget;
  if (btnClose) btnClose.onclick = closeWidget;

  // --- Enviar pregunta ---
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

      if(res.status === 405){
        throw new Error("Método no permitido (405). ¿Seguro que configuraste POST en tu backend?");
      }
      if(!res.ok) throw new Error(`Error ${res.status} al contactar con la IA`);

      const data = await res.json();
      const answer = data.answer || data.choices?.[0]?.message?.content || 'Lo siento, no tengo respuesta en este momento.';
      chatHistory.push({role: 'assistant', content: answer});
      saveSession();
      setLoading(false);
      addMsg('bot', sanitizeHtml(answer));
    } catch(err) {
      console.error("Chatbot error:", err);
      setLoading(false);
      addMsg('bot', `⚠️ Error: ${sanitizeHtml(err.message)}. Revisa tu servidor.`);
    }
  }

  if (form) {
    form.onsubmit = function(e){
      e.preventDefault();
      sendMessage(input.value);
    };
  }

  // Accesibilidad
  document.addEventListener('keydown', function(e){
    if(e.ctrlKey && e.altKey && e.key.toLowerCase()==='c'){ openWidget(); }
    if(e.key==='Escape' && widget.style.display==='flex'){ closeWidget(); }
  });

  // Inicializa
  if(btnOpen) btnOpen.style.display = 'block';

})();
</script>

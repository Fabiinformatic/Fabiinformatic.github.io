<!-- Lixby Chatbot Widget v4 — con botón de dudas principales -->
<script>
(function(){
  // --- Configuración ---
  const ENDPOINT = '/api/chat'; // tu endpoint backend que conecta con OpenAI
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

  // Contexto básico de soporte
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

  // --- Dudas principales (FAQ rápidas) ---
  const dudasPrincipales = [
    "¿Cómo activar la garantía?",
    "¿Cuánto tarda un pedido?",
    "¿Cómo funciona LixbyCare+?",
    "Problemas con el pago",
    "Necesito soporte técnico"
  ];

  function renderDudasPrincipales(){
    const cont = document.createElement('div');
    cont.className = 'faq-buttons';
    dudasPrincipales.forEach(duda=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'faq-btn';
      b.textContent = duda;
      b.onclick = ()=> sendMessage(duda);
      cont.appendChild(b);
    });
    body.appendChild(cont);
    scrollToBottom();
  }

  // Mensaje de bienvenida + restauración de historial
  function ensureWelcome(){
    body.innerHTML = '';
    if (chatHistory.length === 0) {
      addMsg('bot', '¡Hola! Soy Lixby IA 🤖.<br>Puedo ayudarte con soporte, garantía y uso de tu dispositivo.<br><br>👉 Pulsa en "Dudas principales" para ver temas frecuentes.');
      renderDudasPrincipales();
    } else {
      chatHistory.forEach(m => addMsg(m.role === 'user' ? 'user' : 'bot', sanitizeHtml(m.content)));
    }
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

<style>
/* Botones de dudas principales */
.faq-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
}
.faq-btn {
  background: #f1f1f1;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  cursor: pointer;
  transition: 0.2s;
}
.faq-btn:hover { background: #e3e3e3; }
</style>

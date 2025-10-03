// chatbot.js — Lixby Chatbot v2 (mejorado, crea widget si falta)
(function(){
  // --- Configuración ---
  const ENDPOINT = '/api/chat'; // endpoint del servidor
  const STORAGE_KEY = 'lixby_chat_session_v1';
  const MAX_HISTORY = 48; // límite de mensajes que mandaremos al backend
  const REQUEST_TIMEOUT = 30000; // ms
  const SUGGESTIONS = ['Garantía', 'LixbyCare+', 'Soporte técnico', 'Estado pedido'];

  // --- Helpers DOM: crea widget mínimo si no existe ---
  function ensureDomElements() {
    // open button
    if (!document.getElementById('lixbyChatbotOpen')) {
      const btn = document.createElement('button');
      btn.id = 'lixbyChatbotOpen';
      btn.type = 'button';
      btn.title = 'Abrir chat Lixby';
      btn.innerText = 'Chat';
      Object.assign(btn.style, {
        position: 'fixed', right: '18px', bottom: '18px', zIndex: 9999,
        padding: '10px 14px', borderRadius: '999px', background: '#0b74ff', color: '#fff',
        border: 'none', cursor: 'pointer', boxShadow: '0 6px 18px rgba(11,116,255,.2)'
      });
      document.body.appendChild(btn);
    }

    // full widget
    if (!document.getElementById('lixbyChatbot')) {
      const wrap = document.createElement('div');
      wrap.id = 'lixbyChatbot';
      wrap.setAttribute('role','region');
      wrap.setAttribute('aria-label','Lixby Chat');
      Object.assign(wrap.style, {
        display: 'none', position: 'fixed', right: '18px', bottom: '72px', zIndex: 9999,
        width: '360px', maxWidth: 'calc(100% - 40px)', boxShadow: '0 10px 30px rgba(0,0,0,.15)',
        borderRadius: '12px', overflow: 'hidden', fontFamily: 'Arial, sans-serif'
      });

      wrap.innerHTML = `
        <div style="background:#0b74ff;color:#fff;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;">
          <div style="font-weight:600">Lixby IA</div>
          <button id="lixbyChatbotClose" aria-label="Cerrar chat" style="background:transparent;border:none;color:#fff;font-size:16px;cursor:pointer">×</button>
        </div>
        <div id="lixbyChatbotBody" style="background:#fff;height:300px;overflow:auto;padding:12px;box-sizing:border-box"></div>
        <div id="lixbyChatbotSuggested" style="padding:8px;background:#f7f7f8;border-top:1px solid #eee;display:flex;gap:8px;flex-wrap:wrap"></div>
        <form id="lixbyChatbotForm" style="display:flex;padding:10px;background:#fff;border-top:1px solid #eee">
          <input id="lixbyChatbotInput" placeholder="Escribe tu pregunta..." aria-label="mensaje" style="flex:1;padding:8px 10px;border:1px solid #ddd;border-radius:8px" />
          <button id="lixbyChatbotSend" type="submit" style="margin-left:8px;padding:8px 12px;border-radius:8px;border:none;background:#0b74ff;color:#fff;cursor:pointer">Enviar</button>
        </form>
      `;
      document.body.appendChild(wrap);
    }
  }

  ensureDomElements();

  // --- Elementos ---
  const widget   = document.getElementById('lixbyChatbot');
  const btnOpen  = document.getElementById('lixbyChatbotOpen');
  const btnClose = document.getElementById('lixbyChatbotClose');
  const body     = document.getElementById('lixbyChatbotBody');
  const form     = document.getElementById('lixbyChatbotForm');
  const input    = document.getElementById('lixbyChatbotInput');
  const btnSend  = document.getElementById('lixbyChatbotSend');
  const suggested= document.getElementById('lixbyChatbotSuggested');

  if (!widget || !body || !form || !input || !btnSend || !btnOpen) {
    console.warn('Chatbot: elementos DOM incompletos. Revisa chatbot.js y tu HTML.');
    return;
  }

  // --- Estado ---
  let chatHistory = loadSession();
  trimHistory();

  // --- Utilidades ---
  function sanitizeHtml(s){
    const div = document.createElement('div');
    div.textContent = String(s || '');
    return div.innerHTML.replace(/\n/g, '<br>');
  }
  function scrollToBottom(){ try { body.scrollTop = body.scrollHeight; } catch(e){} }
  function addMsg(who, html){
    const el = document.createElement('div');
    el.className = 'lixby-chatbot-msg ' + (who === 'user' ? 'user' : 'bot');
    el.style.margin = '8px 0';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.tabIndex = 0;
    bubble.style.padding = '8px 10px';
    bubble.style.borderRadius = '8px';
    bubble.style.maxWidth = '85%';
    bubble.style.boxSizing = 'border-box';
    if (who === 'user') {
      bubble.style.background = '#e8f0ff';
      bubble.style.marginLeft = 'auto';
    } else {
      bubble.style.background = '#f2f2f2';
    }
    bubble.innerHTML = html || '&nbsp;';
    el.appendChild(bubble);
    body.appendChild(el);
    scrollToBottom();
  }

  function showLoader(){
    if (!document.getElementById('lixbyChatbotLoader')) {
      const loader = document.createElement('div');
      loader.id = 'lixbyChatbotLoader';
      loader.style.margin = '8px 0';
      loader.innerHTML = `<div style="padding:8px 10px;border-radius:8px;background:#fff;max-width:70%"><em>Pensando…</em></div>`;
      body.appendChild(loader);
      scrollToBottom();
    }
  }
  function hideLoader(){ const l = document.getElementById('lixbyChatbotLoader'); if (l) l.remove(); }

  function saveSession(){ try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory)); } catch(e){} }
  function loadSession(){ try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){ return []; } }
  function trimHistory() {
    if (!Array.isArray(chatHistory)) chatHistory = [];
    if (chatHistory.length > MAX_HISTORY) {
      chatHistory = chatHistory.slice(-MAX_HISTORY);
    }
  }

  function buildContext(){
    const product = (document.getElementById('t-product') || {}).value || undefined;
    const kbOpenItems = Array.from(document.querySelectorAll('.kb-item[open] summary'))
                             .map(s=>s.textContent.trim()).slice(0,4);
    return {
      page: location.pathname,
      title: document.title,
      timestamp: new Date().toISOString(),
      product,
      kb_focus: kbOpenItems
    };
  }

  // --- Welcome / Render historial ---
  function ensureWelcome(){
    body.innerHTML = '';
    // sugerencias rápidas
    suggested.innerHTML = '';
    SUGGESTIONS.forEach(s => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'lixby-suggestion';
      chip.innerText = s;
      chip.style.padding = '6px 8px';
      chip.style.border = '1px solid #e6e6e6';
      chip.style.background = '#fff';
      chip.style.borderRadius = '999px';
      chip.style.cursor = 'pointer';
      chip.onclick = () => {
        sendMessage(s);
      };
      suggested.appendChild(chip);
    });

    if (chatHistory.length === 0) {
      addMsg('bot', '¡Hola! Soy Lixby IA 🤖. Puedo ayudarte con preguntas sobre garantía, pedidos y soporte. Prueba con alguna sugerencia o escribe tu duda.');
    } else {
      // render histórico
      chatHistory.forEach(m => addMsg(m.role === 'user' ? 'user' : 'bot', sanitizeHtml(m.content)));
    }
  }

  // --- Open / Close widget ---
  function openWidget(){
    widget.style.display = 'block';
    btnOpen.style.display = 'none';
    ensureWelcome();
    input.focus();
  }
  function closeWidget(){
    widget.style.display = 'none';
    btnOpen.style.display = 'block';
    btnOpen.focus();
  }
  btnOpen.addEventListener('click', openWidget);
  btnClose && btnClose.addEventListener('click', closeWidget);

  // --- Fetch with timeout ---
  async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    options.signal = controller.signal;
    try {
      const res = await fetch(url, options);
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  // --- Enviar mensaje ---
  async function sendMessage(q){
    const content = String(q || '').trim();
    if (!content) return;
    // push local user message
    addMsg('user', sanitizeHtml(content));
    chatHistory.push({ role: 'user', content });
    trimHistory();
    saveSession();

    // UI lock
    input.value = '';
    btnSend.disabled = true;
    showLoader();

    // prepare payload: take last MAX_HISTORY messages
    const payload = {
      messages: chatHistory.slice(-MAX_HISTORY),
      metadata: buildContext()
    };

    try {
      const res = await fetchWithTimeout(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, REQUEST_TIMEOUT);

      if (res.status === 503) {
        // backend (OpenAI) no disponible
        const txt = await safeText(res);
        console.warn('Server 503:', txt);
        addMsg('bot', 'La IA no está disponible ahora (503). Intenta más tarde.');
        return;
      }
      if (!res.ok) {
        const txt = await safeText(res);
        console.error('Server error', res.status, txt);
        addMsg('bot', `Error del servidor (${res.status}).`);
        return;
      }

      const data = await res.json().catch(err => {
        console.error('Invalid JSON from /api/chat', err);
        return null;
      });
      if (!data) {
        addMsg('bot', 'Respuesta inválida del servidor.');
        return;
      }

      // prefer "answer", fallback to choices
      const answer = data.answer || data.choices?.[0]?.message?.content || data.error || 'Lo siento, no tengo respuesta en este momento.';
      chatHistory.push({ role: 'assistant', content: answer });
      trimHistory();
      saveSession();
      addMsg('bot', sanitizeHtml(answer));
    } catch (err) {
      console.error('Chat sendMessage error:', err);
      if (err.name === 'AbortError') {
        addMsg('bot', 'La solicitud tardó demasiado. Intenta de nuevo.');
      } else {
        addMsg('bot', 'No se pudo conectar con el servidor. Revisa la consola y que el backend esté corriendo.');
      }
    } finally {
      hideLoader();
      btnSend.disabled = false;
    }
  }

  // try to read text safely from response
  async function safeText(res) {
    try { return await res.text(); } catch(e) { return String(e); }
  }

  // --- Form handling ---
  form.addEventListener('submit', function(e){
    e.preventDefault();
    sendMessage(input.value);
  });
  // allow Enter to send (but not Shift+Enter)
  input.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });

  // accessibility shortcuts
  document.addEventListener('keydown', function(e){
    if (e.ctrlKey && e.altKey && e.key.toLowerCase()==='c') openWidget();
    if (e.key === 'Escape' && widget.style.display === 'block') closeWidget();
  });

  // init
  btnOpen.style.display = 'block';
  // load welcome/history only when open, but pre-render if already open
  if (widget.style.display === 'block') ensureWelcome();

})();

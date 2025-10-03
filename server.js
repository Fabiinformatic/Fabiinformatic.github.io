// server.js
require('dotenv').config();

const express = require('express');
const app = express();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 4242;

const cors = require('cors');
const helmet = require('helmet');

// OpenAI (IA)
let openai = null;
(function initOpenAI() {
  try {
    const OpenAI = require('openai');
    if (process.env.OPENAI_API_KEY) {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      console.log('OpenAI client inicializado');
    } else {
      console.warn('OPENAI_API_KEY no configurado — /api/chat responderá 503');
    }
  } catch (e) {
    console.warn('Paquete openai no disponible. Instala con: npm i openai');
  }
})();

const APPLECARE = 169.00;

// Seguridad y CORS básicos (para rutas no raw)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));

// Stripe webhook: body raw ANTES de json
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET no configurado — /webhook ignorará verificación');
  }
  let event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejo de eventos
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('checkout.session.completed — sesión:', session.id);
    // TODO: guardar pedido, enviar email, fulfillment...
  } else if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    console.log('payment_intent.succeeded — id:', pi.id);
    // TODO: marcar pedido como pagado, enviar correo, etc.
  } else if (event.type === 'payment_link.created') {
    console.log('payment_link.created', event.data.object.id);
  }

  res.json({ received: true });
});

// JSON parser para el resto
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Static
app.use(express.static('public')); // coloca tus HTML (carrito.html, success.html, soporte.html, etc.) en /public

/* Healthcheck */
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    openai: !!process.env.OPENAI_API_KEY
  });
});

/* Devuelve publishable key al cliente (para Stripe) */
app.get('/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' });
});

/* Endpoint para crear la sesión de Stripe Checkout */
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, isGift, giftMessage, shipping } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Carrito vacío' });

    const line_items = items.map(it => {
      const price = (it.priceNum !== undefined && it.priceNum !== null) ? Number(it.priceNum) : parseFloat(String(it.price||0).replace(/[^\d.-]/g,'')) || 0;
      const qty = Number(it.qty || 1);
      const addon = it.appleCare ? APPLECARE : 0;
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: it.name || 'Producto Lixby',
            description: it.description || '',
            images: it.image ? [it.image] : []
          },
          unit_amount: Math.round((price + addon) * 100)
        },
        quantity: qty
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      customer_email: (shipping && shipping.email) ? shipping.email : undefined,
      metadata: {
        isGift: isGift ? '1' : '0',
        giftMessage: giftMessage || '',
        shipping_name: shipping?.fullname || '',
        shipping_addr: shipping?.addr || '',
        shipping_city: shipping?.city || '',
        shipping_zip: shipping?.zip || '',
        shipping_country: shipping?.country || ''
      },
      success_url: `${process.env.DOMAIN || 'http://localhost:4242'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN || 'http://localhost:4242'}/carrito.html`
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

/* NUEVO: crear PaymentIntent para Stripe Elements */
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { items, shipping, isGift, giftMessage } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Carrito vacío' });

    let subtotal = 0;
    items.forEach(it => {
      const price = (it.priceNum !== undefined && it.priceNum !== null) ? Number(it.priceNum) : parseFloat(String(it.price||0).replace(/[^\d.-]/g,'')) || 0;
      const qty = Number(it.qty || 1);
      const addon = it.appleCare ? APPLECARE : 0;
      subtotal += (price + addon) * qty;
    });

    const amount = Math.round((subtotal) * 100); // céntimos

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      receipt_email: shipping?.email || undefined,
      metadata: {
        isGift: isGift ? '1' : '0',
        giftMessage: giftMessage || '',
        shipping_name: shipping?.fullname || '',
        shipping_addr: shipping?.addr || '',
        shipping_city: shipping?.city || '',
        shipping_zip: shipping?.zip || '',
        shipping_country: shipping?.country || ''
      }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('create-payment-intent', err);
    res.status(500).json({ error: err.message });
  }
});

/* NUEVO: crear un Payment Link dinámico */
app.post('/create-payment-link', async (req, res) => {
  try {
    const { items, shipping, isGift, giftMessage } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Carrito vacío' });

    const line_items = items.map(it => {
      const price = (it.priceNum !== undefined && it.priceNum !== null) ? Number(it.priceNum) : parseFloat(String(it.price||0).replace(/[^\d.-]/g,'')) || 0;
      const qty = Number(it.qty || 1);
      const addon = it.appleCare ? APPLECARE : 0;
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: it.name || 'Producto Lixby',
            description: it.description || '',
            images: it.image ? [it.image] : []
          },
          unit_amount: Math.round((price + addon) * 100)
        },
        quantity: qty
      };
    });

    const metadata = {
      isGift: isGift ? '1' : '0',
      giftMessage: giftMessage || '',
      shipping_name: shipping?.fullname || '',
      shipping_email: shipping?.email || '',
      shipping_addr: shipping?.addr || '',
      shipping_city: shipping?.city || '',
      shipping_zip: shipping?.zip || '',
      shipping_country: shipping?.country || ''
    };

    const domain = process.env.DOMAIN || `http://localhost:${port}`;

    const pl = await stripe.paymentLinks.create({
      line_items,
      metadata,
      after_completion: {
        type: 'redirect',
        redirect: { url: `${domain}/success.html` }
      }
    });

    return res.json({ url: pl.url, id: pl.id });
  } catch (err) {
    console.error('create-payment-link', err);
    return res.status(500).json({ error: err.message });
  }
});

/* NUEVO: endpoint IA para chatbot */
app.post('/api/chat', async (req, res) => {
  try {
    if (!openai) return res.status(503).json({ error: 'IA no disponible (OPENAI_API_KEY no configurado)' });

    const { messages, metadata } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages es requerido' });
    }

    // Sanitiza mensajes mínimos
    const safeMessages = messages
      .filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant' || m.role === 'system'))
      .slice(-24);

    // Inyecta system prompt de soporte
    const systemPrompt = {
      role: 'system',
      content:
        'Eres Lixby IA, asistente de soporte técnico de LIXBY. Responde en español claro, conciso y accionable. ' +
        'Prioriza pasos prácticos, verifica supuestos y sugiere adjuntar registros o capturas si ayuda. ' +
        'Conoce productos Lixby (One Air, One, One Pro) y el programa LixbyCare+. No inventes datos de garantía; ' +
        'si faltan detalles, pregunta antes. Si la duda no es técnica, redirige a FAQ o contacto.'
    };

    const contextNote = {
      role: 'system',
      content: `Contexto de la página: ${JSON.stringify({
        page: metadata?.page || req.headers.referer || '',
        title: metadata?.title || '',
        product: metadata?.product || '',
        kb_focus: metadata?.kb_focus || [],
        timestamp: metadata?.timestamp || new Date().toISOString()
      })}`
    };

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [systemPrompt, contextNote, ...safeMessages].slice(0, 48),
    });

    const answer = completion?.choices?.[0]?.message?.content || 'Lo siento, no tengo respuesta en este momento.';
    return res.json({ answer });
  } catch (err) {
    console.error('/api/chat error:', err);
    return res.status(500).json({ error: 'Error procesando la solicitud de IA' });
  }
});

/* Error handler genérico */
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno' });
});

app.listen(port, () => console.log(`Server running on port ${port}`));

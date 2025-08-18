// server.js
require('dotenv').config();
const express = require('express');
const app = express();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 4242;

const APPLECARE = 169.00;

// Nota: registramos el endpoint /webhook con body raw antes de usar express.json()
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
  }

  res.json({ received: true });
});

// Ahora el parser JSON normal para el resto de rutas
app.use(express.json());
app.use(express.static('public')); // sirve tus html (coloca carrito.html, confirmar-pedido.html, payment.html, success.html en /public)

/* Devuelve publishable key al cliente (para inicializar Stripe) */
app.get('/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' });
});

/* Endpoint para crear la sesión de Stripe Checkout (tu versión previa) */
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

    // calcular total en céntimos (suma precios + applecare si aplica)
    let subtotal = 0;
    items.forEach(it => {
      const price = (it.priceNum !== undefined && it.priceNum !== null) ? Number(it.priceNum) : parseFloat(String(it.price||0).replace(/[^\d.-]/g,'')) || 0;
      const qty = Number(it.qty || 1);
      const addon = it.appleCare ? APPLECARE : 0;
      subtotal += (price + addon) * qty;
    });

    const amount = Math.round((subtotal) * 100); // en céntimos

    // crear PaymentIntent
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

app.listen(port, () => console.log(`Server running on port ${port}`));

// server.js
require('dotenv').config();
const express = require('express');
const app = express();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 4242;

// Nota: registramos el endpoint /webhook con body raw antes de usar express.json()
// para que Stripe pueda verificar la firma correctamente.
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
      // Si no hay secret, parseamos "a mano" (solo para entornos de pruebas muy controlados)
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Maneja eventos importantes (por ejemplo: checkout.session.completed)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Pago completado para la sesión:', session.id);
    // Aquí deberías:
    // - Marcar el pedido como "pagado" en tu base de datos
    // - Enviar confirmación por correo al cliente (session.customer_email)
    // - Desencadenar fulfilment (envío)
    // **NO** ejecutes llamadas inseguras aquí sin validar.
  }

  res.json({ received: true });
});

// Ahora el parser JSON normal para el resto de rutas
app.use(express.json());
app.use(express.static('public')); // sirve tus html (pon confirmar-pedido.html, success.html, carrito.html en /public)

/* Endpoint para crear la sesión de Stripe Checkout */
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, isGift, giftMessage, shipping } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Carrito vacío' });

    // construimos line_items desde los items (asegúrate que price viene en euros)
    const line_items = items.map(it => {
      const price = (it.priceNum !== undefined && it.priceNum !== null) ? Number(it.priceNum) : parseFloat(String(it.price||0).replace(/[^\d.-]/g,'')) || 0;
      const qty = Number(it.qty || 1);
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: it.name || 'Producto Lixby',
            description: it.description || '',
            images: it.image ? [it.image] : []
          },
          unit_amount: Math.round(price * 100) // en céntimos
        },
        quantity: qty
      };
    });

    // crea la sesión
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

app.listen(port, () => console.log(`Server running on port ${port}`));

// server.js
require('dotenv').config();
const express = require('express');
const app = express();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 4242;

app.use(express.json());
app.use(express.static('public')); // sirve tus html (pon confirmar-pedido.html, success.html, carrito.html en /public)

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
        // opcional: guardamos dirección/parámetros para referencia
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

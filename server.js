import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.warn('\n⚠️  WARNING: STRIPE_SECRET_KEY is not set in .env');
  console.warn('⚠️  Checkout will not work until you add a valid Stripe Secret Key.\n');
}

const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2023-10-16',
}) : null;

// The public URL of your site (for Stripe redirects)
// In development: use your ngrok or deployed URL
// In production: set this to your real domain
const SITE_URL = process.env.SITE_URL || 'http://localhost:8081';

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "The payment server is missing the STRIPE_SECRET_KEY. Please add it to your .env file." });
    }

    const { items, orderId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Format items for Stripe Checkout
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product.name,
          description: `${item.product.designer} | ${item.product.category}`,
          // Only include image URLs that are publicly accessible (http/https)
          ...(item.product.image && item.product.image.startsWith('http')
            ? { images: [item.product.image] }
            : {}),
        },
        unit_amount: Math.round(item.product.price * 100), // Stripe expects cents
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      client_reference_id: orderId,
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId || ''}`,
      cancel_url: `${SITE_URL}/checkout`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Stripe redirects will return to: ${SITE_URL}`);
});

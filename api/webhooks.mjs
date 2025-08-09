// api/webhooks.cjs
const Stripe = require('stripe');
const getRawBody = require('raw-body');

module.exports = async (req, res) => {
  if (req.method === 'GET' || req.method === 'HEAD') return res.status(200).end('ok');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end('Method Not Allowed'); }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) return res.status(500).send('Server misconfigured');

  const stripe = new Stripe(secretKey);

  let event;
  const sig = req.headers['stripe-signature'];

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature/body error:', err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message ?? 'Unknown'}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        break;
      case 'invoice.payment_succeeded':
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        break;
      default:
        break;
    }
  } catch (e) {
    console.error('Handler error:', e);
  }

  return res.status(200).end();
};

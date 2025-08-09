// api/webhooks.mjs
import Stripe from 'stripe';
import getRawBody from 'raw-body';

export default async function handler(req, res) {
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

  // TODO: handle events...

  return res.status(200).end();
}

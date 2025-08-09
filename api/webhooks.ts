import Stripe from 'stripe';
import getRawBody from 'raw-body';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET' || req.method === 'HEAD') return res.status(200).end('ok');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end('Method Not Allowed'); }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    console.error('Missing STRIPE env vars');
    return res.status(500).send('Server misconfigured');
  }

  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  const sig = req.headers['stripe-signature'] as string | undefined;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig!, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature/body error:', err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message ?? 'Unknown'}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        // TODO
        break;
      case 'invoice.payment_succeeded':
        // TODO
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        // TODO
        break;
      default:
        break;
    }
  } catch (e) {
    console.error('Handler error:', e);
  }

  return res.status(200).end();
}

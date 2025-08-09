import Stripe from 'stripe';
import getRawBody from 'raw-body';

export default async function handler(req: any, res: any) {
  // Health checks / your curl -I
  if (req.method === 'GET' || req.method === 'HEAD') {
    return res.status(200).end('ok');
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    console.error('Missing STRIPE env vars');
    return res.status(500).send('Server misconfigured');
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2025-07-30.basil' });

  let event: Stripe.Event;
  const sig = req.headers['stripe-signature'] as string | undefined;

  try {
    const rawBody = await getRawBody(req); // no body parsing middleware in Vercel functions
    event = stripe.webhooks.constructEvent(rawBody, sig!, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature/body error:', err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message ?? 'Unknown'}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // TODO: fulfill subscription
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // TODO: mark invoice/subscription paid
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        // TODO: sync subscription status
        break;
      }
      default:
        // Optionally log unhandled events
        break;
    }
  } catch (e) {
    // Your handler logic failed — log but still acknowledge so Stripe stops retrying
    console.error('Handler error:', e);
  }

  return res.status(200).end();
}

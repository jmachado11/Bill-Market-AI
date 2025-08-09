// api/webhooks.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from "https://esm.sh/stripe@12.3.0?target=deno";
import getRawBody from 'raw-body';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  let event: Stripe.Event;
  const sig = req.headers['stripe-signature'] as string;

  try {
    // IMPORTANT: use raw body, not parsed JSON
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events you care about
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // TODO: fulfill order / mark subscription active, etc.
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // TODO: update subscription state
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        // TODO: sync subscription status
        break;
      }
      default:
        // optionally log unhandled events
        break;
    }
  } catch (e) {
    // If your own handler code throws, still return a 200 so Stripe doesn't endlessly retry
    // but log it so you can fix the logic
    console.error('Handler error:', e);
  }

  // Acknowledge receipt
  return res.status(200).end();
}

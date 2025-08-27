import Stripe from "https://esm.sh/stripe@12.3.0?target=deno";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

function subscriptionIsValid(sub: Stripe.Subscription): boolean {
    if (!["active", "trialing"].includes(sub.status)) return false;

  // Match the new plan precisely by Price ID (simplest & robust)
    return sub.items.data.some((item) => item.price.id === Deno.env.get("STRIPE_PRICE_ID"));
}

async function getCustomerEmail(customerId: string) {
  const c = await stripe.customers.retrieve(customerId);
  return "email" in c ? (c.email as string | null) : null;
}

async function upsert(email: string, active: boolean, stripeCustomerId?: string) {
  await supabase
    .from("subscriptions")
    .upsert(
      { email, is_subscribed: active, stripe_customer_id: stripeCustomerId ?? null },
      { onConflict: "email" }
    );
}

serve(async (req) => {
  const sig = req.headers.get("stripe-signature")!;
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature error: ${(err as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subId = session.subscription as string | undefined;
      const email =
        session.customer_details?.email ??
        (await getCustomerEmail(session.customer as string));

      if (email && subId) {
        const sub = await stripe.subscriptions.retrieve(subId, {
          expand: ["items.data.price"],
        });
        await upsert(email, subscriptionIsValid(sub), session.customer as string);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const email = await getCustomerEmail(sub.customer as string);
      if (email) await upsert(email, subscriptionIsValid(sub), sub.customer as string);
      break;
    }

    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const email = await getCustomerEmail(inv.customer as string);
      if (email) await upsert(email, false, inv.customer as string);
      break;
    }

    default:
    // ignore others
  }

  return new Response("ok");
});

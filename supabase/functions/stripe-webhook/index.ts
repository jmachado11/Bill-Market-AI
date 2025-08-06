import Stripe from "https://esm.sh/stripe@12.3.0?target=deno";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

serve(async (req) => {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerId = session.customer;
    const email = session.customer_email;

    const existing = await supabase.from("subscriptions").select("*").eq("email", email).single();
    if (existing.data) {
      await supabase.from("subscriptions").update({ is_subscribed: true }).eq("email", email);
    } else {
      await supabase.from("subscriptions").insert({
        email,
        stripe_customer_id: customerId,
        is_subscribed: true,
      });
    }
  }

  return new Response("ok", { status: 200 });
});

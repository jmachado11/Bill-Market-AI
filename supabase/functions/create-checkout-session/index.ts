import Stripe from "https://esm.sh/stripe@12.3.0?target=deno";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

serve(async (req) => {
  const { email } = await req.json();

  let customer = (await stripe.customers.list({ email })).data[0];
  if (!customer) {
    customer = await stripe.customers.create({ email });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: "subscription",
    line_items: [{ price: Deno.env.get("STRIPE_PRICE_ID")!, quantity: 1 }],
    success_url: "https://yourdomain.com/success?email=" + encodeURIComponent(email),
    cancel_url: "https://yourdomain.com/cancel",
  });

  return new Response(JSON.stringify({ id: session.id }), {
    headers: { "Content-Type": "application/json" },
  });
});

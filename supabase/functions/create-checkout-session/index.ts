import Stripe from "https://esm.sh/stripe@12.3.0?target=deno";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Clients ────────────────────────────────────────────────────────────────────
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});
createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!); // <--- you may need it later for webhooks

// ─── CORS helpers ───────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

// ─── Handler ────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { email } = (await req.json()) as { email: string };

  let customer = (await stripe.customers.list({ email })).data[0];
  if (!customer) customer = await stripe.customers.create({ email });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: Deno.env.get("STRIPE_PRICE_ID")!, quantity: 1 }],
    subscription_data: { trial_period_days: 30 },
    success_url: `${Deno.env.get("PUBLIC_SITE_URL")!}/success?email=${encodeURIComponent(
      email
    )}`,
    cancel_url: `${Deno.env.get("PUBLIC_SITE_URL")!}/cancel`,
  });

  return new Response(JSON.stringify({ id: session.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

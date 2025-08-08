import Stripe from "https://esm.sh/stripe@12.3.0?target=deno";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { email } = await req.json();
  if (!email)
    return new Response("Missing email", { status: 400, headers: cors });

  /* 1️⃣ look up the Stripe Customer by email */
  const customer = (await stripe.customers.list({ email, limit: 1 })).data[0];
  if (!customer)
    return new Response("Customer not found", { status: 404, headers: cors });

  /* 2️⃣ create portal session */
  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: Deno.env.get("PUBLIC_SITE_URL"),
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.3.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // Read email from body or query only (no anon client / JWT parsing)
    const urlEmail = new URL(req.url).searchParams.get("email") ?? undefined;
    const body = await req.json().catch(() => ({} as any));
    const email: string | undefined = body?.email ?? urlEmail;

    // If no email, return safe false (avoid 400s in UI)
    if (!email) return json({ is_subscribed: false });

    // Ask Stripe directly every time
    const customer = (await stripe.customers.list({ email, limit: 1 })).data[0];
    if (!customer) return json({ is_subscribed: false });

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });

    return json({ is_subscribed: subs.data.length > 0 });
  } catch (e) {
    console.error("check-subscription fatal:", e);
    return json({ is_subscribed: false });
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

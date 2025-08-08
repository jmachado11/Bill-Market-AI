import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.3.0?target=deno";

/* ─── clients ─────────────────────────────────────────────────────────── */
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

/* ─── CORS helper (same as before) ─────────────────────────────────────── */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

/* ─── handler ──────────────────────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  /* email can come from query or POST body */
  const urlEmail = new URL(req.url).searchParams.get("email");
  const bodyEmail = (await req.json().catch(() => ({}))).email;
  const email = bodyEmail ?? urlEmail;
  if (!email)
    return new Response(JSON.stringify({ error: "Missing email" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  /* 1️⃣  look in our own DB first */
  const { data } = await supabase
    .from("subscriptions")
    .select("is_subscribed")
    .eq("email", email)
    .single();

  if (data) {
    return new Response(JSON.stringify({ is_subscribed: data.is_subscribed }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  /* 2️⃣  lazy back-fill: ask Stripe only if we didn't find a row */
  const active = await isActiveInStripe(email);
  if (active) {
    await supabase
      .from("subscriptions")
      .upsert({ email, is_subscribed: true }, { onConflict: "email" });
  }

  return new Response(JSON.stringify({ is_subscribed: active }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});

/* util --------------------------------------------------- */
async function isActiveInStripe(email: string): Promise<boolean> {
  const customer = (await stripe.customers.list({ email, limit: 1 })).data[0];
  if (!customer) return false;

  const subs = await stripe.subscriptions.list({
    customer: customer.id,
    status: "active",
    limit: 1,
  });
  return subs.data.length > 0;
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.3.0?target=deno";

/** Use SERVICE ROLE for DB reads/writes to subscriptions */
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/** Use ANON client only to read the user from the JWT when needed */
const supabaseAnon = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_KEY")!
);

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
    const urlEmail = new URL(req.url).searchParams.get("email") ?? undefined;
    const body = await req.json().catch(() => ({} as any));
    const bodyEmail = (body?.email as string | undefined) ?? undefined;

    // 1) Prefer explicit email in body/query
    let email = bodyEmail ?? urlEmail;

    // 2) If not provided, try to derive from Supabase Auth JWT
    if (!email) {
      const auth = req.headers.get("authorization") || req.headers.get("Authorization");
      const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
      if (token) {
        const { data, error } = await supabaseAnon.auth.getUser(token);
        if (!error) email = data.user?.email ?? undefined;
      }
    }

    // 3) If we STILL don’t have an email, return a safe false (no 400s in the UI)
    if (!email) {
      return new Response(JSON.stringify({ is_subscribed: false }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 4) Try cached status in subscriptions
    const { data: subRow, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("is_subscribed")
      .eq("email", email)
      .maybeSingle();
    if (subErr) console.error("subscriptions select error:", subErr);

    if (subRow?.is_subscribed !== undefined && subRow?.is_subscribed !== null) {
      return new Response(JSON.stringify({ is_subscribed: !!subRow.is_subscribed }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 5) Not cached → check Stripe and backfill subscriptions
    const active = await isActiveInStripe(email);

    const { error: upErr } = await supabaseAdmin
      .from("subscriptions")
      .upsert({ email, is_subscribed: active }, { onConflict: "email" });
    if (upErr) console.error("subscriptions upsert error:", upErr);

    return new Response(JSON.stringify({ is_subscribed: active }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-subscription fatal:", e);
    return new Response(JSON.stringify({ is_subscribed: false }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

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

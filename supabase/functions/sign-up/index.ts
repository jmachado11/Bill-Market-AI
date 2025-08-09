import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_KEY")!
);

serve(async (req) => {
  if (req.method === "POST" && new URL(req.url).pathname === "/signup") {
    const { email, password } = await req.json();

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }
    if (!data.user) {
      return new Response(
        JSON.stringify({ error: "Signup failed, no user returned" }),
        { status: 500 }
      );
    }
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: data.user.id, subscribed: false });

    if (profileError)
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
      });

    return new Response(JSON.stringify({ user: data.user }), { status: 200 });
  }

  return new Response("Not Found", { status: 404 });
});

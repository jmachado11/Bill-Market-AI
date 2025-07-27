import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("get-bills function called");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // must use service role key to read/write freely
    const supabase = createClient(supabaseUrl, serviceKey);

    // first attempt to read all bills + stock_predictions
    let { data: bills, error } = await supabase
      .from("bills")
      .select(`*, stock_predictions (*)`)
      .order("introduced_date", { ascending: false });

    // if none, trigger a fetch
    if (!bills || bills.length === 0) {
      console.log("no bills found, invoking fetch-bills");
      const { data: fetchRes, error: fetchErr } = await supabase.functions.invoke("fetch-bills");
      if (fetchErr) throw fetchErr;

      // re-query
      ({ data: bills, error } = await supabase
        .from("bills")
        .select(`*, stock_predictions (*)`)
        .order("introduced_date", { ascending: false }));
    }

    if (error) throw error;

    // transform for frontend
    const out = bills.map((b: any) => ({
      id:                    b.id,
      title:                 b.title,
      description:           b.description,
      sponsor: {
        name:  b.sponsor_name,
        party: b.sponsor_party,
        state: b.sponsor_state,
      },
      introducedDate:        b.introduced_date,
      lastAction:            b.last_action,
      lastActionDate:        b.last_action_date,
      estimatedDecisionDate: b.estimated_decision_date,
      passingLikelihood:     b.passing_likelihood,
      status:                b.status,
      chamber:               b.chamber,
      documentUrl:           b.document_url,
      affectedStocks:        (b.stock_predictions || []).map((s: any) => ({
        symbol:             s.symbol,
        companyName:        s.company_name,
        predictedDirection: s.predicted_direction,
        confidence:         s.confidence,
        reasoning:          s.reasoning,
      })),
    }));

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-bills error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

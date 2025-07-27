import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LegiScanBill { /* … your full interface … */ }

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("fetch-bills function started");

    const legiscanApiKey = Deno.env.get("LEGISCAN_API_KEY")!;
    const geminiApiKey   = Deno.env.get("GEMINI_API_KEY")!;
    const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
    const serviceKey     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // must use the Service Role key here
    const supabase = createClient(supabaseUrl, serviceKey);

    // fetch list of recent bills
    const legiscanUrl = `https://api.legiscan.com/?key=${legiscanApiKey}&op=getSearch&state=ALL&year=2024`;
    const searchRes   = await fetch(legiscanUrl);
    if (!searchRes.ok) throw new Error(`LegiScan search failed: ${searchRes.statusText}`);
    const { status, searchresult } = await searchRes.json();
    if (status !== "OK" || !Array.isArray(searchresult) || searchresult.length === 0) {
      throw new Error("No bills returned from LegiScan");
    }

    const billsToProcess = searchresult.slice(0, 20);

    for (const summary of billsToProcess) {
      try {
        // get detail
        const detailRes = await fetch(
          `https://api.legiscan.com/?key=${legiscanApiKey}&op=getBill&id=${summary.bill_id}`
        );
        if (!detailRes.ok) continue;
        const detailJson = await detailRes.json();
        if (detailJson.status !== "OK" || !detailJson.bill) continue;
        const bill: any = detailJson.bill;

        // skip if already exists
        const { data: existing } = await supabase
          .from("bills")
          .select("id")
          .eq("legiscan_id", bill.bill_id)
          .single();
        if (existing) continue;

        // analyze with Gemini
        console.log(`Analyzing ${bill.bill_id}`);
        const analysis = await analyzeWithGemini(bill, geminiApiKey);

        // insert bill
        const { data: inserted, error: insertErr } = await supabase
          .from("bills")
          .insert({
            legiscan_id:           bill.bill_id,
            title:                 bill.title || bill.bill_number,
            description:           bill.description || "",
            sponsor_name:          bill.sponsors?.[0]?.name || "",
            sponsor_party:         bill.sponsors?.[0]?.party || "",
            sponsor_state:         bill.sponsors?.[0]?.state || "",
            introduced_date:       bill.introduced,
            last_action:           bill.last_action,
            last_action_date:      bill.last_action_date,
            estimated_decision_date: analysis.estimatedDecisionDate,
            passing_likelihood:    analysis.passingLikelihood,
            status:                mapLegiScanStatus(bill.status),
            chamber:               bill.chamber === "H" ? "house" : "senate",
            document_url:          bill.url,
            raw_legiscan_data:     bill,
            gemini_analysis:       analysis,
          })
          .select()
          .single();
        if (insertErr) {
          console.error("Insert bill error:", insertErr);
          continue;
        }

        // insert stock predictions
        if (analysis.affectedStocks.length) {
          const stockRows = analysis.affectedStocks.map((s: any) => ({
            bill_id:            inserted.id,
            symbol:             s.symbol,
            company_name:       s.companyName,
            predicted_direction: s.predictedDirection,
            confidence:         s.confidence,
            reasoning:          s.reasoning,
          }));
          const { error: stockErr } = await supabase
            .from("stock_predictions")
            .insert(stockRows);
          if (stockErr) console.error("Insert stocks error:", stockErr);
        }

        // throttle
        await new Promise((r) => setTimeout(r, 1000));
      } catch (innerErr) {
        console.error("Error in bill loop:", innerErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fetch-bills error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Extracts analysis via Gemini */
async function analyzeWithGemini(bill: any, apiKey: string) {
  const prompt = `
Analyze this legislative bill and respond with JSON:
{
  "passingLikelihood": number (1-99),
  "estimatedDecisionDate": "YYYY-MM-DD",
  "affectedStocks": [
    {
      "symbol": "…",
      "companyName": "…",
      "predictedDirection": "up"|"down",
      "confidence": number (1-99),
      "reasoning": "…"
    }
  ]
}
Bill:
Title: ${bill.title}
…etc.
`;
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!resp.ok) throw new Error(resp.statusText);
    const { candidates } = await resp.json();
    const text = candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
    return {
      passingLikelihood:    Math.min(99, Math.max(1, json.passingLikelihood || 1)),
      estimatedDecisionDate: json.estimatedDecisionDate || new Date(Date.now() + 90*86400000).toISOString().split("T")[0],
      affectedStocks:       (json.affectedStocks || []).slice(0, 5),
    };
  } catch {
    return { passingLikelihood: 25, estimatedDecisionDate: new Date(Date.now()+90*86400000).toISOString().split("T")[0], affectedStocks: [] };
  }
}

/** Map LegiScan status code to string */
function mapLegiScanStatus(code: number) {
  switch (code) {
    case 1: return "introduced";
    case 2: return "committee";
    case 3: return "floor";
    case 4: return "passed";
    case 5: return "failed";
    default: return "introduced";
  }
}

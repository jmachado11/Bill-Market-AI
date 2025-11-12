// supabase/functions/analyze-bills-test/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    console.log("analyze-bills-test started");

    const SUPA_URL = Deno.env.get("SUPABASE_URL");
    const SUPA_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!SUPA_URL || !SUPA_ROLE || !GEMINI_KEY) {
      throw new Error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY");
    }

    const db = createClient(SUPA_URL, SUPA_ROLE);
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

    // Pull only test bills that haven't been analyzed
    const { data: bills, error: fetchErr } = await db
      .from("bills_test")
      .select("id,legiscan_id,title,description")
      .is("affected_stock_ids", null);

    if (fetchErr) throw fetchErr;
    if (!bills || bills.length === 0) {
      return new Response(JSON.stringify({ message: "No bills_test to analyze" }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const BATCH_SIZE = 10;
    const processed: number[] = [];
    const todayStr = new Date().toISOString().split("T")[0];

    for (let i = 0; i < bills.length; i += BATCH_SIZE) {
      const batch = bills.slice(i, i + BATCH_SIZE);
      const billsPayload = batch.map((b) => ({
        legiscan_id: b.legiscan_id,
        title: b.title,
        description: b.description?.slice(0, 500) ?? "",
      }));

      const prompt = `
Analyze these ${billsPayload.length} bills. Return ONLY a JSON array of objects (no markdown). Do not include any text before or after the array.

You MUST include exactly 1 publicly traded U.S. stocks for each bill, even if the predicted impact is uncertain. Always choose "up" or "down".
"estimatedDecisionDate" must be > ${todayStr} and within 1 year (YYYY-MM-DD).

Schema:
[
  {
    "legiscan_id": number,
    "passingLikelihood": number,       // 0..1
    "estimatedDecisionDate": "YYYY-MM-DD",
    "affectedStocks": [
      { "symbol": string, "companyName": string, "predictedDirection": "up"|"down", "confidence": number, "reasoning": string }
    ]
  }
]
Bills:
${JSON.stringify(billsPayload)}
`.trim();

      const resp = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.0, maxOutputTokens: 10000 },
        }),
      });
      if (!resp.ok) {
        const errTxt = await resp.text();
        throw new Error(`Gemini API error ${resp.status}: ${errTxt}`);
      }

      const raw = await resp.json();
      let text = raw.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      text = text
        .replace(/```(?:json)?/gi, "")
        .replace(/^json\s*/i, "")
        .replace(/^\s*[\r\n]+/, "")
        .replace(/\s*```$/, "")
        .trim();

      let analyses: any[] = [];
      try {
        const parsed = JSON.parse(text);
        analyses = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        console.error("parse error:", text);
        throw e;
      }

      for (const bill of batch) {
        const a = analyses.find(x => x.legiscan_id === bill.legiscan_id);
        if (!a) { console.warn("no analysis for", bill.legiscan_id); continue; }

        // insert up to 5 predictions into stock_predictions_test
        let affectedIds: string[] = [];
        if (Array.isArray(a.affectedStocks)) {
          const rows = a.affectedStocks.slice(0,5).map((s:any)=>({
            bill_id: bill.id,
            symbol: s.symbol,
            company_name: s.companyName,
            predicted_direction: s.predictedDirection,
            confidence: s.confidence,
            reasoning: s.reasoning,
          }));
          const { data: ins, error: insErr } = await db
            .from("stock_predictions_test")
            .insert(rows)
            .select("id");
          if (!insErr && ins) affectedIds = ins.map(r=>r.id);
          else if (insErr) console.error("insert stock_predictions_test error:", insErr);
        }

        const { error: updErr } = await db
          .from("bills_test")
          .update({
            passing_likelihood: a.passingLikelihood,
            estimated_decision_date: a.estimatedDecisionDate,
            affected_stock_ids: affectedIds,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bill.id);

        if (!updErr) processed.push(bill.legiscan_id);
        else console.error("update bills_test error:", updErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Analyzed & updated ${processed.length} bills_test.`,
      processed_legiscan_ids: processed
    }), { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (error:any) {
    console.error("analyze-bills-test error:", error);
    return new Response(JSON.stringify({ success:false, error: error.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

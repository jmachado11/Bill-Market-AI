import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    console.log("analyze-bills function started.");

    // Read environment variables
    const SUPA_URL = Deno.env.get("SUPABASE_URL");
    const SUPA_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!SUPA_URL || !SUPA_ROLE || !GEMINI_KEY) {
      throw new Error(
        "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY"
      );
    }

    // Initialize Supabase client
    const db = createClient(SUPA_URL, SUPA_ROLE);
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

    // Fetch all bills without analysis
    const { data: bills, error: fetchErr } = await db
      .from("bills")
      .select("id,legiscan_id,title,description")
      .is("affected_stock_ids", null);

    if (fetchErr) {
      console.error("Supabase fetch error:", fetchErr);
      throw fetchErr;
    }
    if (!bills || bills.length === 0) {
      console.log("No bills to analyze.");
      return new Response(JSON.stringify({ message: "No bills to analyze" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    console.log(`Fetched ${bills.length} bills for analysis.`);

    const BATCH_SIZE = 10;
    const processedLegiscanIds: number[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; 
    // Process bills in batches of 10
    for (let i = 0; i < bills.length; i += BATCH_SIZE) {
      const batch = bills.slice(i, i + BATCH_SIZE);

      // Build a tiny prompt just for these 10
      const billsPayload = batch.map((b) => ({
        legiscan_id: b.legiscan_id,
        title: b.title,
        description: b.description?.slice(0, 500) ?? "",
      }));
const prompt = `
Analyze these ${billsPayload.length} bills. Return ONLY a JSON array of objects (no markdown). Do not include any text before or after the array.

You MUST include exactly 5 publicly traded U.S. stocks for each bill, even if the predicted impact is uncertain. Do not use "none", "neutral", or skip any. You must choose either "up" or "down" for each stock's predictedDirection based on the most likely directional effect, even if confidence is low.

The "estimatedDecisionDate" MUST:
- Be strictly later than ${todayStr}
- Be within 1 year from today
- Follow the format YYYY-MM-DD

Each object must follow this exact structure:
[
  {
    "legiscan_id": number,
    "passingLikelihood": number, // between 0 and 1
    "estimatedDecisionDate": "YYYY-MM-DD", //must be in the future
    "affectedStocks": [
      {
        "symbol": string, // real U.S. stock ticker
        "companyName": string,
        "predictedDirection": "up" | "down", // no "neutral"
        "confidence": number, // between 0 and 1
        "reasoning": string // 1-2 sentence explanation
      }
    ]
  }
]

If you're unsure about a stock’s directional impact, make your best judgment based on the bill’s content and still assign "up" or "down" with a low confidence score.

Bills:
${JSON.stringify(billsPayload)}
`.trim();


      console.log(`Calling Gemini for bills ${i + 1}-${i + batch.length}…`);
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
        console.error(`Gemini API error ${resp.status}: ${errTxt}`);
        throw new Error(`Gemini API error ${resp.status}`);
      }

      const raw = await resp.json();
      let text = raw.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      text = text
        .replace(/```(?:json)?/gi, "")
        .replace(/^json\s*/i, "")
        .replace(/^\s*[\r\n]+/, "")
        .replace(/\s*```$/, "")
        .trim();

      let analysesBatch: any[];
      try {
        analysesBatch = JSON.parse(text);
        if (!Array.isArray(analysesBatch)) {
          analysesBatch = [analysesBatch];
        }
        console.log(`Parsed ${analysesBatch.length} analyses in this batch.`);
      } catch (err) {
        console.error("Failed to parse batch JSON:", err);
        console.error("Problematic text:", text);
        throw err;
      }

      // Update each bill from this batch
      for (const bill of batch) {
        const analysis = analysesBatch.find(
          (a) => a.legiscan_id === bill.legiscan_id
        );
        if (!analysis) {
          console.warn(
            `No analysis for legiscan_id ${bill.legiscan_id}; skipping.`
          );
          continue;
        }

        // Insert up to 5 stock predictions
        let affectedStockIds: string[] = [];
        if (Array.isArray(analysis.affectedStocks)) {
          const rows = analysis.affectedStocks.slice(0, 5).map((s: any) => ({
            bill_id: bill.id,
            symbol: s.symbol,
            company_name: s.companyName,
            predicted_direction: s.predictedDirection,
            confidence: s.confidence,
            reasoning: s.reasoning,
          }));
          const { data: insertedData, error: insertErr } = await db
            .from("stock_predictions")
            .insert(rows)
            .select("id");
          if (insertErr) {
            console.error(
              `Error inserting stock predictions for ${bill.legiscan_id}:`,
              insertErr
            );
          } else {
            affectedStockIds = insertedData.map((r) => r.id);
          }
        }

        // Update the bill record
        const { error: updateErr } = await db
          .from("bills")
          .update({
            passing_likelihood: analysis.passingLikelihood,
            estimated_decision_date: analysis.estimatedDecisionDate,
            affected_stock_ids: affectedStockIds,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bill.id);

        if (updateErr) {
          console.error(`Error updating bill ${bill.legiscan_id}:`, updateErr);
        } else {
          console.log(`SUCCESS: Updated bill ${bill.legiscan_id}`);
          processedLegiscanIds.push(bill.legiscan_id);
        }
      }
    }

    // Only return once every batch is done
    return new Response(
      JSON.stringify({
        success: true,
        message: `Analyzed & updated ${processedLegiscanIds.length} bills.`,
        processed_legiscan_ids: processedLegiscanIds,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-bills unhandled error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors },
      }
    );
  }
});

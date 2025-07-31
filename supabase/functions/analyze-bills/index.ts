import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: analyze-bills
 * Fetches bills missing analysis, sends them to Gemini in a single query,
 * and stores results in Supabase, limiting stock predictions to 5 per bill.
 */
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

    // Fetch all bills without analysis
    const { data: bills, error: fetchErr } = await db
      .from("bills")
      .select("id,legiscan_id,title,description")
      .is('affected_stock_ids', null);

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

    // Prepare Gemini prompt for all bills
    const billsPayload = bills.map((bill) => ({
      legiscan_id: bill.legiscan_id,
      title: bill.title,
      description: bill.description,
    }));

    // Explicitly ask for an array of JSON objects
    const prompt = `Analyze the following bills and return an array of JSON objects, one for each bill, in this exact JSON format without any extra text or code blocks. For each bill, give me at most 5 affectedStocks.

Bills:
${JSON.stringify(billsPayload)}

Schema:
[
  {
    "legiscan_id": number,
    "passingLikelihood": number (0-1),
    "estimatedDecisionDate": "YYYY-MM-DD",
    "affectedStocks": [
      {
        "symbol": string,
        "companyName": string,
        "predictedDirection": "up" | "down",
        "confidence": number (0-1),
        "reasoning": string
      }
    ]
  }
]

Output only valid JSON. Do not wrap it in triple backticks or say anything else.`;

    // Call Gemini generateText endpoint
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
    console.log("Calling Gemini API...");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
            role: "user",
          },
        ],
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 2048, // Increased for potentially larger outputs
        },
      }),
    });

    if (!response.ok) {
      const errTxt = await response.text();
      console.error(`Gemini API error ${response.status}: ${errTxt}`);
      throw new Error(`Gemini API error ${response.status}: ${errTxt}`);
    }

    const raw = await response.json();
    let text = raw.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    console.log("Raw Gemini response (first part):", raw);
    console.log("Extracted text from Gemini:", text);

    // Clean up potential Markdown formatting or extra text
    text = text
      .replace(/^json\s*/, "") // Remove 'json' if Gemini adds it
      .replace(/```/g, "")     // Remove triple backticks
      .trim();

    let analyses: any[];
    try {
      analyses = JSON.parse(text);
      if (!Array.isArray(analyses)) {
        console.warn("Gemini output was not an array. Attempting to wrap if it's a single object.");
        // If Gemini returns a single object instead of an array, wrap it.
        if (typeof analyses === 'object' && analyses !== null) {
            analyses = [analyses];
        } else {
            throw new Error("Gemini output is not a valid array or single object.");
        }
      }
      console.log(`Parsed ${analyses.length} analyses from Gemini.`);
    } catch (err) {
      console.error("Failed to parse Gemini JSON output:", err);
      // Log the problematic text for debugging
      console.error("Problematic text:", text);
      throw new Error(`Failed to parse Gemini JSON output: ${err.message}`);
    }

    const processedLegiscanIds: number[] = [];

    // Process each bill fetched from Supabase
    for (const bill of bills) {
      const analysis = analyses.find(
        (a: any) => a.legiscan_id === bill.legiscan_id
      );

      if (!analysis) {
        console.warn(
          `No analysis found in Gemini's response for bill with legiscan_id: ${bill.legiscan_id}. Skipping bill update.`
        );
        continue; // Skip this bill if no corresponding analysis was found
      }

      let affectedStockIds: number[] = [];
      if (
        Array.isArray(analysis.affectedStocks) &&
        analysis.affectedStocks.length
      ) {
        // Limit to at most 5 stock predictions per bill
        const rows = analysis.affectedStocks.slice(0, 5).map((s: any) => ({
          bill_id: bill.id,
          symbol: s.symbol,
          company_name: s.companyName,
          predicted_direction: s.predictedDirection,
          confidence: s.confidence,
          reasoning: s.reasoning,
        }));

        const { data: insertedData, error: insertError } = await db
          .from("stock_predictions")
          .insert(rows)
          .select("id");

        if (insertError) {
          console.error(
            `Error inserting stock predictions for bill ${bill.id} (legiscan_id: ${bill.legiscan_id}):`,
            insertError
          );
          // Decide whether to throw or continue. For robustness, we'll continue trying to update the bill.
        } else {
          affectedStockIds = insertedData.map((row) => row.id);
          console.log(`Inserted ${affectedStockIds.length} stock predictions for bill ${bill.legiscan_id}.`);
        }
      }

      const { error: updateError } = await db
        .from("bills")
        .update({
          passing_likelihood: analysis.passingLikelihood,
          estimated_decision_date: analysis.estimatedDecisionDate,
          affected_stock_ids: affectedStockIds,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bill.id);

      if (updateError) {
        console.error(
          `Error updating bill ${bill.id} (legiscan_id: ${bill.legiscan_id}):`,
          updateError
        );
      } else {
        // --- LOG TO CONSOLE ON SUCCESS ---
        console.log(`SUCCESS: Bill ${bill.legiscan_id} analysis and update completed.`);
        // --- END LOG ---
        processedLegiscanIds.push(bill.legiscan_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully analyzed and updated ${processedLegiscanIds.length} bills.`,
        processed_legiscan_ids: processedLegiscanIds,
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
      }
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
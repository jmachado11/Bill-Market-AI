import "https://deno.land/x/xhr@0.1.0/mod.ts"; // Required for XHR in Deno deploy environments
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.11.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (_req) => {
  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    console.log("Running analysis");
    if (!geminiApiKey || !supabaseUrl || !serviceKey) {
      throw new Error("Missing required environment variable(s).");
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });

    const { data: bills, error: fetchError } = await supabase
      .from("bills")
      .select("*")
      .or(
        "passing_likelihood.is.null,estimated_decision_date.is.null,affected_stock_ids.is.null"
      );
    if (fetchError || !bills || bills.length === 0) {
      console.log("Fetch error");
      return new Response(JSON.stringify({ error: "No bills to analyze." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STEP 1: Create the prompt
    const prompt = bills
      .map(
        (bill, idx) => `### Bill ${idx + 1}
ID: ${bill.id}
Title: ${bill.title}
Description: ${bill.description}
Status: ${bill.status}
Chamber: ${bill.chamber}
Sponsor Party: ${bill.sponsor_party}
Introduced Date: ${bill.introduced_date}
Last Action: ${bill.last_action} on ${bill.last_action_date}
Raw Legiscan Data: ${JSON.stringify(bill.raw_legiscan_data?.history || [])}`
      )
      .join("\n\n");

    // STEP 2: Ask Gemini to analyze all bills
    const billAnalysisPrompt = `
You are a legislative analyst. Analyze the following bills and for each:
- Predict a passing likelihood (0-100)
- Provide an estimated decision date (YYYY-MM-DD)
- Identify affected stocks (max 5 per bill). For each stock, return:
  - symbol
  - companyName
  - predictedDirection (up or down)
  - confidence (0-100)
  - reasoning

Return a JSON array in this format:
[
  {
    billId: string,
    passingLikelihood: number,
    estimatedDecisionDate: string,
    affectedStocks: [
      {
        symbol: string,
        companyName: string,
        predictedDirection: "up" | "down",
        confidence: number,
        reasoning: string
      }
    ]
  }
]

Bills:
${prompt}`.trim();

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: billAnalysisPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });
    const responseText = result.response
      .text()
      .replace(/```json\n?|```/g, "")
      .trim();
    const analysisResults = JSON.parse(responseText);

    let updatedCount = 0;

    for (const result of analysisResults) {
      const {
        billId,
        passingLikelihood,
        estimatedDecisionDate,
        affectedStocks,
      } = result;

      // STEP 3: Insert stock predictions and collect their IDs
      const stockIds: string[] = [];
      for (const stock of affectedStocks || []) {
        const { data: insertedStock, error: insertError } = await supabase
          .from("stock_predictions")
          .insert([{ ...stock, billId }])
          .select("id")
          .single();

        if (insertError) {
          console.error(
            `Failed to insert stock prediction for ${billId}`,
            insertError
          );
        } else {
          stockIds.push(insertedStock.id);
        }
      }

      // STEP 4: Update the bill with analysis + stock IDs
      const { error: updateError } = await supabase
        .from("bills")
        .update({
          passing_likelihood: Math.round(passingLikelihood),
          estimated_decision_date: estimatedDecisionDate,
          affected_stocks_id: stockIds,
        })
        .eq("id", billId);

      if (updateError) {
        console.error(`Failed to update bill ${billId}`, updateError);
      } else {
        updatedCount++;
        console.log(`Updated bill ${billId}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, analyzed: updatedCount }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[bulk-analyze-bills] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

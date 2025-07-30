import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: analyze-first-bill
 * Fetches the first bill missing analysis, sends it to Gemini, and stores results in Supabase.
 */
serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    // Read environment variables
    const SUPA_URL = Deno.env.get('SUPABASE_URL');
    const SUPA_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!SUPA_URL || !SUPA_ROLE || !GEMINI_KEY) {
      throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY');
    }

    // Initialize Supabase client
    const db = createClient(SUPA_URL, SUPA_ROLE);

    // Fetch one bill without analysis
    const { data: bill, error: fetchErr } = await db
      .from('bills')
      .select('id,legiscan_id,title,description')
      .is('gemini_analysis', null)
      .limit(1)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!bill) {
      return new Response(JSON.stringify({ message: 'No bills to analyze' }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // Prepare Gemini prompt
    const payload = {
      legiscan_id: bill.legiscan_id,
      title: bill.title,
      description: bill.description
    };
    const prompt =
      `Analyze this single bill and return exact JSON format:\n${JSON.stringify(payload)}\n` +
      `Schema:{"legiscan_id":number,"passingLikelihood":number(0-1),` +
      `"estimatedDecisionDate":"YYYY-MM-DD","affectedStocks":[{` +
      `"symbol":string,"companyName":string,` +
      `"predictedDirection":"positive"|"negative"|"neutral",` +
      `"confidence":number(0-1),"reasoning":string}]}`;

    // Call Gemini generateText endpoint
    const url =
      `https://generativelanguage.googleapis.com/v1beta2/models/gemini-2.5-pro:generateText?key=${GEMINI_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ text: prompt }],
        parameters: { temperature: 0.0, maxOutputTokens: 512 }
      })
    });
    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errTxt}`);
    }

    // Parse LLM response
    const json = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid JSON from Gemini');
    const analysis = JSON.parse(match[0]);

    // Update bill record
    await db.from('bills')
      .update({
        gemini_analysis:         analysis,
        passing_likelihood:      analysis.passingLikelihood,
        estimated_decision_date: analysis.estimatedDecisionDate,
        updated_at:              new Date().toISOString()
      })
      .eq('id', bill.id);

    // Insert stock predictions
    if (Array.isArray(analysis.affectedStocks) && analysis.affectedStocks.length) {
      const rows = analysis.affectedStocks.slice(0, 3).map((s: any) => ({
        bill_id:            bill.id,
        symbol:             s.symbol,
        company_name:       s.companyName,
        predicted_direction:s.predictedDirection,
        confidence:         s.confidence,
        reasoning:          s.reasoning
      }));
      await db.from('stock_predictions').insert(rows);
    }

    // Return success
    return new Response(JSON.stringify({ success: true, legiscan_id: bill.legiscan_id }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('analyze-first-bill error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...cors }
    });
  }
});


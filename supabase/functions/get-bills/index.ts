import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Fetch bills with their stock predictions
    const { data: bills, error } = await supabase
      .from('bills')
      .select(`
        *,
        stock_predictions (*)
      `)
      .order('introduced_date', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform data to match frontend Bill interface
    const transformedBills = bills.map(bill => ({
      id: bill.id,
      title: bill.title,
      description: bill.description,
      sponsor: {
        name: bill.sponsor_name,
        party: bill.sponsor_party,
        state: bill.sponsor_state
      },
      introducedDate: bill.introduced_date,
      lastAction: bill.last_action,
      lastActionDate: bill.last_action_date,
      estimatedDecisionDate: bill.estimated_decision_date,
      passingLikelihood: bill.passing_likelihood,
      status: bill.status,
      chamber: bill.chamber,
      documentUrl: bill.document_url,
      affectedStocks: bill.stock_predictions.map((stock: any) => ({
        symbol: stock.symbol,
        companyName: stock.company_name,
        predictedDirection: stock.predicted_direction,
        confidence: stock.confidence,
        reasoning: stock.reasoning
      }))
    }));

    return new Response(
      JSON.stringify(transformedBills),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-bills function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
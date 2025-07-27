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
    console.log('get-bills function called');
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    console.log('Supabase client initialized');

    // Fetch bills with their stock predictions
    console.log('Fetching bills from database...');
    const { data: bills, error } = await supabase
      .from('bills')
      .select(`
        *,
        stock_predictions (*)
      `)
      .order('introduced_date', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    console.log(`Found ${bills?.length || 0} bills in database`);

    // If no bills found, trigger the fetch process
    if (!bills || bills.length === 0) {
      console.log('No bills found, triggering fetch...');
      
      // Call fetch-bills function to populate data
      const fetchResponse = await supabase.functions.invoke('fetch-bills');
      
      if (fetchResponse.error) {
        console.error('Error calling fetch-bills:', fetchResponse.error);
      } else {
        console.log('Fetch-bills completed:', fetchResponse.data);
        
        // Fetch bills again after populating
        const { data: newBills, error: newError } = await supabase
          .from('bills')
          .select(`
            *,
            stock_predictions (*)
          `)
          .order('introduced_date', { ascending: false });
          
        if (!newError && newBills) {
          console.log(`Found ${newBills.length} bills after fetch`);
          bills = newBills;
        }
      }
    }

    // Transform data to match frontend Bill interface
    const transformedBills = (bills || []).map(bill => ({
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
      affectedStocks: (bill.stock_predictions || []).map((stock: any) => ({
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
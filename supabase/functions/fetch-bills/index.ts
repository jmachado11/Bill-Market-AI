import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LegiScanBill {
  bill_id: number;
  bill_number: string;
  title: string;
  description: string;
  status: number;
  status_date: string;
  introduced: string;
  last_action: string;
  last_action_date: string;
  chamber: string;
  sponsors: Array<{
    name: string;
    party: string;
    state: string;
  }>;
  url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const legiscanApiKey = Deno.env.get('LEGISCAN_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!legiscanApiKey || !geminiApiKey) {
      throw new Error('Missing API keys');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    console.log('Fetching recent bills from LegiScan...');
    
    // Fetch recent bills from LegiScan
    const legiscanResponse = await fetch(
      `https://api.legiscan.com/?key=${legiscanApiKey}&op=getSearchRaw&year=2024&query=*`
    );
    
    if (!legiscanResponse.ok) {
      throw new Error(`LegiScan API error: ${legiscanResponse.statusText}`);
    }
    
    const legiscanData = await legiscanResponse.json();
    console.log('LegiScan response status:', legiscanData.status);
    
    if (legiscanData.status !== 'OK' || !legiscanData.searchresult) {
      throw new Error('Invalid LegiScan response');
    }

    const bills = legiscanData.searchresult.slice(0, 20); // Process first 20 bills
    console.log(`Processing ${bills.length} bills...`);

    for (const billSummary of bills) {
      try {
        // Get detailed bill information
        const billDetailResponse = await fetch(
          `https://api.legiscan.com/?key=${legiscanApiKey}&op=getBill&id=${billSummary.bill_id}`
        );
        
        if (!billDetailResponse.ok) {
          console.log(`Failed to fetch bill ${billSummary.bill_id}`);
          continue;
        }
        
        const billDetailData = await billDetailResponse.json();
        
        if (billDetailData.status !== 'OK' || !billDetailData.bill) {
          console.log(`Invalid bill data for ${billSummary.bill_id}`);
          continue;
        }
        
        const bill = billDetailData.bill;
        
        // Check if bill already exists
        const { data: existingBill } = await supabase
          .from('bills')
          .select('id')
          .eq('legiscan_id', bill.bill_id)
          .single();
        
        if (existingBill) {
          console.log(`Bill ${bill.bill_id} already exists, skipping...`);
          continue;
        }

        // Analyze with Gemini
        console.log(`Analyzing bill ${bill.bill_id} with Gemini...`);
        const analysis = await analyzeWithGemini(bill, geminiApiKey);
        
        // Prepare bill data for insertion
        const billData = {
          legiscan_id: bill.bill_id,
          title: bill.title || bill.bill_number,
          description: bill.description || bill.title,
          sponsor_name: bill.sponsors?.[0]?.name || 'Unknown',
          sponsor_party: bill.sponsors?.[0]?.party || 'Unknown',
          sponsor_state: bill.sponsors?.[0]?.state || 'Unknown',
          introduced_date: bill.introduced || new Date().toISOString().split('T')[0],
          last_action: bill.last_action || 'Introduced',
          last_action_date: bill.last_action_date || bill.introduced,
          estimated_decision_date: analysis.estimatedDecisionDate,
          passing_likelihood: analysis.passingLikelihood,
          status: mapLegiScanStatus(bill.status),
          chamber: bill.chamber === 'H' ? 'house' : 'senate',
          document_url: bill.url,
          raw_legiscan_data: bill,
          gemini_analysis: analysis
        };

        // Insert bill
        const { data: insertedBill, error: billError } = await supabase
          .from('bills')
          .insert(billData)
          .select()
          .single();

        if (billError) {
          console.error(`Error inserting bill ${bill.bill_id}:`, billError);
          continue;
        }

        // Insert stock predictions
        if (analysis.affectedStocks?.length > 0) {
          const stockPredictions = analysis.affectedStocks.map((stock: any) => ({
            bill_id: insertedBill.id,
            symbol: stock.symbol,
            company_name: stock.companyName,
            predicted_direction: stock.predictedDirection,
            confidence: stock.confidence,
            reasoning: stock.reasoning
          }));

          const { error: stockError } = await supabase
            .from('stock_predictions')
            .insert(stockPredictions);

          if (stockError) {
            console.error(`Error inserting stock predictions for bill ${bill.bill_id}:`, stockError);
          }
        }

        console.log(`Successfully processed bill ${bill.bill_id}`);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error processing bill ${billSummary.bill_id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${bills.length} bills` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-bills function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function analyzeWithGemini(bill: any, apiKey: string) {
  const prompt = `
Analyze this legislative bill and provide a JSON response with the following structure:
{
  "passingLikelihood": number (0-100),
  "estimatedDecisionDate": "YYYY-MM-DD",
  "affectedStocks": [
    {
      "symbol": "STOCK_SYMBOL",
      "companyName": "Company Name",
      "predictedDirection": "up" | "down",
      "confidence": number (0-100),
      "reasoning": "Brief explanation"
    }
  ]
}

Bill Details:
Title: ${bill.title}
Description: ${bill.description}
Status: ${bill.status}
Last Action: ${bill.last_action}
Chamber: ${bill.chamber}
Sponsors: ${JSON.stringify(bill.sponsors)}

Consider factors like:
- Historical passage rates for similar bills
- Current political climate
- Bill complexity and scope
- Sponsor influence and party alignment
- Industry impact and lobbying pressure

Provide realistic stock predictions for publicly traded companies that would be significantly affected by this legislation. Focus on major companies with clear connections to the bill's subject matter.
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No response from Gemini');
    }

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // Validate and set defaults
    return {
      passingLikelihood: Math.min(100, Math.max(0, analysis.passingLikelihood || 20)),
      estimatedDecisionDate: analysis.estimatedDecisionDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      affectedStocks: (analysis.affectedStocks || []).slice(0, 5) // Limit to 5 stocks
    };
  } catch (error) {
    console.error('Error analyzing with Gemini:', error);
    // Return default analysis if Gemini fails
    return {
      passingLikelihood: 25,
      estimatedDecisionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      affectedStocks: []
    };
  }
}

function mapLegiScanStatus(status: number): string {
  // Map LegiScan status codes to our status values
  switch (status) {
    case 1: return 'introduced';
    case 2: return 'committee';
    case 3: return 'floor';
    case 4: return 'passed';
    case 5: return 'failed';
    default: return 'introduced';
  }
}
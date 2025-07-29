import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration with logging
const CONFIG = {
  CHUNK_SIZE: 5,
  MAX_RETRIES: 5,
  BASE_DELAY_MS: 2000,
  MODEL_PRIORITY: [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro'
  ],
  LOG_LEVEL: 'debug' // 'debug' | 'info' | 'warn' | 'error'
};

function log(level: string, message: string, data?: any) {
  const levels = ['debug', 'info', 'warn', 'error'];
  if (levels.indexOf(level) >= levels.indexOf(CONFIG.LOG_LEVEL)) {
    console[level](`[${new Date().toISOString()}] ${message}`, data || '');
  }
}

function delay(ms: number) {
  const jitter = Math.floor(Math.random() * ms * 0.2);
  const delayTime = ms + jitter;
  log('debug', `Delaying for ${delayTime}ms (base: ${ms}ms, jitter: ${jitter}ms)`);
  return new Promise((resolve) => setTimeout(resolve, delayTime));
}

async function fetchWithRetry(
  apiKey: string,
  model: string,
  prompt: string,
  attempt = 1
): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  log('debug', `Attempt ${attempt} with model ${model}`, {
    url: url.replace(apiKey, 'REDACTED'),
    promptLength: prompt.length
  });

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });
    const duration = Date.now() - startTime;

    log('debug', `API Response (${duration}ms)`, {
      status: response.status,
      statusText: response.statusText,
      model,
      attempt
    });

    if (response.status === 503) {
      throw new Error(`Model overloaded (503)`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      log('error', `API Error Response`, {
        status: response.status,
        errorText,
        model,
        attempt
      });
      throw new Error(`API error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const responseData = await response.json();
    log('debug', `API Success Response`, {
      model,
      attempt,
      responseKeys: Object.keys(responseData)
    });

    return responseData;
  } catch (error) {
    log('warn', `Fetch Error`, {
      model,
      attempt,
      error: error.message
    });

    if (attempt >= CONFIG.MAX_RETRIES) {
      log('error', `Max retries exceeded for model ${model}`);
      throw error;
    }
    
    const delayMs = CONFIG.BASE_DELAY_MS * Math.pow(2, attempt - 1);
    log('info', `Retrying in ${delayMs}ms...`);
    await delay(delayMs);
    return fetchWithRetry(apiKey, model, prompt, attempt + 1);
  }
}

async function analyzeWithFallback(
  apiKey: string,
  prompt: string
): Promise<any> {
  let lastError: Error | null = null;

  log('info', `Starting analysis with fallback models`, {
    models: CONFIG.MODEL_PRIORITY
  });

  for (const model of CONFIG.MODEL_PRIORITY) {
    try {
      log('info', `Attempting model ${model}`);
      const result = await fetchWithRetry(apiKey, model, prompt);
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      log('debug', `Raw response text`, {
        textPreview: text.substring(0, 100) + '...',
        textLength: text.length
      });

      if (!text.trim()) {
        throw new Error("Empty response from model");
      }
      
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      
      log('debug', `JSON extraction points`, {
        jsonStart,
        jsonEnd,
        hasJson: jsonStart !== -1 && jsonEnd !== 0
      });

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error("No JSON found in response");
      }

      const jsonText = text.slice(jsonStart, jsonEnd);
      log('debug', `Extracted JSON`, {
        jsonPreview: jsonText.substring(0, 100) + '...',
        jsonLength: jsonText.length
      });

      const parsed = JSON.parse(jsonText);
      log('info', `Successfully parsed response from ${model}`);
      return parsed;
    } catch (error) {
      lastError = error;
      log('warn', `Model ${model} failed`, {
        error: error.message,
        stack: error.stack
      });
      await delay(1000);
    }
  }

  log('error', `All models failed`, {
    errors: lastError?.message
  });
  throw lastError || new Error("All models failed");
}

async function processBillBatch(
  db: any,
  bills: any[],
  apiKey: string
): Promise<{processed: number, errors: any[]}> {
  const errors: any[] = [];
  let processed = 0;

  log('info', `Starting batch processing`, {
    totalBills: bills.length,
    chunkSize: CONFIG.CHUNK_SIZE
  });

  for (let i = 0; i < bills.length; i += CONFIG.CHUNK_SIZE) {
    const chunk = bills.slice(i, i + CONFIG.CHUNK_SIZE);
    log('info', `Processing chunk`, {
      chunkIndex: i / CONFIG.CHUNK_SIZE + 1,
      totalChunks: Math.ceil(bills.length / CONFIG.CHUNK_SIZE),
      billsInChunk: chunk.length,
      firstBillId: chunk[0]?.legiscan_id
    });

    const chunkPrompt = createPrompt(chunk);
    log('debug', `Chunk prompt created`, {
      promptPreview: chunkPrompt.substring(0, 100) + '...',
      promptLength: chunkPrompt.length
    });

    try {
      const analysis = await analyzeWithFallback(apiKey, chunkPrompt);
      log('info', `Chunk analysis completed`, {
        itemsAnalyzed: analysis.length
      });

      for (const item of analysis) {
        try {
          log('debug', `Processing bill analysis`, {
            legiscan_id: item.legiscan_id,
            passingLikelihood: item.passingLikelihood,
            stocksCount: item.affectedStocks?.length || 0
          });

          await updateBill(db, item);
          processed++;
          log('debug', `Bill processed successfully`, {
            legiscan_id: item.legiscan_id
          });
        } catch (error) {
          log('error', `Failed to process bill`, {
            legiscan_id: item.legiscan_id,
            error: error.message
          });
          errors.push({
            legiscan_id: item.legiscan_id,
            error: error.message
          });
        }
      }
      
      if (i + CONFIG.CHUNK_SIZE < bills.length) {
        log('info', `Chunk completed, adding delay before next chunk`);
        await delay(3000);
      }
    } catch (error) {
      log('error', `Failed to process entire chunk`, {
        chunkIndex: i / CONFIG.CHUNK_SIZE + 1,
        error: error.message
      });
      chunk.forEach(bill => {
        errors.push({
          legiscan_id: bill.legiscan_id,
          error: "Failed to analyze chunk"
        });
      });
    }
  }

  log('info', `Batch processing completed`, {
    processed,
    errors: errors.length
  });
  return { processed, errors };
}

function createPrompt(bills: any[]): string {
  const prompt = `STRICTLY output JSON for these bills:
${JSON.stringify(bills.map(b => ({
    legiscan_id: b.legiscan_id,
    title: b.title,
    description: b.description
  })))}

Output format:
[{
  "legiscan_id": number,
  "passingLikelihood": number (1-99),
  "estimatedDecisionDate": "YYYY-MM-DD",
  "affectedStocks": [{
    "symbol": string,
    "companyName": string,
    "predictedDirection": "up"|"down",
    "confidence": number (1-100),
    "reasoning": string
  }]
}]`;

  log('debug', `Created prompt`, {
    billCount: bills.length,
    promptLength: prompt.length
  });
  return prompt;
}

async function updateBill(db: any, analysis: any) {
  log('debug', `Updating bill in database`, {
    legiscan_id: analysis.legiscan_id
  });

  const { error } = await db.from('bills')
    .update({
      gemini_analysis: analysis,
      passing_likelihood: analysis.passingLikelihood,
      estimated_decision_date: analysis.estimatedDecisionDate,
      updated_at: new Date().toISOString()
    })
    .eq('legiscan_id', analysis.legiscan_id);

  if (error) {
    log('error', `Failed to update bill`, {
      legiscan_id: analysis.legiscan_id,
      error: error.message
    });
    throw error;
  }

  if (analysis.affectedStocks?.length) {
    log('debug', `Inserting stock predictions`, {
      count: analysis.affectedStocks.length
    });

    const { data, error: stockError } = await db.from('stock_predictions')
      .insert(analysis.affectedStocks.map((s: any) => ({
        bill_id: analysis.legiscan_id,
        symbol: s.symbol,
        company_name: s.companyName,
        predicted_direction: s.predictedDirection,
        confidence: s.confidence,
        reasoning: s.reasoning
      })))
      .select('id');

    if (stockError) {
      log('error', `Failed to insert stock predictions`, {
        legiscan_id: analysis.legiscan_id,
        error: stockError.message
      });
      throw stockError;
    }
  }

  log('debug', `Bill update completed`, {
    legiscan_id: analysis.legiscan_id
  });
}

serve(async (req) => {
  log('info', `Request received`, {
    method: req.method,
    url: req.url
  });

  if (req.method === "OPTIONS") {
    log('debug', `Handling OPTIONS request`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log('info', `Initializing Supabase client`);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!supabaseUrl || !serviceRole || !geminiKey) {
      const missing = [
        !supabaseUrl && 'SUPABASE_URL',
        !serviceRole && 'SUPABASE_SERVICE_ROLE_KEY',
        !geminiKey && 'GEMINI_API_KEY'
      ].filter(Boolean);
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }

    log('debug', `Environment variables verified`);
    const db = createClient(supabaseUrl, serviceRole);
    
    log('info', `Fetching unanalyzed bills`);
    const { data: bills, error } = await db.from('bills')
      .select('id,legiscan_id,title,description')
      .is('gemini_analysis', null)
      .limit(50);

    if (error) {
      log('error', `Database error fetching bills`, {
        error: error.message
      });
      throw error;
    }

    log('info', `Fetched bills`, {
      count: bills?.length || 0
    });

    if (!bills?.length) {
      log('info', `No bills to process`);
      return new Response(JSON.stringify({ message: 'No bills to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { processed, errors } = await processBillBatch(db, bills, geminiKey);

    log('info', `Request completed successfully`, {
      processed,
      errors: errors.length
    });

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed: errors.length,
      errors: errors.length ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    log('error', `Request failed`, {
      error: error.message,
      stack: error.stack
    });
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
      ...(CONFIG.LOG_LEVEL === 'debug' ? { stack: error.stack } : {})
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
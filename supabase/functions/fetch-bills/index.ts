import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Two-letter US State codes
const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("fetch-bills function started");

    const legiscanKey = Deno.env.get("LEGISCAN_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!legiscanKey || !supabaseUrl || !serviceKey) {
      throw new Error("Missing environment variable(s)");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    for (const state of STATES) {
      console.log(`\nProcessing state ${state}...`);

      // 1. Fetch master bill list for this state
      const masterRes = await fetch(
        `https://api.legiscan.com/?key=${legiscanKey}&op=getMasterListRaw&state=${state}`
      );
      if (!masterRes.ok) {
        console.warn(`Failed to fetch master list for ${state}: ${masterRes.status}`);
        continue;
      }
      const masterJson = await masterRes.json();
      if (masterJson.status !== 'OK' || !masterJson.masterlist) {
        console.warn(`No master list returned for ${state}`);
        continue;
      }

      // 2. Select the summary with the highest bill_id (most recently created)
      const summaries = Object.values(masterJson.masterlist) as any[];
      if (summaries.length === 0) continue;
      const mostRecent = summaries.reduce((prev, curr) =>
        curr.bill_id > prev.bill_id ? curr : prev
      );
      console.log(`Most recent bill for ${state}: ID=${mostRecent.bill_id}`);(`Most recent bill for ${state}: ID=${mostRecent.bill_id}, date=${mostRecent.status_date}`);

      // 3. Fetch full bill details
      let detailJson;
      try {
        const detailRes = await fetch(
          `https://api.legiscan.com/?key=${legiscanKey}&op=getBill&id=${mostRecent.bill_id}`
        );
        if (!detailRes.ok) throw new Error(`Detail fetch failed: ${detailRes.status}`);
        const detailData = await detailRes.json();
        if (detailData.status !== 'OK' || !detailData.bill) {
          throw new Error('Invalid bill detail');
        }
        detailJson = detailData.bill;
      } catch (e) {
        console.error(`Error fetching detail for bill ${mostRecent.bill_id}:`, e);
        continue;
      }

            // 4. No date filter: we already selected the most recent bill
            // 5. Skip if already exists (use maybeSingle to avoid errors on no rows)
      const { data: exists, error: existErr } = await supabase
        .from('bills')
        .select('id')
        .eq('legiscan_id', detailJson.bill_id)
        .maybeSingle();
      if (existErr) {
        console.error('Error checking existing bill:', existErr);
        continue;
      }
      if (exists) {
        console.log(`Bill ${detailJson.bill_id} already exists, skipping`);
        continue;
      }

      // 6. Insert into Supabase with state in description
      const { data: inserted, error: insertErr } = await supabase
        .from('bills')
        .insert({
          legiscan_id:       detailJson.bill_id,
          state:             state,
          title:             detailJson.title,
          description:       `[${state}] ${detailJson.description || ''}`,
          sponsor_name:      detailJson.sponsors?.[0]?.name ?? '',
          sponsor_party:     detailJson.sponsors?.[0]?.party ?? '',
          sponsor_state:     detailJson.sponsors?.[0]?.state ?? '',
          introduced_date:   detailJson.introduced?.split('T')[0] ?? '',
          last_action:       detailJson.last_action,
          last_action_date:  detailJson.last_action_date?.split('T')[0] ?? '',
          chamber:           detailJson.chamber === 'H' ? 'house' : 'senate',
          status:            detailJson.status,
          document_url:      detailJson.url,
          raw_legiscan_data: detailJson
        })
        .select()
        .single();

      if (insertErr) {
        console.error(`❌ Insert failed for bill ${detailJson.bill_id}:`, insertErr);
      } else {
        console.log(`✔️ Inserted bill id=${inserted.id}`);
      }

      // Throttle to avoid rate limits
      await new Promise(r => setTimeout(r, 500));(r => setTimeout(r, 500));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('fetch-bills error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});


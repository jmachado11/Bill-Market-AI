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

const statusMap: Record<number, string> = {
  0: 'Pre-Filed',
  1: 'Intro',
  2: 'Engross',
  3: 'Enroll',
  4: 'Pass',
  5: 'Vetoed',
  6: 'Failed',
  7: 'Overrated',
  8: 'Chaptered',
  9: 'Refer',
  10: 'Report Pass',
  11: 'Report DNS',
  12: 'Draft'
};

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
      throw new Error("Missing required environment variable(s)");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    for (const state of STATES) {
      console.log(`Processing state ${state}...`);

      // 1. Fetch master bill list for this state
      const masterRes = await fetch(
        `https://api.legiscan.com/?key=${legiscanKey}&op=getMasterListRaw&state=${state}`
      );
      if (!masterRes.ok) {
        console.warn(`Failed to fetch master list for ${state}: ${masterRes.status}`);
        continue;
      }
      const masterData = await masterRes.json();
      if (masterData.status !== 'OK' || !masterData.masterlist) {
        console.warn(`No master list returned for ${state}`);
        continue;
      }

      // 2. Select the summary with the most recent status_date
      const summaries = Object.values(masterData.masterlist) as any[];
      if (summaries.length === 0) continue;
      const mostRecent = summaries.reduce((prev, curr) =>
        curr.status_date > prev.status_date ? curr : prev
      );
      console.log(`Most recent bill for ${state}: ID=${mostRecent.bill_id}, status_date=${mostRecent.status_date}`);

      // 3. Fetch full bill details
      let bill: any;
      try {
        const detailRes = await fetch(
          `https://api.legiscan.com/?key=${legiscanKey}&op=getBill&id=${mostRecent.bill_id}`
        );
        if (!detailRes.ok) throw new Error(`Detail fetch failed: ${detailRes.status}`);
        const detailJson = await detailRes.json();
        if (detailJson.status !== 'OK' || !detailJson.bill) {
          throw new Error('Invalid bill detail');
        }
        bill = detailJson.bill;
      } catch (e) {
        console.error(`Error fetching detail for bill ${mostRecent.bill_id}:`, e);
        continue;
      }

      // 4. Skip if already exists
      const { data: exists, error: existErr } = await supabase
        .from('bills')
        .select('id')
        .eq('legiscan_id', bill.bill_id)
        .maybeSingle();
      if (existErr) {
        console.error('Error checking existing bill:', existErr);
        continue;
      }
      if (exists) {
        console.log(`Bill ${bill.bill_id} already exists, skipping`);
        continue;
      }

      // 5. Compute introduced_date
      let introducedDate: string;
      if (Array.isArray(bill.history) && bill.history.length > 0) {
        const historyArr = bill.history.filter((h: any) => h.importance);
        const arr = historyArr.length > 0 ? historyArr : bill.history;
        introducedDate = arr[arr.length - 1].date;
      } else {
        introducedDate = bill.introduced_date
          ?? (bill.introduced ? bill.introduced.split('T')[0] : new Date().toISOString().split('T')[0]);
      }

      // Compute last_action
      let last_event: string;
      if (Array.isArray(bill.history) && bill.history.length > 0) {
        last_event = bill.history[0].action;
      } else {
        last_event = `Went into ${statusMap[bill.status]}`;
      }

      // 6. Insert into Supabase
      const { data: inserted, error: insertErr } = await supabase
        .from('bills')
        .insert({
          legiscan_id:      bill.bill_id,
          title:            bill.title,
          description:      bill.description,
          sponsor_name:     bill.sponsors?.[0]?.name ?? '',
          sponsor_party:    (typeof bill.sponsors?.[0]?.party === 'string' && bill.sponsors[0].party.trim()) ? bill.sponsors[0].party : 'None',
          sponsor_state:    bill.state ?? '',
          introduced_date:  introducedDate,
          last_action:      last_event,
          last_action_date: bill.status_date,
          status:           statusMap[bill.status] ?? 'Veto',
          chamber:          bill.chamber === 'H' ? 'house' : 'senate',
          document_url:     bill.url,
          raw_legiscan_data: bill
        })
        .select()
        .single();

      if (insertErr) {
        console.error(`❌ Insert failed for bill ${bill.bill_id}:`, insertErr);
      } else {
        console.log(`✔️ Inserted bill id=${inserted.id}`);
      }

      // Throttle to avoid rate limits
      await new Promise((r) => setTimeout(r, 500));
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

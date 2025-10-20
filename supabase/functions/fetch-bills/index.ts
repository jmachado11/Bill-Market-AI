import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const TARGET_NEW = 50; // <= add up to 50 NEW bills per invocation

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

    // 1) Build a global candidate list of (bill_id, status_date, state), newest first.
    type Candidate = { bill_id: number; status_date: string; state: string };
    const candidates: Candidate[] = [];

    for (const state of STATES) {
      console.log(`Fetching master list for ${state}...`);
      const res = await fetch(
        `https://api.legiscan.com/?key=${legiscanKey}&op=getMasterListRaw&state=${state}`
      );
      if (!res.ok) {
        console.warn(`Master list fetch failed for ${state}: ${res.status}`);
        continue;
      }
      const json = await res.json();
      const ml = json?.masterlist;
      if (json?.status !== "OK" || !ml) {
        console.warn(`No valid master list for ${state}`);
        continue;
      }

      for (const v of Object.values(ml) as any[]) {
        if (v && typeof v.bill_id === "number" && v.status_date) {
          candidates.push({
            bill_id: v.bill_id,
            status_date: v.status_date,
            state,
          });
        }
      }

      // small throttle to be nice to Legiscan
      await new Promise((r) => setTimeout(r, 150));
    }

    // sort newest first by status_date
    candidates.sort((a, b) => (a.status_date < b.status_date ? 1 : -1));

    // 2) Walk candidates until we've inserted TARGET_NEW brand-new rows.
    let insertedCount = 0;
    for (const c of candidates) {
      if (insertedCount >= TARGET_NEW) break;

      // 2a) quick existence check by legiscan_id to avoid detail fetch if we already have it
      const { data: exists, error: existErr } = await supabase
        .from("bills")
        .select("id")
        .eq("legiscan_id", c.bill_id)
        .maybeSingle();

      if (existErr) {
        console.error("Existence check error:", existErr);
        continue;
      }
      if (exists) {
        // already in DB, skip
        continue;
      }

      // 2b) fetch full bill details now that we know it's new
      let bill: any;
      try {
        const detailRes = await fetch(
          `https://api.legiscan.com/?key=${legiscanKey}&op=getBill&id=${c.bill_id}`
        );
        if (!detailRes.ok) throw new Error(`Detail fetch failed: ${detailRes.status}`);
        const detailJson = await detailRes.json();
        if (detailJson.status !== 'OK' || !detailJson.bill) {
          throw new Error('Invalid bill detail');
        }
        bill = detailJson.bill;
      } catch (e) {
        console.error(`Error fetching detail for bill ${c.bill_id}:`, e);
        continue;
      }

      // 2c) compute introduced_date and last_event (same logic you had)
      let introducedDate: string;
      if (Array.isArray(bill.history) && bill.history.length > 0) {
        const historyArr = bill.history.filter((h: any) => h.importance);
        const arr = historyArr.length > 0 ? historyArr : bill.history;
        introducedDate = arr[arr.length - 1].date;
      } else {
        introducedDate =
          bill.introduced_date ??
          (bill.introduced ? bill.introduced.split("T")[0] : new Date().toISOString().split("T")[0]);
      }

      let last_event: string;
      if (Array.isArray(bill.history) && bill.history.length > 0) {
        last_event = bill.history[0].action;
      } else {
        last_event = `Went into ${statusMap[bill.status]}`;
      }

      // 2d) insert (unique on legiscan_id will keep DB consistent). We use a plain insert
      //     since we already did an existence check. If there is a race, the unique constraint
      //     will protect us and we just skip counting it.
      const { data: inserted, error: insertErr } = await supabase
        .from("bills")
        .insert({
          legiscan_id:      bill.bill_id,
          title:            bill.title,
          description:      bill.description,
          sponsor_name:     bill.sponsors?.[0]?.name ?? "",
          sponsor_party:    (typeof bill.sponsors?.[0]?.party === "string" && bill.sponsors[0].party.trim()) ? bill.sponsors[0].party : "None",
          sponsor_state:    bill.state ?? "",
          introduced_date:  introducedDate,
          last_action:      last_event,
          last_action_date: bill.status_date,
          status:           statusMap[bill.status] ?? "Veto",
          chamber:          bill.chamber === "H" ? "house" : "senate",
          document_url:     bill.url,
          raw_legiscan_data: bill,
        })
        .select()
        .single();

      if (insertErr) {
        // If a race caused a duplicate insert attempt, just skip counting it.
        console.error(`Insert failed for bill ${bill.bill_id}:`, insertErr);
      } else {
        insertedCount += 1;
        console.log(`✔️ Inserted bill id=${inserted.id} (total new this run: ${insertedCount}/${TARGET_NEW})`);
      }

      // make sure we don’t hammer the API
      await new Promise((r) => setTimeout(r, 250));
    }

    return new Response(JSON.stringify({ success: true, inserted: insertedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fetch-bills error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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

// ▶▶ Per-run insertion target: try to add at least this many brand-new bills each invocation
const MIN_INSERTS_PER_CALL = 20;

// How deep to look per state (newest sessions first). Increase to go further back.
const MAX_SESSIONS_PER_STATE = 3;

// Be nice to the API
const API_THROTTLE_MS = 200;

type Candidate = { bill_id: number; status_date: string; state: string };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("fetch-bills (>=20 per call) started");

    const legiscanKey = Deno.env.get("LEGISCAN_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!legiscanKey || !supabaseUrl || !serviceKey) {
      throw new Error("Missing required environment variable(s)");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1) Build a cross-state candidate list by walking newest sessions first
    const candidates: Candidate[] = [];
    const seenBillIds = new Set<number>(); // avoid duplicates across overlapping sessions

    for (const state of STATES) {
      try {
        const sessRes = await fetch(
          `https://api.legiscan.com/?key=${legiscanKey}&op=getSessionList&state=${state}`
        );
        if (!sessRes.ok) {
          console.warn(`getSessionList failed for ${state}: ${sessRes.status}`);
          continue;
        }
        const sessJson = await sessRes.json();
        const sessions: any[] = Array.isArray(sessJson?.sessions) ? sessJson.sessions : [];
        if (sessions.length === 0) continue;

        // newest sessions first
        sessions.sort((a, b) => (a.session_id < b.session_id ? 1 : -1));
        const toScan = sessions.slice(0, MAX_SESSIONS_PER_STATE);

        for (const s of toScan) {
          const mlRes = await fetch(
            `https://api.legiscan.com/?key=${legiscanKey}&op=getMasterList&id=${s.session_id}`
          );
          if (!mlRes.ok) {
            console.warn(`getMasterList failed ${state} session=${s.session_id}: ${mlRes.status}`);
            continue;
          }
          const mlJson = await mlRes.json();
          const ml = mlJson?.masterlist;
          if (mlJson?.status !== "OK" || !ml) continue;

          for (const v of Object.values(ml) as any[]) {
            if (!v || typeof v.bill_id !== "number" || !v.status_date) continue;
            if (seenBillIds.has(v.bill_id)) continue;
            seenBillIds.add(v.bill_id);
            candidates.push({ bill_id: v.bill_id, status_date: v.status_date, state });
          }

          await new Promise((r) => setTimeout(r, API_THROTTLE_MS));
        }
      } catch (e) {
        console.warn(`State ${state} session walk failed:`, e);
      }
    }

    console.log(`Collected ${candidates.length} unique candidates across sessions/states.`);

    // 2) Sort newest first by status_date
    candidates.sort((a, b) => (a.status_date < b.status_date ? 1 : -1));

    // 3) Insert until we hit MIN_INSERTS_PER_CALL or run out
    let insertedCount = 0;
    let scanned = 0;

    for (const c of candidates) {
      if (insertedCount >= MIN_INSERTS_PER_CALL) break;
      scanned++;

      // Skip if already in DB
      const { data: exists, error: existErr } = await supabase
        .from("bills")
        .select("id")
        .eq("legiscan_id", c.bill_id)
        .maybeSingle();

      if (existErr) {
        console.error("Existence check error:", existErr);
        continue;
      }
      if (exists) continue;

      // Fetch full bill details
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
        console.error(`Detail fetch error for bill ${c.bill_id}:`, e);
        continue;
      }

      // introduced_date + last_event (same as your original logic)
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
        last_event = `Went into ${statusMap[bill.status] ?? "Unknown"}`;
      }

      const { data: inserted, error: insertErr } = await supabase
        .from("bills")
        .insert({
          legiscan_id:      bill.bill_id,
          title:            bill.title,
          description:      bill.description,
          sponsor_name:     bill.sponsors?.[0]?.name ?? "",
          sponsor_party:    (typeof bill.sponsors?.[0]?.party === "string" && bill.sponsors[0].party.trim())
                              ? bill.sponsors[0].party : "None",
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
        console.error(`Insert failed for bill ${bill.bill_id}:`, insertErr);
      } else {
        insertedCount += 1;
        console.log(`✔️ Inserted bill id=${inserted.id} (this run: ${insertedCount}/${MIN_INSERTS_PER_CALL})`);
      }

      await new Promise((r) => setTimeout(r, API_THROTTLE_MS));
    }

    return new Response(JSON.stringify({
      success: true,
      inserted: insertedCount,
      min_target: MIN_INSERTS_PER_CALL,
      candidates_scanned: scanned,
      total_candidates_available: candidates.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("fetch-bills error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// supabase/functions/fetch-bills-test/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

/**
 * --------- TUNE THESE ----------
 */
const TARGET_YEAR = 2020;      // <— set the year you want
const TARGET_COUNT = 100;      // <— newest N for that year
const PER_STATE = false;       // true = N per state; false = N nationwide
const API_THROTTLE_MS = 200;   // be nice to LegiScan
/**
 * -------------------------------
 */

const statusMap: Record<number, string> = {
  0:'Pre-Filed',1:'Intro',2:'Engross',3:'Enroll',4:'Pass',5:'Vetoed',6:'Failed',7:'Overrated',
  8:'Chaptered',9:'Refer',10:'Report Pass',11:'Report DNS',12:'Draft'
};

type Candidate = {
  bill_id: number;
  status_date: string; // YYYY-MM-DD
  state: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("fetch-bills-test (single-year) started", { TARGET_YEAR, TARGET_COUNT, PER_STATE });

    const legiscanKey = Deno.env.get("LEGISCAN_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!legiscanKey || !supabaseUrl || !serviceKey) {
      throw new Error("Missing required environment variable(s)");
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    const jan1   = `${TARGET_YEAR}-01-01`;
    const nextJ1 = `${TARGET_YEAR + 1}-01-01`;

    const candidates: Candidate[] = [];

    // 1) For each state, find sessions covering TARGET_YEAR, then pull master lists
    for (const state of STATES) {
      const sessRes = await fetch(
        `https://api.legiscan.com/?key=${legiscanKey}&op=getSessionList&state=${state}`
      );
      if (!sessRes.ok) { console.warn(`getSessionList failed ${state}`); continue; }
      const sessJson = await sessRes.json();
      if (sessJson?.status !== "OK" || !Array.isArray(sessJson.sessions)) continue;

      const sessions: Array<{session_id:number; year_start:number; year_end:number}> =
        sessJson.sessions.map((s:any)=>({session_id:s.session_id, year_start:s.year_start, year_end:s.year_end}));

      const sessionsForYear = sessions.filter(s => s.year_start <= TARGET_YEAR && s.year_end >= TARGET_YEAR);
      if (sessionsForYear.length === 0) continue;

      for (const s of sessionsForYear) {
        const mlRes = await fetch(
          `https://api.legiscan.com/?key=${legiscanKey}&op=getMasterList&id=${s.session_id}`
        );
        if (!mlRes.ok) { console.warn(`getMasterList failed ${state} session=${s.session_id}`); continue; }
        const mlJson = await mlRes.json();
        const ml = mlJson?.masterlist;
        if (mlJson?.status !== "OK" || !ml) continue;

        for (const v of Object.values(ml) as any[]) {
          if (!v || typeof v.bill_id !== "number" || !v.status_date) continue;
          // Keep only bills whose status_date falls within the target year [Jan 1, next Jan 1)
          if (v.status_date >= jan1 && v.status_date < nextJ1) {
            candidates.push({ bill_id: v.bill_id, status_date: v.status_date, state });
          }
        }

        await new Promise(r=>setTimeout(r, API_THROTTLE_MS));
      }
    }

    // 2) Sort newest first and cap to TARGET_COUNT (either nationwide or per state)
    candidates.sort((a,b)=> (a.status_date < b.status_date ? 1 : -1));

    const perStateCount = new Map<string, number>();
    let totalInserted = 0;

    for (const c of candidates) {
      if (!PER_STATE && totalInserted >= TARGET_COUNT) break;

      if (PER_STATE) {
        const sCount = perStateCount.get(c.state) ?? 0;
        if (sCount >= TARGET_COUNT) continue;
      }

      // Existence check in bills_test
      const { data: exists, error: existErr } = await supabase
        .from("bills_test")
        .select("id")
        .eq("legiscan_id", c.bill_id)
        .maybeSingle();

      if (existErr) { console.error("exist check:", existErr); continue; }
      if (exists) continue;

      // Fetch full bill detail
      let bill: any;
      try {
        const dRes = await fetch(
          `https://api.legiscan.com/?key=${legiscanKey}&op=getBill&id=${c.bill_id}`
        );
        if (!dRes.ok) throw new Error(`detail ${dRes.status}`);
        const dJson = await dRes.json();
        if (dJson.status !== 'OK' || !dJson.bill) throw new Error('invalid bill detail');
        bill = dJson.bill;
      } catch(e) {
        console.error(`detail error bill ${c.bill_id}`, e);
        continue;
      }

      // introduced_date + last_event (same logic as your prod)
      let introducedDate: string;
      if (Array.isArray(bill.history) && bill.history.length > 0) {
        const major = bill.history.filter((h: any) => h.importance);
        const arr = major.length > 0 ? major : bill.history;
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
        .from("bills_test")
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
        console.error(`insert failed for bill ${bill.bill_id}:`, insertErr);
      } else {
        if (PER_STATE) {
          perStateCount.set(c.state, (perStateCount.get(c.state) ?? 0) + 1);
        } else {
          totalInserted += 1;
        }
        console.log(`✔ inserted bills_test id=${inserted.id} state=${c.state} date=${c.status_date} total=${PER_STATE ? perStateCount.get(c.state) : totalInserted}`);
      }

      // Exit quickly if we've hit the nationwide cap
      if (!PER_STATE && totalInserted >= TARGET_COUNT) break;

      await new Promise(r=>setTimeout(r, API_THROTTLE_MS));
    }

    return new Response(JSON.stringify({
      success: true,
      mode: PER_STATE ? "per_state" : "nationwide",
      year: TARGET_YEAR,
      total_inserted: PER_STATE ? Object.fromEntries(perStateCount.entries()) : totalInserted
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err:any) {
    console.error("fetch-bills-test error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

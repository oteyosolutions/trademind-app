// TradeMind ICT - economic calendar for every app user (Supabase Edge Function "calendar")
// Downloads the free weekly calendar at most every 3 hours (for ALL users together), caches it in
// the calendar_cache table and returns the high/medium-impact events of the coming week.
// Deploy like tv-webhook: Edge Functions -> Deploy a new function -> Via editor -> name: calendar
// -> paste this file -> Deploy -> Settings: turn OFF "Verify JWT with legacy secret" (public read-only data).
import { createClient } from "jsr:@supabase/supabase-js@2";

const FEEDS = [
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  "https://nfs.faireconomy.media/ff_calendar_nextweek.json",
];
const MAX_AGE_MS = 3 * 3600 * 1000;
const KEEP = new Set(["High", "Medium"]);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

type Event = { time_utc: string; currency: string; impact: string; title: string };

function parse(items: unknown[]): Event[] {
  const out: Event[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const impact = String(o.impact ?? "").trim();
    const t = Date.parse(String(o.date ?? ""));
    const currency = String(o.country ?? o.currency ?? "").toUpperCase().trim();
    if (!KEEP.has(impact) || !Number.isFinite(t) || !currency) continue;
    out.push({ time_utc: new Date(t).toISOString().slice(0, 19) + "Z", currency, impact, title: String(o.title ?? "").slice(0, 120) });
  }
  return out.sort((a, b) => a.time_utc.localeCompare(b.time_utc));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: row } = await db.from("calendar_cache").select("fetched_at, events").eq("id", 1).maybeSingle();
  let events: Event[] = (row?.events as Event[]) ?? [];
  let fetchedAt = row?.fetched_at ? Date.parse(row.fetched_at) : 0;

  if (Date.now() - fetchedAt > MAX_AGE_MS) {
    try {
      const all: unknown[] = [];
      for (const url of FEEDS) {
        const r = await fetch(url, { headers: { "User-Agent": "TradeMind-ICT-app (calendar cache)" } });
        if (r.ok) {
          const j = await r.json();
          if (Array.isArray(j)) all.push(...j);
        }
      }
      if (all.length) {
        events = parse(all);
        fetchedAt = Date.now();
        await db.from("calendar_cache").upsert({ id: 1, fetched_at: new Date(fetchedAt).toISOString(), events });
      }
    } catch (_e) {
      // keep serving the last good copy
    }
  }

  const now = Date.now();
  const upcoming = events.filter((e) => {
    const t = Date.parse(e.time_utc);
    return t >= now - 2 * 3600 * 1000 && t <= now + 8 * 86400 * 1000;
  });
  return new Response(JSON.stringify({ events: upcoming, fetched_at: fetchedAt ? new Date(fetchedAt).toISOString() : null }), {
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "public, max-age=600" },
  });
});

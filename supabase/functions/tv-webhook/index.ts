// TradeMind ICT - TradingView webhook (Supabase Edge Function "tv-webhook")
// Receives a TradingView alert, checks your secret token and stores the signal for your bot.
// The bot on your PC picks it up within seconds and decides whether to trade it (all safety rules apply).
//
// Deploy: Supabase dashboard -> Edge Functions -> Deploy a new function -> Via editor ->
//         name it  tv-webhook  -> paste this file -> Deploy.
//         Then in the function's settings turn OFF "Enforce JWT verification" (TradingView cannot log in).
import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_BODY = 2000;          // bytes - TradingView messages are small
const MAX_PER_MINUTE = 20;      // per user - protects you from a runaway alert
const ALLOWED_ACTIONS = new Set(["buy", "sell", "close"]);

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply(405, { error: "POST only" });
  const raw = await req.text();
  if (raw.length > MAX_BODY) return reply(413, { error: "message too long" });

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return reply(400, { error: "the TradingView alert message must be JSON (see the TradeMind guide)" });
  }
  const url = new URL(req.url);
  const token = String(url.searchParams.get("token") || payload.token || "");
  if (token.length < 24) return reply(401, { error: "missing token" });

  const action = String(payload.action || "").toLowerCase();
  if (!ALLOWED_ACTIONS.has(action)) return reply(400, { error: "action must be buy, sell or close" });
  if (!payload.symbol) return reply(400, { error: "symbol missing" });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: owner } = await db.from("webhook_tokens").select("user_id").eq("token", token).maybeSingle();
  if (!owner) return reply(401, { error: "unknown token" });

  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await db.from("tv_signals").select("id", { count: "exact", head: true })
    .eq("user_id", owner.user_id).gte("received_at", since);
  if ((count ?? 0) >= MAX_PER_MINUTE) return reply(429, { error: "too many alerts this minute" });

  delete payload.token;   // never store the secret
  const { error } = await db.from("tv_signals").insert({ user_id: owner.user_id, payload: { ...payload, action } });
  if (error) return reply(500, { error: "could not store the signal" });

  // housekeeping: forget signals older than 30 days
  await db.from("tv_signals").delete().eq("user_id", owner.user_id)
    .lt("received_at", new Date(Date.now() - 30 * 86400_000).toISOString());
  return reply(200, { ok: true });
});

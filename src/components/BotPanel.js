import React, { useEffect, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { useApp } from "../context/AppContext";
import { timeAgo } from "../utils/format";
import { botPost, botUrl } from "../utils/botApi";
import BotSettings from "./BotSettings";
import GuardianCard from "./GuardianCard";

const POLL_MS = 15000;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Tue 15:30 (in 2h 10m)" in the phone's own time zone. */
function newsTime(iso) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const mins = Math.round((d.getTime() - Date.now()) / 60000);
  const away = mins <= 0 ? "now" : mins < 60 ? `in ${mins}m` : `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${DAYS[d.getDay()]} ${hh}:${mm} (${away})`;
}


/** Status and controls for trade_bot.py running on the PC (same Wi-Fi). */
export default function BotPanel() {
  const { scannerUrl } = useApp();
  const [bot, setBot] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const base = botUrl(scannerUrl);

  async function load() {
    if (!base) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${base}/bot`, { signal: controller.signal });
      setBot(await res.json());
      setError("");
    } catch (e) {
      setBot(null);
      setError("Bot not running on the PC (start it with: python trade_bot.py).");
    } finally {
      clearTimeout(timer);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [base]);

  async function command(action) {
    setBusy(true);
    const res = await botPost(scannerUrl, `/bot/${action}`);
    setBusy(false);
    if (res.ok) setBot(res.json);
    else if (res.status === 401) Alert.alert("PIN needed", "Open 'Bot settings' below and enter the 6-digit PIN shown in the bot window on your PC.");
    else Alert.alert("Bot", res.json.error || "Command refused.");
  }

  if (!base) return null;

  if (!bot) {
    return (
      <View style={styles.calculator}>
        <Text style={styles.menuTitle}>Auto-trading bot</Text>
        <Text style={styles.small}>{error || "Checking..."}</Text>
      </View>
    );
  }

  const live = bot.mode === "LIVE";
  const plColor = bot.day_pl > 0 ? C.green : bot.day_pl < 0 ? C.red : C.muted;
  const warnings = [];
  if (!bot.algo_trading_on) warnings.push("Algo Trading is OFF in MT5 - no orders can be placed.");
  if (bot.daily_limit_hit) warnings.push("Daily loss limit reached - paused until tomorrow.");
  if (bot.model && bot.model.verdict !== "PASS") warnings.push("Model FAILED on unseen data - forward-testing only.");
  if (!bot.model) warnings.push("No trained model - trading the plain rules.");
  if (bot.dry_run) warnings.push("Dry run - no orders are sent.");

  return (
    <View style={[styles.calculator, { borderColor: live ? C.red : C.border }]}>
      <View style={styles.tradeRow}>
        <Text style={styles.menuTitle}>Auto-trading bot</Text>
        <Text style={[styles.tag, live ? { color: C.red, backgroundColor: "#3D1F23" } : styles.tagGood]}>
          {live ? "LIVE - REAL MONEY" : "DEMO"}
        </Text>
      </View>
      <Text style={[styles.muted, { color: bot.paused ? C.orange : C.green }]}>
        {bot.paused ? `Paused: ${bot.pause_reason}` : "Running"} · account {bot.account}
      </Text>
      <GuardianCard bot={bot} scannerUrl={scannerUrl} onChanged={load} />
      <View style={styles.tradeRow}>
        <Text style={styles.muted}>Today</Text>
        <Text style={[styles.calcValue, { color: plColor }]}>
          {bot.day_pl >= 0 ? "+" : ""}
          {bot.day_pl} {bot.currency} ({bot.day_pl_pct}%)
        </Text>
      </View>
      <View style={styles.tradeRow}>
        <Text style={styles.muted}>Trades today</Text>
        <Text style={styles.calcValue}>
          {bot.trades_today} / {bot.max_trades_per_day} · risk {bot.risk_percent}%
        </Text>
      </View>
      <View style={styles.tradeRow}>
        <Text style={styles.muted}>Balance / equity</Text>
        <Text style={styles.calcValue}>
          {bot.balance} / {bot.equity}
        </Text>
      </View>

      {(bot.open_positions || []).map((p, i) => (
        <Text key={`${p.symbol}-${i}`} style={styles.small}>
          {p.symbol} {p.type} {p.volume} @ {p.price} · SL {p.sl} · TP {p.tp} ·{" "}
          <Text style={{ color: p.profit >= 0 ? C.green : C.red }}>{p.profit}</Text>
        </Text>
      ))}

      {warnings.map((w) => (
        <Text key={w} style={[styles.small, { color: C.orange }]}>⚠ {w}</Text>
      ))}

      {bot.news && bot.news.filter ? (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.muted}>
            High-impact news (no new trades {bot.news.before_min}m before to {bot.news.after_min}m after)
          </Text>
          {(bot.news.next || []).length === 0 ? (
            <Text style={styles.small}>None in the next 24 hours.</Text>
          ) : (
            bot.news.next.map((e, i) => {
              const mins = (new Date(e.time_utc).getTime() - Date.now()) / 60000;
              const blocking = mins <= bot.news.before_min && mins >= -bot.news.after_min;
              return (
                <Text key={`${e.time_utc}-${i}`} style={[styles.small, blocking && { color: C.orange }]}>
                  {blocking ? "⏸ " : ""}
                  {newsTime(e.time_utc)} · {e.currency} {e.title}
                </Text>
              );
            })
          )}
        </View>
      ) : bot.news ? (
        <Text style={[styles.small, { color: C.orange }]}>⚠ News filter is OFF - the bot may trade into big news.</Text>
      ) : null}

      <View style={[styles.choices, { marginTop: 12 }]}>
        {bot.paused ? (
          <TouchableOpacity style={[styles.choice, styles.choiceActive]} disabled={busy} onPress={() => command("resume")}>
            <Text style={[styles.choiceText, styles.choiceTextActive]}>Resume bot</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.choice, { borderColor: C.orange }]} disabled={busy} onPress={() => command("pause")}>
            <Text style={[styles.choiceText, { color: C.orange }]}>Pause bot</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.small}>
        Pausing stops new trades. Open trades keep their stop-loss and take-profit in MT5.
      </Text>

      {(bot.actions || []).slice(0, 5).map((a, i) => (
        <Text key={`${a.time_local}-${i}`} style={styles.small}>
          {a.time_local.slice(11, 16)} {a.symbol} {a.action}: {a.detail}
        </Text>
      ))}
      {!!bot.last_check && <Text style={styles.small}>Updated {timeAgo(bot.last_check)}</Text>}
      <BotSettings onSaved={load} />
    </View>
  );
}

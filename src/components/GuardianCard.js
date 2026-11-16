import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { botPost } from "../utils/botApi";

function Meter({ label, value, max, color, right }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={{ marginTop: 8 }}>
      <View style={styles.tradeRow}>
        <Text style={styles.small}>{label}</Text>
        <Text style={[styles.small, { color }]}>{right}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: C.border, overflow: "hidden", marginTop: 3 }}>
        <View style={{ width: `${pct * 100}%`, height: 8, backgroundColor: color }} />
      </View>
    </View>
  );
}

function untilText(until) {
  if (!until) return "";
  if (until === "manual") return "until you unlock it";
  const d = new Date(until);
  if (!Number.isFinite(d.getTime())) return "";
  return `until ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Guardian lock, account rules, prop-firm meters and currency exposure (from trade_bot.py v3). */
export default function GuardianCard({ bot, scannerUrl, onChanged }) {
  const g = bot.guardian || {};
  const prop = bot.prop || {};
  const exposure = Object.entries(bot.exposure || {}).filter(([, v]) => v !== 0);
  const tv = bot.tradingview || {};
  const cp = bot.copier || {};
  if (!g.on && !g.locked && !prop.on && exposure.length === 0 && !tv.on && !cp.on) return null;

  async function unlock() {
    Alert.alert(
      "Unlock trading?",
      "TradeMind locked trading to protect your account. Unlock only if you are sure.",
      [
        { text: "Keep locked", style: "cancel" },
        {
          text: "Unlock",
          style: "destructive",
          onPress: async () => {
            const res = await botPost(scannerUrl, "/bot/unlock");
            if (res.ok) {
              if (onChanged) onChanged();
            } else if (res.status === 401) {
              Alert.alert("PIN needed", "Open 'Bot settings' and enter the PIN shown on the PC.");
            } else {
              Alert.alert("Not unlocked", res.json.error || "The bot refused.");
            }
          },
        },
      ]
    );
  }

  const roomColor = (room, limit) => (room <= limit * 0.25 ? C.red : room <= limit * 0.5 ? C.orange : C.green);

  return (
    <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8 }}>
      {g.locked ? (
        <View style={{ backgroundColor: "#3A1F24", borderRadius: 10, padding: 10, marginBottom: 6 }}>
          <Text style={[styles.muted, { color: C.red, fontWeight: "800" }]}>🔒 New trades locked {untilText(g.lock_until)}</Text>
          <Text style={styles.small}>{g.lock_reason}</Text>
          <TouchableOpacity onPress={unlock} style={{ marginTop: 6 }}>
            <Text style={[styles.small, { color: C.blue, fontWeight: "700" }]}>Unlock</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {g.on ? (
        <Text style={styles.small}>
          🛡 Guardian {g.enforce ? "(enforcing)" : "on"} · today {g.day_pl_pct >= 0 ? "+" : ""}
          {Number(g.day_pl_pct || 0).toFixed(2)}% · {g.trades_today} trades · {g.losses_in_a_row} losses in a row
        </Text>
      ) : null}

      {prop.on ? (
        <View style={{ marginTop: 4 }}>
          <Text style={[styles.muted, { fontWeight: "800" }]}>Prop account · start {Number(prop.start).toLocaleString()}</Text>
          <Meter
            label={`Daily drawdown room (limit ${prop.daily_limit_pct}%)`}
            value={prop.daily_room_pct}
            max={prop.daily_limit_pct}
            color={roomColor(prop.daily_room_pct, prop.daily_limit_pct)}
            right={`${Number(prop.daily_room_pct).toFixed(2)}% left`}
          />
          <Meter
            label={`Maximum drawdown room (limit ${prop.max_limit_pct}%)`}
            value={prop.max_room_pct}
            max={prop.max_limit_pct}
            color={roomColor(prop.max_room_pct, prop.max_limit_pct)}
            right={`${Number(prop.max_room_pct).toFixed(2)}% left`}
          />
          {prop.target_progress_pct !== null && prop.target_progress_pct !== undefined ? (
            <Meter
              label={`Profit target ${prop.target_pct}%`}
              value={Math.max(0, prop.target_progress_pct)}
              max={100}
              color={C.blue}
              right={`${Number(prop.target_progress_pct).toFixed(0)}% of target`}
            />
          ) : null}
          <Text style={styles.small}>Closes everything {prop.buffer_pct}% before a limit. Check your firm's exact rules.</Text>
        </View>
      ) : null}

      {tv.on ? (
        <Text style={[styles.small, { marginTop: 6, color: tv.ready ? C.text : C.orange }]}>
          📈 TradingView {tv.ready ? "listening" : !tv.cloud ? "- bot not signed in to the cloud" : "- run 'python tradingview.py setup' on the PC"}
          {(tv.recent || [])[0] ? ` · last: ${tv.recent[0].symbol} ${tv.recent[0].action} ${tv.recent[0].status}` : ""}
        </Text>
      ) : null}
      {cp.on ? (
        <Text style={[styles.small, { marginTop: 4 }]}>
          🔁 Copier ({cp.source === "all" ? "all trades" : "bot trades"}):{" "}
          {(cp.followers || []).length === 0 ? "no follower accounts in config.py" :
            cp.followers.map((f) => `${f.name} ${f.alive ? `✓ ${f.copied_open ?? 0} open` : "✗ not running"}`).join(" · ")}
        </Text>
      ) : null}
      {exposure.length > 0 ? (
        <Text style={[styles.small, { marginTop: 6 }]}>
          Exposure: {exposure.map(([cur, v]) => `${v > 0 ? "long" : "short"} ${cur}${Math.abs(v) > 1 ? ` x${Math.abs(v)}` : ""}`).join(" · ")}
        </Text>
      ) : null}
    </View>
  );
}

import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { RULE_RESULTS, SKIP_REASONS } from "../constants";
import { useApp } from "../context/AppContext";
import { fmtR, num, timeAgo } from "../utils/format";

export default function AlertCard({ alert: a }) {
  const { alertStatus, skippingId, setSkippingId, setAlertState, clearAlertState, startReview } = useApp();
  const st = alertStatus[a.id];
  const status = st ? st.status : "new";
  const o = a.outcome || { status: "waiting" };

  let outcomeText = "Rules: waiting for entry / exit";
  let outcomeColor = C.muted;
  if (RULE_RESULTS.includes(o.status)) {
    outcomeText = `Rules result: ${o.status} ${fmtR(num(o.r))}`;
    outcomeColor = num(o.r) >= 0 ? C.green : C.red;
  } else if (o.status === "Cancelled") {
    outcomeText = `Rules: order never filled (${o.detail})`;
  } else if (o.status === "Unknown") {
    outcomeText = "Rules: result unknown";
  }

  const how =
    a.mode === "market"
      ? a.direction === "Buy" ? "BUY at market" : "SELL at market"
      : a.direction === "Buy" ? "BUY LIMIT" : "SELL LIMIT";

  return (
    <View style={styles.tradeCard}>
      <View style={styles.tradeRow}>
        <Text style={styles.tradePair}>{a.symbol}</Text>
        <Text style={a.direction === "Buy" ? styles.buy : styles.sell}>{how}</Text>
      </View>
      <Text style={styles.muted}>
        Swept {a.liquidity} at {a.level} · {a.session} · {a.timeframe} · {timeAgo(a.time_utc)}
      </Text>
      <View style={styles.tradeRow}>
        <Text style={styles.muted}>Entry: {a.entry}</Text>
        <Text style={styles.muted}>Stop: {a.stop}</Text>
      </View>
      <View style={styles.tradeRow}>
        <Text style={styles.muted}>Target: {a.target}</Text>
        <Text style={styles.rrText}>R:R 1:{num(a.rr).toFixed(1)}</Text>
      </View>
      <View style={styles.tagRow}>
        <Text style={[styles.tag, a.with_htf_bias ? styles.tagGood : styles.tagWarn]}>
          {a.with_htf_bias ? "With H1 bias" : "Against H1 bias"}
        </Text>
        <Text style={[styles.tag, a.in_killzone ? styles.tagGood : styles.tagWarn]}>
          {a.in_killzone ? "In killzone" : "Outside killzone"}
        </Text>
      </View>
      <Text style={[styles.small, { color: outcomeColor }]}>{outcomeText}</Text>

      {status === "new" && skippingId !== a.id && (
        <View style={[styles.choices, { marginTop: 12 }]}>
          <TouchableOpacity style={[styles.choice, styles.choiceActive]} onPress={() => startReview(a)}>
            <Text style={[styles.choiceText, styles.choiceTextActive]}>Review & journal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.choice} onPress={() => setSkippingId(a.id)}>
            <Text style={styles.choiceText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "new" && skippingId === a.id && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>Why are you skipping it?</Text>
          <View style={styles.reasonWrap}>
            {SKIP_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.reasonChip}
                onPress={() => {
                  setAlertState(a.id, "skipped", reason);
                  setSkippingId(null);
                }}
              >
                <Text style={styles.choiceText}>{reason}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.choice} onPress={() => setSkippingId(null)}>
            <Text style={styles.choiceText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {status !== "new" && (
        <View style={styles.tradeRow}>
          <Text style={[styles.small, { color: status === "taken" ? C.green : C.orange }]}>
            {status === "taken" ? "Taken - in your journal" : `Skipped: ${st.reason}`}
          </Text>
          {status === "skipped" && (
            <TouchableOpacity onPress={() => clearAlertState(a.id)}>
              <Text style={[styles.small, { color: C.blue }]}>Undo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { coachReport, fmtR } from "../utils/coach";

function Insight({ item, color }) {
  return (
    <View style={{ marginTop: 8, borderLeftWidth: 3, borderLeftColor: color, paddingLeft: 8 }}>
      <Text style={[styles.small, { color: C.text }]}>{item.text}</Text>
      {item.kind === "leak" ? <Text style={[styles.small, { color }]}>→ {item.action}</Text> : null}
    </View>
  );
}

/** Built-in trade coach: weekly review, biggest leaks and strengths - from your own journal. */
export default function CoachCard({ trades }) {
  const [open, setOpen] = useState(true);
  const rep = useMemo(() => coachReport(trades), [trades]);
  const w = rep.week;

  return (
    <View style={[styles.calculator, { marginTop: 12 }]}>
      <View style={styles.tradeRow}>
        <Text style={styles.menuTitle}>🧠 Your trade coach</Text>
        <TouchableOpacity onPress={() => setOpen(!open)}>
          <Text style={[styles.small, { color: C.blue }]}>{open ? "Hide" : "Show"}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.small}>{rep.levelText}</Text>

      {open ? (
        <>
          <View style={{ marginTop: 10, backgroundColor: "#13233A", borderRadius: 10, padding: 10 }}>
            <Text style={[styles.muted, { fontWeight: "800" }]}>This week</Text>
            {w.trades === 0 ? (
              <Text style={styles.small}>No closed trades in the last 7 days.</Text>
            ) : (
              <>
                <Text style={[styles.small, { color: C.text }]}>
                  {w.trades} trades · <Text style={{ color: w.net >= 0 ? C.green : C.red }}>{fmtR(w.net)}</Text> · {Math.round(w.winRate)}% wins
                  {w.prevTrades ? ` (last week ${fmtR(w.prevNet)} from ${w.prevTrades})` : ""}
                </Text>
                {w.best ? <Text style={styles.small}>Best: {w.best.pair} {fmtR(Number(w.best.realizedR))} · Worst: {w.worst.pair} {fmtR(Number(w.worst.realizedR))}</Text> : null}
                {w.ruleBreaks ? <Text style={[styles.small, { color: C.orange }]}>{w.ruleBreaks} trade(s) broke your plan or had a mistake tag.</Text> : null}
                {w.unreviewed ? <Text style={styles.small}>{w.unreviewed} trade(s) not reviewed yet - add "plan followed" and mistakes so the coach can learn.</Text> : null}
              </>
            )}
            <Text style={[styles.small, { color: C.blue, marginTop: 6, fontWeight: "700" }]}>Focus next: {rep.focus}</Text>
          </View>

          {rep.leaks.length ? <Text style={[styles.muted, { fontWeight: "800", marginTop: 12, color: C.red }]}>Where you lose money</Text> : null}
          {rep.leaks.map((l, i) => <Insight key={`l${i}`} item={l} color={C.red} />)}

          {rep.strengths.length ? <Text style={[styles.muted, { fontWeight: "800", marginTop: 12, color: C.green }]}>Where your edge is</Text> : null}
          {rep.strengths.map((s, i) => <Insight key={`s${i}`} item={s} color={C.green} />)}

          {rep.trades >= 10 && !rep.leaks.length && !rep.strengths.length ? (
            <Text style={[styles.small, { marginTop: 8 }]}>No pattern is strong enough yet to call - that is normal. Keep journaling.</Text>
          ) : null}
          <Text style={[styles.small, { marginTop: 10 }]}>
            Patterns need {5}+ trades and a clear difference from your other trades. Works offline - nothing leaves your phone.
          </Text>
        </>
      ) : null}
    </View>
  );
}

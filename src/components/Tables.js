import React from "react";
import { Text, View } from "react-native";
import { C, styles } from "../theme";
import { fmtPct, fmtPF, fmtR } from "../utils/format";
import { Stat } from "./ui";

export function StatsGrid({ stats }) {
  return (
    <View style={styles.statGrid}>
      <Stat label="Closed trades" value={stats.closed} />
      <Stat label="Win rate" value={fmtPct(stats.winRate)} />
      <Stat
        label="Net performance"
        value={stats.closed === 0 ? "--" : fmtR(stats.netR)}
        color={stats.closed === 0 ? null : stats.netR >= 0 ? C.green : C.red}
      />
      <Stat label="Average R" value={fmtR(stats.avgR)} />
      <Stat label="Profit factor" value={fmtPF(stats.profitFactor)} />
      <Stat label="W / L / BE" value={`${stats.wins} / ${stats.losses} / ${stats.breakEven}`} />
    </View>
  );
}

export function BreakdownTable({ groups }) {
  if (groups.length === 0) {
    return (
      <View style={styles.menu}>
        <Text style={styles.muted}>No trades to compare yet.</Text>
      </View>
    );
  }
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHead]}>
        <Text style={[styles.th, { flex: 2 }]}>Group</Text>
        <Text style={styles.th}>Trades</Text>
        <Text style={styles.th}>Win %</Text>
        <Text style={styles.th}>Avg R</Text>
        <Text style={styles.th}>Net R</Text>
      </View>
      {groups.map((g) => (
        <View style={styles.tableRow} key={g.key}>
          <Text style={[styles.td, { flex: 2, color: C.text }]} numberOfLines={2}>
            {g.key}
          </Text>
          <Text style={styles.td}>
            {g.closed}
            {g.open > 0 ? ` (+${g.open})` : ""}
          </Text>
          <Text style={styles.td}>{fmtPct(g.winRate)}</Text>
          <Text style={styles.td}>{fmtR(g.avgR)}</Text>
          <Text
            style={[
              styles.td,
              { color: g.closed === 0 ? C.muted : g.netR >= 0 ? C.green : C.red, fontWeight: "800" },
            ]}
          >
            {g.closed === 0 ? "--" : fmtR(g.netR)}
          </Text>
        </View>
      ))}
      <Text style={styles.small}>Trades = closed trades (open trades shown in brackets).</Text>
    </View>
  );
}

export function RTable({ rows }) {
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHead]}>
        <Text style={[styles.th, { flex: 2.4 }]}>Group</Text>
        <Text style={styles.th}>Trades</Text>
        <Text style={styles.th}>Win %</Text>
        <Text style={styles.th}>Avg R</Text>
        <Text style={styles.th}>Net R</Text>
      </View>
      {rows.map((r) => (
        <View style={styles.tableRow} key={r.label}>
          <Text style={[styles.td, { flex: 2.4, color: C.text }]}>{r.label}</Text>
          <Text style={styles.td}>{r.count}</Text>
          <Text style={styles.td}>{fmtPct(r.winRate)}</Text>
          <Text style={styles.td}>{fmtR(r.avg)}</Text>
          <Text
            style={[
              styles.td,
              { fontWeight: "800", color: r.count === 0 ? C.muted : r.net >= 0 ? C.green : C.red },
            ]}
          >
            {r.count === 0 ? "--" : fmtR(r.net)}
          </Text>
        </View>
      ))}
    </View>
  );
}

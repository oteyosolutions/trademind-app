import React, { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { C, styles } from "../theme";
import { useApp } from "../context/AppContext";
import { chartSeries, forwardReport, MIN_TRADES_TO_JUDGE } from "../utils/forward";
import { botGet } from "../utils/botApi";

const EXP_KEY = "@trademind_ict_expectations_v1";

const LEVEL_COLOR = {
  nodata: C.muted, none: C.muted, early: C.blue, good: C.green, ok: C.green, watch: C.orange, stop: C.red,
};

function Line({ pts, width, color, thick = 2, dashed = false }) {
  const segs = [];
  for (let i = 1; i < pts.length; i += 1) {
    if (dashed && i % 2 === 0) continue;
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segs.push(
      <View
        key={i}
        style={{
          position: "absolute", height: thick, borderRadius: thick / 2, backgroundColor: color, width: len,
          left: (a.x + b.x) / 2 - len / 2, top: (a.y + b.y) / 2 - thick / 2,
          transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
        }}
      />
    );
  }
  return width > 0 ? segs : null;
}

function ForwardChart({ series }) {
  const [width, setWidth] = useState(0);
  const height = 180;
  const pad = 14;
  const all = [...series.actual, ...series.p5, ...series.p95, 0];
  const max = Math.max(...all);
  const min = Math.min(...all);
  const range = max - min || 1;
  const innerW = Math.max(0, width - pad * 2);
  const innerH = height - pad * 2;
  const toPts = (vals) =>
    vals.map((v, i) => ({ x: pad + (i / series.len) * innerW, y: pad + ((max - v) / range) * innerH }));

  return (
    <View style={[styles.chart, { height }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={[styles.zeroLine, { top: pad + (max / range) * innerH }]} />
      <Line pts={toPts(series.p95)} width={width} color={C.border} thick={2} dashed />
      <Line pts={toPts(series.p5)} width={width} color={C.border} thick={2} dashed />
      <Line pts={toPts(series.p50)} width={width} color={C.muted} thick={1} />
      <Line pts={toPts(series.actual)} width={width} color={C.blue} thick={3} />
      <Text style={[styles.chartLabel, { top: 2 }]}>{`${max >= 0 ? "+" : ""}${max.toFixed(1)}R`}</Text>
      <Text style={[styles.chartLabel, { bottom: 2 }]}>{`${min.toFixed(1)}R`}</Text>
      <Text style={[styles.chartLabel, { bottom: 2, left: 8, right: undefined }]}>{`0 → ${series.len} trades`}</Text>
    </View>
  );
}

function Row({ label, value, expected, color }) {
  return (
    <View style={styles.tradeRow}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.calcValue, color && { color }]}>
        {value}
        {expected ? <Text style={styles.small}>{`  (backtest ${expected})`}</Text> : null}
      </Text>
    </View>
  );
}

/** Forward test: the bot's REAL closed trades vs what the backtest said is normal. */
export default function ForwardTestCard() {
  const { trades, scannerUrl } = useApp();
  const [exp, setExp] = useState(null);
  const [note, setNote] = useState("");
  const [changedAt, setChangedAt] = useState(null);

  async function load() {
    try {
      const saved = await AsyncStorage.getItem(EXP_KEY);
      if (saved && !exp) setExp(JSON.parse(saved));
    } catch (e) {
      // ignore - nothing cached yet
    }
    if (!scannerUrl) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(`${scannerUrl}/expectations`, { signal: controller.signal });
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.band)) {
          setExp(json);
          setNote("");
          AsyncStorage.setItem(EXP_KEY, JSON.stringify(json)).catch(() => {});
        }
      } else if (res.status === 404) {
        setNote("No targets on the PC yet - run: python run_backtest.py");
      }
    } catch (e) {
      setNote("Using the last saved targets (PC scanner not reachable).");
    } finally {
      clearTimeout(timer);
    }
  }

  useEffect(() => {
    load();
    if (scannerUrl) {
      botGet(scannerUrl, "/bot").then((res) => {
        if (res.ok) setChangedAt(res.json.strategy_changed_at || null);
      });
    }
  }, [scannerUrl]);
  const outdated = !!(exp && changedAt && new Date(changedAt) > new Date(exp.created_at));

  const report = useMemo(() => forwardReport(trades, exp), [trades, exp]);
  const series = useMemo(() => chartSeries(report, exp), [report, exp]);
  const st = report.status;
  const pct = (v) => (v === null || v === undefined ? "--" : `${v.toFixed(0)}%`);
  const r = (v) => (v === null || v === undefined ? "--" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}R`);

  return (
    <View style={[styles.calculator, { borderColor: LEVEL_COLOR[st.level] || C.border }]}>
      <View style={styles.tradeRow}>
        <Text style={styles.menuTitle}>Forward test</Text>
        <TouchableOpacity onPress={load}>
          <Text style={[styles.small, { color: C.blue }]}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.small}>The bot's real trades compared with what the backtest says is normal.</Text>

      <Text style={[styles.muted, { color: LEVEL_COLOR[st.level], fontWeight: "800", marginTop: 8 }]}>{st.title}</Text>
      <Text style={styles.small}>{st.detail}</Text>

      {exp && report.n > 0 ? (
        <>
          <View style={{ marginTop: 10 }}>
            <ForwardChart series={series} />
            <Text style={styles.small}>
              Blue = the bot. Grey line = typical backtest result. Dashed = normal range (90% of backtest outcomes).
            </Text>
          </View>
          <Row label="Closed bot trades" value={`${report.n}`}
            expected={`~${Number(exp.trades_per_month).toFixed(1)}/month`} />
          <Row label="Net result" value={r(report.cum)} color={report.cum >= 0 ? C.green : C.red}
            expected={`normal ${r(report.band.p5)} to ${r(report.band.p95)}`} />
          <Row label="Win rate" value={pct(report.winRate)}
            expected={`${exp.win_rate}%, normal ${pct(report.band.w5)}-${pct(report.band.w95)}`} />
          <Row label="Average per trade" value={r(report.avgR)} expected={r(exp.avg_r)} />
          <Row label="Worst drawdown" value={`-${report.maxDD.toFixed(1)}R`}
            color={report.maxDD > exp.dd_95 ? C.red : null} expected={`bad case -${Number(exp.dd_95).toFixed(1)}R`} />
          <Row label="Worst losing streak" value={`${report.worstStreak}`}
            color={report.worstStreak > exp.streak_95 ? C.red : null} expected={`bad case ${exp.streak_95}`} />
          {report.perMonth !== null && (
            <Row label="Trades per month" value={report.perMonth.toFixed(1)}
              expected={`${Number(exp.trades_per_month).toFixed(1)}`} />
          )}
        </>
      ) : null}

      {exp ? (
        <Text style={[styles.small, { marginTop: 8 }]}>
          Targets from {exp.trades} {exp.basis === "unseen" ? "unseen-period" : ""} backtest trades
          ({String(exp.created_at).slice(0, 10)}): {exp.settings}
        </Text>
      ) : null}
      {report.n > 0 && report.n < MIN_TRADES_TO_JUDGE ? (
        <Text style={styles.small}>Don't change settings during the test - each change restarts the count.</Text>
      ) : null}
      {outdated && (
        <Text style={[styles.small, { color: C.orange, fontWeight: "700" }]}>
          ⚠ The bot's strategy was changed after these targets were made. On the PC double-click
          "TradeMind Update Backtest", then tap Refresh.
        </Text>
      )}
      {!!note && <Text style={[styles.small, { color: C.orange }]}>{note}</Text>}
    </View>
  );
}

import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

// IMPORTANT: unchanged so existing saved trades are preserved
const STORAGE_KEY = "@trademind_ict_trades_v1";

const C = {
  bg: "#0B1120",
  card: "#151E30",
  border: "#263249",
  text: "#F4F7FB",
  muted: "#91A0B7",
  green: "#35D39A",
  blue: "#65A9FF",
  orange: "#FFB454",
  red: "#FF7777",
};

const setups = [
  "Liquidity Sweep",
  "Fair Value Gap (FVG)",
  "Order Block",
  "Break of Structure (BOS)",
  "Change of Character (CHOCH)",
  "Breaker Block",
  "Other",
];

const SESSIONS = ["Asia", "London", "New York"];
const RESULT_FILTERS = ["All", "Open", "Win", "Loss", "Break-even"];
const MIN_RR = 2;

const CHECKLIST = [
  { id: "bias", group: "Context", label: "Higher-timeframe bias is clear (Daily / 4H)" },
  { id: "liquidity", group: "Liquidity", label: "Liquidity has been swept (equal highs/lows, session high/low)" },
  { id: "structure", group: "Structure", label: "Market structure shift confirmed (BOS or CHOCH)" },
  { id: "poi", group: "Entry", label: "Entry at a valid POI (FVG, order block or breaker)" },
  { id: "confirmation", group: "Entry", label: "Lower-timeframe entry confirmation is present" },
  { id: "session", group: "Timing", label: "Inside a planned session / killzone" },
  { id: "stop", group: "Risk", label: "Stop-loss sits beyond the structure that invalidates the idea" },
  { id: "target", group: "Risk", label: "Target is at opposing liquidity" },
  { id: "news", group: "Risk", label: "High-impact news has been checked" },
];

/* ---------------- Helpers ---------------- */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtR = (v) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "--"
    : `${v >= 0 ? "+" : ""}${v.toFixed(2)}R`;

const fmtPct = (v) => (v === null || v === undefined ? "--" : `${v.toFixed(1)}%`);

const fmtPF = (v) =>
  v === null || v === undefined ? "--" : v === Infinity ? "∞" : v.toFixed(2);

function computeStats(list) {
  const closed = list.filter((t) => t.result && t.result !== "Open");
  const wins = closed.filter((t) => t.result === "Win");
  const losses = closed.filter((t) => t.result === "Loss");
  const breakEven = closed.filter((t) => t.result === "Break-even");

  const netR = closed.reduce((sum, t) => sum + num(t.realizedR), 0);
  const grossProfit = wins.reduce((sum, t) => sum + Math.max(0, num(t.realizedR)), 0);
  const grossLoss = Math.abs(
    losses.reduce((sum, t) => sum + Math.min(0, num(t.realizedR)), 0)
  );

  return {
    total: list.length,
    open: list.filter((t) => t.result === "Open").length,
    closed: closed.length,
    wins: wins.length,
    losses: losses.length,
    breakEven: breakEven.length,
    winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : null,
    netR,
    avgR: closed.length > 0 ? netR / closed.length : null,
    profitFactor:
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null,
    grossProfit,
    grossLoss,
  };
}

function groupStats(list, getKey) {
  const groups = {};
  list.forEach((t) => {
    const key = getKey(t) || "Unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  return Object.keys(groups)
    .map((key) => ({ key, ...computeStats(groups[key]) }))
    .sort((a, b) => b.netR - a.netR);
}

function buildEquity(list) {
  const closed = list
    .filter((t) => t.result && t.result !== "Open")
    .slice()
    .sort(
      (a, b) =>
        new Date(a.closedAt || a.createdAt) - new Date(b.closedAt || b.createdAt)
    );

  let cum = 0;
  let peak = 0;
  let maxDD = 0;
  const points = [0];

  closed.forEach((t) => {
    cum += num(t.realizedR);
    points.push(cum);
    peak = Math.max(peak, cum);
    maxDD = Math.max(maxDD, peak - cum);
  });

  return { points, maxDD, current: cum, peak };
}

function checklistGrade(trade) {
  if (!trade.checklistMax) return "No checklist";
  const ratio = num(trade.checklistScore) / trade.checklistMax;
  if (ratio >= 0.9) return "A+ (90%+)";
  if (ratio >= 0.7) return "B (70–89%)";
  return "Below plan (<70%)";
}

function getPeriodRange(mode, offset) {
  const now = new Date();
  if (mode === "Week") {
    const dayFromMonday = (now.getDay() + 6) % 7;
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - dayFromMonday + offset * 7
    );
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
    return {
      start,
      end,
      label: `${start.toLocaleDateString()} – ${last.toLocaleDateString()}`,
    };
  }
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return { start, end, label: `${months[start.getMonth()]} ${start.getFullYear()}` };
}

/* ---------------- Small components ---------------- */

function Field({ label, value, onChangeText, placeholder, keyboardType }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || "Enter " + label.toLowerCase()}
        placeholderTextColor="#65738B"
        keyboardType={keyboardType || "default"}
        autoCapitalize="none"
      />
    </View>
  );
}

function Choice({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceActive]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function EquityCurve({ points }) {
  const [width, setWidth] = useState(0);
  const height = 170;
  const pad = 12;

  if (points.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.muted}>Close at least one trade to see your equity curve.</Text>
      </View>
    );
  }

  const max = Math.max(0, ...points);
  const min = Math.min(0, ...points);
  const range = max - min || 1;
  const innerW = Math.max(0, width - pad * 2);
  const innerH = height - pad * 2;

  const xy = points.map((v, i) => ({
    x: pad + (i / (points.length - 1)) * innerW,
    y: pad + ((max - v) / range) * innerH,
    v,
  }));
  const zeroY = pad + (max / range) * innerH;

  return (
    <View
      style={[styles.chart, { height }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={[styles.zeroLine, { top: zeroY }]} />
      {width > 0 &&
        xy.slice(1).map((p, i) => {
          const a = xy[i];
          const dx = p.x - a.x;
          const dy = p.y - a.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          return (
            <View
              key={"seg" + i}
              style={[
                styles.segment,
                {
                  width: len,
                  left: (a.x + p.x) / 2 - len / 2,
                  top: (a.y + p.y) / 2 - 1,
                  backgroundColor: p.v >= a.v ? C.green : C.red,
                  transform: [{ rotate: `${angle}rad` }],
                },
              ]}
            />
          );
        })}
      {width > 0 &&
        points.length <= 60 &&
        xy.map((p, i) => (
          <View key={"dot" + i} style={[styles.dot, { left: p.x - 3, top: p.y - 3 }]} />
        ))}
      <Text style={[styles.chartLabel, { top: 2 }]}>{fmtR(max)}</Text>
      <Text style={[styles.chartLabel, { bottom: 2 }]}>{fmtR(min)}</Text>
    </View>
  );
}

/* ---------------- App ---------------- */

export default function App() {
  const [tab, setTab] = useState("Home");
  const [trades, setTrades] = useState([]);
  const [tradesLoaded, setTradesLoaded] = useState(false);

  // Closing trades
  const [closingTradeId, setClosingTradeId] = useState(null);
  const [exitPrice, setExitPrice] = useState("");

  // Journal search / filters
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("All");

  // Analysis / reports
  const [analysisView, setAnalysisView] = useState("Analytics");
  const [breakdownBy, setBreakdownBy] = useState("Pair");
  const [reportMode, setReportMode] = useState("Week");
  const [reportOffset, setReportOffset] = useState(0);

  // ICT checklist
  const [checklist, setChecklist] = useState({});

  // Trade form
  const [pair, setPair] = useState("EURUSD");
  const [direction, setDirection] = useState("Buy");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [lots, setLots] = useState("0.01");
  const [setup, setSetup] = useState("Liquidity Sweep");
  const [session, setSession] = useState("London");
  const [notes, setNotes] = useState("");

  /* ---------- Storage ---------- */

  useEffect(() => {
    const loadTrades = async () => {
      try {
        const savedTrades = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedTrades) {
          const parsedTrades = JSON.parse(savedTrades);
          if (Array.isArray(parsedTrades)) {
            setTrades(parsedTrades);
          }
        }
      } catch (error) {
        console.error("Could not load saved trades:", error);
      } finally {
        setTradesLoaded(true);
      }
    };
    loadTrades();
  }, []);

  useEffect(() => {
    if (!tradesLoaded) return;
    const saveTrades = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
      } catch (error) {
        console.error("Could not save trades:", error);
      }
    };
    saveTrades();
  }, [trades, tradesLoaded]);

  /* ---------- Overall stats ---------- */

  const stats = computeStats(trades);
  const equity = buildEquity(trades);

  /* ---------- Form calculations ---------- */

  const e = Number(entry);
  const s = Number(stop);
  const t = Number(target);

  const validPrices =
    entry.trim() !== "" &&
    stop.trim() !== "" &&
    target.trim() !== "" &&
    Number.isFinite(e) &&
    Number.isFinite(s) &&
    Number.isFinite(t) &&
    e > 0 &&
    s > 0 &&
    t > 0;

  const validDirection =
    validPrices && (direction === "Buy" ? s < e && t > e : s > e && t < e);

  const riskDistance = validPrices ? Math.abs(e - s) : 0;
  const rewardDistance = validPrices ? Math.abs(t - e) : 0;
  const rr = validDirection && riskDistance > 0 ? rewardDistance / riskDistance : 0;

  /* ---------- Checklist calculations ---------- */

  const rrOk = validDirection && rr >= MIN_RR;
  const checklistMax = CHECKLIST.length + 1; // +1 for automatic R:R rule
  const checklistScore =
    CHECKLIST.filter((item) => checklist[item.id]).length + (rrOk ? 1 : 0);
  const checklistRatio = checklistScore / checklistMax;
  const checklistVerdict =
    checklistRatio >= 0.9
      ? { text: "A+ setup — meets your trading plan", color: C.green }
      : checklistRatio >= 0.7
      ? { text: "Acceptable — review the missing items", color: C.orange }
      : { text: "Does not meet your plan — consider skipping", color: C.red };

  function toggleChecklist(id) {
    setChecklist((current) => ({ ...current, [id]: !current[id] }));
  }

  /* ---------- Actions ---------- */

  function saveTrade() {
    if (!pair.trim() || !validDirection || rr <= 0) {
      Alert.alert(
        "Check your trade",
        "Enter positive prices and make sure the stop-loss and target are on the correct sides of your entry."
      );
      return;
    }

    const trade = {
      id: String(Date.now()),
      pair: pair.trim().toUpperCase(),
      direction,
      entry: e,
      stop: s,
      target: t,
      lots: lots.trim(),
      setup,
      session,
      notes: notes.trim(),
      rr,
      result: "Open",
      createdAt: new Date().toISOString(),
      checklist: { ...checklist, rr: rrOk },
      checklistScore,
      checklistMax,
    };

    setTrades((current) => [trade, ...current]);
    setEntry("");
    setStop("");
    setTarget("");
    setNotes("");
    setChecklist({});
    setTab("Journal");

    Alert.alert("Trade saved", "Your trade has been added to your journal.");
  }

  function closeTrade(trade) {
    const exit = Number(exitPrice);

    if (exitPrice.trim() === "" || !Number.isFinite(exit) || exit <= 0) {
      Alert.alert("Invalid exit price", "Enter a valid exit price greater than zero.");
      return;
    }

    if (trade.result !== "Open") {
      Alert.alert("Trade already closed", "This trade has already been closed.");
      return;
    }

    const originalRisk = Math.abs(Number(trade.entry) - Number(trade.stop));

    if (!Number.isFinite(originalRisk) || originalRisk <= 0) {
      Alert.alert(
        "Invalid trade",
        "The original entry and stop-loss must have a valid risk distance."
      );
      return;
    }

    const priceMovement =
      trade.direction === "Buy"
        ? exit - Number(trade.entry)
        : Number(trade.entry) - exit;

    const realizedR = priceMovement / originalRisk;
    const result = realizedR > 0 ? "Win" : realizedR < 0 ? "Loss" : "Break-even";

    const closedTrade = {
      ...trade,
      result,
      exitPrice: exit,
      realizedR,
      closedAt: new Date().toISOString(),
    };

    setTrades((current) =>
      current.map((item) => (item.id === trade.id ? closedTrade : item))
    );
    setClosingTradeId(null);
    setExitPrice("");

    Alert.alert(
      "Trade closed",
      `${trade.pair}: ${result}\nRealized R: ${realizedR.toFixed(2)}R`
    );
  }

  function deleteTrade(trade) {
    Alert.alert(
      "Delete trade",
      `Delete this ${trade.pair} ${trade.direction} trade? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setTrades((current) => current.filter((item) => item.id !== trade.id));
            if (closingTradeId === trade.id) {
              setClosingTradeId(null);
              setExitPrice("");
            }
          },
        },
      ]
    );
  }

  /* ---------- Shared renderers ---------- */

  function renderStatsGrid(st) {
    return (
      <View style={styles.statGrid}>
        <Stat label="Closed trades" value={st.closed} />
        <Stat label="Win rate" value={fmtPct(st.winRate)} />
        <Stat
          label="Net performance"
          value={st.closed === 0 ? "--" : fmtR(st.netR)}
          color={st.closed === 0 ? null : st.netR >= 0 ? C.green : C.red}
        />
        <Stat label="Average R" value={fmtR(st.avgR)} />
        <Stat label="Profit factor" value={fmtPF(st.profitFactor)} />
        <Stat label="W / L / BE" value={`${st.wins} / ${st.losses} / ${st.breakEven}`} />
      </View>
    );
  }

  function renderBreakdown(groups) {
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

  function renderTrade(trade) {
    return (
      <View style={styles.tradeCard} key={trade.id}>
        <View style={styles.tradeRow}>
          <Text style={styles.tradePair}>{trade.pair}</Text>
          <Text style={trade.direction === "Buy" ? styles.buy : styles.sell}>
            {trade.direction}
          </Text>
        </View>
        <Text style={styles.muted}>
          {trade.setup} · {trade.session}
        </Text>
        <View style={styles.tradeRow}>
          <Text style={styles.muted}>Entry: {trade.entry}</Text>
          <Text style={styles.muted}>Stop: {trade.stop}</Text>
        </View>
        <View style={styles.tradeRow}>
          <Text style={styles.muted}>Target: {trade.target}</Text>
          <Text style={styles.rrText}>R:R 1:{num(trade.rr).toFixed(2)}</Text>
        </View>
        <Text style={styles.small}>
          Status: {trade.result} · {new Date(trade.createdAt).toLocaleDateString()}
          {trade.lots ? ` · Lots: ${trade.lots}` : ""}
          {trade.checklistMax ? ` · Checklist: ${trade.checklistScore}/${trade.checklistMax}` : ""}
        </Text>
        {!!trade.notes && <Text style={styles.notes}>{trade.notes}</Text>}

        {trade.result === "Open" && (
          <View style={{ marginTop: 12 }}>
            {closingTradeId === trade.id ? (
              <>
                <Field
                  label="Actual exit price"
                  value={exitPrice}
                  onChangeText={setExitPrice}
                  keyboardType="decimal-pad"
                  placeholder="Enter closing price"
                />
                <TouchableOpacity style={styles.primaryButton} onPress={() => closeTrade(trade)}>
                  <Text style={styles.primaryText}>Confirm Close Trade</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.choice}
                  onPress={() => {
                    setClosingTradeId(null);
                    setExitPrice("");
                  }}
                >
                  <Text style={styles.choiceText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  setClosingTradeId(trade.id);
                  setExitPrice("");
                }}
              >
                <Text style={styles.primaryText}>Close Trade</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {trade.result !== "Open" && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.small}>Exit price: {trade.exitPrice}</Text>
            <Text style={styles.small}>
              Realized result: {trade.result} ({num(trade.realizedR).toFixed(2)}R)
            </Text>
            <Text style={styles.small}>
              Closed: {trade.closedAt ? new Date(trade.closedAt).toLocaleDateString() : "--"}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.deleteButton} onPress={() => deleteTrade(trade)}>
          <Text style={styles.deleteText}>Delete trade</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ---------- Screens (called as functions so inputs keep focus) ---------- */

  function renderDashboard() {
    return (
      <>
        <View style={styles.account}>
          <Text style={styles.muted}>TRADING JOURNAL</Text>
          <Text style={styles.balance}>TradeMind ICT</Text>
          <Text style={styles.demo}>DEMO DATA · NO LIVE BROKER CONNECTED</Text>
        </View>

        <Text style={styles.section}>Performance overview</Text>
        <View style={styles.statGrid}>
          <Stat label="Total trades" value={stats.total} />
          <Stat label="Open trades" value={stats.open} />
          <Stat label="Win rate" value={fmtPct(stats.winRate)} />
          <Stat
            label="Net performance"
            value={stats.closed === 0 ? "--" : fmtR(stats.netR)}
            color={stats.closed === 0 ? null : stats.netR >= 0 ? C.green : C.red}
          />
          <Stat label="Average R / trade" value={fmtR(stats.avgR)} />
          <Stat label="Profit factor" value={fmtPF(stats.profitFactor)} />
        </View>

        <View style={styles.menu}>
          <Text style={styles.menuTitle}>Closed trade outcomes</Text>
          <Text style={styles.muted}>
            Wins: {stats.wins} | Losses: {stats.losses} | Break-even: {stats.breakEven}
          </Text>
          <Text style={styles.muted}>
            Max drawdown: {stats.closed === 0 ? "--" : `-${equity.maxDD.toFixed(2)}R`}
          </Text>
        </View>

        <Text style={styles.section}>Workspace</Text>
        <TouchableOpacity style={styles.menu} onPress={() => setTab("New Trade")}>
          <Text style={styles.menuTitle}>+ Record a trade</Text>
          <Text style={styles.muted}>Entry, stop-loss, target, setup and checklist</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menu} onPress={() => setTab("Journal")}>
          <Text style={styles.menuTitle}>Trading journal</Text>
          <Text style={styles.muted}>Search, filter, close and delete trades</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menu} onPress={() => setTab("Analysis")}>
          <Text style={styles.menuTitle}>Analytics & reports</Text>
          <Text style={styles.muted}>Equity curve, drawdown, breakdowns, weekly/monthly</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menu} onPress={() => setTab("Bot")}>
          <Text style={styles.menuTitle}>ICT checklist assistant</Text>
          <Text style={styles.muted}>Review a setup against your trading rules</Text>
        </TouchableOpacity>
      </>
    );
  }

  function renderTradeForm() {
    return (
      <>
        <Text style={styles.pageTitle}>Record a trade</Text>
        <Text style={styles.muted}>Plan the trade before entering the market.</Text>

        <Field label="Currency pair" value={pair} onChangeText={setPair} placeholder="EURUSD" />

        <Text style={[styles.label, { marginTop: 17 }]}>Direction</Text>
        <View style={styles.choices}>
          <Choice label="Buy" selected={direction === "Buy"} onPress={() => setDirection("Buy")} />
          <Choice label="Sell" selected={direction === "Sell"} onPress={() => setDirection("Sell")} />
        </View>

        <Field label="Entry price" value={entry} onChangeText={setEntry} keyboardType="decimal-pad" />
        <Field label="Stop-loss price" value={stop} onChangeText={setStop} keyboardType="decimal-pad" />
        <Field label="Take-profit price" value={target} onChangeText={setTarget} keyboardType="decimal-pad" />
        <Field label="Lot size (reference only)" value={lots} onChangeText={setLots} keyboardType="decimal-pad" />

        <Text style={[styles.label, { marginTop: 17 }]}>SMC / ICT setup</Text>
        <View style={styles.pickerBox}>
          <Picker
            selectedValue={setup}
            onValueChange={setSetup}
            dropdownIconColor={C.blue}
            style={styles.picker}
          >
            {setups.map((item) => (
              <Picker.Item key={item} label={item} value={item} color="#152033" />
            ))}
          </Picker>
        </View>

        <Text style={[styles.label, { marginTop: 17 }]}>Trading session</Text>
        <View style={styles.choices}>
          {SESSIONS.map((item) => (
            <Choice key={item} label={item} selected={session === item} onPress={() => setSession(item)} />
          ))}
        </View>

        <Field
          label="Trade notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Why does this setup meet my plan?"
        />

        <View style={styles.calculator}>
          <Text style={styles.section}>Risk calculator</Text>
          <View style={styles.tradeRow}>
            <Text style={styles.muted}>Stop distance</Text>
            <Text style={styles.calcValue}>{validPrices ? riskDistance.toFixed(5) : "--"}</Text>
          </View>
          <View style={styles.tradeRow}>
            <Text style={styles.muted}>Potential reward distance</Text>
            <Text style={styles.calcValue}>{validPrices ? rewardDistance.toFixed(5) : "--"}</Text>
          </View>
          <View style={styles.tradeRow}>
            <Text style={styles.muted}>Risk-to-reward</Text>
            <Text style={[styles.calcValue, { color: validDirection ? C.green : C.orange }]}>
              {validDirection ? "1:" + rr.toFixed(2) : "--"}
            </Text>
          </View>
          <Text style={styles.small}>
            Price distance is not a cash-risk calculation. Pip value, contract size, fees and
            slippage are not included.
          </Text>
        </View>

        <TouchableOpacity style={styles.calculator} onPress={() => setTab("Bot")}>
          <View style={styles.tradeRow}>
            <Text style={styles.menuTitle}>ICT checklist</Text>
            <Text style={[styles.calcValue, { color: checklistVerdict.color }]}>
              {checklistScore}/{checklistMax}
            </Text>
          </View>
          <Text style={styles.muted}>{checklistVerdict.text}</Text>
          <Text style={styles.small}>Tap to review the checklist. It is saved with this trade.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={saveTrade}>
          <Text style={styles.primaryText}>Save trade to journal</Text>
        </TouchableOpacity>
      </>
    );
  }

  function renderJournal() {
    const query = search.trim().toLowerCase();
    const filtered = trades.filter((trade) => {
      if (resultFilter !== "All" && trade.result !== resultFilter) return false;
      if (!query) return true;
      return [trade.pair, trade.setup, trade.session, trade.direction, trade.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });

    return (
      <>
        <Text style={styles.pageTitle}>Trading journal</Text>
        <Text style={styles.muted}>
          {trades.length} trade{trades.length === 1 ? "" : "s"} recorded
        </Text>

        {trades.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.menuTitle}>No trades yet</Text>
            <Text style={styles.muted}>Record your first planned setup to start your journal.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setTab("New Trade")}>
              <Text style={styles.primaryText}>Record first trade</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Field
              label="Search"
              value={search}
              onChangeText={setSearch}
              placeholder="Pair, setup, session or notes"
            />
            <View style={[styles.choices, { marginTop: 12 }]}>
              {RESULT_FILTERS.map((item) => (
                <Choice
                  key={item}
                  label={item === "Break-even" ? "BE" : item}
                  selected={resultFilter === item}
                  onPress={() => setResultFilter(item)}
                />
              ))}
            </View>
            <Text style={styles.small}>
              Showing {filtered.length} of {trades.length}
            </Text>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.muted}>No trades match your search or filter.</Text>
              </View>
            ) : (
              filtered.map(renderTrade)
            )}
          </>
        )}
      </>
    );
  }

  function renderAnalytics() {
    const getKey = {
      Pair: (tr) => tr.pair,
      Session: (tr) => tr.session,
      Setup: (tr) => tr.setup,
      Checklist: checklistGrade,
    }[breakdownBy];

    return (
      <>
        <Text style={styles.section}>Equity curve (cumulative R)</Text>
        <EquityCurve points={equity.points} />
        <View style={styles.statGrid}>
          <Stat
            label="Current equity"
            value={stats.closed === 0 ? "--" : fmtR(equity.current)}
            color={stats.closed === 0 ? null : equity.current >= 0 ? C.green : C.red}
          />
          <Stat
            label="Max drawdown"
            value={stats.closed === 0 ? "--" : `-${equity.maxDD.toFixed(2)}R`}
            color={stats.closed === 0 ? null : C.red}
          />
          <Stat label="Peak equity" value={stats.closed === 0 ? "--" : fmtR(equity.peak)} />
          <Stat label="Gross win / loss" value={`${stats.grossProfit.toFixed(1)} / ${stats.grossLoss.toFixed(1)}R`} />
        </View>

        <Text style={styles.section}>Overall performance</Text>
        {renderStatsGrid(stats)}

        <Text style={styles.section}>Performance breakdown</Text>
        <View style={styles.choices}>
          {["Pair", "Session", "Setup", "Checklist"].map((item) => (
            <Choice key={item} label={item} selected={breakdownBy === item} onPress={() => setBreakdownBy(item)} />
          ))}
        </View>
        {renderBreakdown(groupStats(trades, getKey))}
      </>
    );
  }

  function renderReports() {
    const range = getPeriodRange(reportMode, reportOffset);
    const periodTrades = trades.filter((tr) => {
      const d = new Date(tr.createdAt);
      return d >= range.start && d < range.end;
    });
    const periodStats = computeStats(periodTrades);
    const setupGroups = groupStats(periodTrades, (tr) => tr.setup);
    const bestSetup = setupGroups.filter((g) => g.closed > 0)[0];

    return (
      <>
        <View style={[styles.choices, { marginTop: 14 }]}>
          {["Week", "Month"].map((item) => (
            <Choice
              key={item}
              label={item === "Week" ? "Weekly" : "Monthly"}
              selected={reportMode === item}
              onPress={() => {
                setReportMode(item);
                setReportOffset(0);
              }}
            />
          ))}
        </View>

        <View style={styles.periodNav}>
          <TouchableOpacity style={styles.periodButton} onPress={() => setReportOffset(reportOffset - 1)}>
            <Text style={styles.periodArrow}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.menuTitle}>{range.label}</Text>
            <Text style={styles.small}>
              {reportOffset === 0 ? `This ${reportMode.toLowerCase()}` : `${Math.abs(reportOffset)} ${reportMode.toLowerCase()}(s) ago`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.periodButton, reportOffset >= 0 && { opacity: 0.3 }]}
            disabled={reportOffset >= 0}
            onPress={() => setReportOffset(reportOffset + 1)}
          >
            <Text style={styles.periodArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {periodTrades.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.muted}>No trades were taken in this period.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.section}>Period summary</Text>
            {renderStatsGrid(periodStats)}

            <View style={styles.menu}>
              <Text style={styles.menuTitle}>Best setup this period</Text>
              <Text style={[styles.muted, bestSetup && { color: C.green }]}>
                {bestSetup
                  ? `${bestSetup.key} · ${fmtR(bestSetup.netR)} over ${bestSetup.closed} closed trade(s)`
                  : "No closed trades yet in this period"}
              </Text>
            </View>

            <Text style={styles.section}>Setups this period</Text>
            {renderBreakdown(setupGroups)}

            <Text style={styles.section}>Trades taken ({periodTrades.length})</Text>
            {periodTrades.map((tr) => (
              <View style={styles.reportRow} key={tr.id}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuTitle}>
                    {tr.pair} · <Text style={tr.direction === "Buy" ? styles.buy : styles.sell}>{tr.direction}</Text>
                  </Text>
                  <Text style={styles.muted}>
                    {tr.setup} · {tr.session} · {new Date(tr.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.calcValue,
                    { color: tr.result === "Open" ? C.orange : num(tr.realizedR) >= 0 ? C.green : C.red },
                  ]}
                >
                  {tr.result === "Open" ? "Open" : fmtR(num(tr.realizedR))}
                </Text>
              </View>
            ))}
          </>
        )}
      </>
    );
  }

  function renderAnalysis() {
    return (
      <>
        <Text style={styles.pageTitle}>SMC / ICT analysis</Text>
        <Text style={styles.muted}>Measure what is working in your trading.</Text>
        <View style={[styles.choices, { marginTop: 14 }]}>
          {["Analytics", "Reports"].map((item) => (
            <Choice key={item} label={item} selected={analysisView === item} onPress={() => setAnalysisView(item)} />
          ))}
        </View>
        {analysisView === "Analytics" ? renderAnalytics() : renderReports()}
      </>
    );
  }

  function renderAssistant() {
    let lastGroup = null;
    return (
      <>
        <Text style={styles.pageTitle}>ICT checklist assistant</Text>
        <View style={styles.botCard}>
          <Text style={styles.demo}>RULES REVIEW · NO LIVE ORDERS</Text>
          <Text style={styles.muted}>
            Tick each rule your current setup meets. The R:R rule is checked automatically from
            the trade form. The checklist is saved with the next trade you record.
          </Text>
        </View>

        <View style={styles.scoreCard}>
          <Text style={[styles.scoreValue, { color: checklistVerdict.color }]}>
            {checklistScore}/{checklistMax}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(checklistRatio * 100)}%`, backgroundColor: checklistVerdict.color },
              ]}
            />
          </View>
          <Text style={[styles.menuTitle, { color: checklistVerdict.color, marginTop: 10 }]}>
            {checklistVerdict.text}
          </Text>
        </View>

        {CHECKLIST.map((item) => {
          const showGroup = item.group !== lastGroup;
          lastGroup = item.group;
          const checked = !!checklist[item.id];
          return (
            <View key={item.id}>
              {showGroup && <Text style={styles.groupLabel}>{item.group.toUpperCase()}</Text>}
              <TouchableOpacity
                style={[styles.checkRow, checked && styles.checkRowActive]}
                onPress={() => toggleChecklist(item.id)}
              >
                <View style={[styles.checkBox, checked && styles.checkBoxActive]}>
                  {checked && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.checkText}>{item.label}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={[styles.checkRow, rrOk && styles.checkRowActive]}>
          <View style={[styles.checkBox, rrOk && styles.checkBoxActive]}>
            {rrOk && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkText}>
            Risk-to-reward is at least 1:{MIN_RR} (auto:{" "}
            {validDirection ? `1:${rr.toFixed(2)}` : "enter prices in the trade form"})
          </Text>
        </View>

        <View style={styles.choices}>
          <TouchableOpacity style={[styles.choice, { marginTop: 10 }]} onPress={() => setChecklist({})}>
            <Text style={styles.choiceText}>Reset checklist</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.choice, styles.choiceActive, { marginTop: 10 }]} onPress={() => setTab("New Trade")}>
            <Text style={[styles.choiceText, styles.choiceTextActive]}>Go to trade form</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Strategy development roadmap</Text>
        {[
          "Define objective SMC/ICT entry rules",
          "Test rules on historical candle data",
          "Include spread, fees and slippage",
          "Add simulated positions and risk limits",
          "Evaluate results before considering live execution",
        ].map((item, index) => (
          <View style={styles.planRow} key={item}>
            <Text style={styles.planNumber}>{index + 1}</Text>
            <Text style={styles.menuDescription}>{item}</Text>
          </View>
        ))}
      </>
    );
  }

  /* ---------- Layout ---------- */

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>TRADEMIND ICT</Text>
        {tab === "Home" && renderDashboard()}
        {tab === "New Trade" && renderTradeForm()}
        {tab === "Journal" && renderJournal()}
        {tab === "Analysis" && renderAnalysis()}
        {tab === "Bot" && renderAssistant()}
      </ScrollView>

      <View style={styles.nav}>
        {[
          ["Home", "Home"],
          ["New Trade", "Journal +"],
          ["Journal", "Trades"],
          ["Analysis", "Analysis"],
          ["Bot", "Checklist"],
        ].map(([value, label]) => (
          <TouchableOpacity key={value} style={styles.navItem} onPress={() => setTab(value)}>
            <Text style={[styles.navText, tab === value && styles.navActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 28 },
  brand: { color: C.blue, fontSize: 12, fontWeight: "800", letterSpacing: 2, marginVertical: 12 },
  account: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 20, marginBottom: 22 },
  balance: { color: C.text, fontSize: 28, fontWeight: "800", marginVertical: 10 },
  demo: { color: C.orange, fontSize: 10, fontWeight: "800", letterSpacing: 0.7, marginBottom: 10 },
  muted: { color: C.muted, fontSize: 12, lineHeight: 19 },
  section: { color: C.text, fontSize: 16, fontWeight: "700", marginTop: 18, marginBottom: 12 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 12 },
  stat: { width: "48%", padding: 15, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, marginBottom: 10 },
  statValue: { color: C.text, fontSize: 22, fontWeight: "800", marginTop: 10 },
  menu: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  menuTitle: { color: C.text, fontSize: 14, fontWeight: "700", marginBottom: 6 },
  menuDescription: { color: C.muted, fontSize: 12, lineHeight: 19, flex: 1 },
  pageTitle: { color: C.text, fontSize: 25, fontWeight: "800", marginBottom: 8 },
  field: { marginTop: 17 },
  label: { color: C.text, fontSize: 12, fontWeight: "700", marginBottom: 8 },
  input: { color: C.text, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14 },
  choices: { flexDirection: "row", gap: 8, marginBottom: 8 },
  choice: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, alignItems: "center", marginBottom: 8 },
  choiceActive: { backgroundColor: "#1C304B", borderColor: C.blue },
  choiceText: { color: C.muted, fontSize: 11, fontWeight: "600" },
  choiceTextActive: { color: C.blue },
  pickerBox: { borderWidth: 1, borderColor: C.border, borderRadius: 11, overflow: "hidden", backgroundColor: C.card },
  picker: { color: C.text, height: 52 },
  calculator: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 22 },
  tradeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10 },
  calcValue: { color: C.text, fontSize: 13, fontWeight: "800" },
  small: { color: C.muted, fontSize: 10, lineHeight: 16, marginTop: 12 },
  primaryButton: { backgroundColor: C.blue, borderRadius: 12, padding: 15, alignItems: "center", marginTop: 18, marginBottom: 20 },
  primaryText: { color: "#091321", fontSize: 13, fontWeight: "800" },
  deleteButton: { borderWidth: 1, borderColor: "#5A2A33", borderRadius: 10, padding: 10, alignItems: "center", marginTop: 12 },
  deleteText: { color: C.red, fontSize: 11, fontWeight: "700" },
  empty: { padding: 20, backgroundColor: C.card, borderRadius: 14, marginTop: 20 },
  tradeCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 15, marginTop: 14 },
  tradePair: { color: C.text, fontSize: 16, fontWeight: "800" },
  buy: { color: C.green, fontWeight: "800" },
  sell: { color: C.red, fontWeight: "800" },
  rrText: { color: C.green, fontSize: 12, fontWeight: "800" },
  notes: { color: C.text, fontSize: 12, marginTop: 10, lineHeight: 18 },
  botCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 17, marginTop: 14 },
  planRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, padding: 13, borderRadius: 10, marginBottom: 8 },
  planNumber: { color: C.blue, fontWeight: "800", fontSize: 15 },
  // Chart
  chart: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, marginBottom: 12, overflow: "hidden", position: "relative" },
  chartEmpty: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 20, marginBottom: 12 },
  zeroLine: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: C.border },
  segment: { position: "absolute", height: 2, borderRadius: 1 },
  dot: { position: "absolute", width: 6, height: 6, borderRadius: 3, backgroundColor: C.blue },
  chartLabel: { position: "absolute", right: 8, color: C.muted, fontSize: 9, fontWeight: "700" },
  // Table
  table: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, marginBottom: 12 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border },
  tableHead: { paddingTop: 2 },
  th: { flex: 1, color: C.muted, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  td: { flex: 1, color: C.muted, fontSize: 11 },
  // Reports
  periodNav: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 10, marginTop: 4 },
  periodButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  periodArrow: { color: C.blue, fontSize: 22, fontWeight: "800" },
  reportRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  // Checklist
  scoreCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 17, marginTop: 14, marginBottom: 6 },
  scoreValue: { fontSize: 30, fontWeight: "800", marginBottom: 10 },
  progressTrack: { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  groupLabel: { color: C.blue, fontSize: 10, fontWeight: "800", letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 13, marginBottom: 8 },
  checkRowActive: { borderColor: "#2C6B57" },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.muted, alignItems: "center", justifyContent: "center" },
  checkBoxActive: { backgroundColor: C.green, borderColor: C.green },
  checkMark: { color: "#091321", fontSize: 13, fontWeight: "900" },
  checkText: { color: C.text, fontSize: 12, lineHeight: 18, flex: 1 },
  // Nav
  nav: { flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, paddingBottom: 10 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 5 },
  navText: { color: C.muted, fontSize: 9, fontWeight: "600", textAlign: "center" },
  navActive: { color: C.blue, fontWeight: "800" },
});

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

export default function App() {
  const [tab, setTab] = useState("Home");
  const [trades, setTrades] = useState([]);


  const closedTrades = trades.filter((trade) => trade.result !== "Open");
  const winningTrades = closedTrades.filter((trade) => trade.result === "Win");
  const losingTrades = closedTrades.filter((trade) => trade.result === "Loss");
  const breakEvenTrades = closedTrades.filter((trade) => trade.result === "Break-even");

  const winRate = closedTrades.length > 0
    ? (winningTrades.length / closedTrades.length) * 100
    : null;

    
  const averageR = closedTrades.length > 0
    ? netR / closedTrades.length
    : null;

  const grossProfitR = winningTrades.reduce(
    (total, trade) => total + Math.max(0, Number(trade.realizedR) || 0),
    0
  );

  const grossLossR = Math.abs(
    losingTrades.reduce(
      (total, trade) => total + Math.min(0, Number(trade.realizedR) || 0),
      0
    )
  );

  const profitFactor = grossLossR > 0
    ? grossProfitR / grossLossR
    : grossProfitR > 0
      ? Infinity
      : null;



 
  const [closingTradeId, setClosingTradeId] = useState(null);
  const [exitPrice, setExitPrice] = useState("");


const [tradesLoaded, setTradesLoaded] = useState(false);

useEffect(() => {
  const loadTrades = async () => {
    try {
      const savedTrades = await AsyncStorage.getItem(
        "@trademind_ict_trades_v1"
      );

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
  if (!tradesLoaded) {
    return;
  }

  const saveTrades = async () => {
    try {
      await AsyncStorage.setItem(
        "@trademind_ict_trades_v1",
        JSON.stringify(trades)
      );
    } catch (error) {
      console.error("Could not save trades:", error);
    }
  };

  saveTrades();
}, [trades, tradesLoaded]);

  const [pair, setPair] = useState("EURUSD");
  const [direction, setDirection] = useState("Buy");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [lots, setLots] = useState("0.01");
  const [setup, setSetup] = useState("Liquidity Sweep");
  const [session, setSession] = useState("London");
  const [notes, setNotes] = useState("");

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
    validPrices &&
    (direction === "Buy" ? s < e && t > e : s > e && t < e);

  const riskDistance = validPrices ? Math.abs(e - s) : 0;
  const rewardDistance = validPrices ? Math.abs(t - e) : 0;
  const rr = validDirection && riskDistance > 0
    ? rewardDistance / riskDistance
    : 0;

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
    };

    setTrades((current) => [trade, ...current]);
    setEntry("");
    setStop("");
    setTarget("");
    setNotes("");
    setTab("Journal");

    Alert.alert("Trade saved", "Your trade has been added to this session's journal.");
  }



  function closeTrade(trade) {
    const exit = Number(exitPrice);

    if (
      exitPrice.trim() === "" ||
      !Number.isFinite(exit) ||
      exit <= 0
    ) {
      Alert.alert(
        "Invalid exit price",
        "Enter a valid exit price greater than zero."
      );
      return;
    }

    if (trade.result !== "Open") {
      Alert.alert("Trade already closed", "This trade has already been closed.");
      return;
    }

    const originalRisk = Math.abs(
      Number(trade.entry) - Number(trade.stop)
    );

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

    const result =
      realizedR > 0
        ? "Win"
        : realizedR < 0
        ? "Loss"
        : "Break-even";

    const closedTrade = {
      ...trade,
      result,
      exitPrice: exit,
      realizedR,
      closedAt: new Date().toISOString(),
    };

    setTrades((current) =>
      current.map((item) =>
        item.id === trade.id ? closedTrade : item
      )
    );

    setClosingTradeId(null);
    setExitPrice("");

    Alert.alert(
      "Trade closed",
      `${trade.pair}: ${result}\nRealized R: ${realizedR.toFixed(2)}R`
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
        <Text style={styles.muted}>{trade.setup} · {trade.session}</Text>
        <View style={styles.tradeRow}>
          <Text style={styles.muted}>Entry: {trade.entry}</Text>
          <Text style={styles.muted}>Stop: {trade.stop}</Text>
        </View>
        <View style={styles.tradeRow}>
          <Text style={styles.muted}>Target: {trade.target}</Text>
          <Text style={styles.rrText}>R:R 1:{trade.rr.toFixed(2)}</Text>
        </View>
        <Text style={styles.small}>
          Status: {trade.result} · {new Date(trade.createdAt).toLocaleDateString()}
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
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => closeTrade(trade)}
                >
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
            <Text style={styles.small}>
              Exit price: {trade.exitPrice}
            </Text>
            <Text style={styles.small}>
              Realized result: {trade.result} ({Number(trade.realizedR).toFixed(2)}R)
            </Text>
            <Text style={styles.small}>
              Closed: {trade.closedAt ? new Date(trade.closedAt).toLocaleDateString() : "--"}
            </Text>
          </View>
        )}

      </View>
    );
  }

  function Dashboard() {
    return (
      <>
        <View style={styles.account}>
          <Text style={styles.muted}>TRADING JOURNAL</Text>
          <Text style={styles.balance}>TradeMind ICT</Text>
          <Text style={styles.demo}>DEMO DATA · NO LIVE BROKER CONNECTED</Text>
        </View>

        <Text style={styles.section}>Performance overview</Text>
        <View style={styles.statGrid}>
          <View style={styles.stat}>
            <Text style={styles.muted}>Total trades</Text>
            <Text style={styles.statValue}>{trades.length}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.muted}>Open trades</Text>
            <Text style={styles.statValue}>{trades.filter(x => x.result === "Open").length}</Text>
          </View>
            
 
         
          <View style={styles.stat}>
            <Text style={styles.muted}>Win rate</Text>
            <Text style={styles.statValue}>
              {winRate === null ? "--" : `${winRate.toFixed(1)}%`}
            </Text>
          </View>

            
       
          <View style={styles.stat}>
            <Text style={styles.muted}>Net performance</Text>
            <Text style={styles.statValue}>
              {closedTrades.length === 0 ? "--" : `${netR >= 0 ? "+" : ""}${netR.toFixed(2)}R`}
            </Text>
          </View>
        </View>

        <Text style={styles.section}>Workspace</Text>

   
  
       
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>Closed trade outcomes</Text>
          <Text style={styles.muted}>
            Wins: {winningTrades.length}  |  Losses: {losingTrades.length}  |  Break-even: {breakEvenTrades.length}
          </Text>
        </View>

          
  
        <TouchableOpacity style={styles.menu} onPress={() => setTab("New Trade")}>
          <Text style={styles.menuTitle}>+ Record a trade</Text>
          <Text style={styles.muted}>Entry, stop-loss, target and setup</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menu} onPress={() => setTab("Journal")}>
          <Text style={styles.menuTitle}>Trading journal</Text>
          <Text style={styles.muted}>Review trades recorded this session</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menu} onPress={() => setTab("Bot")}>
          <Text style={styles.menuTitle}>Trading bot</Text>
          <Text style={styles.muted}>Strategy development and simulation</Text>
        </TouchableOpacity>
      </>
    );
  }

  function TradeForm() {
    return (
      <>
        <Text style={styles.pageTitle}>Record a trade</Text>
        <Text style={styles.muted}>
          Plan the trade before entering the market.
        </Text>

        <Field label="Currency pair" value={pair} onChangeText={setPair} placeholder="EURUSD" />
        <Text style={styles.label}>Direction</Text>
        <View style={styles.choices}>
          <Choice label="Buy" selected={direction === "Buy"} onPress={() => setDirection("Buy")} />
          <Choice label="Sell" selected={direction === "Sell"} onPress={() => setDirection("Sell")} />
        </View>

        <Field label="Entry price" value={entry} onChangeText={setEntry} keyboardType="decimal-pad" />
        <Field label="Stop-loss price" value={stop} onChangeText={setStop} keyboardType="decimal-pad" />
        <Field label="Take-profit price" value={target} onChangeText={setTarget} keyboardType="decimal-pad" />
        <Field label="Lot size (reference only)" value={lots} onChangeText={setLots} keyboardType="decimal-pad" />

        <Text style={styles.label}>SMC / ICT setup</Text>
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

        <Text style={styles.label}>Trading session</Text>
        <View style={styles.choices}>
          {["Asia", "London", "New York"].map((item) => (
            <Choice key={item} label={item} selected={session === item} onPress={() => setSession(item)} />
          ))}
        </View>

        <Field label="Trade notes (optional)" value={notes} onChangeText={setNotes} placeholder="Why does this setup meet my plan?" />

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
            Price distance is not a cash-risk calculation. Pip value, contract size, fees and slippage are not included.
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={saveTrade}>
          <Text style={styles.primaryText}>Save trade to journal</Text>
        </TouchableOpacity>
      </>
    );
  }

  function Journal() {
    return (
      <>
        <Text style={styles.pageTitle}>Trading journal</Text>
        <Text style={styles.muted}>
          {trades.length} trade{trades.length === 1 ? "" : "s"} recorded in this session
        </Text>
        {trades.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.menuTitle}>No trades yet</Text>
            <Text style={styles.muted}>Record your first planned setup to start your journal.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setTab("New Trade")}>
              <Text style={styles.primaryText}>Record first trade</Text>
            </TouchableOpacity>
          </View>
        ) : trades.map(renderTrade)}
      </>
    );
  }

  function Bot() {
    return (
      <>
        <Text style={styles.pageTitle}>Trading bot</Text>
        <View style={styles.botCard}>
          <Text style={styles.demo}>SIMULATION DEVELOPMENT</Text>
          <Text style={styles.menuTitle}>No live orders are enabled</Text>
          <Text style={styles.muted}>
            The automated strategy is not implemented yet. We will build historical backtesting first, followed by paper trading and risk controls.
          </Text>
        </View>
        <Text style={styles.section}>Planned bot milestones</Text>
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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>TRADEMIND ICT</Text>
        {tab === "Home" && <Dashboard />}
        {tab === "New Trade" && <TradeForm />}
        {tab === "Journal" && <Journal />}
        {tab === "Bot" && <Bot />}
        {tab === "Analysis" && (
          <>
            <Text style={styles.pageTitle}>SMC / ICT analysis</Text>
            <Text style={styles.muted}>Analysis tools will be added after the journal form works.</Text>
            <View style={styles.menu}>
              {setups.map(item => <Text key={item} style={styles.planRowText}>{item}</Text>)}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.nav}>
        {[
          ["Home", "Home"],
          ["New Trade", "Journal +"],
          ["Journal", "Trades"],
          ["Analysis", "Analysis"],
          ["Bot", "Bot"],
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
  statValue: { color: C.text, fontSize: 24, fontWeight: "800", marginTop: 10 },
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
  empty: { padding: 20, backgroundColor: C.card, borderRadius: 14, marginTop: 20 },
  tradeCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 15, marginTop: 14 },
  tradePair: { color: C.text, fontSize: 16, fontWeight: "800" },
  buy: { color: C.green, fontWeight: "800" },
  sell: { color: C.red, fontWeight: "800" },
  rrText: { color: C.green, fontSize: 12, fontWeight: "800" },
  notes: { color: C.text, fontSize: 12, marginTop: 10, lineHeight: 18 },
  botCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 17, marginTop: 20 },
  planRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, padding: 13, borderRadius: 10, marginBottom: 8 },
  planNumber: { color: C.blue, fontWeight: "800", fontSize: 15 },
  planRowText: { color: C.text, paddingVertical: 8, fontSize: 12 },
  nav: { flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, paddingBottom: 10 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 5 },
  navText: { color: C.muted, fontSize: 9, fontWeight: "600", textAlign: "center" },
  navActive: { color: C.blue, fontWeight: "800" },
});

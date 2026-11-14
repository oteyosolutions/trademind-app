import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../theme";
import { RESULT_FILTERS } from "../constants";
import { useApp } from "../context/AppContext";
import { Choice, Field } from "../components/ui";
import TradeCard from "../components/TradeCard";

export function DatasetSwitch() {
  const { dataset, setDataset, backtestTrades } = useApp();
  if (backtestTrades.length === 0) return null;
  return (
    <View style={[styles.choices, { marginTop: 12 }]}>
      <Choice label="My trades" selected={dataset === "mine"} onPress={() => setDataset("mine")} />
      <Choice
        label={`Bot backtest (${backtestTrades.length})`}
        selected={dataset === "backtest"}
        onPress={() => setDataset("backtest")}
      />
    </View>
  );
}

export default function JournalScreen() {
  const { datasetTrades, dataset, search, setSearch, resultFilter, setResultFilter, setTab } = useApp();
  const list = datasetTrades;

  const query = search.trim().toLowerCase();
  const filtered = list.filter((trade) => {
    if (resultFilter !== "All" && trade.result !== resultFilter) return false;
    if (!query) return true;
    return [trade.pair, trade.setup, trade.session, trade.direction, trade.notes,
      trade.alertId ? "alert" : "manual"]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
  const shown = filtered.slice(0, 150);

  return (
    <>
      <Text style={styles.pageTitle}>Trading journal</Text>
      <Text style={styles.muted}>
        {list.length} {dataset === "backtest" ? "backtest " : ""}trade{list.length === 1 ? "" : "s"} recorded
      </Text>
      <DatasetSwitch />

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.menuTitle}>No trades yet</Text>
          <Text style={styles.muted}>Record your first planned setup to start your journal.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setTab("New Trade")}>
            <Text style={styles.primaryText}>Record first trade</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Field label="Search" value={search} onChangeText={setSearch} placeholder="Pair, setup, session or notes" />
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
            Showing {shown.length} of {filtered.length}
            {filtered.length > shown.length ? " (refine the search to see older trades)" : ""}
          </Text>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.muted}>No trades match your search or filter.</Text>
            </View>
          ) : (
            shown.map((trade) => <TradeCard key={trade.id} trade={trade} />)
          )}
        </>
      )}
    </>
  );
}

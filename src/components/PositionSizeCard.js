import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { useApp } from "../context/AppContext";
import { fmtMoney } from "../utils/risk";
import { Field } from "./ui";

export default function PositionSizeCard() {
  const { sizing, settings, currentRisk, quoteRate, setQuoteRate, setLots, setTab } = useApp();
  const cur = settings.currency;

  return (
    <View style={styles.calculator}>
      <Text style={styles.section}>Position size</Text>
      {currentRisk === null ? (
        <>
          <Text style={styles.muted}>
            Set your account balance and risk % to get a lot size for every trade.
          </Text>
          <TouchableOpacity onPress={() => setTab("Settings")}>
            <Text style={styles.linkText}>Open account settings</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.tradeRow}>
            <Text style={styles.muted}>Risk per trade</Text>
            <Text style={styles.calcValue}>
              {fmtMoney(currentRisk, cur).replace("+", "")} ({settings.riskPercent}%)
            </Text>
          </View>
          <View style={styles.tradeRow}>
            <Text style={styles.muted}>Stop distance</Text>
            <Text style={styles.calcValue}>
              {sizing.pips !== null && sizing.distance > 0 ? `${sizing.pips.toFixed(1)} pips` : "--"}
            </Text>
          </View>

          {sizing.needsRate && (
            <Field
              label={`1 ${sizing.info.quote} = how many USD? (e.g. JPY: 0.0067)`}
              value={quoteRate}
              onChangeText={setQuoteRate}
              keyboardType="decimal-pad"
            />
          )}

          {sizing.error ? (
            <Text style={[styles.small, { color: C.orange }]}>{sizing.error}</Text>
          ) : (
            <>
              <View style={styles.tradeRow}>
                <Text style={styles.muted}>Suggested lot size</Text>
                <Text style={[styles.calcValue, { color: sizing.tooSmall ? C.red : C.green, fontSize: 16 }]}>
                  {sizing.tooSmall ? "< 0.01" : sizing.lots.toFixed(2)}
                </Text>
              </View>
              <View style={styles.tradeRow}>
                <Text style={styles.muted}>Loss if stopped out</Text>
                <Text style={styles.calcValue}>
                  {sizing.tooSmall ? "--" : fmtMoney(-sizing.actualRisk, cur)}
                </Text>
              </View>
              {sizing.tooSmall ? (
                <Text style={[styles.small, { color: C.red }]}>
                  Even 0.01 lots risks {fmtMoney(sizing.valuePerLot * 0.01, cur).replace("+", "")} - more
                  than your risk limit. Use a tighter stop or skip the trade.
                </Text>
              ) : (
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setLots(sizing.lots.toFixed(2))}>
                  <Text style={styles.secondaryText}>Use {sizing.lots.toFixed(2)} lots</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          <Text style={styles.small}>
            {sizing.info.known
              ? `Contract: ${sizing.contract.toLocaleString()} units per lot. Check your broker's contract size for indices and other symbols.`
              : "Unknown symbol type - lot size assumes 1 unit per lot. Check your broker's contract size."}{" "}
            Spread and commission are not included.
          </Text>
        </>
      )}
    </View>
  );
}

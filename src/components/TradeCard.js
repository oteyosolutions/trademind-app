import React from "react";
import { Image, Linking, Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { PARTIAL_PRESETS } from "../constants";
import { useApp } from "../context/AppContext";
import { num } from "../utils/format";
import { fmtMoney } from "../utils/risk";
import { exitR, isBacktest, remainingPercent } from "../utils/trades";
import { Chips, Field } from "./ui";
import ReviewFields from "./ReviewFields";

function openLink(url) {
  if (!url) return;
  const full = /^https?:\/\//i.test(url) ? url : "https://" + url;
  Linking.openURL(full).catch(() => {});
}

export default function TradeCard({ trade }) {
  const {
    closingTradeId, setClosingTradeId, exitPrice, setExitPrice, closeTrade, deleteTrade, startEdit,
    startClosing, closePlan, setClosePlan, closeMistakes, setCloseMistakes, closeLesson, setCloseLesson,
    partialTradeId, setPartialTradeId, partialPercent, setPartialPercent, partialPrice, setPartialPrice,
    partialClose, undoPartial, moveStopToBreakeven, moneyOf, settings,
  } = useApp();

  const origin = isBacktest(trade) ? " · Bot backtest" : trade.alertId ? " · From scanner alert" : "";
  const partials = trade.partials || [];
  const remaining = remainingPercent(trade);
  const money = moneyOf(trade);
  const isOpen = trade.result === "Open";

  return (
    <View style={styles.tradeCard}>
      <View style={styles.tradeRow}>
        <Text style={styles.tradePair}>{trade.pair}</Text>
        <Text style={trade.direction === "Buy" ? styles.buy : styles.sell}>{trade.direction}</Text>
      </View>
      <Text style={styles.muted}>
        {trade.setup} · {trade.session}
        {origin}
      </Text>
      <View style={styles.tradeRow}>
        <Text style={styles.muted}>Entry: {trade.entry}</Text>
        <Text style={styles.muted}>
          Stop: {trade.stop}
          {trade.stopAtBreakeven ? " → BE" : ""}
        </Text>
      </View>
      <View style={styles.tradeRow}>
        <Text style={styles.muted}>Target: {trade.target}</Text>
        <Text style={styles.rrText}>R:R 1:{num(trade.rr).toFixed(2)}</Text>
      </View>
      <Text style={styles.small}>
        Status: {trade.result} · {new Date(trade.createdAt).toLocaleDateString()}
        {trade.lots ? ` · Lots: ${trade.lots}` : ""}
        {trade.checklistMax ? ` · Checklist: ${trade.checklistScore}/${trade.checklistMax}` : ""}
        {trade.emotion ? ` · Felt: ${trade.emotion}` : ""}
        {trade.updatedAt ? " · edited" : ""}
      </Text>
      {!!trade.notes && <Text style={styles.notes}>{trade.notes}</Text>}

      {partials.length > 0 && (
        <View style={{ marginTop: 8 }}>
          {partials.map((p, i) => (
            <Text key={`${p.at}-${i}`} style={styles.small}>
              Partial: {p.percent}% closed at {p.price} ({(exitR(trade, Number(p.price)) || 0).toFixed(2)}R)
            </Text>
          ))}
          {isOpen && (
            <TouchableOpacity onPress={() => undoPartial(trade)}>
              <Text style={[styles.small, { color: C.blue }]}>Undo last partial</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {(trade.photos || []).length > 0 && (
        <View style={styles.photoRow}>
          {trade.photos.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.thumb} />
          ))}
        </View>
      )}
      {(!!trade.chartBefore || !!trade.chartAfter) && (
        <View style={styles.tagRow}>
          {!!trade.chartBefore && (
            <TouchableOpacity onPress={() => openLink(trade.chartBefore)}>
              <Text style={styles.linkText}>Chart before ↗</Text>
            </TouchableOpacity>
          )}
          {!!trade.chartAfter && (
            <TouchableOpacity onPress={() => openLink(trade.chartAfter)}>
              <Text style={[styles.linkText, { marginLeft: 12 }]}>Chart after ↗</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isOpen && (
        <View style={{ marginTop: 12 }}>
          {closingTradeId === trade.id ? (
            <>
              <Field
                label={partials.length ? `Exit price for the remaining ${remaining}%` : "Actual exit price"}
                value={exitPrice}
                onChangeText={setExitPrice}
                keyboardType="decimal-pad"
                placeholder="Enter closing price"
              />
              <ReviewFields
                plan={closePlan}
                setPlan={setClosePlan}
                mistakes={closeMistakes}
                setMistakes={setCloseMistakes}
                lesson={closeLesson}
                setLesson={setCloseLesson}
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
          ) : partialTradeId === trade.id ? (
            <>
              <Text style={styles.label}>Close part of the position ({remaining}% open)</Text>
              <Chips
                options={PARTIAL_PRESETS.filter((p) => p < remaining).map((p) => `${p}%`)}
                selected={`${partialPercent}%`}
                onSelect={(o) => setPartialPercent(o.replace("%", ""))}
              />
              <Field label="Percent to close" value={partialPercent} onChangeText={setPartialPercent} keyboardType="decimal-pad" />
              <Field label="Partial close price" value={partialPrice} onChangeText={setPartialPrice} keyboardType="decimal-pad" />
              <TouchableOpacity style={styles.primaryButton} onPress={() => partialClose(trade)}>
                <Text style={styles.primaryText}>Confirm partial close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.choice} onPress={() => setPartialTradeId(null)}>
                <Text style={styles.choiceText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.primaryButton} onPress={() => startClosing(trade)}>
                <Text style={styles.primaryText}>Close Trade</Text>
              </TouchableOpacity>
              <View style={[styles.choices, { marginTop: -8 }]}>
                <TouchableOpacity
                  style={styles.choice}
                  onPress={() => {
                    setClosingTradeId(null);
                    setPartialPrice("");
                    setPartialPercent(String(PARTIAL_PRESETS.find((p) => p < remaining) || 50));
                    setPartialTradeId(trade.id);
                  }}
                >
                  <Text style={styles.choiceText}>Partial close</Text>
                </TouchableOpacity>
                {!trade.stopAtBreakeven && (
                  <TouchableOpacity style={styles.choice} onPress={() => moveStopToBreakeven(trade)}>
                    <Text style={styles.choiceText}>Stop to breakeven</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      )}

      {!isOpen && (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.small}>Exit price: {trade.exitPrice}</Text>
          <Text style={[styles.small, { color: num(trade.realizedR) > 0 ? C.green : num(trade.realizedR) < 0 ? C.red : C.muted }]}>
            Realized result: {trade.result} ({num(trade.realizedR).toFixed(2)}R
            {money ? ` · ${fmtMoney(money.amount, settings.currency)}${money.estimated ? " est." : ""}` : ""})
          </Text>
          <Text style={styles.small}>
            Closed: {trade.closedAt ? new Date(trade.closedAt).toLocaleDateString() : "--"}
            {trade.planFollowed === true ? " · Followed plan" : trade.planFollowed === false ? " · Broke plan" : ""}
          </Text>
          {(trade.mistakes || []).length > 0 && (
            <Text style={[styles.small, { color: C.orange }]}>Mistakes: {trade.mistakes.join(", ")}</Text>
          )}
          {!!trade.lesson && <Text style={styles.notes}>Lesson: {trade.lesson}</Text>}
        </View>
      )}

      <View style={styles.choices}>
        <TouchableOpacity style={styles.editButton} onPress={() => startEdit(trade)}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.deleteButton, { flex: 1 }]} onPress={() => deleteTrade(trade)}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

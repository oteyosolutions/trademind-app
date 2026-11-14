import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { C, styles } from "../theme";
import { EMOTIONS, SESSIONS, SETUPS } from "../constants";
import { useApp } from "../context/AppContext";
import { Chips, Choice, Field } from "../components/ui";
import PositionSizeCard from "../components/PositionSizeCard";
import ReviewFields from "../components/ReviewFields";
import PhotoPicker from "../components/PhotoPicker";

export default function TradeFormScreen() {
  const app = useApp();
  const {
    pair, setPair, direction, setDirection, entry, setEntry, stop, setStop, target, setTarget,
    lots, setLots, setup, setSetup, session, setSession, notes, setNotes, plan, saveTrade,
    checklistScore, checklistMax, checklistVerdict, setTab, reviewingAlert, setReviewingAlert,
    editingTradeId, editExitPrice, setEditExitPrice, cancelEdit, trades, emotion, setEmotion,
    chartBefore, setChartBefore, chartAfter, setChartAfter, photos, setPhotos, planFollowed,
    setPlanFollowed, mistakes, setMistakes, lesson, setLesson,
  } = app;
  const { validPrices, validDirection, riskDistance, rewardDistance, rr } = plan;
  const editing = editingTradeId ? trades.find((t) => t.id === editingTradeId) : null;

  return (
    <>
      <Text style={styles.pageTitle}>{editing ? "Edit trade" : "Record a trade"}</Text>
      <Text style={styles.muted}>
        {editing
          ? `Editing ${editing.pair} ${editing.direction} from ${new Date(editing.createdAt).toLocaleDateString()}.`
          : "Plan the trade before entering the market."}
      </Text>

      {reviewingAlert && !editing && (
        <View style={[styles.menu, { marginTop: 12, borderColor: C.blue }]}>
          <Text style={styles.menuTitle}>From scanner alert: {reviewingAlert.symbol}</Text>
          <Text style={styles.muted}>
            Prices are pre-filled from the alert. Adjust them to what you actually trade.
          </Text>
          <TouchableOpacity onPress={() => setReviewingAlert(null)}>
            <Text style={[styles.small, { color: C.blue }]}>Unlink from alert</Text>
          </TouchableOpacity>
        </View>
      )}

      <Field label="Currency pair" value={pair} onChangeText={setPair} placeholder="EURUSD" />

      <Text style={[styles.label, { marginTop: 17 }]}>Direction</Text>
      <View style={styles.choices}>
        <Choice label="Buy" selected={direction === "Buy"} onPress={() => setDirection("Buy")} />
        <Choice label="Sell" selected={direction === "Sell"} onPress={() => setDirection("Sell")} />
      </View>

      <Field label="Entry price" value={entry} onChangeText={setEntry} keyboardType="decimal-pad" />
      <Field label="Stop-loss price" value={stop} onChangeText={setStop} keyboardType="decimal-pad" />
      <Field label="Take-profit price" value={target} onChangeText={setTarget} keyboardType="decimal-pad" />
      {editing && editing.result !== "Open" && (
        <Field
          label="Exit price (closed trade)"
          value={editExitPrice}
          onChangeText={setEditExitPrice}
          keyboardType="decimal-pad"
        />
      )}
      <Field label="Lot size (reference only)" value={lots} onChangeText={setLots} keyboardType="decimal-pad" />

      <Text style={[styles.label, { marginTop: 17 }]}>SMC / ICT setup</Text>
      <View style={styles.pickerBox}>
        <Picker selectedValue={setup} onValueChange={setSetup} dropdownIconColor={C.blue} style={styles.picker}>
          {SETUPS.map((item) => (
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
        multiline
      />

      <Text style={[styles.label, { marginTop: 17 }]}>How do you feel before this trade?</Text>
      <Chips options={EMOTIONS} selected={emotion} onSelect={(o) => setEmotion(emotion === o ? "" : o)} />

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
          Price distance is not a cash-risk calculation. Pip value, contract size, fees and slippage
          are not included.
        </Text>
      </View>

      <PositionSizeCard />

      <PhotoPicker photos={photos} setPhotos={setPhotos} />
      <Field
        label="Chart link before entry (e.g. TradingView snapshot)"
        value={chartBefore}
        onChangeText={setChartBefore}
        placeholder="https://www.tradingview.com/x/..."
      />
      <Field
        label="Chart link after the trade (optional)"
        value={chartAfter}
        onChangeText={setChartAfter}
        placeholder="https://www.tradingview.com/x/..."
      />

      {editing && editing.result !== "Open" && (
        <View style={styles.calculator}>
          <Text style={styles.menuTitle}>Trade review</Text>
          <ReviewFields
            plan={planFollowed}
            setPlan={setPlanFollowed}
            mistakes={mistakes}
            setMistakes={setMistakes}
            lesson={lesson}
            setLesson={setLesson}
          />
        </View>
      )}

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
        <Text style={styles.primaryText}>{editing ? "Save changes" : "Save trade to journal"}</Text>
      </TouchableOpacity>
      {editing && (
        <TouchableOpacity style={[styles.choice, { marginTop: -8 }]} onPress={cancelEdit}>
          <Text style={styles.choiceText}>Cancel editing</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

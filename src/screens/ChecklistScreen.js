import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { CHECKLIST, MIN_RR } from "../constants";
import { useApp } from "../context/AppContext";

const ROADMAP = [
  "Define objective SMC/ICT entry rules",
  "Test rules on historical candle data",
  "Include spread, fees and slippage",
  "Add simulated positions and risk limits",
  "Evaluate results before considering live execution",
];

export default function ChecklistScreen() {
  const {
    checklist, setChecklist, toggleChecklist, checklistScore, checklistMax, checklistRatio,
    checklistVerdict, rrOk, plan, reviewingAlert, setReviewingAlert, setSkippingId, setAlertFilter,
    setTab, editingTradeId,
  } = useApp();
  let lastGroup = null;

  return (
    <>
      <Text style={styles.pageTitle}>ICT checklist assistant</Text>

      {reviewingAlert && (
        <View style={[styles.botCard, { borderColor: C.blue }]}>
          <Text style={styles.demo}>REVIEWING SCANNER ALERT</Text>
          <Text style={styles.menuTitle}>
            {reviewingAlert.symbol} {reviewingAlert.direction} · entry {reviewingAlert.entry}
          </Text>
          <Text style={styles.muted}>
            The trade form is pre-filled. Tick only the rules this setup really meets, then continue.
            If it fails your plan, skip it instead.
          </Text>
          <View style={[styles.choices, { marginTop: 10 }]}>
            <TouchableOpacity style={[styles.choice, styles.choiceActive]} onPress={() => setTab("New Trade")}>
              <Text style={[styles.choiceText, styles.choiceTextActive]}>Continue to trade form</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.choice}
              onPress={() => {
                setSkippingId(reviewingAlert.id);
                setReviewingAlert(null);
                setAlertFilter("New");
                setTab("Alerts");
              }}
            >
              <Text style={styles.choiceText}>Skip this alert</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.botCard}>
        <Text style={styles.demo}>RULES REVIEW · NO LIVE ORDERS</Text>
        <Text style={styles.muted}>
          Tick each rule your current setup meets. The R:R rule is checked automatically from the
          trade form. The checklist is saved with the {editingTradeId ? "trade you are editing" : "next trade you record"}.
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
          {plan.validDirection ? `1:${plan.rr.toFixed(2)}` : "enter prices in the trade form"})
        </Text>
      </View>

      <View style={styles.choices}>
        <TouchableOpacity style={[styles.choice, { marginTop: 10 }]} onPress={() => setChecklist({})}>
          <Text style={styles.choiceText}>Reset checklist</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.choice, styles.choiceActive, { marginTop: 10 }]}
          onPress={() => setTab("New Trade")}
        >
          <Text style={[styles.choiceText, styles.choiceTextActive]}>Go to trade form</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Strategy development roadmap</Text>
      {ROADMAP.map((item, index) => (
        <View style={styles.planRow} key={item}>
          <Text style={styles.planNumber}>{index + 1}</Text>
          <Text style={styles.menuDescription}>{item}</Text>
        </View>
      ))}
    </>
  );
}

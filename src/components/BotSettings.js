import React, { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { useApp } from "../context/AppContext";
import { botGet, botPost, clearPin, getPin, setPin } from "../utils/botApi";
import TradingViewLink from "./TradingViewLink";

const FALLBACK_GROUPS = [
  { key: "risk", title: "Risk & limits", note: "Applies to the next trade." },
  { key: "news", title: "News filter", note: "Applies immediately." },
  { key: "strategy", title: "Strategy", note: "Changes WHAT the bot trades - the forward test starts again and the backtest must be re-run." },
];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function fmtNum(v, step) {
  const decimals = String(step).includes(".") ? String(step).split(".")[1].length : 0;
  return Number(v).toFixed(decimals);
}

function Stepper({ field, value, onChange }) {
  const step = field.step || 1;
  const clamp = (v) => Math.min(field.max, Math.max(field.min, Math.round(v / step) * step));
  const btn = (label, delta) => (
    <TouchableOpacity
      onPress={() => onChange(Number(fmtNum(clamp(Number(value) + delta), step)))}
      style={[styles.chip, { minWidth: 44, alignItems: "center" }]}
    >
      <Text style={[styles.chipText, { fontSize: 16 }]}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {btn("−", -step)}
      <Text style={[styles.calcValue, { minWidth: 48, textAlign: "center" }]}>{fmtNum(value, step)}</Text>
      {btn("+", step)}
    </View>
  );
}

function ChipRow({ options, isOn, onPress }) {
  return (
    <View style={styles.chipWrap}>
      {options.map(([val, label]) => (
        <TouchableOpacity key={JSON.stringify(val)} style={[styles.chip, isOn(val) && styles.chipActive]} onPress={() => onPress(val)}>
          <Text style={[styles.chipText, isOn(val) && styles.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function MoneyInput({ field, value, onChange }) {
  const [text, setText] = useState(String(value ?? 0));
  return (
    <TextInput
      style={[styles.input, { marginTop: 6 }]}
      value={text}
      keyboardType="numeric"
      onChangeText={(t) => {
        setText(t);
        const v = Number(t.replace(/[^0-9.]/g, ""));
        if (Number.isFinite(v) && v >= field.min && v <= field.max) onChange(v);
      }}
      placeholder="0"
      placeholderTextColor="#65738B"
    />
  );
}

function Control({ field, value, onChange }) {
  if (field.type === "money") return <MoneyInput field={field} value={value} onChange={onChange} />;
  if (field.type === "int" || field.type === "float") return <Stepper field={field} value={value} onChange={onChange} />;
  if (field.type === "bool")
    return <ChipRow options={[[true, "On"], [false, "Off"]]} isOn={(v) => v === value} onPress={onChange} />;
  if (field.type === "choice")
    return <ChipRow options={field.options} isOn={(v) => same(v, value)} onPress={onChange} />;
  if (field.type === "symbols") {
    const list = Array.isArray(value) ? value : [];
    return (
      <ChipRow
        options={(field.options || []).map((s) => [s, s])}
        isOn={(s) => list.includes(s)}
        onPress={(s) => {
          const next = list.includes(s) ? list.filter((x) => x !== s) : [...list, s];
          if (next.length) onChange((field.options || []).filter((x) => next.includes(x)));
        }}
      />
    );
  }
  return <Text style={styles.small}>{JSON.stringify(value)}</Text>;
}

/** Bot settings - edited on the phone, checked and applied by the bot on the PC (PIN protected). */
export default function BotSettings({ onSaved }) {
  const { scannerUrl } = useApp();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [pinInput, setPinInput] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function openPanel() {
    setOpen(true);
    setMsg("");
    setHasPin(!!(await getPin()));
    const res = await botGet(scannerUrl, "/bot/settings");
    if (res.ok && res.json.schema) {
      setData(res.json);
      setDraft({});
    } else {
      setMsg(res.status === 404 ? "Update the bot on the PC (version 2.2 or newer) to change settings from the app." : res.json.error || "Could not load settings.");
    }
  }

  async function savePin() {
    const pin = pinInput.replace(/\D/g, "");
    if (pin.length !== 6) {
      Alert.alert("PIN", "The PIN has 6 digits. It is shown in the bot window on the PC.");
      return;
    }
    await setPin(pin);
    setPinInput("");
    setHasPin(true);
  }

  const changes = Object.keys(draft).filter((k) => data && !same(draft[k], data.values[k]));
  const strategyChanges = changes.filter((k) => data.schema.find((f) => f.key === k)?.group === "strategy");

  async function send() {
    const body = { changes: Object.fromEntries(changes.map((k) => [k, draft[k]])) };
    setBusy(true);
    const res = await botPost(scannerUrl, "/bot/settings", body);
    setBusy(false);
    if (res.ok) {
      setData({ ...data, values: res.json.values });
      setDraft({});
      setMsg(res.json.strategy_changed
        ? "Saved. Strategy changed: on the PC double-click 'TradeMind Update Backtest' so the forward test uses the new rules."
        : "Saved - the bot uses the new settings from its next check.");
      if (onSaved) onSaved();
    } else if (res.status === 401) {
      await clearPin();
      setHasPin(false);
      Alert.alert("Wrong PIN", "Enter the 6-digit PIN shown in the bot window on your PC.");
    } else {
      Alert.alert("Not saved", res.json.error || "The bot refused the change.");
    }
  }

  function save() {
    if (!changes.length) return;
    if (strategyChanges.length) {
      Alert.alert(
        "Change the strategy?",
        "This changes which trades the bot takes. The forward test starts again, and you must re-run the backtest on the PC.",
        [{ text: "Cancel", style: "cancel" }, { text: "Change it", onPress: send }]
      );
    } else {
      send();
    }
  }

  if (!scannerUrl) return null;
  if (!open) {
    return (
      <TouchableOpacity style={[styles.secondaryButton, { marginTop: 12 }]} onPress={openPanel}>
        <Text style={{ color: C.blue, fontWeight: "700" }}>Bot settings</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
      <View style={styles.tradeRow}>
        <Text style={styles.menuTitle}>Bot settings</Text>
        <TouchableOpacity onPress={() => setOpen(false)}>
          <Text style={[styles.small, { color: C.blue }]}>Close</Text>
        </TouchableOpacity>
      </View>

      {!hasPin && (
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.small}>Enter the 6-digit PIN shown in the bot window on your PC (line "App PIN").</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={pinInput}
              onChangeText={setPinInput}
              placeholder="6-digit PIN"
              placeholderTextColor="#65738B"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />
            <TouchableOpacity style={[styles.chip, styles.chipActive, { justifyContent: "center" }]} onPress={savePin}>
              <Text style={[styles.chipText, styles.chipTextActive]}>Save PIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {data && (data.groups || FALLBACK_GROUPS).map(({ key: group, title, note }) => (
        <View key={group} style={{ marginBottom: 10 }}>
          <Text style={[styles.muted, { fontWeight: "800", color: group === "strategy" ? C.orange : C.text, marginTop: 10 }]}>{title}</Text>
          <Text style={styles.small}>{note}</Text>
          {data.schema.filter((f) => f.group === group).map((f) => {
            const value = f.key in draft ? draft[f.key] : data.values[f.key];
            const changed = f.key in draft && !same(draft[f.key], data.values[f.key]);
            return (
              <View key={f.key} style={{ marginTop: 8 }}>
                <Text style={[styles.small, changed && { color: C.blue, fontWeight: "700" }]}>
                  {f.label}{changed ? "  (changed)" : ""}
                </Text>
                <Control field={f} value={value} onChange={(v) => setDraft({ ...draft, [f.key]: v })} />
                {f.key === "TV_ON" && <TradingViewLink scannerUrl={scannerUrl} />}
                {f.key === "BOT_RISK_PERCENT" && data.live && (
                  <Text style={[styles.small, { color: C.orange }]}>LIVE account: capped at {data.live_max_risk}% on the PC.</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}

      {data && (
        <>
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 6, marginBottom: 6, opacity: changes.length && hasPin && !busy ? 1 : 0.4 }]}
            disabled={!changes.length || !hasPin || busy}
            onPress={save}
          >
            <Text style={styles.primaryText}>{busy ? "Saving..." : changes.length ? `Save ${changes.length} change${changes.length > 1 ? "s" : ""}` : "No changes"}</Text>
          </TouchableOpacity>
          {changes.length > 0 && (
            <TouchableOpacity onPress={() => setDraft({})}>
              <Text style={[styles.small, { color: C.blue, textAlign: "center" }]}>Undo changes</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.small}>
            Real-money (live) trading can only be switched on at the PC, never from the app.
          </Text>
        </>
      )}
      {!!msg && <Text style={[styles.small, { color: msg.startsWith("Saved") ? C.green : C.orange, marginTop: 6 }]}>{msg}</Text>}
    </View>
  );
}

import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { APP_VERSION, CURRENCIES } from "../constants";
import { useApp } from "../context/AppContext";
import { fmtMoney } from "../utils/risk";
import { Chips, Choice, Field } from "../components/ui";
import CloudAccount from "../components/CloudAccount";
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from "../config";
import { Linking } from "react-native";

function AccountSettings() {
  const { settings, updateSettings, currentRisk } = useApp();
  const risk = Number(settings.riskPercent);
  return (
    <View style={styles.calculator}>
      <Text style={styles.menuTitle}>Account & risk</Text>
      <Text style={styles.muted}>Used for lot sizes and to show results in money as well as R.</Text>
      <Field
        label="Account balance"
        value={settings.balance}
        onChangeText={(v) => updateSettings({ balance: v })}
        keyboardType="decimal-pad"
        placeholder="e.g. 1000"
      />
      <Text style={[styles.label, { marginTop: 17 }]}>Account currency</Text>
      <Chips options={CURRENCIES} selected={settings.currency} onSelect={(c) => updateSettings({ currency: c, usdToAccount: c === "USD" ? "1" : settings.usdToAccount })} />
      {settings.currency !== "USD" && (
        <Field
          label={`1 USD = how many ${settings.currency}?`}
          value={settings.usdToAccount}
          onChangeText={(v) => updateSettings({ usdToAccount: v })}
          keyboardType="decimal-pad"
          placeholder={settings.currency === "KES" ? "e.g. 129" : "e.g. 0.92"}
        />
      )}
      <Field
        label="Risk per trade (%)"
        value={settings.riskPercent}
        onChangeText={(v) => updateSettings({ riskPercent: v })}
        keyboardType="decimal-pad"
        placeholder="1"
      />
      <Text style={[styles.small, { color: risk > 2 ? C.orange : C.muted }]}>
        {currentRisk !== null
          ? `You risk ${fmtMoney(currentRisk, settings.currency).replace("+", "")} per trade.`
          : "Enter a balance and risk % to enable lot sizes."}
        {risk > 2 ? " Most professional traders risk 0.5-2% per trade." : ""}
      </Text>
      <Text style={styles.small}>
        Each new trade stores the amount risked when you save it, so changing these later does not
        rewrite past results.
      </Text>
    </View>
  );
}

function SecuritySettings() {
  const { pin, savePin, removePin } = useApp();
  const [newPin, setNewPin] = useState("");
  return (
    <View style={styles.calculator}>
      <Text style={styles.menuTitle}>App lock</Text>
      <Text style={styles.muted}>
        {pin
          ? "A PIN is required when the app starts."
          : "Ask for a PIN when the app starts. Stops casual access to your journal - it does not encrypt your data."}
      </Text>
      <TextInput
        style={styles.pinInput}
        value={newPin}
        onChangeText={(v) => setNewPin(v.replace(/\D/g, "").slice(0, 6))}
        placeholder={pin ? "New PIN" : "4-6 digits"}
        placeholderTextColor="#65738B"
        keyboardType="number-pad"
        secureTextEntry
      />
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          if (savePin(newPin)) setNewPin("");
        }}
      >
        <Text style={styles.secondaryText}>{pin ? "Change PIN" : "Set PIN"}</Text>
      </TouchableOpacity>
      {pin && (
        <TouchableOpacity style={styles.deleteButton} onPress={removePin}>
          <Text style={styles.deleteText}>Remove PIN</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const {
    myTrades, backtestTrades, lastBackup, backupAge, exportBackup, exportCsv, importText,
    setImportText, applyImport, removeBacktestTrades, dataset, setDataset, alertStatus, setTab, isPro,
  } = useApp();

  return (
    <>
      <Text style={styles.pageTitle}>Settings & backup</Text>
      <Text style={styles.muted}>
        Your journal is stored only on this phone. Uninstalling Expo Go or clearing its data
        deletes it - keep a recent backup.
      </Text>

      <CloudAccount />
      <AccountSettings />
      <SecuritySettings />

      {/* ---------- Backup ---------- */}
      <View style={styles.calculator}>
        <Text style={styles.menuTitle}>Back up everything</Text>
        <Text style={styles.muted}>
          Creates a backup of {myTrades.length} trade(s)
          {backtestTrades.length ? `, ${backtestTrades.length} backtest trade(s)` : ""} and{" "}
          {Object.keys(alertStatus).length} alert decision(s). Send it to WhatsApp ("Message
          yourself"), Gmail or Google Drive.
        </Text>
        <Text style={[styles.small, { color: backupAge === null || backupAge >= 7 ? C.orange : C.green }]}>
          {lastBackup
            ? `Last backup: ${new Date(lastBackup).toLocaleString()} (${backupAge} day(s) ago)`
            : "No backup made yet"}
        </Text>
        <TouchableOpacity style={[styles.primaryButton, { marginBottom: 4 }]} onPress={exportBackup}>
          <Text style={styles.primaryText}>Back up now</Text>
        </TouchableOpacity>
      </View>

      {/* ---------- CSV ---------- */}
      <View style={styles.calculator}>
        <Text style={styles.menuTitle}>Export to Excel (CSV)</Text>
        <Text style={styles.muted}>
          Shares your trades as CSV text. Paste it into a file named trades.csv, or into Google
          Sheets (Data → Split text to columns).
        </Text>
        {backtestTrades.length > 0 && (
          <View style={[styles.choices, { marginTop: 12 }]}>
            <Choice label="My trades" selected={dataset === "mine"} onPress={() => setDataset("mine")} />
            <Choice label="Bot backtest" selected={dataset === "backtest"} onPress={() => setDataset("backtest")} />
          </View>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={exportCsv}>
          <Text style={styles.secondaryText}>
            Export {dataset === "backtest" ? "backtest trades" : "my trades"} as CSV
          </Text>
        </TouchableOpacity>
      </View>

      {/* ---------- Import ---------- */}
      <View style={styles.calculator}>
        <Text style={styles.menuTitle}>Restore or import</Text>
        <Text style={styles.muted}>
          Long-press the box and paste a TradeMind backup, or the contents of the bot's
          results\trades_M15.json file. Backtest trades are kept separate from your own trades.
        </Text>
        <TextInput
          style={[styles.textArea, { marginTop: 12 }]}
          value={importText}
          onChangeText={setImportText}
          placeholder="Paste backup text here"
          placeholderTextColor="#65738B"
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={[styles.choices, { marginTop: 12 }]}>
          <TouchableOpacity style={[styles.choice, styles.choiceActive]} onPress={() => applyImport("merge")}>
            <Text style={[styles.choiceText, styles.choiceTextActive]}>Add to my journal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.choice} onPress={() => applyImport("replace")}>
            <Text style={styles.choiceText}>Replace everything</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.small}>
          "Add" keeps your current trades and adds missing ones. "Replace" restores the backup
          exactly (you will be asked to confirm).
        </Text>
        {importText.length > 0 && (
          <TouchableOpacity onPress={() => setImportText("")}>
            <Text style={[styles.small, { color: C.blue }]}>Clear box</Text>
          </TouchableOpacity>
        )}
      </View>

      {backtestTrades.length > 0 && (
        <View style={styles.calculator}>
          <Text style={styles.menuTitle}>Backtest data</Text>
          <Text style={styles.muted}>{backtestTrades.length} imported backtest trade(s).</Text>
          <TouchableOpacity style={styles.deleteButton} onPress={removeBacktestTrades}>
            <Text style={styles.deleteText}>Remove all backtest trades</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.menu, { marginTop: 22 }]}>
        <Text style={styles.menuTitle}>About</Text>
        <Text style={styles.muted}>TradeMind ICT v{APP_VERSION} · SMC/ICT trading journal</Text>
        <View style={styles.tagRow}>
          <TouchableOpacity onPress={() => setTab("Pro")}>
            <Text style={styles.linkText}>{isPro ? "Pro ✓" : "Get Pro"}</Text>
          </TouchableOpacity>
          {!!PRIVACY_URL && (
            <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
              <Text style={[styles.linkText, { marginLeft: 16 }]}>Privacy policy</Text>
            </TouchableOpacity>
          )}
          {!!TERMS_URL && (
            <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
              <Text style={[styles.linkText, { marginLeft: 16 }]}>Terms</Text>
            </TouchableOpacity>
          )}
          {!!SUPPORT_EMAIL && (
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
              <Text style={[styles.linkText, { marginLeft: 16 }]}>Contact support</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.small}>
          For journaling and education only. Not financial advice. Scanner alerts are setup
          candidates, not recommendations, and past results do not guarantee future results.
        </Text>
      </View>
    </>
  );
}

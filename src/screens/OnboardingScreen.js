import React, { useState } from "react";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { CURRENCIES } from "../constants";
import { useApp } from "../context/AppContext";
import { Chips, Field } from "../components/ui";

const STEPS = 3;

export default function OnboardingScreen() {
  const { settings, updateSettings, myTrades } = useApp();
  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);

  const finish = () => updateSettings({ onboarded: true });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>TRADEMIND ICT · STEP {step + 1} OF {STEPS}</Text>

        {step === 0 && (
          <>
            <Text style={styles.pageTitle}>Welcome</Text>
            <Text style={styles.muted}>
              TradeMind ICT helps you plan, journal and review SMC/ICT trades so you can see what
              really works for you.
            </Text>
            {myTrades.length > 0 && (
              <Text style={[styles.small, { color: C.green }]}>
                Your {myTrades.length} saved trade(s) are safe and will appear after setup.
              </Text>
            )}
            <View style={styles.calculator}>
              <Text style={styles.menuTitle}>Important</Text>
              <Text style={styles.muted}>
                This app is for journaling and education only. It is not financial advice and does
                not place trades. Scanner alerts are setup candidates, not recommendations. Trading
                carries a high risk of loss.
              </Text>
              <TouchableOpacity style={[styles.checkRow, { marginTop: 12 }, accepted && styles.checkRowActive]} onPress={() => setAccepted(!accepted)}>
                <View style={[styles.checkBox, accepted && styles.checkBoxActive]}>
                  {accepted && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.checkText}>I understand</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.pageTitle}>Your account</Text>
            <Text style={styles.muted}>
              Used for lot sizes and money results. You can change it any time in Settings, or skip.
            </Text>
            <Field
              label="Account balance"
              value={settings.balance}
              onChangeText={(v) => updateSettings({ balance: v })}
              keyboardType="decimal-pad"
              placeholder="e.g. 1000"
            />
            <Text style={[styles.label, { marginTop: 17 }]}>Account currency</Text>
            <Chips options={CURRENCIES} selected={settings.currency} onSelect={(c) => updateSettings({ currency: c })} />
            {settings.currency !== "USD" && (
              <Field
                label={`1 USD = how many ${settings.currency}?`}
                value={settings.usdToAccount}
                onChangeText={(v) => updateSettings({ usdToAccount: v })}
                keyboardType="decimal-pad"
              />
            )}
            <Field
              label="Risk per trade (%)"
              value={settings.riskPercent}
              onChangeText={(v) => updateSettings({ riskPercent: v })}
              keyboardType="decimal-pad"
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.pageTitle}>Keep your data safe</Text>
            <View style={styles.calculator}>
              <Text style={styles.menuTitle}>Back up regularly</Text>
              <Text style={styles.muted}>
                Your journal lives only on this phone. Use Settings → Back up now and send the backup
                to yourself on WhatsApp, Gmail or Drive. The app reminds you every 7 days.
              </Text>
            </View>
            <View style={styles.calculator}>
              <Text style={styles.menuTitle}>Optional PIN</Text>
              <Text style={styles.muted}>You can add a PIN lock in Settings → App lock.</Text>
            </View>
            <View style={styles.calculator}>
              <Text style={styles.menuTitle}>Scanner alerts</Text>
              <Text style={styles.muted}>
                Run scan_signals.py on your PC and connect it in the Alerts tab to review setups.
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, step === 0 && !accepted && { opacity: 0.4 }]}
          disabled={step === 0 && !accepted}
          onPress={() => (step < STEPS - 1 ? setStep(step + 1) : finish())}
        >
          <Text style={styles.primaryText}>{step < STEPS - 1 ? "Continue" : "Start journaling"}</Text>
        </TouchableOpacity>
        {step === 1 && (
          <TouchableOpacity style={styles.choice} onPress={() => setStep(step + 1)}>
            <Text style={styles.choiceText}>Skip for now</Text>
          </TouchableOpacity>
        )}
        {step > 0 && (
          <TouchableOpacity onPress={() => setStep(step - 1)}>
            <Text style={[styles.linkText, { textAlign: "center" }]}>Back</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

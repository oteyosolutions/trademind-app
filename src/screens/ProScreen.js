import React from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { PRO_FREE_DURING_BETA, PRIVACY_URL, TERMS_URL } from "../config";
import { useApp } from "../context/AppContext";

const FEATURES = [
  ["Cloud backup & sync", "Your journal saved automatically and available on any phone."],
  ["MT5 trade import", "Bring in your real MT5 history instead of typing every trade."],
  ["Alerts anywhere", "Scanner setups and push notifications even when you are away from home."],
  ["Advanced analytics", "Calendar heatmap, R distribution, mistake, emotion, weekday and hour breakdowns."],
];

export default function ProScreen() {
  const { isPro, proStatus, proPackages, proBusy, buyPro, restorePro, purchasesAvailable, setTab } = useApp();

  return (
    <>
      <Text style={styles.pageTitle}>TradeMind Pro</Text>
      <Text style={styles.muted}>Everything in the free journal, plus:</Text>

      {FEATURES.map(([title, text]) => (
        <View key={title} style={styles.menu}>
          <Text style={styles.menuTitle}>✓ {title}</Text>
          <Text style={styles.muted}>{text}</Text>
        </View>
      ))}

      {proStatus.active ? (
        <View style={[styles.menu, { borderColor: C.green }]}>
          <Text style={[styles.menuTitle, { color: C.green }]}>You have Pro</Text>
          <Text style={styles.muted}>
            {proStatus.expires ? `${proStatus.willRenew ? "Renews" : "Ends"} ${new Date(proStatus.expires).toLocaleDateString()}. ` : ""}
            Manage or cancel any time in Google Play → Payments & subscriptions.
          </Text>
        </View>
      ) : PRO_FREE_DURING_BETA ? (
        <View style={[styles.menu, { borderColor: C.blue }]}>
          <Text style={[styles.menuTitle, { color: C.blue }]}>Pro is free during the beta</Text>
          <Text style={styles.muted}>Thank you for testing TradeMind ICT. All Pro features are unlocked for now.</Text>
        </View>
      ) : null}

      {!proStatus.active && purchasesAvailable && proPackages.length > 0 &&
        proPackages.map((pkg) => (
          <TouchableOpacity
            key={pkg.identifier}
            style={[styles.primaryButton, { marginBottom: 0 }, proBusy && { opacity: 0.5 }]}
            disabled={proBusy}
            onPress={() => buyPro(pkg)}
          >
            <Text style={styles.primaryText}>
              {pkg.product.title.replace(/\s*\(.*\)$/, "")} · {pkg.product.priceString}
            </Text>
          </TouchableOpacity>
        ))}

      {!proStatus.active && purchasesAvailable && proPackages.length === 0 && !PRO_FREE_DURING_BETA && (
        <Text style={[styles.small, { color: C.orange }]}>Subscriptions could not be loaded. Check your internet connection.</Text>
      )}
      {!purchasesAvailable && !PRO_FREE_DURING_BETA && (
        <Text style={[styles.small, { color: C.orange }]}>
          Subscriptions are available in the TradeMind app from Google Play.
        </Text>
      )}

      {purchasesAvailable && (
        <TouchableOpacity style={styles.secondaryButton} disabled={proBusy} onPress={restorePro}>
          <Text style={styles.secondaryText}>Restore purchases</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.small}>
        Payment is charged to your Google Play account (card, M-Pesa or Play balance). Subscriptions
        renew automatically until cancelled in Google Play. Pro is a journaling tool - it does not
        give financial advice or trade signals.
      </Text>
      <View style={styles.tagRow}>
        {!!TERMS_URL && (
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={styles.linkText}>Terms</Text>
          </TouchableOpacity>
        )}
        {!!PRIVACY_URL && (
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={[styles.linkText, { marginLeft: 16 }]}>Privacy</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={styles.choice} onPress={() => setTab("Settings")}>
        <Text style={styles.choiceText}>Back to settings</Text>
      </TouchableOpacity>
    </>
  );
}

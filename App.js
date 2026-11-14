/**
 * TradeMind ICT - SMC/ICT trading journal
 *
 * Folder layout:
 *   App.js                    this file: header, screen switching, bottom navigation
 *   src/theme.js              colours and styles
 *   src/constants.js          storage keys, setups, sessions, checklist rules
 *   src/context/AppContext.js all app data and actions (saving, closing, editing, alerts, backup)
 *   src/utils/                calculations (stats, trades, backup, formatting)
 *   src/components/           reusable pieces (cards, tables, inputs, equity curve)
 *   src/screens/              one file per screen
 */
import "react-native-url-polyfill/auto";
import React from "react";
import { SafeAreaView, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";

import { C, styles } from "./src/theme";
import { AppProvider, useApp } from "./src/context/AppContext";
import DashboardScreen from "./src/screens/DashboardScreen";
import TradeFormScreen from "./src/screens/TradeFormScreen";
import JournalScreen from "./src/screens/JournalScreen";
import AlertsScreen from "./src/screens/AlertsScreen";
import AnalysisScreen from "./src/screens/AnalysisScreen";
import ChecklistScreen from "./src/screens/ChecklistScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import LockScreen from "./src/screens/LockScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import ProScreen from "./src/screens/ProScreen";
import ErrorBoundary from "./src/components/ErrorBoundary";

const SCREENS = {
  Home: DashboardScreen,
  "New Trade": TradeFormScreen,
  Journal: JournalScreen,
  Alerts: AlertsScreen,
  Analysis: AnalysisScreen,
  Bot: ChecklistScreen,
  Settings: SettingsScreen,
  Pro: ProScreen,
};

function Shell() {
  const { tab, setTab, newAlertCount, editingTradeId, backupDue, settingsLoaded, unlocked, settings } = useApp();
  const Screen = SCREENS[tab] || DashboardScreen;

  if (!settingsLoaded) {
    return <SafeAreaView style={styles.safe} />;
  }
  if (!unlocked) return <LockScreen />;
  if (!settings.onboarded) return <OnboardingScreen />;

  const navItems = [
    ["Home", "Home"],
    ["New Trade", editingTradeId ? "Editing" : "Journal +"],
    ["Journal", "Trades"],
    ["Alerts", newAlertCount > 0 ? `Alerts (${newAlertCount})` : "Alerts"],
    ["Analysis", "Analysis"],
    ["Bot", "Checklist"],
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={styles.brand}>TRADEMIND ICT</Text>
          <TouchableOpacity onPress={() => setTab("Settings")}>
            <Text style={[styles.gear, tab === "Settings" && styles.gearActive, backupDue && { color: C.orange }]}>
              {backupDue ? "Backup ⚠" : "Settings"}
            </Text>
          </TouchableOpacity>
        </View>
        <Screen />
      </ScrollView>

      <View style={styles.nav}>
        {navItems.map(([value, label]) => (
          <TouchableOpacity key={value} style={styles.navItem} onPress={() => setTab(value)}>
            <Text style={[styles.navText, tab === value && styles.navActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <ErrorBoundary>
          <Shell />
        </ErrorBoundary>
      </AppProvider>
    </ErrorBoundary>
  );
}

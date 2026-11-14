import React, { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { ALERT_FILTERS } from "../constants";
import { useApp } from "../context/AppContext";
import { timeAgo } from "../utils/format";
import { Choice, Field } from "../components/ui";
import AlertCard from "../components/AlertCard";

export default function AlertsScreen() {
  const {
    alertsData, allAlerts, user, alertStatus, alertFilter, setAlertFilter, scannerInput, setScannerInput,
    connectScanner, scannerUrl, alertsError, alertsLoading, lastFetch, fetchAlerts, fetchCloudAlerts,
  } = useApp();

  useEffect(() => {
    fetchCloudAlerts();
  }, []);

  const refreshAll = () => {
    fetchCloudAlerts();
    if (scannerUrl) fetchAlerts();
  };
  const all = allAlerts;
  const scanner = alertsData.scanner;
  const statusOf = (a) => (alertStatus[a.id] ? alertStatus[a.id].status : "new");
  const filtered = all.filter((a) => alertFilter === "All" || statusOf(a) === alertFilter.toLowerCase());

  let statusLine = "";
  if (scannerUrl && !alertsError) {
    statusLine = "Connected";
    if (scanner && Array.isArray(scanner.symbols)) {
      statusLine += ` · ${scanner.symbols.length} symbols, ${scanner.timeframe}`;
    }
    if (scanner && scanner.last_check) statusLine += ` · scanner checked ${timeAgo(scanner.last_check)}`;
    if (lastFetch) statusLine += ` · updated ${lastFetch.toLocaleTimeString()}`;
  }

  return (
    <>
      <Text style={styles.pageTitle}>Setup alerts</Text>
      <Text style={styles.muted}>
        Setup candidates from your scanner. Review each one with your checklist - the alerts
        alone have not shown an edge in testing.
      </Text>

      <View style={styles.calculator}>
        <Text style={styles.menuTitle}>Scanner connection</Text>
        <Field
          label="Scanner address (shown in the scanner window)"
          value={scannerInput}
          onChangeText={setScannerInput}
          placeholder="192.168.1.20:8765"
        />
        <TouchableOpacity style={[styles.primaryButton, { marginBottom: 6 }]} onPress={connectScanner}>
          <Text style={styles.primaryText}>{scannerUrl ? "Reconnect" : "Connect"}</Text>
        </TouchableOpacity>
        {!!user && (
          <Text style={[styles.small, { color: C.green }]}>
            Cloud alerts on - you also see alerts when away from your Wi-Fi.
          </Text>
        )}
        {scannerUrl ? (
          <Text style={[styles.small, { color: alertsError ? C.red : C.green }]}>
            {alertsError || statusLine}
          </Text>
        ) : (
          <Text style={styles.small}>
            On your PC run: python scan_signals.py - then type the address it shows. Phone and PC
            must be on the same Wi-Fi.
          </Text>
        )}
        {scannerUrl || user ? (
          <TouchableOpacity onPress={refreshAll}>
            <Text style={[styles.small, { color: C.blue }]}>{alertsLoading ? "Refreshing..." : "Refresh now"}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={[styles.choices, { marginTop: 16 }]}>
        {ALERT_FILTERS.map((item) => {
          const count = item === "All" ? all.length : all.filter((a) => statusOf(a) === item.toLowerCase()).length;
          return (
            <Choice
              key={item}
              label={`${item} (${count})`}
              selected={alertFilter === item}
              onPress={() => setAlertFilter(item)}
            />
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>
            {all.length === 0
              ? "No alerts yet. Setups are not frequent - expect a few per week across all symbols."
              : "No alerts in this view."}
          </Text>
        </View>
      ) : (
        filtered.slice(0, 100).map((a) => <AlertCard key={a.id} alert={a} />)
      )}
    </>
  );
}

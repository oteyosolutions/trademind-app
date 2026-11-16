import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { useApp } from "../context/AppContext";
import { fmtPct, fmtPF, fmtR } from "../utils/format";
import { fmtMoney } from "../utils/risk";
import { Stat } from "../components/ui";
import MarketClock from "../components/MarketClock";

export default function DashboardScreen() {
  const { stats, equity, setTab, newAlertCount, backupDue, backupAge, settings, moneyTotal, myTrades, currentRisk } = useApp();
  const money = moneyTotal(myTrades);
  const balance = Number(settings.balance);

  return (
    <>
      <View style={styles.account}>
        <Text style={styles.muted}>TRADING JOURNAL</Text>
        <Text style={styles.balance}>TradeMind ICT</Text>
        {balance > 0 ? (
          <>
            <Text style={styles.muted}>
              Starting balance {fmtMoney(balance, settings.currency).replace("+", "")} · risk{" "}
              {settings.riskPercent}% ({fmtMoney(currentRisk, settings.currency).replace("+", "")}) per trade
            </Text>
            {money && (
              <Text style={[styles.menuTitle, { marginTop: 6, color: money.total >= 0 ? C.green : C.red }]}>
                Journal P/L {fmtMoney(money.total, settings.currency)}
                {money.estimated ? " (est.)" : ""} · now about{" "}
                {fmtMoney(balance + money.total, settings.currency).replace("+", "")}
              </Text>
            )}
          </>
        ) : (
          <TouchableOpacity onPress={() => setTab("Settings")}>
            <Text style={styles.linkText}>Set your account balance and risk % →</Text>
          </TouchableOpacity>
        )}

      </View>

      <MarketClock />

      {backupDue && (
        <TouchableOpacity style={styles.warnCard} onPress={() => setTab("Settings")}>
          <Text style={[styles.menuTitle, { color: C.orange }]}>Back up your journal</Text>
          <Text style={styles.muted}>
            {backupAge === null
              ? "You have never made a backup. "
              : `Your last backup was ${backupAge} days ago. `}
            Your trades live only on this phone - tap to save a copy.
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.section}>Performance overview</Text>
      <View style={styles.statGrid}>
        <Stat label="Total trades" value={stats.total} />
        <Stat label="Open trades" value={stats.open} />
        <Stat label="Win rate" value={fmtPct(stats.winRate)} />
        <Stat
          label="Net performance"
          value={stats.closed === 0 ? "--" : fmtR(stats.netR)}
          color={stats.closed === 0 ? null : stats.netR >= 0 ? C.green : C.red}
        />
        <Stat label="Average R / trade" value={fmtR(stats.avgR)} />
        <Stat label="Profit factor" value={fmtPF(stats.profitFactor)} />
      </View>

      <View style={styles.menu}>
        <Text style={styles.menuTitle}>Closed trade outcomes</Text>
        <Text style={styles.muted}>
          Wins: {stats.wins} | Losses: {stats.losses} | Break-even: {stats.breakEven}
        </Text>
        <Text style={styles.muted}>
          Max drawdown: {stats.closed === 0 ? "--" : `-${equity.maxDD.toFixed(2)}R`}
        </Text>
      </View>

      <Text style={styles.section}>Workspace</Text>
      <TouchableOpacity style={styles.menu} onPress={() => setTab("New Trade")}>
        <Text style={styles.menuTitle}>+ Record a trade</Text>
        <Text style={styles.muted}>Entry, stop-loss, target, setup and checklist</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menu} onPress={() => setTab("Journal")}>
        <Text style={styles.menuTitle}>Trading journal</Text>
        <Text style={styles.muted}>Search, filter, edit, close and delete trades</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menu} onPress={() => setTab("Alerts")}>
        <Text style={styles.menuTitle}>
          Setup alerts{newAlertCount > 0 ? ` (${newAlertCount} new)` : ""}
        </Text>
        <Text style={styles.muted}>Review scanner setups, journal or skip them</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menu} onPress={() => setTab("Analysis")}>
        <Text style={styles.menuTitle}>Analytics & reports</Text>
        <Text style={styles.muted}>Equity curve, drawdown, breakdowns, weekly/monthly</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menu} onPress={() => setTab("Settings")}>
        <Text style={styles.menuTitle}>Backup & settings</Text>
        <Text style={styles.muted}>Back up, export to Excel, restore or import trades</Text>
      </TouchableOpacity>
    </>
  );
}

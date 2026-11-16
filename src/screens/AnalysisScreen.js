import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { useApp } from "../context/AppContext";
import { fmtR, num } from "../utils/format";
import {
  buildEquity, checklistGrade, computeDiscipline, computeStats, getPeriodRange, groupStats,
  groupStatsMulti, hourOf, performanceDetails, weekdayOf,
} from "../utils/stats";
import { fmtMoney } from "../utils/risk";
import { Chips, Choice, Stat } from "../components/ui";
import CalendarHeatmap from "../components/CalendarHeatmap";
import RDistribution from "../components/RDistribution";
import ProLock from "../components/ProLock";
import CoachCard from "../components/CoachCard";
import EquityCurve from "../components/EquityCurve";
import { BreakdownTable, RTable, StatsGrid } from "../components/Tables";
import { DatasetSwitch } from "./JournalScreen";

const BREAKDOWNS = {
  Pair: (tr) => tr.pair,
  Session: (tr) => tr.session,
  Setup: (tr) => tr.setup,
  Weekday: weekdayOf,
  Hour: hourOf,
  Emotion: (tr) => tr.emotion || "Not recorded",
  Plan: (tr) =>
    tr.planFollowed === true ? "Followed plan" : tr.planFollowed === false ? "Broke plan" : "Not recorded",
  Mistakes: null, // several per trade - handled separately
  Checklist: checklistGrade,
  Source: (tr) =>
    tr.source === "bot" ? "Auto bot" : tr.source === "mt5" ? "MT5 (manual)" : tr.alertId ? "From alert" : "Manual",
};

const FREE_BREAKDOWNS = ["Pair", "Session", "Setup", "Checklist", "Source"];

function mistakeKeys(tr) {
  if (tr.result === "Open") return ["Open trade"];
  if (Array.isArray(tr.mistakes) && tr.mistakes.length) return tr.mistakes;
  return tr.planFollowed === undefined || tr.planFollowed === null ? ["Not reviewed"] : ["No mistakes"];
}

function Analytics({ list }) {
  const { breakdownBy, setBreakdownBy, moneyTotal, settings, dataset, isPro } = useApp();
  const stats = computeStats(list);
  const equity = buildEquity(list);
  const details = performanceDetails(list);
  const money = dataset === "mine" ? moneyTotal(list) : null;
  const activeBreakdown = isPro || FREE_BREAKDOWNS.includes(breakdownBy) ? breakdownBy : "Pair";
  const groups =
    activeBreakdown === "Mistakes"
      ? groupStatsMulti(list, mistakeKeys)
      : groupStats(list, BREAKDOWNS[activeBreakdown] || BREAKDOWNS.Pair);

  return (
    <>
      <Text style={styles.section}>Equity curve (cumulative R)</Text>
      <EquityCurve points={equity.points} />
      <View style={styles.statGrid}>
        <Stat
          label="Current equity"
          value={stats.closed === 0 ? "--" : fmtR(equity.current)}
          color={stats.closed === 0 ? null : equity.current >= 0 ? C.green : C.red}
        />
        <Stat
          label="Max drawdown"
          value={stats.closed === 0 ? "--" : `-${equity.maxDD.toFixed(2)}R`}
          color={stats.closed === 0 ? null : C.red}
        />
        <Stat label="Peak equity" value={stats.closed === 0 ? "--" : fmtR(equity.peak)} />
        <Stat label="Gross win / loss" value={`${stats.grossProfit.toFixed(1)} / ${stats.grossLoss.toFixed(1)}R`} />
      </View>

      <Text style={styles.section}>Overall performance</Text>
      <StatsGrid stats={stats} />
      {money && (
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>Net profit / loss</Text>
          <Text style={[styles.statValue, { marginTop: 4, color: money.total >= 0 ? C.green : C.red }]}>
            {fmtMoney(money.total, settings.currency)}
          </Text>
          <Text style={styles.small}>
            From {money.counted} closed trade(s).
            {money.estimated ? " Some older trades use your current risk setting (estimated)." : ""}
          </Text>
        </View>
      )}

      <Text style={styles.section}>Performance details</Text>
      <View style={styles.statGrid}>
        <Stat label="Expectancy / trade" value={fmtR(details.expectancy)} />
        <Stat label="Payoff (avg win/loss)" value={details.payoff === null ? "--" : details.payoff.toFixed(2)} />
        <Stat label="Average win" value={fmtR(details.avgWin)} color={C.green} />
        <Stat label="Average loss" value={fmtR(details.avgLoss)} color={C.red} />
        <Stat label="Best / worst" value={details.count ? `${details.best.toFixed(1)} / ${details.worst.toFixed(1)}R` : "--"} />
        <Stat label="Current streak" value={details.currentStreak} />
        <Stat label="Longest win streak" value={details.bestWinStreak} />
        <Stat label="Longest loss streak" value={details.bestLossStreak} />
      </View>

      <Text style={styles.section}>Calendar</Text>
      <ProLock title="Calendar heatmap">
        <CalendarHeatmap list={list} />
      </ProLock>

      <Text style={styles.section}>R distribution</Text>
      <ProLock title="R distribution">
        <RDistribution list={list} />
      </ProLock>

      <Text style={styles.section}>Performance breakdown</Text>
      <Chips
        options={isPro ? Object.keys(BREAKDOWNS) : FREE_BREAKDOWNS}
        selected={breakdownBy}
        onSelect={setBreakdownBy}
      />
      {!isPro && <Text style={styles.small}>Weekday, hour, emotion, plan and mistake breakdowns are in Pro.</Text>}
      <BreakdownTable groups={groups} />
    </>
  );
}

function Reports({ list }) {
  const { reportMode, setReportMode, reportOffset, setReportOffset } = useApp();
  const range = getPeriodRange(reportMode, reportOffset);
  const periodTrades = list.filter((tr) => {
    const d = new Date(tr.createdAt);
    return d >= range.start && d < range.end;
  });
  const periodStats = computeStats(periodTrades);
  const setupGroups = groupStats(periodTrades, (tr) => tr.setup);
  const bestSetup = setupGroups.filter((g) => g.closed > 0)[0];

  return (
    <>
      <View style={[styles.choices, { marginTop: 14 }]}>
        {["Week", "Month"].map((item) => (
          <Choice
            key={item}
            label={item === "Week" ? "Weekly" : "Monthly"}
            selected={reportMode === item}
            onPress={() => {
              setReportMode(item);
              setReportOffset(0);
            }}
          />
        ))}
      </View>

      <View style={styles.periodNav}>
        <TouchableOpacity style={styles.periodButton} onPress={() => setReportOffset(reportOffset - 1)}>
          <Text style={styles.periodArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.menuTitle}>{range.label}</Text>
          <Text style={styles.small}>
            {reportOffset === 0
              ? `This ${reportMode.toLowerCase()}`
              : `${Math.abs(reportOffset)} ${reportMode.toLowerCase()}(s) ago`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.periodButton, reportOffset >= 0 && { opacity: 0.3 }]}
          disabled={reportOffset >= 0}
          onPress={() => setReportOffset(reportOffset + 1)}
        >
          <Text style={styles.periodArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {periodTrades.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>No trades were taken in this period.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.section}>Period summary</Text>
          <StatsGrid stats={periodStats} />

          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Best setup this period</Text>
            <Text style={[styles.muted, bestSetup && { color: C.green }]}>
              {bestSetup
                ? `${bestSetup.key} · ${fmtR(bestSetup.netR)} over ${bestSetup.closed} closed trade(s)`
                : "No closed trades yet in this period"}
            </Text>
          </View>

          <Text style={styles.section}>Setups this period</Text>
          <BreakdownTable groups={setupGroups} />

          <Text style={styles.section}>Trades taken ({periodTrades.length})</Text>
          {periodTrades.slice(0, 100).map((tr) => (
            <View style={styles.reportRow} key={tr.id}>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>
                  {tr.pair} · <Text style={tr.direction === "Buy" ? styles.buy : styles.sell}>{tr.direction}</Text>
                </Text>
                <Text style={styles.muted}>
                  {tr.setup} · {tr.session} · {new Date(tr.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.calcValue,
                  { color: tr.result === "Open" ? C.orange : num(tr.realizedR) >= 0 ? C.green : C.red },
                ]}
              >
                {tr.result === "Open" ? "Open" : fmtR(num(tr.realizedR))}
              </Text>
            </View>
          ))}
        </>
      )}
    </>
  );
}

function Discipline() {
  const { allAlerts, alertStatus, myTrades } = useApp();
  const alerts = allAlerts;
  if (alerts.length === 0) {
    return (
      <>
        <Text style={styles.section}>Your decisions vs the rules</Text>
        <View style={styles.menu}>
          <Text style={styles.muted}>
            Connect the scanner in the Alerts tab. Once alerts resolve, this section shows whether
            the alerts you take beat the raw rules.
          </Text>
        </View>
      </>
    );
  }
  const d = computeDiscipline(alerts, alertStatus, myTrades);
  const [all, taken, skipped] = d.rows;
  let verdict = "Not enough resolved alerts yet. Keep reviewing and journaling.";
  if (taken.count >= 10 && all.count >= 20) {
    verdict =
      taken.avg > all.avg
        ? `Your selection adds value: alerts you take average ${fmtR(taken.avg)} vs ${fmtR(all.avg)} for all alerts.`
        : `Your selection is not adding value yet: taken alerts average ${fmtR(taken.avg)} vs ${fmtR(all.avg)} for all alerts.`;
  }
  return (
    <>
      <Text style={styles.section}>Your decisions vs the rules</Text>
      <RTable rows={d.rows} />
      <View style={styles.menu}>
        <Text style={styles.menuTitle}>Verdict</Text>
        <Text style={styles.muted}>{verdict}</Text>
        {skipped.count > 0 && (
          <Text style={styles.small}>
            Skipped alerts would have made {fmtR(skipped.net)} by the rules -{" "}
            {skipped.net < 0 ? "skipping them saved you R." : "skipping them cost you R."}
          </Text>
        )}
        <Text style={styles.small}>
          "Rules" = what the scanner's rules alone made (filled orders only). {d.cancelled} alert(s)
          never filled, {d.waiting} still waiting.
        </Text>
      </View>
      <Text style={styles.section}>Which alert conditions work (rules alone)</Text>
      <RTable rows={d.tags} />
    </>
  );
}

export default function AnalysisScreen() {
  const { analysisView, setAnalysisView, datasetTrades, dataset } = useApp();
  return (
    <>
      <Text style={styles.pageTitle}>SMC / ICT analysis</Text>
      <Text style={styles.muted}>
        {dataset === "backtest"
          ? "Showing imported bot backtest trades."
          : "Measure what is working in your trading."}
      </Text>
      <DatasetSwitch />
      {dataset === "mine" ? <CoachCard trades={datasetTrades} /> : null}
      <View style={[styles.choices, { marginTop: 14 }]}>
        {["Analytics", "Reports"].map((item) => (
          <Choice key={item} label={item} selected={analysisView === item} onPress={() => setAnalysisView(item)} />
        ))}
      </View>
      {analysisView === "Analytics" ? <Analytics list={datasetTrades} /> : <Reports list={datasetTrades} />}
      {analysisView === "Analytics" && dataset === "mine" && <Discipline />}
    </>
  );
}

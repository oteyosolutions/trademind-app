import { RULE_RESULTS } from "../constants";
import { num } from "./format";

export function computeStats(list) {
  const closed = list.filter((t) => t.result && t.result !== "Open");
  const wins = closed.filter((t) => t.result === "Win");
  const losses = closed.filter((t) => t.result === "Loss");
  const breakEven = closed.filter((t) => t.result === "Break-even");

  const netR = closed.reduce((sum, t) => sum + num(t.realizedR), 0);
  const grossProfit = wins.reduce((sum, t) => sum + Math.max(0, num(t.realizedR)), 0);
  const grossLoss = Math.abs(
    losses.reduce((sum, t) => sum + Math.min(0, num(t.realizedR)), 0)
  );

  return {
    total: list.length,
    open: list.filter((t) => t.result === "Open").length,
    closed: closed.length,
    wins: wins.length,
    losses: losses.length,
    breakEven: breakEven.length,
    winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : null,
    netR,
    avgR: closed.length > 0 ? netR / closed.length : null,
    profitFactor:
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null,
    grossProfit,
    grossLoss,
  };
}

export function groupStats(list, getKey) {
  const groups = {};
  list.forEach((t) => {
    const key = getKey(t) || "Unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  return Object.keys(groups)
    .map((key) => ({ key, ...computeStats(groups[key]) }))
    .sort((a, b) => b.netR - a.netR);
}

export function buildEquity(list) {
  const closed = list
    .filter((t) => t.result && t.result !== "Open")
    .slice()
    .sort(
      (a, b) =>
        new Date(a.closedAt || a.createdAt) - new Date(b.closedAt || b.createdAt)
    );

  let cum = 0;
  let peak = 0;
  let maxDD = 0;
  const points = [0];

  closed.forEach((t) => {
    cum += num(t.realizedR);
    points.push(cum);
    peak = Math.max(peak, cum);
    maxDD = Math.max(maxDD, peak - cum);
  });

  return { points, maxDD, current: cum, peak };
}

export function checklistGrade(trade) {
  if (!trade.checklistMax) return "No checklist";
  const ratio = num(trade.checklistScore) / trade.checklistMax;
  if (ratio >= 0.9) return "A+ (90%+)";
  if (ratio >= 0.7) return "B (70–89%)";
  return "Below plan (<70%)";
}

export function getPeriodRange(mode, offset) {
  const now = new Date();
  if (mode === "Week") {
    const dayFromMonday = (now.getDay() + 6) % 7;
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - dayFromMonday + offset * 7
    );
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
    return {
      start,
      end,
      label: `${start.toLocaleDateString()} – ${last.toLocaleDateString()}`,
    };
  }
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return { start, end, label: `${months[start.getMonth()]} ${start.getFullYear()}` };
}

export function rStats(rs) {
  const count = rs.length;
  const net = rs.reduce((a, b) => a + b, 0);
  const wins = rs.filter((r) => r > 0).length;
  return {
    count,
    net,
    avg: count ? net / count : null,
    winRate: count ? (wins / count) * 100 : null,
  };
}

export function computeDiscipline(alerts, alertStatus, trades) {
  const filled = alerts.filter((a) => a.outcome && RULE_RESULTS.includes(a.outcome.status));
  const ruleR = (list) => rStats(list.map((a) => num(a.outcome.r)));
  const statusOf = (a) => (alertStatus[a.id] ? alertStatus[a.id].status : "new");
  const journalFromAlerts = trades.filter(
    (t) => t.alertId && t.result && t.result !== "Open"
  );
  return {
    rows: [
      { label: "All alerts (rules alone)", ...ruleR(filled) },
      { label: "Alerts you took (rules)", ...ruleR(filled.filter((a) => statusOf(a) === "taken")) },
      { label: "Alerts you skipped (rules)", ...ruleR(filled.filter((a) => statusOf(a) === "skipped")) },
      { label: "Your journal: alert trades", ...rStats(journalFromAlerts.map((t) => num(t.realizedR))) },
    ],
    tags: [
      { label: "With H1 bias", ...ruleR(filled.filter((a) => a.with_htf_bias)) },
      { label: "Against H1 bias", ...ruleR(filled.filter((a) => !a.with_htf_bias)) },
      { label: "In killzone", ...ruleR(filled.filter((a) => a.in_killzone)) },
      { label: "Outside killzone", ...ruleR(filled.filter((a) => !a.in_killzone)) },
    ],
    cancelled: alerts.filter((a) => a.outcome && a.outcome.status === "Cancelled").length,
    waiting: alerts.filter((a) => a.outcome && a.outcome.status === "waiting").length,
  };
}

/* ---------------- Version 4 analytics ---------------- */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function closedTrades(list) {
  return list.filter((t) => t.result && t.result !== "Open");
}

/** Same as groupStats, but a trade can belong to several groups (e.g. several mistakes). */
export function groupStatsMulti(list, getKeys) {
  const groups = {};
  list.forEach((t) => {
    const keys = getKeys(t);
    (keys && keys.length ? keys : ["Unknown"]).forEach((key) => {
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
  });
  return Object.keys(groups)
    .map((key) => ({ key, ...computeStats(groups[key]) }))
    .sort((a, b) => b.netR - a.netR);
}

export const weekdayOf = (t) => DAYS[new Date(t.createdAt).getDay()];
export const hourOf = (t) => {
  const h = new Date(t.createdAt).getHours();
  return `${String(h).padStart(2, "0")}:00`;
};

/** Expectancy, average win/loss, extremes and streaks (closed trades, by close order). */
export function performanceDetails(list) {
  const closed = closedTrades(list)
    .slice()
    .sort((a, b) => new Date(a.closedAt || a.createdAt) - new Date(b.closedAt || b.createdAt));
  const rs = closed.map((t) => num(t.realizedR));
  const wins = rs.filter((r) => r > 0);
  const losses = rs.filter((r) => r < 0);
  const n = rs.length;
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : null;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : null;
  const winRate = n ? wins.length / n : null;
  const expectancy =
    n ? (winRate * (avgWin || 0)) + ((losses.length / n) * (avgLoss || 0)) : null;

  let bestWinStreak = 0;
  let bestLossStreak = 0;
  let run = 0;
  let runType = null;
  rs.forEach((r) => {
    const type = r > 0 ? "W" : r < 0 ? "L" : "B";
    if (type === runType && type !== "B") run += 1;
    else {
      runType = type;
      run = type === "B" ? 0 : 1;
    }
    if (type === "W") bestWinStreak = Math.max(bestWinStreak, run);
    if (type === "L") bestLossStreak = Math.max(bestLossStreak, run);
  });
  let current = "";
  if (runType && runType !== "B" && run > 0) current = `${run} ${runType === "W" ? "win" : "loss"}${run > 1 ? (runType === "W" ? "s" : "es") : ""}`;

  return {
    count: n,
    avgWin,
    avgLoss,
    expectancy,
    payoff: avgWin !== null && avgLoss ? avgWin / Math.abs(avgLoss) : null,
    best: n ? Math.max(...rs) : null,
    worst: n ? Math.min(...rs) : null,
    bestWinStreak,
    bestLossStreak,
    currentStreak: current || "--",
  };
}

export const R_BUCKETS = [
  { label: "≤ -1.5R", test: (r) => r <= -1.5 },
  { label: "-1.5 to -0.5", test: (r) => r > -1.5 && r <= -0.5 },
  { label: "-0.5 to +0.5", test: (r) => r > -0.5 && r < 0.5 },
  { label: "+0.5 to +1.5", test: (r) => r >= 0.5 && r < 1.5 },
  { label: "+1.5 to +2.5", test: (r) => r >= 1.5 && r < 2.5 },
  { label: "≥ +2.5R", test: (r) => r >= 2.5 },
];

export function rDistribution(list) {
  const rs = closedTrades(list).map((t) => num(t.realizedR));
  return R_BUCKETS.map((b) => ({ label: b.label, count: rs.filter(b.test).length }));
}

/** Net R per day for one month (by close date). offset 0 = this month. */
export function calendarMonth(list, offset) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const byDay = {};
  closedTrades(list).forEach((t) => {
    const d = new Date(t.closedAt || t.createdAt);
    if (d.getFullYear() === first.getFullYear() && d.getMonth() === first.getMonth()) {
      const day = d.getDate();
      if (!byDay[day]) byDay[day] = { r: 0, count: 0 };
      byDay[day].r += num(t.realizedR);
      byDay[day].count += 1;
    }
  });
  const leading = (first.getDay() + 6) % 7; // Monday first
  const cells = [];
  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push({ day, ...(byDay[day] || { r: 0, count: 0 }) });
  while (cells.length % 7 !== 0) cells.push(null);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December"];
  const tradingDays = Object.values(byDay);
  return {
    label: `${months[first.getMonth()]} ${first.getFullYear()}`,
    cells,
    netR: tradingDays.reduce((a, d) => a + d.r, 0),
    greenDays: tradingDays.filter((d) => d.r > 0).length,
    redDays: tradingDays.filter((d) => d.r < 0).length,
  };
}

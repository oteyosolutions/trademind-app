/**
 * Forward test: are the bot's REAL trades behaving like the backtest said they would?
 * `exp` comes from the PC (results/expectations.json via the scanner's /expectations).
 */

export const MIN_TRADES_TO_JUDGE = 20;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Closed bot trades, oldest first. */
export function botClosedTrades(trades) {
  return (trades || [])
    .filter((t) => t && t.source === "bot" && t.result && t.result !== "Open")
    .slice()
    .sort((a, b) => new Date(a.closedAt || a.createdAt) - new Date(b.closedAt || b.createdAt));
}

/** Normal range after n trades: cumulative R (p5 / p50 / p95) and win rate (p5 / p95). */
export function bandAt(exp, n) {
  if (!exp || n <= 0) return { p5: 0, p50: 0, p95: 0, w5: 0, w95: 100 };
  const rows = Array.isArray(exp.band) ? exp.band : [];
  if (n <= rows.length) {
    const r = rows[n - 1];
    return { p5: r[1], p50: r[2], p95: r[3], w5: r[4], w95: r[5] };
  }
  // beyond the saved table: normal approximation
  const mean = num(exp.avg_r) * n;
  const sd = num(exp.sd_r) * Math.sqrt(n);
  const p = num(exp.win_rate) / 100;
  const sdw = Math.sqrt((p * (1 - p)) / n) * 100;
  return {
    p5: mean - 1.645 * sd, p50: mean, p95: mean + 1.645 * sd,
    w5: Math.max(0, p * 100 - 1.645 * sdw), w95: Math.min(100, p * 100 + 1.645 * sdw),
  };
}

export function forwardReport(trades, exp) {
  const list = botClosedTrades(trades);
  const rs = list.map((t) => num(t.realizedR));
  const n = rs.length;

  let cum = 0, peak = 0, maxDD = 0, streak = 0, worstStreak = 0, wins = 0;
  const curve = [0];
  rs.forEach((r) => {
    cum += r;
    curve.push(cum);
    peak = Math.max(peak, cum);
    maxDD = Math.max(maxDD, peak - cum);
    streak = r < 0 ? streak + 1 : 0;
    worstStreak = Math.max(worstStreak, streak);
    if (r > 0) wins += 1;
  });
  const currentDD = peak - cum;

  const first = n ? new Date(list[0].createdAt || list[0].closedAt) : null;
  const days = first ? Math.max(1, (Date.now() - first.getTime()) / 86400000) : 0;
  const perMonth = n && days >= 14 ? (n / days) * 30.44 : null;

  const band = bandAt(exp, n);
  const report = {
    n, cum, wins,
    winRate: n ? (wins / n) * 100 : null,
    avgR: n ? cum / n : null,
    maxDD, currentDD, streak, worstStreak, perMonth, curve, band,
    since: first,
  };
  report.status = judge(report, exp);
  return report;
}

/** level: none | nodata | early | good | ok | watch | stop */
export function judge(r, exp) {
  if (!exp) {
    return { level: "nodata", title: "No backtest targets yet",
      detail: "On the PC run: python run_backtest.py - then keep the scanner running so the app can load them." };
  }
  if (r.n === 0) {
    return { level: "none", title: "Waiting for the bot's first closed trade",
      detail: `The backtest averages about ${num(exp.trades_per_month).toFixed(1)} trades a month across your symbols.` };
  }
  const ddLimit = num(exp.dd_95);
  const streakLimit = num(exp.streak_95);
  if ((ddLimit > 0 && r.maxDD > ddLimit) || (streakLimit > 0 && r.worstStreak > streakLimit)) {
    const why = ddLimit > 0 && r.maxDD > ddLimit
      ? `drawdown ${r.maxDD.toFixed(1)}R is worse than the backtest's bad case (${ddLimit.toFixed(1)}R)`
      : `${r.worstStreak} losses in a row is more than the backtest's bad case (${streakLimit})`;
    return { level: "stop", title: "Outside the normal range - pause and review",
      detail: `The ${why}. Pause the bot, check for a broker or setting problem, and do not go live.` };
  }
  if (r.cum < r.band.p5) {
    return { level: r.n >= MIN_TRADES_TO_JUDGE ? "stop" : "watch",
      title: r.n >= MIN_TRADES_TO_JUDGE ? "Below the normal range - the edge may be gone" : "Weak start - below the normal range",
      detail: `After ${r.n} trades the backtest says ${fmtR(r.band.p5)} to ${fmtR(r.band.p95)} is normal; you are at ${fmtR(r.cum)}.` };
  }
  if (r.n < MIN_TRADES_TO_JUDGE) {
    return { level: "early", title: `Too early to judge (${r.n} of ${MIN_TRADES_TO_JUDGE} trades)`,
      detail: `So far inside the normal range (${fmtR(r.band.p5)} to ${fmtR(r.band.p95)} after ${r.n} trades). Keep the settings unchanged.` };
  }
  if (r.cum >= r.band.p50) {
    return { level: "good", title: "On track - matching or beating the backtest",
      detail: `${fmtR(r.cum)} after ${r.n} trades; the backtest's typical result is ${fmtR(r.band.p50)}.` };
  }
  return { level: "ok", title: "Inside the normal range, below average",
    detail: `${fmtR(r.cum)} after ${r.n} trades vs a typical ${fmtR(r.band.p50)}. Normal luck - keep going and keep the settings unchanged.` };
}

function fmtR(v) {
  return `${v >= 0 ? "+" : ""}${num(v).toFixed(1)}R`;
}

/** Points for the chart: actual curve plus the band, from 0 to max(n, 20) trades. */
export function chartSeries(report, exp) {
  const len = Math.max(report.n, MIN_TRADES_TO_JUDGE);
  const p5 = [0], p50 = [0], p95 = [0];
  for (let k = 1; k <= len; k += 1) {
    const b = bandAt(exp, k);
    p5.push(b.p5); p50.push(b.p50); p95.push(b.p95);
  }
  return { len, actual: report.curve, p5, p50, p95 };
}

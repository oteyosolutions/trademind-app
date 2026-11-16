/**
 * Built-in trade coach - finds patterns in YOUR journal (works offline, no AI service).
 * A pattern is only reported when it is backed by MIN_N trades AND is clearly different from your
 * average (|difference| >= MIN_DIFF R and a t-score >= MIN_T), so the coach does not preach about noise.
 */
import { checklistGrade, hourOf, weekdayOf } from "./stats";

export const MIN_N = 5;
const MIN_DIFF = 0.25;
const MIN_T = 1.5;
const LONG_DAY = { Sun: "Sundays", Mon: "Mondays", Tue: "Tuesdays", Wed: "Wednesdays", Thu: "Thursdays", Fri: "Fridays", Sat: "Saturdays" };

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const fmtR = (v) => `${v >= 0 ? "+" : ""}${num(v).toFixed(2)}R`;
const pct = (v) => `${Math.round(v)}%`;

export function closedTrades(trades) {
  return (trades || [])
    .filter((t) => t && t.result && t.result !== "Open" && Number.isFinite(Number(t.realizedR)))
    .slice()
    .sort((a, b) => new Date(a.closedAt || a.createdAt) - new Date(b.closedAt || b.createdAt));
}

function summary(list) {
  const rs = list.map((t) => num(t.realizedR));
  const n = rs.length;
  const sum = rs.reduce((a, b) => a + b, 0);
  const mean = n ? sum / n : 0;
  const sd = n > 1 ? Math.sqrt(rs.reduce((a, r) => a + (r - mean) ** 2, 0) / (n - 1)) : 0;
  const wins = rs.filter((r) => r > 0).length;
  return { n, sum, mean, sd, winRate: n ? (wins / n) * 100 : 0 };
}

const DIMENSIONS = [
  { key: "session", get: (t) => t.session, where: (g) => `in the ${g} session`,
    fix: (g) => `Stop trading the ${g} session, or halve your risk there until it improves.` },
  { key: "weekday", get: weekdayOf, where: (g) => `on ${LONG_DAY[g] || g}`,
    fix: (g) => `Take ${LONG_DAY[g] || g} off, or only trade A+ setups that day.` },
  { key: "pair", get: (t) => t.pair, where: (g) => `on ${g}`,
    fix: (g) => `Remove ${g} from your watchlist for a month and see if your results improve.` },
  { key: "setup", get: (t) => t.setup, where: (g) => `with ${g} setups`,
    fix: (g) => `Paper-trade ${g} setups only until they show a positive average again.` },
  { key: "hour", get: hourOf, where: (g) => `when you enter around ${g}`,
    fix: (g) => `Avoid entries around ${g}.` },
  { key: "direction", get: (t) => t.direction, where: (g) => `on ${String(g).toLowerCase()} trades`,
    fix: (g) => `Be extra picky with ${String(g).toLowerCase()} trades - require higher-timeframe agreement.` },
  { key: "emotion", get: (t) => t.emotion || null, where: (g) => `when you feel ${String(g).toLowerCase()}`,
    fix: (g) => `When you feel ${String(g).toLowerCase()}, step away for 30 minutes or trade half size.` },
  { key: "plan", get: (t) => (t.planFollowed === true ? "followed" : t.planFollowed === false ? "broke" : null),
    where: (g) => (g === "broke" ? "when you break your plan" : "when you follow your plan"),
    fix: () => "Only take trades that pass your checklist - every rule-break is costing you." },
  { key: "checklist", get: (t) => (t.checklistMax ? checklistGrade(t) : null), where: (g) => `on ${g} checklist trades`,
    fix: () => "Skip trades that score below 70% on your checklist." },
  { key: "source", get: (t) => (t.source === "bot" ? "bot" : t.source === "bot-backtest" ? null : "manual"),
    where: (g) => (g === "bot" ? "on the bot's trades" : "on your own (manual) trades"),
    fix: (g) => (g === "manual" ? "Let the bot take more of the trades, or follow its rules more closely." : "Review the bot's settings and the Forward test card.") },
];

function groupBy(list, get) {
  const groups = new Map();
  list.forEach((t) => {
    const k = get(t);
    if (k === null || k === undefined || k === "") return;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(t);
  });
  return groups;
}

/** Compare one group with the rest of the trades (more honest than comparing with the overall mean). */
function compare(group, rest) {
  const g = summary(group);
  const r = summary(rest);
  const diff = g.mean - r.mean;
  const se = Math.sqrt((g.sd ** 2) / Math.max(g.n, 1) + (r.sd ** 2) / Math.max(r.n, 1)) || 1;
  return { ...g, diff, t: diff / se, restMean: r.mean };
}

function patternInsights(list) {
  const out = [];
  DIMENSIONS.forEach((dim) => {
    const groups = groupBy(list, dim.get);
    if (groups.size < 2) return;
    groups.forEach((items, g) => {
      if (items.length < MIN_N) return;
      const rest = list.filter((t) => !items.includes(t));
      if (rest.length < MIN_N) return;
      const c = compare(items, rest);
      if (Math.abs(c.diff) < MIN_DIFF || Math.abs(c.t) < MIN_T) return;
      const kind = c.diff < 0 && c.mean < 0.05 ? "leak" : c.diff > 0 && c.mean > 0 ? "strength" : null;
      if (!kind) return;
      out.push({
        kind, dim: dim.key, group: g, n: c.n, ids: items.map((t) => t.id).sort().join(","), mean: c.mean, diff: c.diff, score: Math.abs(c.t) * Math.sqrt(c.n),
        cost: kind === "leak" ? c.sum : 0,
        text: kind === "leak"
          ? `You average ${fmtR(c.mean)} ${dim.where(g)} (${c.n} trades, ${pct(c.winRate)} wins) - ${fmtR(Math.abs(c.diff)).slice(1)} worse than your other trades.`
          : `Your edge: ${fmtR(c.mean)} per trade ${dim.where(g)} (${c.n} trades, ${pct(c.winRate)} wins).`,
        action: kind === "leak" ? dim.fix(g) : "Do more of this - it is where your money comes from.",
      });
    });
  });
  return out;
}

const HOUR = 3600 * 1000;

function behaviourInsights(list) {
  const out = [];
  const time = (t, k) => new Date(t[k] || t.createdAt).getTime();

  // revenge trading: opened within 60 minutes after a LOSS closed
  const revenge = [];
  const calm = [];
  list.forEach((t) => {
    const opened = time(t, "createdAt");
    const recentLoss = list.some((p) => p !== t && num(p.realizedR) < 0 && time(p, "closedAt") <= opened && opened - time(p, "closedAt") <= HOUR);
    (recentLoss ? revenge : calm).push(t);
  });
  if (revenge.length >= MIN_N && calm.length >= MIN_N) {
    const c = compare(revenge, calm);
    if (c.diff <= -MIN_DIFF) {
      out.push({ kind: "leak", dim: "revenge", n: c.n, mean: c.mean, diff: c.diff, score: Math.abs(c.t) * Math.sqrt(c.n), cost: c.sum,
        text: `Revenge trading: trades taken within an hour of a loss average ${fmtR(c.mean)} (${c.n} trades) vs ${fmtR(c.restMean)} otherwise.`,
        action: "After a loss, wait at least 60 minutes. Turn on the Risk guardian's cooldown to enforce it." });
    }
  }

  // overtrading: 3rd+ trade of the same day
  const byDay = groupBy(list, (t) => new Date(t.createdAt).toDateString());
  const late = [];
  const early = [];
  byDay.forEach((items) => {
    items.slice().sort((a, b) => time(a, "createdAt") - time(b, "createdAt")).forEach((t, i) => (i >= 2 ? late : early).push(t));
  });
  if (late.length >= MIN_N && early.length >= MIN_N) {
    const c = compare(late, early);
    if (c.diff <= -MIN_DIFF) {
      out.push({ kind: "leak", dim: "overtrading", n: c.n, mean: c.mean, diff: c.diff, score: Math.abs(c.t) * Math.sqrt(c.n), cost: c.sum,
        text: `Overtrading: your 3rd and later trades of a day average ${fmtR(c.mean)} (${c.n} trades) vs ${fmtR(c.restMean)} for the first two.`,
        action: "Stop after 2 trades a day. The Risk guardian's 'max trades per day' can enforce it." });
    }
  }

  // cutting winners early: wins that closed far below the planned target
  const wins = list.filter((t) => num(t.realizedR) > 0 && num(t.rr) > 0);
  if (wins.length >= MIN_N) {
    const early = wins.filter((t) => num(t.realizedR) < 0.6 * num(t.rr));
    const share = early.length / wins.length;
    if (share >= 0.4) {
      const avgWin = summary(wins).mean;
      const planned = wins.reduce((a, t) => a + num(t.rr), 0) / wins.length;
      out.push({ kind: "leak", dim: "cutting", n: wins.length, mean: avgWin, diff: avgWin - planned, score: share * 10, cost: 0,
        text: `You close ${pct(share * 100)} of your winners early: average win ${fmtR(avgWin)} vs ${fmtR(planned)} planned.`,
        action: "Let winners reach the target, or move the stop to breakeven instead of closing (the trade manager can do it)." });
    }
  }

  // losses bigger than 1R: stop moved, no stop, or too much slippage
  const losses = list.filter((t) => num(t.realizedR) < 0);
  if (losses.length >= MIN_N) {
    const big = losses.filter((t) => num(t.realizedR) < -1.2);
    if (big.length / losses.length >= 0.2) {
      const extra = big.reduce((a, t) => a + (num(t.realizedR) + 1), 0);
      out.push({ kind: "leak", dim: "bigloss", n: big.length, mean: summary(big).mean, diff: extra / big.length, score: big.length, cost: extra,
        text: `${big.length} of your ${losses.length} losses were bigger than 1R (they cost an extra ${fmtR(extra)}).`,
        action: "Never move your stop further away. Turn on the trade manager's automatic stop-loss." });
    }
  }

  // the most expensive mistake tag
  const tags = new Map();
  list.forEach((t) => (Array.isArray(t.mistakes) ? t.mistakes : []).forEach((m) => {
    if (!tags.has(m)) tags.set(m, []);
    tags.get(m).push(t);
  }));
  let worst = null;
  tags.forEach((items, m) => {
    const s = summary(items);
    if (items.length >= 3 && s.sum < 0 && (!worst || s.sum < worst.sum)) worst = { m, ...s };
  });
  if (worst) {
    out.push({ kind: "leak", dim: "mistake", n: worst.n, mean: worst.mean, diff: worst.mean, score: Math.abs(worst.sum), cost: worst.sum,
      text: `Your most expensive mistake is "${worst.m}": ${worst.n} trades, ${fmtR(worst.sum)} in total.`,
      action: `Write "${worst.m}" on a sticky note next to your screen and check it before every entry.` });
  }
  return out;
}

function weekly(list, now) {
  const end = now.getTime();
  const inRange = (t, from, to) => {
    const c = new Date(t.closedAt || t.createdAt).getTime();
    return c > from && c <= to;
  };
  const week = list.filter((t) => inRange(t, end - 7 * 24 * HOUR, end));
  const prev = list.filter((t) => inRange(t, end - 14 * 24 * HOUR, end - 7 * 24 * HOUR));
  const s = summary(week);
  const p = summary(prev);
  const sorted = week.slice().sort((a, b) => num(b.realizedR) - num(a.realizedR));
  const breaks = week.filter((t) => t.planFollowed === false || (Array.isArray(t.mistakes) && t.mistakes.length)).length;
  const reviewed = week.filter((t) => t.planFollowed !== undefined && t.planFollowed !== null).length;
  return {
    trades: s.n, net: s.sum, winRate: s.winRate, avg: s.mean,
    prevTrades: p.n, prevNet: p.sum,
    best: sorted[0] || null, worst: sorted.length ? sorted[sorted.length - 1] : null,
    ruleBreaks: breaks, unreviewed: s.n - reviewed,
  };
}

/** Everything the Coach card shows. */
export function coachReport(trades, now = new Date()) {
  const list = closedTrades(trades);
  const all = summary(list);
  const insights = [...patternInsights(list), ...behaviourInsights(list)];
  // the same trades seen through two lenses (e.g. "New York session" = "entries around 18:00"): say it once
  const seen = new Set();
  const unique = (arr) => arr.filter((i) => {
    if (!i.ids) return true;
    if (seen.has(i.ids)) return false;
    seen.add(i.ids);
    return true;
  });
  const leaks = unique(insights.filter((i) => i.kind === "leak").sort((a, b) => b.score - a.score));
  const strengths = unique(insights.filter((i) => i.kind === "strength").sort((a, b) => b.score - a.score));
  const level = list.length < 20 ? "early" : list.length < 60 ? "developing" : "solid";
  const focus = leaks[0]
    ? leaks[0].action
    : list.length < MIN_N * 2
      ? `Log at least ${MIN_N * 2} closed trades so the coach can spot patterns.`
      : "No clear leaks found - keep following your plan and journaling every trade.";
  return {
    trades: list.length, overall: all, level,
    levelText: level === "early"
      ? `Early days: ${list.length} closed trades. Patterns need at least ${MIN_N} trades each - treat them as hints.`
      : level === "developing" ? `${list.length} closed trades - patterns are becoming reliable.` : `${list.length} closed trades - solid evidence.`,
    leaks: leaks.slice(0, 4), strengths: strengths.slice(0, 3), focus, week: weekly(list, now),
  };
}

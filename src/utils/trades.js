import { BACKTEST_SOURCE } from "../constants";

/** Validate entry / stop / target text and work out the risk-to-reward. */
export function planTrade(direction, entryText, stopText, targetText) {
  const e = Number(entryText);
  const s = Number(stopText);
  const t = Number(targetText);
  const validPrices =
    String(entryText).trim() !== "" &&
    String(stopText).trim() !== "" &&
    String(targetText).trim() !== "" &&
    Number.isFinite(e) &&
    Number.isFinite(s) &&
    Number.isFinite(t) &&
    e > 0 &&
    s > 0 &&
    t > 0;
  const validDirection = validPrices && (direction === "Buy" ? s < e && t > e : s > e && t < e);
  const riskDistance = validPrices ? Math.abs(e - s) : 0;
  const rewardDistance = validPrices ? Math.abs(t - e) : 0;
  const rr = validDirection && riskDistance > 0 ? rewardDistance / riskDistance : 0;
  return { e, s, t, validPrices, validDirection, riskDistance, rewardDistance, rr };
}

/** Realized R and result for a trade closed at `exit`. Returns null if not possible. */
export function closeResult(direction, entry, stop, exit) {
  const risk = Math.abs(Number(entry) - Number(stop));
  if (!Number.isFinite(risk) || risk <= 0 || !Number.isFinite(exit) || exit <= 0) return null;
  const move = direction === "Buy" ? exit - Number(entry) : Number(entry) - exit;
  const realizedR = move / risk;
  const result = realizedR > 0 ? "Win" : realizedR < 0 ? "Loss" : "Break-even";
  return { realizedR, result };
}

export const isBacktest = (trade) => trade && trade.source === BACKTEST_SOURCE;

/** Percent of the position still open after partial closes. */
export function remainingPercent(trade) {
  const closed = (trade.partials || []).reduce((sum, p) => sum + Number(p.percent || 0), 0);
  return Math.max(0, 100 - closed);
}

/** R of one exit price for this trade (based on the ORIGINAL stop). */
export function exitR(trade, price) {
  const risk = Math.abs(Number(trade.entry) - Number(trade.stop));
  if (!(risk > 0)) return null;
  const move = trade.direction === "Buy" ? price - Number(trade.entry) : Number(trade.entry) - price;
  return move / risk;
}

/**
 * Final result including any partial closes:
 * realized R = sum(partial% x partial R) + remaining% x final R.
 */
export function finalResult(trade, finalExit) {
  const finalR = exitR(trade, finalExit);
  if (finalR === null || !Number.isFinite(finalExit) || finalExit <= 0) return null;
  let realizedR = 0;
  (trade.partials || []).forEach((p) => {
    realizedR += (Number(p.percent) / 100) * exitR(trade, Number(p.price));
  });
  realizedR += (remainingPercent(trade) / 100) * finalR;
  const rounded = Math.round(realizedR * 1e6) / 1e6;
  const result = rounded > 0 ? "Win" : rounded < 0 ? "Loss" : "Break-even";
  return { realizedR: rounded, result };
}

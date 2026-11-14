/**
 * Position sizing and money conversion.
 *
 * Value of a 1.0 price move for 1 standard lot = contract size x (quote currency -> account currency).
 * Broker symbols with suffixes (EURUSDm, EURUSD.raw) are handled.
 */

const METALS = { XAU: 100, XAG: 5000, XPT: 100, XPD: 100 };

export function cleanSymbol(pair) {
  return String(pair || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function instrumentInfo(pair) {
  const sym = cleanSymbol(pair);
  const base = sym.slice(0, 3);
  const quote = sym.slice(3, 6);
  if (METALS[base] && quote === "USD") {
    return { known: true, kind: "metal", base, quote, contract: METALS[base], pip: base === "XAU" ? 0.1 : 0.01 };
  }
  if (/^[A-Z]{6}/.test(sym) && !/\d/.test(sym.slice(0, 6))) {
    return { known: true, kind: "fx", base, quote, contract: 100000, pip: quote === "JPY" ? 0.01 : 0.0001 };
  }
  return { known: false, kind: "other", base: "", quote: "", contract: 1, pip: 1 };
}

/**
 * How much 1 unit of the quote currency is worth in USD.
 * Returns null when it cannot be worked out from the trade itself.
 */
export function quoteToUsd(info, price, manualRate) {
  if (info.quote === "USD") return 1;
  if (info.base === "USD" && price > 0) return 1 / price; // e.g. USDJPY: 1 JPY = 1/price USD
  const manual = Number(manualRate);
  return Number.isFinite(manual) && manual > 0 ? manual : null;
}

/** Risk amount in account currency for the current settings. */
export function riskAmount(settings) {
  const balance = Number(settings.balance);
  const pct = Number(settings.riskPercent);
  if (!(balance > 0) || !(pct > 0)) return null;
  return (balance * pct) / 100;
}

/**
 * Suggested lot size.
 * manualQuoteRate: for crosses like EURJPY, 1 JPY = ? USD (the app asks for it).
 */
export function positionSize({ pair, entry, stop, settings, manualQuoteRate, contractOverride }) {
  const info = instrumentInfo(pair);
  const contract = Number(contractOverride) > 0 ? Number(contractOverride) : info.contract;
  const risk = riskAmount(settings);
  const distance = Math.abs(Number(entry) - Number(stop));
  const out = { info, contract, risk, distance, pips: info.known ? distance / info.pip : null };
  if (risk === null) return { ...out, error: "Set your balance and risk % in Settings." };
  if (!(distance > 0)) return { ...out, error: "Enter entry and stop-loss prices." };

  const q = quoteToUsd(info, Number(entry), manualQuoteRate);
  if (q === null) {
    return { ...out, needsRate: true, error: `Enter the value of 1 ${info.quote} in USD to size this pair.` };
  }
  const usdToAccount = Number(settings.usdToAccount) > 0 ? Number(settings.usdToAccount) : 1;
  const valuePerLot = distance * contract * q * usdToAccount; // money lost per 1.00 lot at the stop
  const rawLots = risk / valuePerLot;
  const lots = Math.floor(rawLots * 100 + 1e-6) / 100; // round DOWN to 0.01 (tolerant of float error)
  return {
    ...out,
    lots,
    rawLots,
    valuePerLot,
    actualRisk: lots * valuePerLot,
    tooSmall: lots < 0.01,
  };
}

/** Money result of a closed trade, using the risk stored on the trade (or current settings). */
export function tradeMoney(trade, settings) {
  if (!trade || trade.result === "Open") return null;
  const r = Number(trade.realizedR);
  if (!Number.isFinite(r)) return null;
  const stored = Number(trade.riskAmount);
  const risk = stored > 0 ? stored : riskAmount(settings);
  if (!(risk > 0)) return null;
  return { amount: r * risk, estimated: !(stored > 0) };
}

export function fmtMoney(amount, currency) {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "--";
  const sign = amount < 0 ? "-" : amount > 0 ? "+" : "";
  const abs = Math.abs(amount);
  const text = abs >= 1000 ? abs.toLocaleString(undefined, { maximumFractionDigits: 0 }) : abs.toFixed(2);
  return `${sign}${text} ${currency || ""}`.trim();
}

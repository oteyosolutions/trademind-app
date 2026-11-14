import { APP_VERSION, BACKTEST_SOURCE, BACKUP_VERSION, RESULTS } from "../constants";

/** Full backup of everything the app stores, as text. */
export function buildBackup({ trades, alertStatus, scannerUrl, account }) {
  return JSON.stringify({
    app: "TradeMind ICT",
    type: "backup",
    version: BACKUP_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    trades,
    alertStatus,
    settings: { scannerUrl, account: account ? { ...account } : undefined },
  });
}

function cleanTrade(raw) {
  if (!raw || typeof raw !== "object") return null;
  const entry = Number(raw.entry);
  const stop = Number(raw.stop);
  const target = Number(raw.target);
  if (!raw.pair || !["Buy", "Sell"].includes(raw.direction)) return null;
  if (![entry, stop, target].every((v) => Number.isFinite(v) && v > 0)) return null;
  const result = RESULTS.includes(raw.result) ? raw.result : "Open";
  const trade = {
    ...raw,
    id: String(raw.id || `${raw.pair}-${raw.createdAt || Date.now()}`),
    pair: String(raw.pair).toUpperCase(),
    entry,
    stop,
    target,
    rr: Number.isFinite(Number(raw.rr)) ? Number(raw.rr) : Math.abs(target - entry) / Math.abs(entry - stop),
    result,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
  if (result !== "Open") {
    trade.realizedR = Number.isFinite(Number(raw.realizedR)) ? Number(raw.realizedR) : 0;
  }
  return trade;
}

/**
 * Understand pasted text. Accepts:
 *   - a TradeMind backup (from this app)
 *   - a list of trades (e.g. results\trades_M15.json from the Python backtester)
 */
export function parseImport(text) {
  let data;
  try {
    data = JSON.parse(String(text || "").trim());
  } catch (error) {
    return { error: "This is not valid backup text. Paste the whole message, from { to }." };
  }

  let kind;
  let rawTrades;
  let alertStatus = null;
  let settings = null;
  if (Array.isArray(data)) {
    rawTrades = data;
    kind = "trades";
  } else if (data && data.type === "backup" && Array.isArray(data.trades)) {
    rawTrades = data.trades;
    kind = "backup";
    alertStatus = data.alertStatus && typeof data.alertStatus === "object" ? data.alertStatus : null;
    settings = data.settings || null;
  } else {
    return { error: "No trades found in this text." };
  }

  const trades = rawTrades.map(cleanTrade).filter(Boolean);
  if (kind === "trades" && trades.length > 0 && trades.every((t) => t.source === BACKTEST_SOURCE)) {
    kind = "backtest";
  }
  return {
    kind,
    trades,
    skipped: rawTrades.length - trades.length,
    alertStatus,
    settings,
    exportedAt: data.exportedAt || null,
  };
}

/** Add incoming trades that are not already in the journal (matched by id). */
export function mergeTrades(existing, incoming) {
  const ids = new Set(existing.map((t) => t.id));
  const added = incoming.filter((t) => !ids.has(t.id));
  const merged = [...existing, ...added].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  return { merged, addedCount: added.length };
}

const CSV_COLUMNS = [
  "createdAt", "closedAt", "pair", "direction", "setup", "session", "entry", "stop", "target",
  "rr", "lots", "result", "exitPrice", "realizedR", "riskAmount", "checklistScore", "checklistMax",
  "emotion", "planFollowed", "mistakes", "partials", "stopAtBreakeven", "lesson", "chartBefore",
  "chartAfter", "source", "alertId", "notes",
];

function csvCell(value) {
  if (value === null || value === undefined) return "";
  let text;
  if (Array.isArray(value)) {
    text = value
      .map((v) => (v && typeof v === "object" ? `${v.percent}% @ ${v.price}` : String(v)))
      .join("; ");
  } else {
    text = String(value);
  }
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Spreadsheet-friendly export (opens in Excel / Google Sheets). */
export function tradesToCsv(trades) {
  const lines = [CSV_COLUMNS.join(",")];
  trades.forEach((t) => lines.push(CSV_COLUMNS.map((c) => csvCell(t[c])).join(",")));
  return lines.join("\n");
}

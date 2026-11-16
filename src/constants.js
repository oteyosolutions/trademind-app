// Storage keys - NEVER change these, or saved data will not load.
export const STORAGE_KEY = "@trademind_ict_trades_v1";
export const SCANNER_URL_KEY = "@trademind_ict_scanner_url_v1";
export const ALERT_STATUS_KEY = "@trademind_ict_alert_status_v1";
export const LAST_BACKUP_KEY = "@trademind_ict_last_backup_v1";

export const APP_VERSION = "5.1";
export const BACKUP_VERSION = 1;
export const BACKUP_REMINDER_DAYS = 7;

export const SETUPS = [
  "Liquidity Sweep",
  "Fair Value Gap (FVG)",
  "Order Block",
  "Break of Structure (BOS)",
  "Change of Character (CHOCH)",
  "Breaker Block",
  "Other",
];

export const SESSIONS = ["Asia", "London", "New York"];
export const RESULT_FILTERS = ["All", "Open", "Win", "Loss", "Break-even"];
export const RESULTS = ["Open", "Win", "Loss", "Break-even"];
export const MIN_RR = 2;

export const CHECKLIST = [
  { id: "bias", group: "Context", label: "Higher-timeframe bias is clear (Daily / 4H)" },
  { id: "liquidity", group: "Liquidity", label: "Liquidity has been swept (equal highs/lows, session high/low)" },
  { id: "structure", group: "Structure", label: "Market structure shift confirmed (BOS or CHOCH)" },
  { id: "poi", group: "Entry", label: "Entry at a valid POI (FVG, order block or breaker)" },
  { id: "confirmation", group: "Entry", label: "Lower-timeframe entry confirmation is present" },
  { id: "session", group: "Timing", label: "Inside a planned session / killzone" },
  { id: "stop", group: "Risk", label: "Stop-loss sits beyond the structure that invalidates the idea" },
  { id: "target", group: "Risk", label: "Target is at opposing liquidity" },
  { id: "news", group: "Risk", label: "High-impact news has been checked" },
];

// Scanner alerts
export const ALERT_POLL_MS = 30000;
export const SKIP_REASONS = ["Against my bias", "Poor structure", "News risk", "Missed it", "Other"];
export const ALERT_FILTERS = ["New", "Taken", "Skipped", "All"];
export const RULE_RESULTS = ["Win", "Loss", "Break-even"];

// Trades imported from the Python backtester are kept apart from your own trades
export const BACKTEST_SOURCE = "bot-backtest";

// Settings, onboarding and PIN
export const SETTINGS_KEY = "@trademind_ict_settings_v1";
export const PIN_KEY = "@trademind_ict_pin_v1";
export const DEFAULT_SETTINGS = {
  balance: "",            // account balance as text, e.g. "1000"
  currency: "USD",        // account currency
  riskPercent: "1",       // risk per trade in %
  usdToAccount: "1",      // 1 USD = ? account currency (1 for USD accounts)
  onboarded: false,
  desktopMode: false,     // true = this phone is paired with TradeMind Desktop (PC scanner + bot)
};
export const CURRENCIES = ["USD", "EUR", "GBP", "KES"];

// Psychology and review
export const EMOTIONS = ["Calm", "Confident", "Anxious", "FOMO", "Revenge", "Bored"];
export const MISTAKES = [
  "Entered early",
  "Entered late",
  "No confirmation",
  "Moved stop",
  "Closed too early",
  "Oversized",
  "Against HTF bias",
  "Revenge trade",
  "Ignored news",
];
export const PARTIAL_PRESETS = [25, 50, 75];

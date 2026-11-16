export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const fmtR = (v) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "--"
    : `${v >= 0 ? "+" : ""}${v.toFixed(2)}R`;

export const fmtPct = (v) =>
  v === null || v === undefined || !Number.isFinite(v) ? "--" : `${v.toFixed(1)}%`;

export const fmtPF = (v) =>
  v === null || v === undefined ? "--" : v === Infinity ? "∞" : v.toFixed(2);

export function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 48) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

export function daysSince(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 86400000) : null;
}

export function normalizeScannerUrl(text) {
  // Accepts any form: "192.168.1.20", "192.168.1.20:8765", "http://192.168.1.20:8765/alerts",
  // the bot port (8766) or a pasted address with spaces - always returns http://HOST:8765
  let t = String(text || "").trim().replace(/\s+/g, "");
  if (!t) return "";
  t = t.replace(/^[a-z]+:?\/*/i, (m) => (/^https?:?\/*$/i.test(m) ? "" : m)); // drop http:// (even typos like http//)
  const hostPort = t.split(/[/?#]/)[0];
  const match = hostPort.match(/^([^:]+)(?::(\d+))?/);
  if (!match || !match[1]) return "";
  const host = match[1];
  let port = match[2] || "8765";
  if (port === "8766") port = "8765"; // bot port typed by mistake
  return `http://${host}:${port}`;
}

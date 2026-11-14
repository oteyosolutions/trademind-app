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
  let url = String(text || "").trim().replace(/\/+$/, "");
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = "http://" + url;
  if (!/:\d+$/.test(url)) url = url + ":8765";
  return url;
}

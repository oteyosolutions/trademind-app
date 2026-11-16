/**
 * Trading sessions and killzones - all worked out in UTC, shown in the phone's own time.
 * Summer time rules: Europe (last Sunday of March -> last Sunday of October, 01:00 UTC) and
 * USA (second Sunday of March 07:00 UTC -> first Sunday of November 06:00 UTC).
 */

const H = 3600 * 1000;

function nthSunday(year, month, n) {
  // n >= 1: nth Sunday; n = -1: last Sunday (month 0-11), at 00:00 UTC
  if (n === -1) {
    const last = new Date(Date.UTC(year, month + 1, 0));
    return new Date(Date.UTC(year, month, last.getUTCDate() - last.getUTCDay()));
  }
  const first = new Date(Date.UTC(year, month, 1));
  const day = 1 + ((7 - first.getUTCDay()) % 7) + (n - 1) * 7;
  return new Date(Date.UTC(year, month, day));
}

export function euSummer(d) {
  const y = d.getUTCFullYear();
  const start = nthSunday(y, 2, -1).getTime() + 1 * H;
  const end = nthSunday(y, 9, -1).getTime() + 1 * H;
  return d.getTime() >= start && d.getTime() < end;
}

export function usSummer(d) {
  const y = d.getUTCFullYear();
  const start = nthSunday(y, 2, 2).getTime() + 7 * H;
  const end = nthSunday(y, 10, 1).getTime() + 6 * H;
  return d.getTime() >= start && d.getTime() < end;
}

/** Session hours in UTC for the given moment (they move with local summer time). */
export function sessionsUtc(d) {
  const lon = euSummer(d) ? 7 : 8;   // London 08:00-17:00 local
  const ny = usSummer(d) ? 12 : 13;  // New York 08:00-17:00 local
  return [
    { key: "asia", name: "Asia (Tokyo)", start: 0, end: 9 },
    { key: "london", name: "London", start: lon, end: lon + 9 },
    { key: "newyork", name: "New York", start: ny, end: ny + 9 },
  ];
}

const inWindow = (hour, start, end) => (start <= end ? hour >= start && hour < end : hour >= start || hour < end);

/** Forex is closed from Friday 22:00 UTC to Sunday 22:00 UTC (21:00 in US summer). */
export function marketOpen(d) {
  const close = usSummer(d) ? 21 : 22;
  const day = d.getUTCDay();
  const h = d.getUTCHours() + d.getUTCMinutes() / 60;
  if (day === 6) return false;
  if (day === 5 && h >= close) return false;
  if (day === 0 && h < close) return false;
  return true;
}

function nextOpen(d) {
  for (let k = 1; k <= 60 * 24 * 3; k += 1) {   // minute steps, max 3 days
    const t = new Date(d.getTime() + k * 60000);
    if (marketOpen(t)) return t;
  }
  return null;
}

/** Next time (after d) when the UTC hour equals `hour` exactly. */
function nextUtcHour(d, hour) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, 0, 0));
  if (t.getTime() <= d.getTime()) t.setUTCDate(t.getUTCDate() + 1);
  return t;
}

/**
 * Everything the clock card shows. killzones = {"London": [7, 10], "New York": [12, 15]} in UTC
 * (the bot's own KILLZONES_UTC, so the clock matches what the bot trades).
 */
export function clockState(d, killzones) {
  const h = d.getUTCHours() + d.getUTCMinutes() / 60;
  const open = marketOpen(d);
  const sessions = sessionsUtc(d).map((s) => ({ ...s, active: open && inWindow(h, s.start, s.end) }));
  const kz = Object.entries(killzones || {}).map(([name, [start, end]]) => ({
    name, start, end, active: open && inWindow(h, start, end),
  }));
  const activeKz = kz.find((k) => k.active) || null;
  let nextKz = null;
  if (!activeKz && kz.length) {
    const candidates = kz
      .map((k) => {
        let t = nextUtcHour(d, k.start);
        let guard = 0;
        while (!marketOpen(new Date(t.getTime() + 60000)) && guard < 7) {
          t = new Date(t.getTime() + 24 * H);
          guard += 1;
        }
        return { ...k, at: t };
      })
      .sort((a, b) => a.at - b.at);
    nextKz = candidates[0];
  }
  const active = sessions.filter((s) => s.active).map((s) => s.name);
  return {
    open,
    opensAt: open ? null : nextOpen(d),
    sessions,
    overlap: active.length > 1 ? active.join(" + ") : null,
    killzones: kz,
    activeKz,
    activeKzEnds: activeKz ? new Date(nextUtcHour(d, activeKz.end)) : null,
    nextKz,
  };
}

export function untilText(from, to) {
  const mins = Math.max(0, Math.round((to - from) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ${mins % 60}m` : `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

export function localHM(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** UTC hour -> "HH:00" in the phone's time today (for labels like "London 10:00-13:00"). */
export function utcHourLocal(hour, ref = new Date()) {
  const t = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), hour, 0, 0));
  return localHM(t);
}

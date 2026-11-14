/**
 * Two-way sync between this phone and Supabase.
 *
 * Rules
 *  - Every change to a trade marks it "dirty"; deletions leave a "tombstone".
 *  - Push: dirty trades and tombstones are upserted to the `trades` table.
 *  - Pull: rows changed on the server since the last pull (by server time) are merged.
 *  - Conflicts: the version edited most recently (client time) wins.
 *  - Bot backtest trades stay on the phone (not uploaded).
 */
import { BACKTEST_SOURCE } from "../constants";

const PAGE = 1000;
const CHUNK = 400;

export const stampOf = (t) => (t && (t.updatedAt || t.closedAt || t.createdAt)) || "1970-01-01T00:00:00.000Z";

export function emptySyncState(userId = null) {
  return { userId, cursor: null, dirty: [], tombstones: {}, settingsDirty: false, settingsStamp: null, lastSyncAt: null };
}

/** Rows to upload for dirty trades and tombstones. */
export function buildPushRows(userId, trades, dirtyIds, tombstones) {
  const byId = new Map(trades.map((t) => [t.id, t]));
  const rows = [];
  dirtyIds.forEach((id) => {
    const t = byId.get(id);
    if (t && t.source !== BACKTEST_SOURCE) {
      rows.push({ user_id: userId, id, data: t, deleted: false, client_updated_at: stampOf(t) });
    }
  });
  Object.entries(tombstones).forEach(([id, when]) => {
    rows.push({ user_id: userId, id, data: null, deleted: true, client_updated_at: when });
  });
  return rows;
}

/** Merge rows pulled from the server into the local trade list. Pure function. */
export function mergeRows(localTrades, tombstones, rows) {
  const map = new Map(localTrades.map((t) => [t.id, t]));
  let changed = 0;
  rows.forEach((row) => {
    const local = map.get(row.id);
    const remoteTime = row.client_updated_at;
    if (row.deleted) {
      if (local && stampOf(local) <= remoteTime) {
        map.delete(row.id);
        changed += 1;
      }
      return;
    }
    if (!row.data) return;
    const tomb = tombstones[row.id];
    if (tomb && tomb >= remoteTime) return; // deleted here after that edit
    if (!local || remoteTime > stampOf(local)) {
      map.set(row.id, row.data);
      changed += 1;
    }
  });
  const trades = Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { trades, changed };
}

/** Upload rows in chunks. */
export async function pushRows(client, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await client.from("trades").upsert(rows.slice(i, i + CHUNK), { onConflict: "user_id,id" });
    if (error) throw new Error(error.message || "Upload failed");
  }
}

/** Download everything changed on the server since `cursor`. */
export async function pullRows(client, userId, cursor) {
  const all = [];
  // Look 2 minutes further back than the last pull: rows saved at the same moment by
  // another phone are never missed (merging the same row twice is harmless).
  const since = cursor ? new Date(Date.parse(cursor) - 120000).toISOString() : null;
  for (let from = 0; ; from += PAGE) {
    let q = client.from("trades").select("id,data,deleted,client_updated_at,server_updated_at").eq("user_id", userId);
    if (since) q = q.gt("server_updated_at", since);
    const { data, error } = await q.order("server_updated_at", { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message || "Download failed");
    all.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  const newCursor = all.reduce((max, r) => (r.server_updated_at > max ? r.server_updated_at : max), cursor || "");
  return { rows: all, cursor: newCursor || cursor };
}

export async function pushSettings(client, userId, data, stamp) {
  const { error } = await client
    .from("user_settings")
    .upsert([{ user_id: userId, data, client_updated_at: stamp }], { onConflict: "user_id" });
  if (error) throw new Error(error.message || "Settings upload failed");
}

export async function pullSettings(client, userId) {
  const { data, error } = await client.from("user_settings").select("data,client_updated_at").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message || "Settings download failed");
  return data || null;
}

/**
 * One full sync. Returns the new local trades and sync state.
 * getTrades() must return the CURRENT trade list (it may change during the network calls).
 */
export async function runSync({ client, userId, getTrades, syncState, settingsPayload }) {
  const state = { ...syncState };
  const pushed = buildPushRows(userId, getTrades(), state.dirty, state.tombstones);
  await pushRows(client, pushed);
  const pushedDirty = new Set(state.dirty);
  const pushedTombs = { ...state.tombstones };

  let remoteSettings = null;
  if (state.settingsDirty && settingsPayload) {
    await pushSettings(client, userId, settingsPayload, state.settingsStamp || new Date().toISOString());
  } else {
    const s = await pullSettings(client, userId);
    if (s && (!state.settingsStamp || s.client_updated_at > state.settingsStamp)) remoteSettings = s;
  }

  const { rows, cursor } = await pullRows(client, userId, state.cursor);
  return { rows, cursor, pushedDirty, pushedTombs, pushedCount: pushed.length, remoteSettings };
}

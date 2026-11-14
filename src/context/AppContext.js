import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Share, Vibration } from "react-native";

import { C } from "../theme";
import {
  ALERT_POLL_MS,
  ALERT_STATUS_KEY,
  BACKTEST_SOURCE,
  BACKUP_REMINDER_DAYS,
  CHECKLIST,
  DEFAULT_SETTINGS,
  LAST_BACKUP_KEY,
  MIN_RR,
  PIN_KEY,
  SCANNER_URL_KEY,
  SESSIONS,
  SETTINGS_KEY,
  STORAGE_KEY,
} from "../constants";
import { daysSince, normalizeScannerUrl } from "../utils/format";
import { buildEquity, computeStats } from "../utils/stats";
import { finalResult, isBacktest, planTrade, remainingPercent } from "../utils/trades";
import { positionSize, riskAmount, tradeMoney } from "../utils/risk";
import { buildBackup, mergeTrades, parseImport, tradesToCsv } from "../utils/backup";
import { PRO_FREE_DURING_BETA, cloudConfigured } from "../config";
import { getSupabase, friendlyAuthError } from "../services/supabase";
import { emptySyncState, mergeRows, pushSettings, runSync, stampOf } from "../services/sync";
import {
  buyPackage, getPackages, getProStatus, initPurchases, logOutPurchases, purchasesSupported, restorePurchases,
} from "../services/pro";
import { getPushToken, onNotificationTap, setupNotificationDisplay } from "../services/push";

const SYNC_KEY = "@trademind_ict_sync_v1";
const SYNC_DEBOUNCE_MS = 4000;
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [tab, setTab] = useState("Home");
  const [trades, setTrades] = useState([]);
  const [tradesLoaded, setTradesLoaded] = useState(false);

  // Closing trades
  const [closingTradeId, setClosingTradeId] = useState(null);
  const [exitPrice, setExitPrice] = useState("");

  // Journal + analysis views
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("All");
  const [dataset, setDataset] = useState("mine"); // "mine" or "backtest"
  const [analysisView, setAnalysisView] = useState("Analytics");
  const [breakdownBy, setBreakdownBy] = useState("Pair");
  const [reportMode, setReportMode] = useState("Week");
  const [reportOffset, setReportOffset] = useState(0);

  // ICT checklist
  const [checklist, setChecklist] = useState({});

  // Trade form (also used for editing)
  const [pair, setPair] = useState("EURUSD");
  const [direction, setDirection] = useState("Buy");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [lots, setLots] = useState("0.01");
  const [setup, setSetup] = useState("Liquidity Sweep");
  const [session, setSession] = useState("London");
  const [notes, setNotes] = useState("");
  const [editingTradeId, setEditingTradeId] = useState(null);
  const [editExitPrice, setEditExitPrice] = useState("");

  // Scanner alerts
  const [scannerUrl, setScannerUrl] = useState("");
  const [scannerInput, setScannerInput] = useState("");
  const [alertsData, setAlertsData] = useState({ alerts: [], scanner: null });
  const [alertsError, setAlertsError] = useState(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const [alertStatus, setAlertStatus] = useState({});
  const [alertStatusLoaded, setAlertStatusLoaded] = useState(false);
  const [alertFilter, setAlertFilter] = useState("New");
  const [skippingId, setSkippingId] = useState(null);
  const [reviewingAlert, setReviewingAlert] = useState(null);
  const knownAlertIds = useRef(null);

  // Backup
  const [lastBackup, setLastBackup] = useState(null);
  const [importText, setImportText] = useState("");

  // Account settings, onboarding, PIN
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [pin, setPin] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [failedUnlocks, setFailedUnlocks] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  // Cloud account + sync
  const [authSession, setAuthSession] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [syncState, setSyncState] = useState(emptySyncState());
  const [syncLoaded, setSyncLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ state: "idle", message: "" });
  const [cloudAlerts, setCloudAlerts] = useState([]);
  const [pushStatus, setPushStatus] = useState("");
  const tradesRef = useRef([]);
  const prevTradesRef = useRef(null);
  const applyingRemoteRef = useRef(false);
  const applyingRemoteSettingsRef = useRef(false);
  const syncingRef = useRef(false);
  const syncStateRef = useRef(emptySyncState());
  const settingsRef = useRef(null);
  const alertStatusRef = useRef({});
  const settingsSeenRef = useRef(false);

  // Pro subscription
  const [proStatus, setProStatus] = useState({ active: false, expires: null });
  const [proPackages, setProPackages] = useState([]);
  const [proBusy, setProBusy] = useState(false);

  // Extra trade-form fields (version 4)
  const [emotion, setEmotion] = useState("");
  const [chartBefore, setChartBefore] = useState("");
  const [chartAfter, setChartAfter] = useState("");
  const [photos, setPhotos] = useState([]);
  const [quoteRate, setQuoteRate] = useState("");
  const [planFollowed, setPlanFollowed] = useState(null);
  const [mistakes, setMistakes] = useState([]);
  const [lesson, setLesson] = useState("");

  // Closing review + partial closes (Journal cards)
  const [closePlan, setClosePlan] = useState(null);
  const [closeMistakes, setCloseMistakes] = useState([]);
  const [closeLesson, setCloseLesson] = useState("");
  const [partialTradeId, setPartialTradeId] = useState(null);
  const [partialPercent, setPartialPercent] = useState("50");
  const [partialPrice, setPartialPrice] = useState("");

  /* ---------------- Storage ---------------- */

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setTrades(parsed);
        }
      } catch (error) {
        console.error("Could not load saved trades:", error);
      } finally {
        setTradesLoaded(true);
      }
      try {
        const savedUrl = await AsyncStorage.getItem(SCANNER_URL_KEY);
        if (savedUrl) {
          setScannerUrl(savedUrl);
          setScannerInput(savedUrl);
        }
        const savedStatus = await AsyncStorage.getItem(ALERT_STATUS_KEY);
        if (savedStatus) {
          const parsed = JSON.parse(savedStatus);
          if (parsed && typeof parsed === "object") setAlertStatus(parsed);
        }
        const savedBackup = await AsyncStorage.getItem(LAST_BACKUP_KEY);
        if (savedBackup) setLastBackup(savedBackup);
        const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed && typeof parsed === "object") setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
        const savedSync = await AsyncStorage.getItem(SYNC_KEY);
        if (savedSync) {
          const parsed = JSON.parse(savedSync);
          if (parsed && typeof parsed === "object") setSyncState({ ...emptySyncState(), ...parsed });
        }
        const savedPin = await AsyncStorage.getItem(PIN_KEY);
        if (savedPin) setPin(savedPin);
        else setUnlocked(true);
      } catch (error) {
        console.error("Could not load settings:", error);
        setUnlocked(true);
      } finally {
        setAlertStatusLoaded(true);
        setSettingsLoaded(true);
        setSyncLoaded(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!tradesLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trades)).catch((error) =>
      console.error("Could not save trades:", error)
    );
  }, [trades, tradesLoaded]);

  useEffect(() => {
    if (!alertStatusLoaded) return;
    AsyncStorage.setItem(ALERT_STATUS_KEY, JSON.stringify(alertStatus)).catch((error) =>
      console.error("Could not save alert status:", error)
    );
  }, [alertStatus, alertStatusLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch((error) =>
      console.error("Could not save settings:", error)
    );
  }, [settings, settingsLoaded]);

  /* ---------------- Change tracking for cloud sync ---------------- */

  tradesRef.current = trades;
  syncStateRef.current = syncState;
  settingsRef.current = settings;
  alertStatusRef.current = alertStatus;

  useEffect(() => {
    if (!tradesLoaded || !syncLoaded) return;
    const prev = prevTradesRef.current;
    prevTradesRef.current = trades;
    if (prev === null) return;
    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false;
      return;
    }
    const prevMap = new Map(prev.map((t) => [t.id, t]));
    const nowIds = new Set(trades.map((t) => t.id));
    const changed = trades.filter((t) => !isBacktest(t) && prevMap.get(t.id) !== t).map((t) => t.id);
    const removed = prev.filter((t) => !isBacktest(t) && !nowIds.has(t.id)).map((t) => t.id);
    if (!changed.length && !removed.length) return;
    const now = new Date().toISOString();
    setSyncState((s) => {
      const dirty = new Set(s.dirty);
      changed.forEach((id) => dirty.add(id));
      const tombstones = { ...s.tombstones };
      changed.forEach((id) => delete tombstones[id]);
      removed.forEach((id) => {
        dirty.delete(id);
        tombstones[id] = now;
      });
      return { ...s, dirty: Array.from(dirty), tombstones };
    });
  }, [trades, tradesLoaded, syncLoaded]);

  useEffect(() => {
    if (!settingsLoaded || !alertStatusLoaded) return;
    if (!settingsSeenRef.current) {
      settingsSeenRef.current = true; // values just loaded from the phone - not a change
      return;
    }
    if (applyingRemoteSettingsRef.current) {
      applyingRemoteSettingsRef.current = false;
      return;
    }
    setSyncState((s) => ({ ...s, settingsDirty: true, settingsStamp: new Date().toISOString() }));
  }, [settings, alertStatus]);

  useEffect(() => {
    if (!syncLoaded) return;
    AsyncStorage.setItem(SYNC_KEY, JSON.stringify(syncState)).catch(() => {});
  }, [syncState, syncLoaded]);

  /* ---------------- Cloud account ---------------- */

  const cloudReady = cloudConfigured();
  const user = authSession && authSession.user ? authSession.user : null;
  const isPro = PRO_FREE_DURING_BETA || proStatus.active;

  useEffect(() => {
    const client = getSupabase();
    if (!client) return undefined;
    client.auth.getSession().then(({ data }) => setAuthSession((data && data.session) || null)).catch(() => {});
    const { data } = client.auth.onAuthStateChange((_event, newSession) => setAuthSession(newSession || null));
    return () => data && data.subscription && data.subscription.unsubscribe();
  }, []);

  // A different (or first) account on this phone: upload everything once, download everything
  useEffect(() => {
    if (!user || !syncLoaded) return;
    if (syncState.userId !== user.id) {
      setSyncState({
        ...emptySyncState(user.id),
        dirty: tradesRef.current.filter((t) => !isBacktest(t)).map((t) => t.id),
      });
    }
  }, [user && user.id, syncLoaded]);

  async function signUp(email, password) {
    const client = getSupabase();
    if (!client) return;
    setAuthBusy(true);
    try {
      const { data, error } = await client.auth.signUp({ email: email.trim(), password });
      if (error) throw error;
      if (!data.session) {
        Alert.alert("Check your email", "We sent you a link to confirm your account. Confirm it, then sign in.");
      }
    } catch (error) {
      Alert.alert("Sign up failed", friendlyAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function signIn(email, password) {
    const client = getSupabase();
    if (!client) return;
    setAuthBusy(true);
    try {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (error) {
      Alert.alert("Sign in failed", friendlyAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function resetPassword(email) {
    const client = getSupabase();
    if (!client || !email.trim()) {
      Alert.alert("Reset password", "Type your email address first.");
      return;
    }
    const { error } = await client.auth.resetPasswordForEmail(email.trim());
    Alert.alert("Reset password", error ? friendlyAuthError(error) : "If that email has an account, a reset link is on its way.");
  }

  async function signOut() {
    const client = getSupabase();
    if (!client) return;
    await client.auth.signOut().catch(() => {});
    await logOutPurchases();
    setAuthSession(null);
    setCloudAlerts([]);
    setSyncState(emptySyncState());
    setSyncStatus({ state: "idle", message: "" });
  }

  function deleteAccount() {
    const client = getSupabase();
    if (!client || !user) return;
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your account and ALL trades stored in the cloud. Trades on this phone are kept. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: async () => {
            const { error } = await client.rpc("delete_my_account");
            if (error) {
              Alert.alert("Could not delete account", friendlyAuthError(error));
              return;
            }
            await signOut();
            Alert.alert("Account deleted", "Your cloud account and data have been removed.");
          },
        },
      ]
    );
  }

  /* ---------------- Sync ---------------- */

  async function syncNow(manual) {
    const client = getSupabase();
    if (!client || !user || syncingRef.current) return;
    if (!isPro) {
      if (manual) setTab("Pro");
      return;
    }
    syncingRef.current = true;
    setSyncStatus({ state: "syncing", message: "Syncing..." });
    try {
      const state = syncStateRef.current;
      const settingsPayload = { account: settingsRef.current, alertStatus: alertStatusRef.current };
      const result = await runSync({
        client,
        userId: user.id,
        getTrades: () => tradesRef.current,
        syncState: state,
        settingsPayload,
      });

      // Remove from the queue only what did not change again while uploading
      const pushedStamps = new Map(
        tradesRef.current.filter((t) => result.pushedDirty.has(t.id)).map((t) => [t.id, stampOf(t)])
      );
      setSyncState((s) => {
        const dirty = s.dirty.filter((id) => {
          const t = tradesRef.current.find((x) => x.id === id);
          return !(result.pushedDirty.has(id) && t && pushedStamps.get(id) === stampOf(t)) &&
            !(result.pushedDirty.has(id) && !t);
        });
        const tombstones = { ...s.tombstones };
        Object.entries(result.pushedTombs).forEach(([id, when]) => {
          if (tombstones[id] === when) delete tombstones[id];
        });
        return {
          ...s,
          dirty,
          tombstones,
          cursor: result.cursor,
          settingsDirty: s.settingsDirty && s.settingsStamp !== state.settingsStamp,
          lastSyncAt: new Date().toISOString(),
        };
      });

      if (result.rows.length) {
        const merged = mergeRows(tradesRef.current, state.tombstones, result.rows);
        if (merged.changed > 0) {
          applyingRemoteRef.current = true;
          setTrades(merged.trades);
        }
      }

      if (result.remoteSettings && result.remoteSettings.data) {
        const remote = result.remoteSettings.data;
        applyingRemoteSettingsRef.current = true;
        if (remote.account) setSettings((cur) => ({ ...cur, ...remote.account, onboarded: true }));
        if (remote.alertStatus) setAlertStatus(remote.alertStatus);
        setSyncState((s) => ({ ...s, settingsStamp: result.remoteSettings.client_updated_at, settingsDirty: false }));
      } else if (!state.settingsDirty && !state.settingsStamp) {
        const stamp = new Date().toISOString();
        await pushSettings(client, user.id, settingsPayload, stamp);
        setSyncState((s) => ({ ...s, settingsStamp: stamp }));
      }

      setSyncStatus({
        state: "ok",
        message: `Synced ${new Date().toLocaleTimeString()}` +
          (result.pushedCount ? ` · ${result.pushedCount} uploaded` : "") +
          (result.rows.length ? ` · ${result.rows.length} checked from cloud` : ""),
      });
    } catch (error) {
      setSyncStatus({ state: "error", message: `Sync failed: ${friendlyAuthError(error)}. Will retry.` });
    } finally {
      syncingRef.current = false;
    }
  }

  // Sync soon after any change, and every 5 minutes
  useEffect(() => {
    if (!user || !isPro || !syncLoaded || syncState.userId !== user.id) return undefined;
    const pending = syncState.dirty.length || Object.keys(syncState.tombstones).length || syncState.settingsDirty || !syncState.lastSyncAt;
    if (!pending) return undefined;
    const t = setTimeout(() => syncNow(false), SYNC_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [user && user.id, isPro, syncLoaded, syncState]);

  useEffect(() => {
    if (!user || !isPro) return undefined;
    const id = setInterval(() => {
      syncNow(false);
      fetchCloudAlerts();
    }, SYNC_INTERVAL_MS);
    fetchCloudAlerts();
    return () => clearInterval(id);
  }, [user && user.id, isPro]);

  /* ---------------- Cloud alerts + push ---------------- */

  async function fetchCloudAlerts() {
    const client = getSupabase();
    if (!client || !user) return;
    try {
      const { data, error } = await client
        .from("alerts")
        .select("id,data,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(300);
      if (!error && Array.isArray(data)) setCloudAlerts(data.map((r) => r.data).filter(Boolean));
    } catch (error) {
      // offline - keep what we have
    }
  }

  async function enablePush() {
    const client = getSupabase();
    if (!client || !user) {
      Alert.alert("Push notifications", "Sign in to your TradeMind account first.");
      return;
    }
    if (!isPro) {
      setTab("Pro");
      return;
    }
    setPushStatus("Requesting permission...");
    const res = await getPushToken();
    if (res.error) {
      setPushStatus(res.error);
      return;
    }
    const { error } = await client
      .from("push_tokens")
      .upsert([{ user_id: user.id, token: res.token, platform: "android", updated_at: new Date().toISOString() }], {
        onConflict: "user_id,token",
      });
    setPushStatus(error ? `Could not save: ${friendlyAuthError(error)}` : "Push notifications are on for this phone.");
  }

  useEffect(() => {
    setupNotificationDisplay();
    return onNotificationTap(() => setTab("Alerts"));
  }, []);

  /* ---------------- Pro subscription ---------------- */

  async function refreshPro() {
    const ok = await initPurchases(user ? user.id : undefined);
    if (!ok) return;
    setProStatus(await getProStatus());
    setProPackages(await getPackages());
  }

  useEffect(() => {
    refreshPro();
  }, [user && user.id]);

  async function buyPro(pkg) {
    setProBusy(true);
    const res = await buyPackage(pkg);
    setProBusy(false);
    if (res.ok) {
      setProStatus(await getProStatus());
      Alert.alert("Welcome to Pro", "Thank you! All Pro features are now unlocked.");
    } else if (!res.cancelled) {
      Alert.alert("Purchase not completed", res.error || "Please try again.");
    }
  }

  async function restorePro() {
    setProBusy(true);
    const res = await restorePurchases();
    setProBusy(false);
    setProStatus(await getProStatus());
    Alert.alert("Restore purchases", res.ok ? "Pro restored on this phone." : res.error || "No active Pro subscription was found for this Google account.");
  }

  /* ---------------- MT5 history import ---------------- */

  async function importMt5FromPc() {
    if (!isPro) {
      setTab("Pro");
      return;
    }
    if (!scannerUrl) {
      Alert.alert("MT5 import", "Connect to your PC scanner first (Alerts tab), then try again.");
      return;
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(scannerUrl + "/history", { signal: controller.signal });
      clearTimeout(timer);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const incoming = Array.isArray(json.trades) ? json.trades : [];
      const { merged, addedCount } = mergeTrades(tradesRef.current, incoming);
      setTrades(merged);
      Alert.alert(
        "MT5 import",
        `${addedCount} new trade(s) imported from MT5 (${incoming.length - addedCount} already in your journal).` +
          (json.note ? `\n\n${json.note}` : "")
      );
    } catch (error) {
      Alert.alert("MT5 import failed", "Could not get your MT5 history from the PC scanner. Make sure scan_signals.py (version 5) is running.");
    }
  }

  function updateSettings(patch) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  /* ---------------- PIN lock ---------------- */

  function savePin(code) {
    if (!/^\d{4,6}$/.test(code)) {
      Alert.alert("PIN", "Use 4 to 6 digits.");
      return false;
    }
    setPin(code);
    setUnlocked(true);
    AsyncStorage.setItem(PIN_KEY, code).catch(() => {});
    Alert.alert("PIN set", "The app will ask for this PIN when it starts. Keep a backup - a forgotten PIN cannot be recovered.");
    return true;
  }

  function removePin() {
    setPin(null);
    setUnlocked(true);
    AsyncStorage.removeItem(PIN_KEY).catch(() => {});
    Alert.alert("PIN removed", "The app will open without a PIN.");
  }

  function tryUnlock(code) {
    if (Date.now() < lockedUntil) return "wait";
    if (code === pin) {
      setUnlocked(true);
      setFailedUnlocks(0);
      return "ok";
    }
    const fails = failedUnlocks + 1;
    setFailedUnlocks(fails);
    if (fails >= 5) {
      setLockedUntil(Date.now() + 30000);
      setFailedUnlocks(0);
      return "wait";
    }
    return "wrong";
  }

  /* ---------------- Derived values ---------------- */

  const myTrades = trades.filter((t) => !isBacktest(t));
  const backtestTrades = trades.filter(isBacktest);
  const datasetTrades = dataset === "backtest" ? backtestTrades : myTrades;
  const stats = computeStats(myTrades);
  const equity = buildEquity(myTrades);

  const plan = planTrade(direction, entry, stop, target);
  const rrOk = plan.validDirection && plan.rr >= MIN_RR;
  const checklistMax = CHECKLIST.length + 1; // +1 for the automatic R:R rule
  const checklistScore = CHECKLIST.filter((item) => checklist[item.id]).length + (rrOk ? 1 : 0);
  const checklistRatio = checklistScore / checklistMax;
  const checklistVerdict =
    checklistRatio >= 0.9
      ? { text: "A+ setup — meets your trading plan", color: C.green }
      : checklistRatio >= 0.7
      ? { text: "Acceptable — review the missing items", color: C.orange }
      : { text: "Does not meet your plan — consider skipping", color: C.red };

  const allAlerts = (() => {
    const map = new Map();
    cloudAlerts.forEach((a) => a && a.id && map.set(a.id, a));
    alertsData.alerts.forEach((a) => {
      const prev = map.get(a.id);
      const resolved = (x) => x && x.outcome && x.outcome.status !== "waiting";
      if (!prev || resolved(a) || !resolved(prev)) map.set(a.id, a);
    });
    return Array.from(map.values()).sort((a, b) => (a.time_utc < b.time_utc ? 1 : -1));
  })();

  const newAlertCount = allAlerts.filter(
    (a) => !alertStatus[a.id] && Date.now() - new Date(a.time_utc).getTime() < 24 * 3600 * 1000
  ).length;

  const currentRisk = riskAmount(settings);
  const sizing = positionSize({ pair, entry, stop, settings, manualQuoteRate: quoteRate });
  const moneyOf = (t) => tradeMoney(t, settings);
  const moneyTotal = (list) => {
    let total = 0;
    let estimated = false;
    let counted = 0;
    list.forEach((t) => {
      const m = moneyOf(t);
      if (m) {
        total += m.amount;
        counted += 1;
        if (m.estimated) estimated = true;
      }
    });
    return counted ? { total, estimated, counted } : null;
  };

  const backupAge = daysSince(lastBackup);
  const backupDue = myTrades.length > 0 && (backupAge === null || backupAge >= BACKUP_REMINDER_DAYS);

  /* ---------------- Trade form ---------------- */

  function resetForm() {
    setEntry("");
    setStop("");
    setTarget("");
    setNotes("");
    setChecklist({});
    setEditingTradeId(null);
    setEditExitPrice("");
    setEmotion("");
    setChartBefore("");
    setChartAfter("");
    setPhotos([]);
    setQuoteRate("");
    setPlanFollowed(null);
    setMistakes([]);
    setLesson("");
  }

  function toggleIn(list, item) {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  }

  function toggleChecklist(id) {
    setChecklist((current) => ({ ...current, [id]: !current[id] }));
  }

  function startEdit(trade) {
    setReviewingAlert(null);
    setPair(trade.pair);
    setDirection(trade.direction);
    setEntry(String(trade.entry));
    setStop(String(trade.stop));
    setTarget(String(trade.target));
    setLots(trade.lots ? String(trade.lots) : "");
    setSetup(trade.setup || "Other");
    setSession(SESSIONS.includes(trade.session) ? trade.session : "London");
    setNotes(trade.notes || "");
    const saved = { ...(trade.checklist || {}) };
    delete saved.rr; // recalculated automatically
    setChecklist(saved);
    setEditExitPrice(trade.result !== "Open" && trade.exitPrice !== undefined ? String(trade.exitPrice) : "");
    setEmotion(trade.emotion || "");
    setChartBefore(trade.chartBefore || "");
    setChartAfter(trade.chartAfter || "");
    setPhotos(Array.isArray(trade.photos) ? trade.photos : []);
    setPlanFollowed(trade.planFollowed === undefined ? null : trade.planFollowed);
    setMistakes(Array.isArray(trade.mistakes) ? trade.mistakes : []);
    setLesson(trade.lesson || "");
    setEditingTradeId(trade.id);
    setTab("New Trade");
  }

  function cancelEdit() {
    resetForm();
    setTab("Journal");
  }

  function saveTrade() {
    if (!pair.trim() || !plan.validDirection || plan.rr <= 0) {
      Alert.alert(
        "Check your trade",
        "Enter positive prices and make sure the stop-loss and target are on the correct sides of your entry."
      );
      return;
    }

    const fields = {
      pair: pair.trim().toUpperCase(),
      direction,
      entry: plan.e,
      stop: plan.s,
      target: plan.t,
      lots: lots.trim(),
      setup,
      session,
      notes: notes.trim(),
      rr: plan.rr,
      checklist: { ...checklist, rr: rrOk },
      checklistScore,
      checklistMax,
      emotion,
      chartBefore: chartBefore.trim(),
      chartAfter: chartAfter.trim(),
      photos,
    };

    if (editingTradeId) {
      const old = trades.find((t) => t.id === editingTradeId);
      if (!old) {
        resetForm();
        return;
      }
      const updated = { ...old, ...fields, updatedAt: new Date().toISOString() };
      if (old.result !== "Open") {
        const exit = Number(editExitPrice);
        const res = finalResult(updated, exit);
        if (editExitPrice.trim() === "" || !res) {
          Alert.alert("Invalid exit price", "Enter a valid exit price greater than zero.");
          return;
        }
        updated.exitPrice = exit;
        updated.realizedR = res.realizedR;
        updated.result = res.result;
        updated.planFollowed = planFollowed === null ? undefined : planFollowed;
        updated.mistakes = mistakes;
        updated.lesson = lesson.trim();
      }
      setTrades((current) => current.map((t) => (t.id === old.id ? updated : t)));
      resetForm();
      setTab("Journal");
      Alert.alert("Trade updated", "Your changes have been saved.");
      return;
    }

    const trade = {
      id: String(Date.now()),
      ...fields,
      result: "Open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      riskAmount: currentRisk || undefined,
      riskPercent: currentRisk ? Number(settings.riskPercent) : undefined,
      source: reviewingAlert ? "alert" : "manual",
      alertId: reviewingAlert ? reviewingAlert.id : undefined,
    };
    setTrades((current) => [trade, ...current]);
    if (reviewingAlert) {
      setAlertState(reviewingAlert.id, "taken");
      setReviewingAlert(null);
    }
    resetForm();
    setDataset("mine");
    setTab("Journal");
    Alert.alert("Trade saved", "Your trade has been added to your journal.");
  }

  function closeTrade(trade) {
    const exit = Number(exitPrice);
    if (trade.result !== "Open") {
      Alert.alert("Trade already closed", "This trade has already been closed.");
      return;
    }
    const res = finalResult(trade, exit);
    if (exitPrice.trim() === "" || !res) {
      Alert.alert("Invalid exit price", "Enter a valid exit price greater than zero.");
      return;
    }
    const closed = {
      ...trade,
      result: res.result,
      exitPrice: exit,
      realizedR: res.realizedR,
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      planFollowed: closePlan === null ? undefined : closePlan,
      mistakes: closeMistakes,
      lesson: closeLesson.trim(),
    };
    setTrades((current) => current.map((item) => (item.id === trade.id ? closed : item)));
    setClosingTradeId(null);
    setExitPrice("");
    setClosePlan(null);
    setCloseMistakes([]);
    setCloseLesson("");
    Alert.alert("Trade closed", `${trade.pair}: ${res.result}\nRealized R: ${res.realizedR.toFixed(2)}R`);
  }

  function deleteTrade(trade) {
    Alert.alert(
      "Delete trade",
      `Delete this ${trade.pair} ${trade.direction} trade? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setTrades((current) => current.filter((item) => item.id !== trade.id));
            if (trade.alertId) clearAlertState(trade.alertId);
            if (closingTradeId === trade.id) {
              setClosingTradeId(null);
              setExitPrice("");
            }
            if (editingTradeId === trade.id) resetForm();
          },
        },
      ]
    );
  }

  function startClosing(trade) {
    setClosingTradeId(trade.id);
    setExitPrice("");
    setClosePlan(null);
    setCloseMistakes([]);
    setCloseLesson("");
    setPartialTradeId(null);
  }

  function partialClose(trade) {
    const pct = Number(partialPercent);
    const price = Number(partialPrice);
    const remaining = remainingPercent(trade);
    if (!(pct > 0) || pct >= remaining) {
      Alert.alert("Partial close", `Choose a percentage below the ${remaining}% still open. To close everything, use Close Trade.`);
      return;
    }
    if (!(price > 0)) {
      Alert.alert("Partial close", "Enter the price you closed part of the position at.");
      return;
    }
    const partial = { percent: pct, price, at: new Date().toISOString() };
    setTrades((current) =>
      current.map((t) =>
        t.id === trade.id ? { ...t, partials: [...(t.partials || []), partial], updatedAt: new Date().toISOString() } : t
      )
    );
    setPartialTradeId(null);
    setPartialPrice("");
  }

  function undoPartial(trade) {
    setTrades((current) =>
      current.map((t) =>
        t.id === trade.id ? { ...t, partials: (t.partials || []).slice(0, -1), updatedAt: new Date().toISOString() } : t
      )
    );
  }

  function moveStopToBreakeven(trade) {
    setTrades((current) =>
      current.map((t) =>
        t.id === trade.id
          ? { ...t, stopAtBreakeven: true, breakevenAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          : t
      )
    );
  }

  /* ---------------- Scanner alerts ---------------- */

  async function fetchAlerts(baseUrl) {
    const base = baseUrl || scannerUrl;
    if (!base) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    setAlertsLoading(true);
    try {
      const res = await fetch(base + "/alerts", { signal: controller.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const list = Array.isArray(json.alerts) ? json.alerts : [];
      const ids = new Set(list.map((a) => a.id));
      if (knownAlertIds.current) {
        const fresh = list.filter((a) => !knownAlertIds.current.has(a.id));
        if (fresh.length > 0) Vibration.vibrate(400);
      }
      knownAlertIds.current = ids;
      setAlertsData({ alerts: list, scanner: json.scanner || null });
      setAlertsError(null);
      setLastFetch(new Date());
      return true;
    } catch (error) {
      setAlertsError(
        "Cannot reach the scanner. Check that scan_signals.py is running, the address is right, " +
          "and your phone is on the same Wi-Fi as the PC."
      );
      return false;
    } finally {
      clearTimeout(timer);
      setAlertsLoading(false);
    }
  }

  useEffect(() => {
    if (!scannerUrl) return undefined;
    knownAlertIds.current = null;
    fetchAlerts(scannerUrl);
    const id = setInterval(() => fetchAlerts(scannerUrl), ALERT_POLL_MS);
    return () => clearInterval(id);
  }, [scannerUrl]);

  async function connectScanner() {
    const url = normalizeScannerUrl(scannerInput);
    if (!url) {
      Alert.alert("Scanner address", "Enter the address shown in the scanner window, e.g. 192.168.1.20:8765");
      return;
    }
    setScannerInput(url);
    const ok = await fetchAlerts(url);
    if (ok) {
      setScannerUrl(url);
      AsyncStorage.setItem(SCANNER_URL_KEY, url).catch(() => {});
      Alert.alert("Connected", "Alerts from your scanner will appear here.");
    }
  }

  function setAlertState(id, status, reason) {
    setAlertStatus((current) => ({
      ...current,
      [id]: { status, reason: reason || "", at: new Date().toISOString() },
    }));
  }

  function clearAlertState(id) {
    setAlertStatus((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function startReview(alert) {
    setEditingTradeId(null);
    setEditExitPrice("");
    setPair(alert.symbol);
    setDirection(alert.direction);
    setEntry(String(alert.entry));
    setStop(String(alert.stop));
    setTarget(String(alert.target));
    setSetup("Liquidity Sweep");
    setSession(SESSIONS.includes(alert.session) ? alert.session : "London");
    setNotes(
      `Scanner alert: swept ${alert.liquidity} at ${alert.level} (${alert.mode} entry, ` +
        `${alert.with_htf_bias ? "with" : "against"} H1 bias, ` +
        `${alert.in_killzone ? "in" : "outside"} killzone).`
    );
    setChecklist({});
    setReviewingAlert(alert);
    setTab("Bot");
  }

  /* ---------------- Backup / export / import ---------------- */

  async function shareText(message, title) {
    try {
      const result = await Share.share({ message, title });
      return result && result.action !== Share.dismissedAction;
    } catch (error) {
      Alert.alert("Could not open the share menu", String(error.message || error));
      return false;
    }
  }

  async function exportBackup() {
    const text = buildBackup({ trades, alertStatus, scannerUrl, account: settings });
    const shared = await shareText(text, "TradeMind ICT backup");
    if (shared) {
      const now = new Date().toISOString();
      setLastBackup(now);
      AsyncStorage.setItem(LAST_BACKUP_KEY, now).catch(() => {});
    }
  }

  async function exportCsv() {
    const list = dataset === "backtest" ? backtestTrades : myTrades;
    if (list.length === 0) {
      Alert.alert("Nothing to export", "There are no trades in this list yet.");
      return;
    }
    await shareText(tradesToCsv(list), "TradeMind ICT trades (CSV)");
  }

  function applyImport(mode) {
    const parsed = parseImport(importText);
    if (parsed.error) {
      Alert.alert("Import failed", parsed.error);
      return;
    }
    if (parsed.trades.length === 0) {
      Alert.alert("Import failed", "No valid trades were found in the pasted text.");
      return;
    }
    const skippedNote = parsed.skipped > 0 ? `\n${parsed.skipped} invalid trade(s) were ignored.` : "";

    if (parsed.kind === "backtest") {
      const incoming = parsed.trades.map((t) => ({ ...t, source: BACKTEST_SOURCE }));
      const { merged, addedCount } = mergeTrades(trades, incoming);
      setTrades(merged);
      setImportText("");
      Alert.alert(
        "Backtest imported",
        `${addedCount} backtest trade(s) added. They are kept separate from your own trades - ` +
          `choose "Bot backtest" in the Trades or Analysis tab to see them.${skippedNote}`
      );
      return;
    }

    if (mode === "replace") {
      Alert.alert(
        "Replace all trades?",
        `Your current ${trades.length} trade(s) will be replaced by ${parsed.trades.length} from the backup.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace",
            style: "destructive",
            onPress: () => {
              setTrades(parsed.trades);
              if (parsed.alertStatus) setAlertStatus(parsed.alertStatus);
              if (parsed.settings && parsed.settings.account) {
                setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings.account, onboarded: true });
              }
              setImportText("");
              Alert.alert("Restored", `${parsed.trades.length} trade(s) restored.${skippedNote}`);
            },
          },
        ]
      );
      return;
    }

    const { merged, addedCount } = mergeTrades(trades, parsed.trades);
    setTrades(merged);
    if (parsed.alertStatus) setAlertStatus((current) => ({ ...parsed.alertStatus, ...current }));
    setImportText("");
    Alert.alert(
      "Import complete",
      `${addedCount} new trade(s) added. ${parsed.trades.length - addedCount} were already in your journal.${skippedNote}`
    );
  }

  function removeBacktestTrades() {
    if (backtestTrades.length === 0) return;
    Alert.alert("Remove backtest trades?", `${backtestTrades.length} imported backtest trade(s) will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => setTrades((current) => current.filter((t) => !isBacktest(t))),
      },
    ]);
  }

  const value = {
    // navigation
    tab, setTab,
    // data
    trades, myTrades, backtestTrades, datasetTrades, dataset, setDataset, stats, equity,
    // close / delete / edit
    closingTradeId, setClosingTradeId, exitPrice, setExitPrice, closeTrade, deleteTrade,
    startEdit, cancelEdit, editingTradeId, editExitPrice, setEditExitPrice,
    // journal / analysis view state
    search, setSearch, resultFilter, setResultFilter, analysisView, setAnalysisView,
    breakdownBy, setBreakdownBy, reportMode, setReportMode, reportOffset, setReportOffset,
    // form
    pair, setPair, direction, setDirection, entry, setEntry, stop, setStop, target, setTarget,
    lots, setLots, setup, setSetup, session, setSession, notes, setNotes, plan, saveTrade,
    // checklist
    checklist, setChecklist, toggleChecklist, rrOk, checklistMax, checklistScore,
    checklistRatio, checklistVerdict,
    // alerts
    scannerUrl, scannerInput, setScannerInput, alertsData, alertsError, alertsLoading, lastFetch,
    alertStatus, alertFilter, setAlertFilter, skippingId, setSkippingId, reviewingAlert,
    setReviewingAlert, newAlertCount, fetchAlerts, connectScanner, setAlertState, clearAlertState,
    startReview,
    // backup
    lastBackup, backupAge, backupDue, importText, setImportText, exportBackup, exportCsv,
    applyImport, removeBacktestTrades,
    // settings, money, PIN
    settings, settingsLoaded, updateSettings, currentRisk, sizing, moneyOf, moneyTotal,
    pin, unlocked, savePin, removePin, tryUnlock, lockedUntil,
    // journal depth
    emotion, setEmotion, chartBefore, setChartBefore, chartAfter, setChartAfter, photos, setPhotos,
    quoteRate, setQuoteRate, planFollowed, setPlanFollowed, mistakes, setMistakes, lesson, setLesson,
    toggleIn, closePlan, setClosePlan, closeMistakes, setCloseMistakes, closeLesson, setCloseLesson,
    startClosing, partialTradeId, setPartialTradeId, partialPercent, setPartialPercent,
    partialPrice, setPartialPrice, partialClose, undoPartial, moveStopToBreakeven,
    // cloud
    cloudReady, user, authSession, authBusy, signUp, signIn, signOut, resetPassword, deleteAccount,
    syncNow, syncStatus, syncState, allAlerts, cloudAlerts, fetchCloudAlerts, enablePush, pushStatus,
    importMt5FromPc,
    // pro
    isPro, proStatus, proPackages, proBusy, buyPro, restorePro, purchasesAvailable: purchasesSupported(),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { C, styles } from "../theme";
import { useApp } from "../context/AppContext";
import { botGet } from "../utils/botApi";
import { SUPABASE_ANON_KEY, SUPABASE_URL, cloudConfigured } from "../config";
import { clockState, localHM, untilText, utcHourLocal } from "../utils/sessions";

const CAL_KEY = "@trademind_ict_calendar_v1";
const DEFAULT_KZ = { London: [7, 10], "New York": [12, 15] };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Session clock (works offline) + this week's high/medium-impact news (from the bot on your PC). */
export default function MarketClock() {
  const { scannerUrl } = useApp();
  const [now, setNow] = useState(new Date());
  const [cal, setCal] = useState(null);
  const [mineOnly, setMineOnly] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  async function load() {
    try {
      const saved = await AsyncStorage.getItem(CAL_KEY);
      if (saved && !cal) setCal(JSON.parse(saved));
    } catch (e) {
      // nothing cached
    }
    const keep = (data) => {
      setCal(data);
      AsyncStorage.setItem(CAL_KEY, JSON.stringify(data)).catch(() => {});
    };
    // 1. your PC bot (knows which pairs you trade)  2. the TradeMind cloud (everyone)
    if (scannerUrl) {
      const res = await botGet(scannerUrl, "/bot/calendar");
      if (res.ok && Array.isArray(res.json.events)) {
        keep({ ...res.json, fetched_at: new Date().toISOString() });
        return;
      }
    }
    if (cloudConfigured()) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/calendar`, {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          signal: controller.signal,
        });
        const json = await r.json();
        if (r.ok && Array.isArray(json.events)) keep({ events: json.events, my_currencies: [], fetched_at: json.fetched_at || new Date().toISOString() });
      } catch (e) {
        // offline - the cached copy stays on screen
      } finally {
        clearTimeout(timer);
      }
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [scannerUrl]);

  const kz = (cal && cal.killzones_utc && Object.keys(cal.killzones_utc).length ? cal.killzones_utc : DEFAULT_KZ);
  const st = clockState(now, kz);

  const mine = new Set((cal && cal.my_currencies) || []);
  const events = ((cal && cal.events) || [])
    .filter((e) => new Date(e.time_utc).getTime() > now.getTime() - 60 * 60000)
    .filter((e) => !mineOnly || mine.size === 0 || mine.has(e.currency));
  const shown = showAll ? events : events.slice(0, 6);

  return (
    <>
      <View style={styles.calculator}>
        <View style={styles.tradeRow}>
          <Text style={styles.menuTitle}>Market clock</Text>
          <Text style={styles.calcValue}>{localHM(now)}</Text>
        </View>
        {!st.open ? (
          <Text style={[styles.muted, { color: C.orange }]}>
            Market closed · opens {st.opensAt ? `${DAYS[st.opensAt.getDay()]} ${localHM(st.opensAt)} (in ${untilText(now, st.opensAt)})` : "soon"}
          </Text>
        ) : st.activeKz ? (
          <Text style={[styles.muted, { color: C.green, fontWeight: "800" }]}>
            ● {st.activeKz.name} killzone now · ends {localHM(st.activeKzEnds)} (in {untilText(now, st.activeKzEnds)})
          </Text>
        ) : st.nextKz ? (
          <Text style={styles.muted}>
            Next killzone: {st.nextKz.name} {DAYS[st.nextKz.at.getDay()]} {localHM(st.nextKz.at)} (in {untilText(now, st.nextKz.at)})
          </Text>
        ) : null}
        <View style={[styles.chipWrap, { marginTop: 6 }]}>
          {st.sessions.map((s) => (
            <View key={s.key} style={[styles.chip, s.active && styles.chipActive]}>
              <Text style={[styles.chipText, s.active && styles.chipTextActive]}>
                {s.name} {utcHourLocal(s.start, now)}-{utcHourLocal(s.end % 24, now)}
              </Text>
            </View>
          ))}
        </View>
        {st.overlap ? <Text style={[styles.small, { color: C.blue }]}>Overlap: {st.overlap} - usually the busiest hours</Text> : null}
        <Text style={styles.small}>
          Bot killzones (your time): {st.killzones.map((k) => `${k.name} ${utcHourLocal(k.start, now)}-${utcHourLocal(k.end, now)}`).join(" · ")}
        </Text>
      </View>

      <View style={styles.calculator}>
        <View style={styles.tradeRow}>
          <Text style={styles.menuTitle}>Economic calendar</Text>
          {mine.size > 0 ? (
            <TouchableOpacity onPress={() => setMineOnly(!mineOnly)}>
              <Text style={[styles.small, { color: C.blue }]}>{mineOnly ? "My pairs" : "All currencies"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {!cal ? (
          <Text style={styles.small}>
            {scannerUrl || cloudConfigured() ? "Loading this week's news..." : "This week's news appears here when you are online."}
          </Text>
        ) : events.length === 0 ? (
          <Text style={styles.small}>No high or medium impact news coming up{mineOnly ? " for your pairs" : ""}.</Text>
        ) : (
          shown.map((e, i) => {
            const t = new Date(e.time_utc);
            const high = e.impact === "High";
            const soon = t - now < 60 * 60000 && t - now > -30 * 60000;
            return (
              <View key={`${e.time_utc}-${e.currency}-${i}`} style={[styles.tradeRow, { marginTop: 4 }]}>
                <Text style={[styles.small, { flex: 1 }, soon && { color: C.orange, fontWeight: "700" }]}>
                  {DAYS[t.getDay()]} {localHM(t)} · {e.currency} {e.title}
                </Text>
                <Text style={[styles.small, { color: high ? C.red : C.orange }]}>{high ? "HIGH" : "MED"}</Text>
              </View>
            );
          })
        )}
        {events.length > 6 ? (
          <TouchableOpacity onPress={() => setShowAll(!showAll)}>
            <Text style={[styles.small, { color: C.blue, marginTop: 4 }]}>{showAll ? "Show less" : `Show all ${events.length}`}</Text>
          </TouchableOpacity>
        ) : null}
        {cal && cal.fetched_at ? (
          <Text style={styles.small}>Updated {localHM(new Date(cal.fetched_at))} · times are in your phone's time zone</Text>
        ) : null}
      </View>
    </>
  );
}

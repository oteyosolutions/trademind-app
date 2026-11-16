import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { botGetPin } from "../utils/botApi";

/** Shows the secret TradingView webhook link + message examples (PIN protected). */
export default function TradingViewLink({ scannerUrl }) {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");

  async function show() {
    const res = await botGetPin(scannerUrl, "/bot/tradingview");
    if (res.ok) {
      setData(res.json);
      setMsg("");
    } else if (res.status === 401) {
      setMsg("Enter your PIN above first.");
    } else if (res.status === 404) {
      setMsg("Update the bot on the PC to use TradingView.");
    } else {
      setMsg(res.json.error || "Could not load the link.");
    }
  }

  if (!data) {
    return (
      <View style={{ marginTop: 8 }}>
        <TouchableOpacity onPress={show}>
          <Text style={[styles.small, { color: C.blue, fontWeight: "700" }]}>Show my TradingView link</Text>
        </TouchableOpacity>
        {!!msg && <Text style={[styles.small, { color: C.orange }]}>{msg}</Text>}
      </View>
    );
  }
  return (
    <View style={{ marginTop: 8, backgroundColor: "#13233A", borderRadius: 10, padding: 10 }}>
      {!data.cloud ? (
        <Text style={[styles.small, { color: C.orange }]}>The bot is not signed in to your cloud yet (CLOUD_ settings in config.py).</Text>
      ) : null}
      {data.webhook_url ? (
        <>
          <Text style={styles.small}>Webhook URL (TradingView alert → Notifications → Webhook URL). Keep it private:</Text>
          <Text selectable style={[styles.small, { color: C.text, marginTop: 4 }]}>{data.webhook_url}</Text>
        </>
      ) : (
        <Text style={[styles.small, { color: C.orange }]}>No link yet - on the PC run: python tradingview.py setup</Text>
      )}
      <Text style={[styles.small, { marginTop: 8 }]}>Alert message (JSON), for example:</Text>
      {Object.entries(data.examples || {}).map(([k, v]) => (
        <Text key={k} selectable style={[styles.small, { color: C.text }]}>{v}</Text>
      ))}
      {(data.recent || []).length ? <Text style={[styles.small, { marginTop: 8, fontWeight: "700" }]}>Recent alerts</Text> : null}
      {(data.recent || []).slice(0, 8).map((r, i) => (
        <Text key={i} style={[styles.small, { color: r.status === "done" ? C.green : C.orange }]}>
          {String(r.time).slice(11, 16)} {r.symbol} {r.action}: {r.result}
        </Text>
      ))}
    </View>
  );
}

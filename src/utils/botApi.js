import AsyncStorage from "@react-native-async-storage/async-storage";

/** Talking to trade_bot.py on the PC (port 8766, same Wi-Fi). Changes need the PIN shown in the bot window. */

export const BOT_PORT = 8766;
const PIN_KEY = "@trademind_ict_bot_pin_v1";

export function botUrl(scannerUrl) {
  if (!scannerUrl) return "";
  return scannerUrl.replace(/:\d+$/, `:${BOT_PORT}`);
}

export async function getPin() {
  try {
    return (await AsyncStorage.getItem(PIN_KEY)) || "";
  } catch (e) {
    return "";
  }
}

export async function setPin(pin) {
  try {
    await AsyncStorage.setItem(PIN_KEY, String(pin || "").trim());
  } catch (e) {
    // ignore
  }
}

export async function clearPin() {
  try {
    await AsyncStorage.removeItem(PIN_KEY);
  } catch (e) {
    // ignore
  }
}

async function request(url, options = {}, ms = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    let json = {};
    try {
      json = await res.json();
    } catch (e) {
      json = {};
    }
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    return { ok: false, status: 0, json: { error: "Could not reach the bot on your PC." } };
  } finally {
    clearTimeout(timer);
  }
}

export function botGet(scannerUrl, path) {
  return request(`${botUrl(scannerUrl)}${path}`);
}

/** GET that needs the PIN (secrets such as the TradingView link). */
export async function botGetPin(scannerUrl, path) {
  const pin = await getPin();
  return request(`${botUrl(scannerUrl)}${path}`, { headers: { "X-TradeMind-PIN": pin } });
}

/** POST with the saved PIN. status 401 = wrong/missing PIN, 429 = locked for 5 minutes. */
export async function botPost(scannerUrl, path, body) {
  const pin = await getPin();
  return request(`${botUrl(scannerUrl)}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-TradeMind-PIN": pin },
    body: body === undefined ? "" : JSON.stringify(body),
  });
}

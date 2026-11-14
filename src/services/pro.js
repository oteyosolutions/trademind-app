/**
 * Pro subscriptions through RevenueCat (Google Play Billing underneath, so users can pay
 * with M-Pesa, card or Google Play balance).
 *
 * In Expo Go the native module is missing - everything here then fails safely and the
 * app falls back to PRO_FREE_DURING_BETA.
 */
import { Platform } from "react-native";
import { PRO_ENTITLEMENT, REVENUECAT_ANDROID_KEY } from "../config";

let Purchases = null;
try {
  // eslint-disable-next-line global-require
  const mod = require("react-native-purchases");
  Purchases = mod && (mod.default || mod);
} catch (error) {
  Purchases = null;
}

let configured = false;

export function purchasesSupported() {
  return !!Purchases && Platform.OS === "android" && REVENUECAT_ANDROID_KEY.startsWith("goog_");
}

export async function initPurchases(appUserId) {
  if (!purchasesSupported()) return false;
  try {
    if (!configured) {
      Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY, appUserID: appUserId || undefined });
      configured = true;
    } else if (appUserId) {
      await Purchases.logIn(appUserId);
    }
    return true;
  } catch (error) {
    configured = false;
    return false;
  }
}

export function hasPro(customerInfo) {
  return !!(customerInfo && customerInfo.entitlements && customerInfo.entitlements.active &&
    customerInfo.entitlements.active[PRO_ENTITLEMENT]);
}

export async function getProStatus() {
  if (!configured) return { active: false, expires: null };
  try {
    const info = await Purchases.getCustomerInfo();
    const ent = hasPro(info) ? info.entitlements.active[PRO_ENTITLEMENT] : null;
    return { active: !!ent, expires: ent ? ent.expirationDate : null, willRenew: ent ? ent.willRenew : false };
  } catch (error) {
    return { active: false, expires: null };
  }
}

export async function getPackages() {
  if (!configured) return [];
  try {
    const offerings = await Purchases.getOfferings();
    return (offerings && offerings.current && offerings.current.availablePackages) || [];
  } catch (error) {
    return [];
  }
}

/** Returns { ok, cancelled, error }. */
export async function buyPackage(pkg) {
  try {
    const result = await Purchases.purchasePackage(pkg);
    return { ok: hasPro(result && result.customerInfo) };
  } catch (error) {
    if (error && error.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, error: (error && error.message) || "Purchase failed" };
  }
}

export async function restorePurchases() {
  try {
    const info = await Purchases.restorePurchases();
    return { ok: hasPro(info) };
  } catch (error) {
    return { ok: false, error: (error && error.message) || "Restore failed" };
  }
}

export async function logOutPurchases() {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    // anonymous users cannot log out - ignore
  }
}

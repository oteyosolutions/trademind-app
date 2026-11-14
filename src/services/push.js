/**
 * Push notifications for scanner alerts (works in the installed app, not in Expo Go on Android).
 * The phone's Expo push token is saved to Supabase; the PC scanner sends the notification.
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

let handlerSet = false;

export function setupNotificationDisplay() {
  if (handlerSet) return;
  handlerSet = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (error) {
    // not available in this environment
  }
}

/** Ask permission and return this phone's push token, or { error }. */
export async function getPushToken() {
  try {
    if (!Device.isDevice) return { error: "Push notifications need a real phone." };
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("alerts", {
        name: "Setup alerts",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 200, 300],
      });
    }
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== "granted") return { error: "Notification permission was not given." };
    const projectId =
      (Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.eas &&
        Constants.expoConfig.extra.eas.projectId) ||
      (Constants.easConfig && Constants.easConfig.projectId);
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return { token: token.data };
  } catch (error) {
    return {
      error:
        "Push notifications are not available here (Expo Go does not support them on Android). " +
        "They work in the installed app.",
    };
  }
}

/** Call `onOpen` when the user taps a notification. Returns an unsubscribe function. */
export function onNotificationTap(onOpen) {
  try {
    const sub = Notifications.addNotificationResponseReceivedListener(() => onOpen());
    return () => sub.remove();
  } catch (error) {
    return () => {};
  }
}

import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { apiRequest } from "./apiClient";

// Requires `extra.eas.projectId` in app.json, which only exists after running
// `eas build:configure` (Fase 0 of PLAN_IMPLEMENTACION.md). Until then this is a
// no-op — order-status push just won't arrive, nothing else breaks.
export async function registerPushToken() {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn("Skipping push registration: no EAS projectId configured yet.");
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await apiRequest("/push/register-mobile", { method: "POST", body: { expoPushToken } });
  } catch (error) {
    console.warn("Push registration failed:", error);
  }
}

export async function unregisterPushToken() {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await apiRequest("/push/unregister-mobile", { method: "POST", body: { expoPushToken } });
  } catch (error) {
    console.warn("Push unregistration failed:", error);
  }
}

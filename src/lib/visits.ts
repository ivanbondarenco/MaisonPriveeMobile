import { useEffect } from "react";
import { AppState } from "react-native";

import { apiRequest } from "./apiClient";
import { visitStore } from "./secureStore";

// The admin dashboard counts unique visitors per day (POST /visits, one row per
// visitor per day). The storefront reports from components/VisitTracker.tsx;
// this does the same for the app, so app users show up in that KPI too.

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

// Only has to tell devices apart for a daily count, so no crypto module needed
// (a native dependency would also force a new build). 32 hex chars, within the
// backend's 8–64 limit.
const newVisitorId = () =>
  Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

async function recordVisit() {
  const day = today();
  if ((await visitStore.getLastDay()) === day) return;

  let visitorId = await visitStore.getVisitorId();
  if (!visitorId) {
    visitorId = newVisitorId();
    await visitStore.setVisitorId(visitorId);
  }
  await apiRequest("/visits", { method: "POST", body: { visitorId }, auth: false });
  // Only after the backend took it, so a failed request is retried next time.
  await visitStore.setLastDay(day);
}

/** Records today's visit on launch and whenever the app comes back to the foreground. */
export function useVisitTracker() {
  useEffect(() => {
    recordVisit().catch(() => {});
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") recordVisit().catch(() => {});
    });
    return () => subscription.remove();
  }, []);
}

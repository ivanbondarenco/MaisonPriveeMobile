import { apiRequest } from "@/lib/apiClient";

// Feature flags live in the backend's SiteSetting table (GET /settings/:key is
// public; an admin sets one with PUT /settings/:key { value: "true" }). Web and
// app read the same row, so flipping it turns a feature on in both at once.
//
// Add every flag the app reads here, so a typo is a type error.
export const FLAGS = ["payments_enabled"] as const;
export type FlagKey = (typeof FLAGS)[number];

export const flagQueryKey = (key: FlagKey) => ["settings", key] as const;

// Anything but an explicit "true" (unset key, failed request) counts as off,
// so a feature stays hidden until someone deliberately turns it on.
export const getFlag = (key: FlagKey) =>
  apiRequest<{ key: string; value: string | null } | null>(`/settings/${key}`, { auth: false })
    .then((setting) => setting?.value === "true")
    .catch(() => false);

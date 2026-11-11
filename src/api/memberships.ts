import { apiRequest } from "@/lib/apiClient";
import type { MyMembership, UserMembership } from "./types";

export const getMyMembership = () => apiRequest<MyMembership>("/memberships/me");

// The Private Client Registry is free and selective: the request stays PENDING
// until an admin approves the profile. There is no payment and no renewal.
export const requestRegistryAccess = () =>
  apiRequest<UserMembership>("/memberships/request", { method: "POST" });

// Leaves the registry at once; a legacy paid plan only stops renewing and keeps
// access until the end of the period already paid for.
export const cancelMembership = () =>
  apiRequest<UserMembership>("/memberships/cancel", { method: "POST" });

export const myMembershipQueryKey = ["memberships", "me"] as const;

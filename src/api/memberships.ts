import { apiRequest } from "@/lib/apiClient";
import type { MembershipPlan, MyMembership, UserMembership } from "./types";

// Public: the backend resolves name/tagline/benefits for the locale it is given
// and falls back to English for anything untranslated.
export const getMembershipPlans = (locale: string) =>
  apiRequest<MembershipPlan[]>(`/memberships/plans?locale=${encodeURIComponent(locale)}`, { auth: false });

export const getMyMembership = () => apiRequest<MyMembership>("/memberships/me");

// Paid by bank transfer and/or site credit — there is no card flow for
// memberships on the backend, so this mirrors the product checkout.
export const subscribeToPlan = (payload: {
  planId: string;
  transferProofUrl?: string | null;
  creditApplied?: number;
}) => apiRequest<UserMembership>("/memberships/subscribe", { method: "POST", body: payload });

// Stops the renewal; access runs to the end of the period already paid for.
export const cancelMembership = () =>
  apiRequest<UserMembership>("/memberships/cancel", { method: "POST" });

export const myMembershipQueryKey = ["memberships", "me"] as const;
// Keyed by locale so switching language refetches the translated plans.
export const membershipPlansQueryKey = (locale: string) => ["memberships", "plans", locale] as const;

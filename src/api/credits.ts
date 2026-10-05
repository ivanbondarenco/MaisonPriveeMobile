import { apiRequest } from "@/lib/apiClient";
import type { SiteCredit } from "./types";

export const getMyCredits = () => apiRequest<SiteCredit>("/credits/me");

// Shared by the profile balance and checkout so an order that spends credit
// can refresh both with one invalidation.
export const myCreditsQueryKey = ["credits", "me"] as const;

import { apiRequest } from "@/lib/apiClient";
import type { ReferralStats } from "./types";

export const getReferralStats = () => apiRequest<ReferralStats>("/users/referral-stats");

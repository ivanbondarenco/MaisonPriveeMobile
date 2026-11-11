import { apiRequest } from "@/lib/apiClient";
import type { LoyaltyStanding, LoyaltyTier } from "./types";

// Le Cercle: the earned loyalty ladder. The tiers live in the backend and are
// edited from the admin, so the app only fetches them and does the arithmetic,
// exactly like the storefront's lib/loyalty.ts.

export const getLoyaltyTiers = () =>
  apiRequest<{ tiers: LoyaltyTier[]; bonusMinSale: number }>("/loyalty/tiers", { auth: false });

export const getMyLoyalty = () => apiRequest<LoyaltyStanding>("/loyalty/me");

export const loyaltyTiersQueryKey = ["loyalty", "tiers"] as const;
export const myLoyaltyQueryKey = ["loyalty", "me"] as const;

export function tierForSales(tiers: LoyaltyTier[], netSales12m: number): LoyaltyTier | null {
  let match: LoyaltyTier | null = null;
  for (const tier of tiers) {
    if (netSales12m >= tier.minSales) match = tier;
  }
  return match ?? tiers[0] ?? null;
}

export function nextTier(tiers: LoyaltyTier[], tier: LoyaltyTier): LoyaltyTier | null {
  const index = tiers.findIndex((t) => t.key === tier.key);
  return index === -1 ? null : tiers[index + 1] ?? null;
}

/** 0–1 progress through the current tier band. The top tier is always full. */
export function tierProgress(tiers: LoyaltyTier[], netSales12m: number, tier: LoyaltyTier): number {
  const next = nextTier(tiers, tier);
  if (!next) return 1;
  const span = next.minSales - tier.minSales;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (netSales12m - tier.minSales) / span));
}

/** Benefits in the active language, falling back to English. */
export const tierBenefits = (tier: LoyaltyTier, locale: string): string[] =>
  tier.benefits?.[locale] ?? tier.benefits?.en ?? [];

export const formatUsd = (amount: number) => `USD ${Math.round(amount).toLocaleString("en-US")}`;

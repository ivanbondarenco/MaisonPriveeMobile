import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { Check } from "lucide-react-native";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";

import {
  formatUsd,
  getLoyaltyTiers,
  getMyLoyalty,
  loyaltyTiersQueryKey,
  myLoyaltyQueryKey,
  nextTier,
  tierBenefits,
  tierForSales,
  tierProgress,
} from "@/api/loyalty";
import { AppText } from "@/components/AppText";
import { fill, useI18n } from "@/i18n";
import { colors, spacing } from "@/theme";

// Le Cercle standing, the app's take on the storefront's account LoyaltyPanel.
// The tier colours and benefits come from the backend, so the admin edits them
// once for both clients.
export function LoyaltyCard() {
  const { t, locale } = useI18n();
  const tiersQuery = useQuery({ queryKey: loyaltyTiersQueryKey, queryFn: getLoyaltyTiers });
  const standingQuery = useQuery({ queryKey: myLoyaltyQueryKey, queryFn: getMyLoyalty });

  // A payout settled elsewhere may have moved the tier.
  const { refetch } = standingQuery;
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const tiers = tiersQuery.data?.tiers ?? [];
  // Nothing to show without the ladder; a failed standing just reads as no sales yet.
  if (tiers.length === 0) return null;

  const sales = standingQuery.data?.netSales12m ?? 0;
  const current = tierForSales(tiers, sales);
  if (!current) return null;

  const next = nextTier(tiers, current);
  const progress = tierProgress(tiers, sales, current);
  const remaining = next ? Math.max(0, next.minSales - sales) : 0;
  const benefits = tierBenefits(current, locale);
  const range = next
    ? `${formatUsd(current.minSales)} - ${(next.minSales - 1).toLocaleString("en-US")}`
    : `${formatUsd(current.minSales)}+`;

  return (
    <View style={[styles.card, { backgroundColor: current.cardColor }]}>
      <View style={[styles.accentBar, { backgroundColor: current.accent }]} />
      <View style={styles.body}>
        <AppText variant="caption">{t.loyalty.yourTier}</AppText>
        <AppText variant="display" style={styles.tierName}>
          {current.name}
        </AppText>
        <AppText variant="caption" style={styles.range}>
          {`${t.loyalty.range}: ${range}`}
        </AppText>

        <View style={styles.stats}>
          <Stat value={formatUsd(sales)} label={t.loyalty.netSales} />
          <Stat value={String(standingQuery.data?.salesCount12m ?? 0)} label={t.loyalty.piecesSold} />
          <Stat value={current.bonusPct > 0 ? `+${current.bonusPct}%` : "-"} label={t.loyalty.bonus} />
        </View>

        <View style={styles.progressLabels}>
          <AppText variant="caption">{current.name}</AppText>
          <AppText variant="caption">{next?.name ?? ""}</AppText>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: current.accent }]} />
        </View>
        <AppText variant="body" style={styles.status}>
          {sales === 0
            ? t.loyalty.empty
            : next
              ? fill(t.loyalty.toNext, { amount: formatUsd(remaining), tier: next.name })
              : t.loyalty.topTier}
        </AppText>

        {benefits.length > 0 ? (
          <View style={styles.benefits}>
            <AppText variant="label" style={styles.benefitsTitle}>
              {t.loyalty.benefits}
            </AppText>
            {benefits.map((benefit) => (
              <View key={benefit} style={styles.benefit}>
                <Check size={13} strokeWidth={2} color={colors.gold} style={styles.check} />
                <AppText variant="body" style={styles.benefitText}>
                  {benefit}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="display" style={styles.statValue}>
        {value}
      </AppText>
      <AppText variant="caption" style={styles.statLabel}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  accentBar: {
    height: 4,
  },
  body: {
    padding: spacing.md,
  },
  tierName: {
    marginTop: spacing.xs,
    fontSize: 28,
  },
  range: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    textTransform: "none",
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
  },
  statLabel: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  track: {
    height: 3,
    backgroundColor: "rgba(26, 26, 26, 0.1)",
  },
  fill: {
    height: "100%",
  },
  status: {
    marginTop: spacing.md,
    color: colors.textMuted,
  },
  benefits: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  benefitsTitle: {
    marginBottom: spacing.xs,
  },
  benefit: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  check: {
    marginTop: 4,
  },
  benefitText: {
    flex: 1,
  },
});

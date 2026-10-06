import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";

import { getMyCredits, myCreditsQueryKey } from "@/api/credits";
import { AppText } from "@/components/AppText";
import { dateLocale, useI18n } from "@/i18n";
import { colors, spacing } from "@/theme";

const priceFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// The endpoint returns up to 50 movements; the profile only needs a glance.
const RECENT_LIMIT = 5;

const formatSigned = (amount: number) =>
  `${amount < 0 ? "-" : "+"}USD ${priceFormatter.format(Math.abs(amount))}`;

export function SiteCreditCard() {
  const { t, locale } = useI18n();
  const { data, isError, refetch } = useQuery({
    queryKey: myCreditsQueryKey,
    queryFn: getMyCredits,
  });

  // Tabs stay mounted, so refresh whenever the profile comes back into view —
  // a payout or a checkout elsewhere may have moved the balance.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const recent = data?.transactions.slice(0, RECENT_LIMIT) ?? [];

  return (
    <View style={styles.card}>
      <AppText variant="caption">{t.profile.siteCredit}</AppText>
      <AppText variant="display" style={styles.balance}>
        {data ? `USD ${priceFormatter.format(data.balance)}` : isError ? "—" : " "}
      </AppText>
      <AppText variant="body" style={styles.hint}>
        {isError
          ? t.profile.siteCreditError
          : t.profile.siteCreditHint}
      </AppText>

      {recent.length > 0 ? (
        <View style={styles.history}>
          {recent.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txText}>
                <AppText variant="body" numberOfLines={2}>
                  {tx.reason}
                </AppText>
                <AppText variant="caption" style={styles.txDate}>
                  {new Date(tx.createdAt).toLocaleDateString(dateLocale[locale], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </AppText>
              </View>
              <AppText variant="bodyMedium" style={tx.amount < 0 ? styles.spent : styles.earned}>
                {formatSigned(tx.amount)}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  balance: {
    marginTop: spacing.xs,
    fontSize: 28,
    color: colors.gold,
  },
  hint: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  history: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  txText: {
    flex: 1,
  },
  txDate: {
    marginTop: 2,
    textTransform: "none",
  },
  earned: {
    color: colors.primary,
  },
  spent: {
    color: colors.danger,
  },
});

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { getMyConsignments } from "@/api/consignment";
import type { Consignment } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { dateLocale, useI18n } from "@/i18n";
import { colors, spacing } from "@/theme";
import { isProductViewable, STATUS_COLOR } from "./status";

const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function ConsignmentRow({ item, onPress }: { item: Consignment; onPress: () => void }) {
  const { t, locale } = useI18n();
  const statusColor = STATUS_COLOR[item.status] ?? colors.gold;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeading}>
          <AppText variant="caption">
            {item.submissionType === "INSTANT_LIQUIDITY" ? "Instant Liquidity" : "Consignment"}
          </AppText>
          <AppText variant="bodyMedium" style={styles.cardTitle}>
            {item.brand}
            {item.category ? ` — ${item.category}` : ""}
          </AppText>
          <AppText variant="caption" style={styles.cardDate}>
            {new Date(item.createdAt).toLocaleDateString(dateLocale[locale], {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </AppText>
        </View>
        <View style={[styles.statusBadge, { borderColor: statusColor }]}>
          <AppText variant="caption" style={{ color: statusColor }}>
            {t.consignments.status[item.status] ?? item.status}
          </AppText>
        </View>
      </View>

      <View style={styles.cardBody}>
        {item.priceExpectation ? (
          <View style={styles.cardField}>
            <AppText variant="caption">{t.consignments.priceExpectation}</AppText>
            <AppText variant="body">{item.priceExpectation}</AppText>
          </View>
        ) : null}
        {item.payoutAmount != null ? (
          <View style={styles.cardField}>
            <AppText variant="caption">
              {item.payoutMethod === "CREDIT" ? t.consignments.payoutCredit : t.consignments.payout}
            </AppText>
            <AppText variant="bodyMedium">USD {priceFormatter.format(item.payoutAmount)}</AppText>
          </View>
        ) : null}
        {item.product ? (
          <View style={styles.cardField}>
            <AppText variant="caption">
              {isProductViewable(item.product) ? t.consignments.livePiece : t.consignments.piecePreparing}
            </AppText>
            <AppText variant="body">{item.product.title}</AppText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function MyConsignmentsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { user } = useAuth();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["consignments", "mine"],
    queryFn: getMyConsignments,
    enabled: !!user,
  });

  if (!user) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="body" style={styles.centeredText}>
          {t.consignments.signInPrompt}
        </AppText>
        <Button label={t.common.signIn} onPress={() => router.push("/(auth)/login")} style={styles.centeredButton} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="body" style={styles.centeredText}>
          {t.consignments.error}
        </AppText>
        <Button label={t.common.tryAgain} variant="outline" onPress={() => refetch()} style={styles.centeredButton} />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={
          <AppText variant="body" style={styles.intro}>
            {t.consignments.intro}
          </AppText>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <AppText variant="body" style={styles.centeredText}>
                {t.consignments.empty}
              </AppText>
              <Button
                label={t.consignments.submitPiece}
                onPress={() => router.push("/consign/new")}
                style={styles.centeredButton}
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ConsignmentRow item={item} onPress={() => router.push(`/consignments/${item.id}`)} />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  centeredText: {
    textAlign: "center",
    color: colors.textMuted,
  },
  centeredButton: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  intro: {
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  empty: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  cardHeading: {
    flex: 1,
  },
  cardTitle: {
    marginTop: spacing.xs,
  },
  cardDate: {
    marginTop: spacing.xs,
    textTransform: "none",
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  cardBody: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  cardField: {
    gap: 2,
  },
  cardPressed: {
    opacity: 0.7,
  },
});

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import {
  cancelMembership,
  getMembershipPlans,
  getMyMembership,
  membershipPlansQueryKey,
  myMembershipQueryKey,
} from "@/api/memberships";
import type { MembershipPlan, UserMembership } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { dateLocale, fill, useI18n, useT } from "@/i18n";
import type { Translations } from "@/i18n/en";
import { ApiError } from "@/lib/apiClient";
import { colors, spacing } from "@/theme";

const priceFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" });

export const intervalLabel = (interval: "MONTH" | "YEAR", t: Translations) =>
  interval === "YEAR" ? t.membership.perYear : t.membership.perMonth;

function PlanCard({
  plan,
  isCurrent,
  disabled,
  onSubscribe,
}: {
  plan: MembershipPlan;
  isCurrent: boolean;
  disabled: boolean;
  onSubscribe: () => void;
}) {
  const t = useT();

  return (
    <View style={[styles.planCard, plan.cardColor ? { backgroundColor: plan.cardColor } : null]}>
      {plan.badgeLabel ? (
        <View style={[styles.badge, plan.badgeColor ? { backgroundColor: plan.badgeColor } : null]}>
          <AppText variant="caption" style={styles.badgeText}>
            {plan.badgeLabel}
          </AppText>
        </View>
      ) : null}

      <AppText variant="display" style={styles.planName}>
        {plan.name}
      </AppText>
      {plan.tagline ? (
        <AppText variant="body" style={styles.planTagline}>
          {plan.tagline}
        </AppText>
      ) : null}

      <AppText variant="bodyMedium" style={styles.planPrice}>
        {plan.currency} {priceFormatter.format(plan.priceAmount)}
        <AppText variant="body" style={styles.planInterval}>
          {` / ${intervalLabel(plan.interval, t)}`}
        </AppText>
      </AppText>

      <View style={styles.benefits}>
        {plan.benefits.map((benefit, index) => (
          <View key={`${plan.id}-${index}`} style={styles.benefitRow}>
            <Check size={14} color={colors.gold} strokeWidth={1.5} />
            <AppText variant={benefit.bold ? "bodyMedium" : "body"} style={styles.benefitText}>
              {benefit.text}
            </AppText>
          </View>
        ))}
      </View>

      <Button
        label={isCurrent ? t.membership.currentPlan : t.membership.subscribe}
        variant={isCurrent ? "outline" : "primary"}
        disabled={isCurrent || disabled}
        onPress={onSubscribe}
        style={styles.planButton}
      />
    </View>
  );
}

function CurrentMembership({
  membership,
  onCancel,
  isCancelling,
}: {
  membership: UserMembership;
  onCancel: () => void;
  isCancelling: boolean;
}) {
  const { t, locale } = useI18n();
  const isCancelled = !membership.autoRenew;

  return (
    <View style={styles.statusBox}>
      <AppText variant="caption">
        {isCancelled ? t.membership.endingMembership : t.membership.activeMembership}
      </AppText>
      <AppText variant="bodyMedium" style={styles.statusPlan}>
        {membership.plan.name}
      </AppText>
      <AppText variant="body" style={styles.muted}>
        {fill(isCancelled ? t.membership.endsOn : t.membership.renewsOn, {
          date: formatDate(membership.currentPeriodEnd, dateLocale[locale]),
        })}
      </AppText>
      {isCancelled ? null : (
        <Button
          label={t.membership.cancelRenewal}
          variant="outline"
          onPress={onCancel}
          loading={isCancelling}
          style={styles.cancelButton}
        />
      )}
    </View>
  );
}

export function MembershipScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, locale } = useI18n();
  const [isCancelling, setIsCancelling] = useState(false);

  const plansQuery = useQuery({
    queryKey: membershipPlansQueryKey(locale),
    queryFn: () => getMembershipPlans(locale),
  });
  const mineQuery = useQuery({
    queryKey: myMembershipQueryKey,
    queryFn: getMyMembership,
    enabled: !!user,
  });

  const active = mineQuery.data?.active ?? null;
  const pending = mineQuery.data?.pending ?? null;

  const handleSubscribe = (plan: MembershipPlan) => {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    router.push(`/membership/subscribe?planId=${plan.id}`);
  };

  const runCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelMembership();
      queryClient.invalidateQueries({ queryKey: myMembershipQueryKey });
    } catch (error) {
      Alert.alert(
        t.membership.cancelFailed,
        error instanceof ApiError ? error.message : t.membership.cancelFailedBody
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      t.membership.cancelTitle,
      t.membership.cancelBody,
      [
        { text: t.membership.keepMembership, style: "cancel" },
        { text: t.membership.cancelRenewal, style: "destructive", onPress: runCancel },
      ]
    );
  };

  if (plansQuery.isError) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="body" style={styles.centeredText}>
          {t.membership.plansError}
        </AppText>
        <Button
          label={t.common.tryAgain}
          variant="outline"
          onPress={() => plansQuery.refetch()}
          style={styles.centeredButton}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="caption">{t.membership.eyebrow}</AppText>
        <AppText variant="display" style={styles.heading}>
          {t.membership.title}
        </AppText>
        <AppText variant="body" style={styles.muted}>
          {t.membership.intro}
        </AppText>

        {active ? (
          <CurrentMembership membership={active} onCancel={handleCancel} isCancelling={isCancelling} />
        ) : null}

        {pending ? (
          <View style={styles.statusBox}>
            <AppText variant="caption">{t.membership.awaitingPayment}</AppText>
            <AppText variant="bodyMedium" style={styles.statusPlan}>
              {pending.plan.name}
            </AppText>
            <AppText variant="body" style={styles.muted}>
              {t.membership.awaitingPaymentBody}
            </AppText>
          </View>
        ) : null}

        {(plansQuery.data ?? []).map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={active?.planId === plan.id}
            // One pending subscription at a time — the backend rejects a second.
            disabled={!!pending}
            onSubscribe={() => handleSubscribe(plan)}
          />
        ))}

        {!plansQuery.isLoading && (plansQuery.data ?? []).length === 0 ? (
          <AppText variant="body" style={styles.muted}>
            {t.membership.noPlans}
          </AppText>
        ) : null}
      </ScrollView>
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heading: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  muted: {
    color: colors.textMuted,
  },
  statusBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.white,
    gap: spacing.xs,
  },
  statusPlan: {
    marginTop: spacing.xs,
  },
  cancelButton: {
    marginTop: spacing.md,
  },
  planCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.sm,
    backgroundColor: colors.secondary,
  },
  badgeText: {
    color: colors.primary,
  },
  planName: {
    fontSize: 22,
  },
  planTagline: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  planPrice: {
    marginTop: spacing.md,
  },
  planInterval: {
    color: colors.textMuted,
  },
  benefits: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  benefitText: {
    flex: 1,
  },
  planButton: {
    marginTop: spacing.lg,
  },
});

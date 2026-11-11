import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import { cancelMembership, getMyMembership, myMembershipQueryKey, requestRegistryAccess } from "@/api/memberships";
import type { UserMembership } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { dateLocale, fill, useI18n } from "@/i18n";
import { ApiError } from "@/lib/apiClient";
import { colors, spacing } from "@/theme";

const formatDate = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" });

// The Private Client Registry: free and selective. Access is requested here and
// approved by the Maison from the admin; approved members see each new release
// 24 hours before the public. Mirrors the storefront's /private-client-registry.
function ActiveMembership({
  membership,
  onLeave,
  isLeaving,
}: {
  membership: UserMembership;
  onLeave: () => void;
  isLeaving: boolean;
}) {
  const { t, locale } = useI18n();
  // Only a legacy paid plan has a period: the registry itself never lapses.
  const isPaid = membership.pricePaid > 0;

  return (
    <View style={styles.statusBox}>
      <AppText variant="caption" style={styles.statusEyebrow}>
        {t.membership.active}
      </AppText>
      <AppText variant="bodyMedium" style={styles.statusPlan}>
        {membership.plan.name}
      </AppText>
      <AppText variant="body" style={styles.muted}>
        {fill(t.membership.memberSince, { date: formatDate(membership.startedAt, dateLocale[locale]) })}
      </AppText>
      {isPaid ? (
        <AppText variant="body" style={styles.muted}>
          {fill(membership.autoRenew ? t.membership.renewsOn : t.membership.endsOn, {
            date: formatDate(membership.currentPeriodEnd, dateLocale[locale]),
          })}
        </AppText>
      ) : null}
      {membership.autoRenew || !isPaid ? (
        <Button
          label={t.membership.leave}
          variant="outline"
          onPress={onLeave}
          loading={isLeaving}
          style={styles.leaveButton}
        />
      ) : null}
    </View>
  );
}

export function MembershipScreen() {
  const router = useRouter();
  const { user, isLoading: isLoadingSession } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const mineQuery = useQuery({
    queryKey: myMembershipQueryKey,
    queryFn: getMyMembership,
    enabled: !!user,
  });

  const active = mineQuery.data?.active ?? null;
  const pending = mineQuery.data?.pending ?? null;
  // Legacy paid plans wait on a transfer; registry requests wait on approval.
  const awaitingPayment = !!pending?.order;
  const canRequest = !active && !pending && !mineQuery.isLoading;

  const handleRequest = async () => {
    if (!user) {
      router.push("/(auth)/register");
      return;
    }
    setIsRequesting(true);
    try {
      await requestRegistryAccess();
      await queryClient.invalidateQueries({ queryKey: myMembershipQueryKey });
    } catch (error) {
      Alert.alert(error instanceof ApiError ? error.message : t.membership.requestFailed);
    } finally {
      setIsRequesting(false);
    }
  };

  const runLeave = async () => {
    setIsLeaving(true);
    try {
      await cancelMembership();
      queryClient.invalidateQueries({ queryKey: myMembershipQueryKey });
      // Leaving the registry closes the private window: drop the member-only pieces.
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      Alert.alert(
        t.membership.leaveFailed,
        error instanceof ApiError ? error.message : t.membership.leaveFailedBody
      );
    } finally {
      setIsLeaving(false);
    }
  };

  const handleLeave = () => {
    Alert.alert(t.membership.leaveTitle, t.membership.leaveBody, [
      { text: t.membership.stay, style: "cancel" },
      { text: t.membership.leave, style: "destructive", onPress: runLeave },
    ]);
  };

  const requestButton = canRequest ? (
    <Button
      label={t.membership.requestAccess}
      onPress={handleRequest}
      loading={isRequesting}
      disabled={isLoadingSession}
      style={styles.requestButton}
    />
  ) : null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="caption" style={styles.eyebrow}>
          {t.membership.eyebrow}
        </AppText>
        <AppText variant="display" style={styles.heading}>
          {t.membership.title}
        </AppText>
        <AppText variant="body" style={styles.muted}>
          {t.membership.intro}
        </AppText>

        {active ? <ActiveMembership membership={active} onLeave={handleLeave} isLeaving={isLeaving} /> : null}

        {pending ? (
          <View style={styles.statusBox}>
            <AppText variant="caption" style={styles.statusEyebrow}>
              {awaitingPayment ? t.membership.awaitingPayment : t.membership.underReview}
            </AppText>
            <AppText variant="bodyMedium" style={styles.statusPlan}>
              {pending.plan.name}
            </AppText>
            <AppText variant="body" style={styles.muted}>
              {awaitingPayment ? t.membership.awaitingPaymentBody : t.membership.underReviewBody}
            </AppText>
          </View>
        ) : null}

        {requestButton}
        {!user && !isLoadingSession ? (
          <AppText variant="body" style={styles.guestNote}>
            {t.membership.guest}
          </AppText>
        ) : null}

        <AppText variant="label" style={styles.sectionLabel}>
          {t.membership.pillarsLabel}
        </AppText>
        <AppText variant="display" style={styles.sectionTitle}>
          {t.membership.pillarsTitle}
        </AppText>
        <View style={styles.pillars}>
          {t.membership.pillars.map((pillar) => (
            <View key={pillar.title} style={styles.pillar}>
              <AppText variant="displayItalic" style={styles.pillarTitle}>
                {pillar.title}
              </AppText>
              <AppText variant="body" style={styles.muted}>
                {pillar.body}
              </AppText>
            </View>
          ))}
        </View>

        <AppText variant="label" style={styles.sectionLabel}>
          {t.membership.stepsLabel}
        </AppText>
        <AppText variant="display" style={styles.sectionTitle}>
          {t.membership.stepsTitle}
        </AppText>
        {t.membership.steps.map((step, index) => (
          <View key={step.title} style={styles.step}>
            <AppText variant="display" style={styles.stepNumber}>
              {`0${index + 1}`}
            </AppText>
            <View style={styles.stepText}>
              <AppText variant="label">{step.title}</AppText>
              <AppText variant="body" style={styles.muted}>
                {step.body}
              </AppText>
            </View>
          </View>
        ))}

        {requestButton}
        <AppText variant="caption" style={styles.note}>
          {t.membership.note}
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  eyebrow: {
    color: colors.gold,
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
  statusEyebrow: {
    color: colors.gold,
  },
  statusPlan: {
    marginTop: spacing.xs,
  },
  leaveButton: {
    marginTop: spacing.md,
  },
  requestButton: {
    marginTop: spacing.lg,
  },
  guestNote: {
    marginTop: spacing.sm,
    textAlign: "center",
    color: colors.textMuted,
  },
  sectionLabel: {
    marginTop: spacing.xxl,
    color: colors.gold,
  },
  sectionTitle: {
    marginTop: spacing.xs,
    fontSize: 26,
  },
  pillars: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  pillar: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.xs,
  },
  pillarTitle: {
    fontSize: 20,
  },
  step: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  stepNumber: {
    fontSize: 24,
    color: colors.gold,
  },
  stepText: {
    flex: 1,
    gap: spacing.xs,
  },
  note: {
    marginTop: spacing.md,
    textAlign: "center",
    color: colors.textMuted,
  },
});

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";

import { getMyCredits, myCreditsQueryKey } from "@/api/credits";
import {
  getMembershipPlans,
  membershipPlansQueryKey,
  myMembershipQueryKey,
  subscribeToPlan,
} from "@/api/memberships";
import { uploadTransferProof } from "@/api/orders";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { fill, useI18n } from "@/i18n";
import { ApiError } from "@/lib/apiClient";
import { colors, spacing } from "@/theme";
import { intervalLabel } from "./MembershipScreen";

const priceFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function MembershipCheckoutScreen({ planId }: { planId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale } = useI18n();

  const [useCredit, setUseCredit] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState<"CREDIT" | "TRANSFER" | null>(null);

  // Reuses the plans cache from MembershipScreen — there is no per-plan endpoint.
  const { data: plans, isLoading } = useQuery({
    queryKey: membershipPlansQueryKey(locale),
    queryFn: () => getMembershipPlans(locale),
  });
  const { data: credits } = useQuery({ queryKey: myCreditsQueryKey, queryFn: getMyCredits });

  const plan = plans?.find((p) => p.id === planId);
  const creditBalance = credits?.balance ?? 0;
  const price = plan?.priceAmount ?? 0;
  const creditApplied = useCredit ? Math.min(creditBalance, price) : 0;
  const amountToTransfer = Math.max(0, price - creditApplied);
  const fullyCoveredByCredit = creditApplied > 0 && amountToTransfer <= 0;

  const uploadProof = async (uri: string, mimeType: string) => {
    setIsUploadingProof(true);
    setFormError(null);
    try {
      const uploaded = await uploadTransferProof(uri, mimeType);
      setProofUrl(uploaded.url);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t.checkout.uploadFailed);
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handlePickProofPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError(t.checkout.receiptPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await uploadProof(asset.uri, asset.mimeType ?? "image/jpeg");
  };

  const handlePickProofDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await uploadProof(asset.uri, asset.mimeType ?? "application/pdf");
  };

  const handleSubscribe = async () => {
    if (!plan) return;
    // The storefront requires the receipt up front whenever there is an amount
    // left to transfer, so the admin has something to confirm against.
    if (!fullyCoveredByCredit && !proofUrl) {
      setFormError(t.membership.receiptRequired);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await subscribeToPlan({
        planId: plan.id,
        transferProofUrl: fullyCoveredByCredit ? null : proofUrl,
        creditApplied: creditApplied > 0 ? creditApplied : undefined,
      });
      queryClient.invalidateQueries({ queryKey: myMembershipQueryKey });
      if (creditApplied > 0) queryClient.invalidateQueries({ queryKey: myCreditsQueryKey });
      setIsDone(fullyCoveredByCredit ? "CREDIT" : "TRANSFER");
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : t.membership.subscribeFailed
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Screen style={styles.centered} />;
  }

  if (!plan) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="body">{t.membership.planUnavailable}</AppText>
      </Screen>
    );
  }

  if (isDone) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="caption" style={styles.successEyebrow}>
          {isDone === "CREDIT" ? t.membership.activeEyebrow : t.membership.pendingEyebrow}
        </AppText>
        <AppText variant="display" style={styles.successTitle}>
          {plan.name}
        </AppText>
        <AppText variant="body" style={styles.successBody}>
          {isDone === "CREDIT" ? t.membership.activeBody : t.membership.pendingBody}
        </AppText>
        <Button label={t.common.done} onPress={() => router.back()} style={styles.successButton} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="caption">{t.membership.subscribingTo}</AppText>
        <AppText variant="display" style={styles.planName}>
          {plan.name}
        </AppText>
        <AppText variant="body" style={styles.muted}>
          {fill(t.membership.pricePerInterval, {
            price: `${plan.currency} ${priceFormatter.format(plan.priceAmount)}`,
            interval: intervalLabel(plan.interval, t),
          })}
        </AppText>

        {creditBalance > 0 ? (
          <>
            <AppText variant="label" style={styles.sectionLabel}>
              {t.checkout.siteCredit}
            </AppText>
            <View style={styles.creditRow}>
              <View style={styles.creditText}>
                <AppText variant="body">{t.checkout.applyCredit}</AppText>
                <AppText variant="caption" style={styles.hint}>
                  {t.checkout.available} USD {priceFormatter.format(creditBalance)}
                </AppText>
              </View>
              <Switch
                value={useCredit}
                onValueChange={setUseCredit}
                trackColor={{ false: colors.borderLight, true: colors.gold }}
                thumbColor={colors.white}
              />
            </View>
          </>
        ) : null}

        {fullyCoveredByCredit ? null : (
          <>
            <AppText variant="label" style={styles.sectionLabel}>
              {t.checkout.receipt}
            </AppText>
            {proofUrl ? (
              <Button
                label={t.checkout.receiptUploaded}
                variant="outline"
                onPress={handlePickProofPhoto}
                style={styles.sectionButton}
              />
            ) : (
              <View style={styles.proofRow}>
                <Button
                  label={t.common.photo}
                  variant="outline"
                  onPress={handlePickProofPhoto}
                  loading={isUploadingProof}
                  style={styles.proofButton}
                />
                <Button
                  label={t.common.pdf}
                  variant="outline"
                  onPress={handlePickProofDocument}
                  loading={isUploadingProof}
                  style={styles.proofButton}
                />
              </View>
            )}
          </>
        )}

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <AppText variant="label">{t.membership.plan}</AppText>
            <AppText variant="body">
              {plan.currency} {priceFormatter.format(price)}
            </AppText>
          </View>
          {creditApplied > 0 ? (
            <View style={styles.summaryRow}>
              <AppText variant="label">{t.checkout.siteCredit}</AppText>
              <AppText variant="body">-USD {priceFormatter.format(creditApplied)}</AppText>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <AppText variant="bodyMedium">{t.membership.toTransfer}</AppText>
            <AppText variant="bodyMedium">USD {priceFormatter.format(amountToTransfer)}</AppText>
          </View>
        </View>

        {fullyCoveredByCredit ? (
          <AppText variant="caption" style={styles.hint}>
            {t.membership.creditCovers}
          </AppText>
        ) : null}

        {formError ? (
          <AppText variant="body" style={styles.errorText}>
            {formError}
          </AppText>
        ) : null}

        <Button
          label={fullyCoveredByCredit ? t.membership.confirmSubscription : t.membership.confirmTransfer}
          onPress={handleSubscribe}
          loading={isSubmitting}
          style={styles.submitButton}
        />
        <AppText variant="body" style={styles.footerNote}>
          {t.membership.renewNote}
        </AppText>
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  planName: {
    marginTop: spacing.xs,
  },
  muted: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  sectionLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionButton: {
    marginTop: spacing.xs,
  },
  hint: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    textTransform: "none",
  },
  creditRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  creditText: {
    flex: 1,
  },
  proofRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  proofButton: {
    flex: 1,
  },
  summary: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  errorText: {
    marginTop: spacing.md,
    color: colors.danger,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
  footerNote: {
    marginTop: spacing.md,
    textAlign: "center",
    color: colors.textMuted,
  },
  successEyebrow: {
    color: colors.gold,
  },
  successTitle: {
    marginTop: spacing.sm,
    textAlign: "center",
  },
  successBody: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    textAlign: "center",
    color: colors.textMuted,
  },
  successButton: {
    alignSelf: "stretch",
  },
});

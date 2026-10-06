import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ScrollView, Share, StyleSheet, View } from "react-native";

import { getReferralStats } from "@/api/users";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { env } from "@/lib/env";
import { useT } from "@/i18n";
import { colors, spacing } from "@/theme";

const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function ReferralScreen() {
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["referral-stats"],
    queryFn: getReferralStats,
    enabled: !!user,
  });

  if (!user) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="display" style={styles.centeredTitle}>
          {t.referral.signInTitle}
        </AppText>
        <AppText variant="body" style={styles.centeredText}>
          {t.referral.signInPrompt}
        </AppText>
        <Button label={t.common.signIn} onPress={() => router.push("/(auth)/login")} style={styles.centeredButton} />
      </Screen>
    );
  }

  // The referral "code" is the user id itself — the same link the storefront's
  // refer-a-seller page builds, so /vende?ref= captures it the same way.
  const referralCode = stats?.referralCode ?? user.id;
  const referralLink = `${env.siteUrl}/vende?ref=${referralCode}`;

  // expo-sharing only takes local file URIs, so a link/text share goes through
  // React Native's own Share sheet instead.
  const handleShare = () =>
    Share.share({ message: `${t.referral.shareMessage}\n${referralLink}`, url: referralLink });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="caption">{t.referral.eyebrow}</AppText>
        <AppText variant="display" style={styles.title}>
          {t.referral.title}
        </AppText>
        <AppText variant="body" style={styles.subtitle}>
          {t.referral.intro}
        </AppText>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <AppText variant="caption">{t.referral.sellersReferred}</AppText>
            <AppText variant="display" style={styles.statValue}>
              {isLoading ? "—" : (stats?.referredCount ?? 0)}
            </AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="caption">{t.referral.creditEarned}</AppText>
            <AppText variant="display" style={styles.statValue}>
              {isLoading ? "—" : `$${priceFormatter.format(stats?.totalEarned ?? 0)}`}
            </AppText>
          </View>
        </View>

        <AppText variant="label" style={styles.linkLabel}>
          {t.referral.yourLink}
        </AppText>
        <View style={styles.linkBox}>
          <AppText variant="body" selectable style={styles.link}>
            {referralLink}
          </AppText>
        </View>

        <Button label={t.referral.share} onPress={handleShare} style={styles.shareButton} />
        <AppText variant="body" style={styles.footnote}>
          {t.referral.footnote}
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
  centeredTitle: {
    textAlign: "center",
  },
  centeredText: {
    marginTop: spacing.sm,
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
  title: {
    marginTop: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.md,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  statValue: {
    marginTop: spacing.xs,
    fontSize: 24,
  },
  linkLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  linkBox: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  link: {
    color: colors.gold,
  },
  shareButton: {
    marginTop: spacing.lg,
  },
  footnote: {
    marginTop: spacing.md,
    textAlign: "center",
    color: colors.textMuted,
  },
});

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ScrollView, Share, StyleSheet, View } from "react-native";

import { getReferralStats } from "@/api/users";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { env } from "@/lib/env";
import { colors, spacing } from "@/theme";

const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const SHARE_MESSAGE =
  "Consign your pieces with Maison Privée Atelier. We both get $125 in site credit once your first consignment is paid out.";

export function ReferralScreen() {
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
          Refer a Seller
        </AppText>
        <AppText variant="body" style={styles.centeredText}>
          Sign in to get your personal referral link.
        </AppText>
        <Button label="Sign In" onPress={() => router.push("/(auth)/login")} style={styles.centeredButton} />
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
    Share.share({ message: `${SHARE_MESSAGE}\n${referralLink}`, url: referralLink });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="caption">Real Friends</AppText>
        <AppText variant="display" style={styles.title}>
          Earn $125 For You & $125 For Them
        </AppText>
        <AppText variant="body" style={styles.subtitle}>
          Share your invitation with a friend. Once they complete their first paid consignment with
          Maison Privée Atelier, you both receive $125 in site credit.
        </AppText>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <AppText variant="caption">Sellers Referred</AppText>
            <AppText variant="display" style={styles.statValue}>
              {isLoading ? "—" : (stats?.referredCount ?? 0)}
            </AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="caption">Credit Earned</AppText>
            <AppText variant="display" style={styles.statValue}>
              {isLoading ? "—" : `$${priceFormatter.format(stats?.totalEarned ?? 0)}`}
            </AppText>
          </View>
        </View>

        <AppText variant="label" style={styles.linkLabel}>
          Your Invitation Link
        </AppText>
        <View style={styles.linkBox}>
          <AppText variant="body" selectable style={styles.link}>
            {referralLink}
          </AppText>
        </View>

        <Button label="Share Invitation" onPress={handleShare} style={styles.shareButton} />
        <AppText variant="body" style={styles.footnote}>
          Credit is issued once your friend&apos;s first consignment is paid out.
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

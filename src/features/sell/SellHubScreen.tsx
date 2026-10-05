import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { getReceivedOffers } from "@/api/offers";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { colors, spacing } from "@/theme";

function NavRow({
  label,
  description,
  badge,
  onPress,
}: {
  label: string;
  description: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowText}>
        <View style={styles.rowLabelLine}>
          <AppText variant="label">{label}</AppText>
          {badge ? (
            <View style={styles.badge}>
              <AppText variant="caption" style={styles.badgeText}>
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="body" style={styles.rowDescription}>
          {description}
        </AppText>
      </View>
      <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.5} />
    </Pressable>
  );
}

export function SellHubScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Shares its cache with the offers screen, so opening that list is instant.
  const { data: offers } = useQuery({
    queryKey: ["offers", "received"],
    queryFn: getReceivedOffers,
    enabled: !!user,
  });
  const pendingOffers = offers?.filter((offer) => offer.status === "PENDING").length ?? 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="caption">Maison Privée Atelier</AppText>
        <AppText variant="display" style={styles.title}>
          Sell With Us
        </AppText>
        <AppText variant="body" style={styles.subtitle}>
          Consign your pieces or request instant liquidity. Every submission is reviewed discreetly by
          our team.
        </AppText>

        <Button
          label="Submit a Piece"
          onPress={() => router.push("/consign/new")}
          style={styles.submitButton}
        />

        <View style={styles.rows}>
          <NavRow
            label="My Submissions"
            description="Status of the pieces you sent for review."
            onPress={() => router.push("/consignments")}
          />
          <NavRow
            label="Offers Received"
            description="Private offers on the pieces you consigned."
            badge={pendingOffers > 0 ? String(pendingOffers) : undefined}
            onPress={() => router.push("/offers")}
          />
          <NavRow
            label="Refer a Seller"
            description="$125 in credit for you and for them."
            onPress={() => router.push("/refer")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    marginTop: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.md,
    color: colors.textMuted,
  },
  submitButton: {
    marginTop: spacing.xl,
  },
  rows: {
    marginTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowText: {
    flex: 1,
  },
  rowLabelLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  badge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.gold,
    alignItems: "center",
  },
  badgeText: {
    color: colors.white,
  },
  rowDescription: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
});

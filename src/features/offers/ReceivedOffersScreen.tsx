import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";

import { getReceivedOffers, respondToOffer } from "@/api/offers";
import type { OfferStatus, ReceivedOffer } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { colors, spacing } from "@/theme";

const TABS: { value: OfferStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
];

const formatMoney = (amount: number, currency: string) =>
  `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function OfferCard({
  offer,
  isBusy,
  onRespond,
  onPressProduct,
}: {
  offer: ReceivedOffer;
  isBusy: boolean;
  onRespond: (action: "ACCEPT" | "REJECT") => void;
  onPressProduct: () => void;
}) {
  const difference = offer.amount - offer.product.priceAmount;

  return (
    <View style={styles.card}>
      <Pressable style={styles.cardTop} onPress={onPressProduct}>
        <Image
          source={{ uri: offer.product.images[0]?.url }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={150}
        />
        <View style={styles.cardHeading}>
          <AppText variant="caption" numberOfLines={1}>
            {offer.product.brand.name}
          </AppText>
          <AppText variant="displayItalic" numberOfLines={2} style={styles.productTitle}>
            {offer.product.title}
          </AppText>
          <AppText variant="caption" style={styles.currentPrice}>
            Current price {formatMoney(offer.product.priceAmount, offer.product.currency)}
          </AppText>
        </View>
      </Pressable>

      <View style={styles.offerRow}>
        <View>
          <AppText variant="caption">Offer</AppText>
          <AppText variant="bodyMedium" style={styles.offerAmount}>
            {formatMoney(offer.amount, offer.product.currency)}
          </AppText>
          {difference !== 0 ? (
            <AppText variant="caption" style={styles.offerDelta}>
              {difference > 0 ? "+" : "-"}
              {formatMoney(Math.abs(difference), offer.product.currency)} vs. current
            </AppText>
          ) : null}
        </View>
        <View style={styles.offerMeta}>
          <AppText variant="caption">From</AppText>
          <AppText variant="body" numberOfLines={1}>
            {offer.user.name ?? offer.user.email}
          </AppText>
          <AppText variant="caption" style={styles.offerDate}>
            {new Date(offer.respondedAt ?? offer.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </AppText>
        </View>
      </View>

      {offer.status === "PENDING" ? (
        <View style={styles.actions}>
          <Button
            label="Reject"
            variant="outline"
            onPress={() => onRespond("REJECT")}
            disabled={isBusy}
            style={styles.actionButton}
          />
          <Button
            label="Accept"
            onPress={() => onRespond("ACCEPT")}
            loading={isBusy}
            style={styles.actionButton}
          />
        </View>
      ) : null}
    </View>
  );
}

export function ReceivedOffersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<OfferStatus>("PENDING");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["offers", "received"],
    queryFn: getReceivedOffers,
    enabled: !!user,
  });

  const offers = data ?? [];
  const counts: Record<OfferStatus, number> = {
    PENDING: offers.filter((offer) => offer.status === "PENDING").length,
    ACCEPTED: offers.filter((offer) => offer.status === "ACCEPTED").length,
    REJECTED: offers.filter((offer) => offer.status === "REJECTED").length,
  };
  const visible = offers.filter((offer) => offer.status === tab);

  const sendResponse = async (id: string, action: "ACCEPT" | "REJECT") => {
    setBusyId(id);
    try {
      await respondToOffer(id, action);
      // Accepting reprices the piece and rejects the rest server-side, so the
      // product cache is stale too — not just the offers list.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["offers", "received"] }),
        queryClient.invalidateQueries({ queryKey: ["product"] }),
      ]);
    } catch (error) {
      Alert.alert(
        "Offer not updated",
        error instanceof ApiError ? error.message : "Couldn't process the offer."
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRespond = (offer: ReceivedOffer, action: "ACCEPT" | "REJECT") => {
    if (action === "REJECT") {
      sendResponse(offer.id, "REJECT");
      return;
    }
    Alert.alert(
      "Accept this offer?",
      "The piece price will update to the offered amount and every other pending offer on it will be rejected.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Accept", onPress: () => sendResponse(offer.id, "ACCEPT") },
      ]
    );
  };

  if (!user) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="body" style={styles.centeredText}>
          Sign in to see offers on your pieces.
        </AppText>
        <Button label="Sign In" onPress={() => router.push("/(auth)/login")} style={styles.centeredButton} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="body" style={styles.centeredText}>
          Couldn&apos;t load your offers.
        </AppText>
        <Button label="Try Again" variant="outline" onPress={() => refetch()} style={styles.centeredButton} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.tabs}>
        {TABS.map((item) => {
          const isActive = item.value === tab;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => setTab(item.value)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <AppText variant="caption" style={isActive ? styles.tabLabelActive : undefined}>
                {item.label} ({counts[item.value]})
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(offer) => offer.id}
        contentContainerStyle={styles.listContent}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={
          <AppText variant="body" style={styles.intro}>
            Offers received on the pieces you consigned. Accepting one updates the piece price to the
            offered amount.
          </AppText>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <AppText variant="body" style={styles.centeredText}>
                No {TABS.find((item) => item.value === tab)?.label.toLowerCase()} offers.
              </AppText>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <OfferCard
            offer={item}
            isBusy={busyId === item.id}
            onRespond={(action) => handleRespond(item, action)}
            onPressProduct={() => router.push(`/product/${item.product.id}`)}
          />
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
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabLabelActive: {
    color: colors.primary,
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
  },
  card: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: "row",
    gap: spacing.md,
  },
  thumbnail: {
    width: 64,
    height: 80,
    backgroundColor: colors.secondary,
  },
  cardHeading: {
    flex: 1,
  },
  productTitle: {
    marginTop: 2,
    fontSize: 16,
  },
  currentPrice: {
    marginTop: spacing.xs,
    textTransform: "none",
  },
  offerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  offerAmount: {
    marginTop: 2,
    color: colors.gold,
  },
  offerDelta: {
    marginTop: 2,
    textTransform: "none",
  },
  offerMeta: {
    flex: 1,
    alignItems: "flex-end",
  },
  offerDate: {
    marginTop: 2,
    textTransform: "none",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});

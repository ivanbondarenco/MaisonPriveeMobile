import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Heart, Lock, ShieldCheck, Truck, X } from "lucide-react-native";
import { useState } from "react";
import { Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { submitOffer } from "@/api/offers";
import { getProduct } from "@/api/products";
import { addToWishlist, getWishlist, removeFromWishlist } from "@/api/wishlist";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ApiError } from "@/lib/apiClient";
import { colors, spacing } from "@/theme";

const { width } = Dimensions.get("window");

const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Condition tier -> position on a 3-step luxury grading scale (mirrors the storefront).
const CONDITION_LEVEL: Record<string, number> = {
  VERY_GOOD: 1,
  EXCELLENT: 2,
  PRISTINE: 3,
};

const CONDITION_LABEL: Record<string, string> = {
  VERY_GOOD: "Very Good",
  EXCELLENT: "Excellent",
  PRISTINE: "Pristine",
};

const SHIPPING_RETURNS_TEXT =
  "Both domestic shipments within Argentina and international shipments are handled via DHL. All sales are final due to the archive nature of each piece.";

// Mirrors the storefront's "Trust row" (ProductDetailView.tsx) exactly: same
// three icons and labels.
const TRUST_ITEMS = [
  { Icon: ShieldCheck, label: "Expertly Authenticated" },
  { Icon: Truck, label: "Insured Worldwide Shipping" },
  { Icon: Lock, label: "Secure Checkout" },
] as const;

export function ProductDetailScreen({ productId }: { productId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { addItem } = useCart();
  const queryClient = useQueryClient();
  const [activeImage, setActiveImage] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSending, setOfferSending] = useState(false);
  const [offerSent, setOfferSent] = useState(false);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProduct(productId),
  });

  const { data: wishlist } = useQuery({
    queryKey: ["wishlist"],
    queryFn: getWishlist,
    enabled: !!user,
  });
  const isWishlisted = !!wishlist?.some((p) => p.id === productId);

  const handleToggleWishlist = async () => {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    queryClient.setQueryData<typeof wishlist>(["wishlist"], (current) => {
      if (!product) return current;
      if (isWishlisted) return current?.filter((p) => p.id !== productId);
      return [...(current ?? []), product];
    });
    try {
      if (isWishlisted) await removeFromWishlist(productId);
      else await addToWishlist(productId);
    } catch {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleOpenOffer = () => {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    setOfferPrice("");
    setOfferError(null);
    setOfferSent(false);
    setShowOfferModal(true);
  };

  const handleSubmitOffer = async () => {
    const value = Number(offerPrice);
    if (!offerPrice || Number.isNaN(value) || value <= 0) {
      setOfferError("Enter a valid offer amount.");
      return;
    }
    setOfferError(null);
    setOfferSending(true);
    try {
      await submitOffer(productId, value);
      setOfferSent(true);
    } catch (error) {
      setOfferError(error instanceof ApiError ? error.message : "Couldn't send your offer.");
    } finally {
      setOfferSending(false);
    }
  };

  if (isLoading) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="body">Loading...</AppText>
      </Screen>
    );
  }

  if (isError || !product) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="body">Couldn't load this product.</AppText>
      </Screen>
    );
  }

  // Mirrors the storefront: the shared order-creation route doesn't always
  // flip isSoldOut when stock hits 0 for older data, so fall back to stock too.
  const isSoldOut = product.isSoldOut || product.stock <= 0;

  const details = [
    product.condition && { label: "Condition", value: product.condition },
    product.size && { label: "Size", value: product.size },
    product.color && { label: "Color", value: product.color },
    product.categoryName && { label: "Category", value: product.categoryName },
  ].filter(Boolean) as { label: string; value: string }[];

  const conditionLevel = product.condition ? CONDITION_LEVEL[product.condition] ?? 0 : 0;
  const conditionName = product.condition ? CONDITION_LABEL[product.condition] ?? product.condition : "";

  const measurementLines = [
    (product.width || product.height) &&
      `Width/Height: ${[
        product.width ? `W ${product.width}cm` : null,
        product.height ? `H ${product.height}cm` : null,
      ]
        .filter(Boolean)
        .join(", ")}`,
    product.weight && `Weight: ${product.weight}kg`,
  ].filter(Boolean) as string[];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={{ uri: product.images[activeImage]?.url }}
          style={styles.heroImage}
          contentFit="cover"
        />

        {product.images.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
            {product.images.map((image, index) => (
              <Image
                key={image.url + index}
                source={{ uri: image.url }}
                onTouchEnd={() => setActiveImage(index)}
                style={[styles.thumb, index === activeImage && styles.thumbActive]}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.body}>
          {(product.isReserved || product.isNew || isSoldOut) && (
            <AppText variant="caption" style={styles.status}>
              {isSoldOut ? "Sold Out" : product.isReserved ? "Reserved" : "New In"}
            </AppText>
          )}

          <View style={styles.titleRow}>
            <View style={styles.titleColumn}>
              <AppText variant="caption">{product.brandName}</AppText>
              <AppText variant="displayItalic" style={styles.title}>
                {product.title}
              </AppText>
            </View>
            <Pressable
              style={styles.wishlistButton}
              onPress={handleToggleWishlist}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                size={22}
                color={colors.primary}
                fill={isWishlisted ? colors.primary : "transparent"}
                strokeWidth={1.5}
              />
            </Pressable>
          </View>
          <AppText variant="bodyMedium" style={styles.price}>
            {product.currency} {priceFormatter.format(product.priceAmount)}
          </AppText>

          {!isSoldOut ? (
            <Button
              label={justAdded ? "Added" : "Add to Cart"}
              onPress={handleAddToCart}
              style={styles.addToCartButton}
            />
          ) : null}

          {!isSoldOut && product.acceptOffers ? (
            <Button
              label="Make an Offer"
              variant="outline"
              onPress={handleOpenOffer}
              style={styles.offerButton}
            />
          ) : null}

          {conditionLevel > 0 && (
            <View style={styles.conditionRow}>
              <AppText variant="caption" style={styles.conditionLabel}>
                Condition
              </AppText>
              <View style={styles.conditionMeta}>
                <AppText variant="body">{conditionName}</AppText>
                <View style={styles.conditionBars}>
                  {[1, 2, 3].map((n) => (
                    <View
                      key={n}
                      style={[styles.conditionBar, n <= conditionLevel && styles.conditionBarFilled]}
                    />
                  ))}
                </View>
              </View>
            </View>
          )}

          {details.length > 0 && (
            <View style={styles.detailsGrid}>
              {details.map((detail) => (
                <View key={detail.label} style={styles.detailItem}>
                  <AppText variant="caption">{detail.label}</AppText>
                  <AppText variant="body">{detail.value}</AppText>
                </View>
              ))}
            </View>
          )}

          {product.description ? (
            <View style={styles.descriptionWrapper}>
              <AppText variant="label" style={styles.descriptionLabel}>
                Description
              </AppText>
              <AppText variant="body" style={styles.description}>
                {product.description}
              </AppText>
            </View>
          ) : null}

          {measurementLines.length > 0 && (
            <View style={styles.accordionSection}>
              <AppText variant="label" style={styles.descriptionLabel}>
                Details & Measurements
              </AppText>
              {measurementLines.map((line) => (
                <AppText key={line} variant="body" style={styles.accordionLine}>
                  {line}
                </AppText>
              ))}
            </View>
          )}

          <View style={styles.accordionSection}>
            <AppText variant="label" style={styles.descriptionLabel}>
              Shipping & Returns
            </AppText>
            <AppText variant="body" style={styles.description}>
              {SHIPPING_RETURNS_TEXT}
            </AppText>
          </View>

          <View style={styles.trustRow}>
            {TRUST_ITEMS.map(({ Icon, label }) => (
              <View key={label} style={styles.trustItem}>
                <Icon size={20} color={colors.textMuted} strokeWidth={1.25} />
                <AppText variant="caption" style={styles.trustLabel}>
                  {label}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showOfferModal} transparent animationType="fade" onRequestClose={() => setShowOfferModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <Pressable
              style={styles.modalClose}
              onPress={() => setShowOfferModal(false)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={18} color={colors.textMuted} strokeWidth={1.5} />
            </Pressable>

            {offerSent ? (
              <View style={styles.modalBody}>
                <AppText variant="caption" style={styles.modalBadge}>
                  Offer Sent
                </AppText>
                <AppText variant="displayItalic" style={styles.modalTitle}>
                  Thank You
                </AppText>
                <AppText variant="body" style={styles.modalText}>
                  The consignor has been notified of your offer and will respond soon.
                </AppText>
                <Button label="Close" onPress={() => setShowOfferModal(false)} style={styles.modalButton} />
              </View>
            ) : (
              <View style={styles.modalBody}>
                <AppText variant="caption" style={styles.modalBadge}>
                  Maison Privée Atelier
                </AppText>
                <AppText variant="displayItalic" style={styles.modalTitle}>
                  Make an Offer
                </AppText>
                <TextField
                  label={`Your Offer (${product.currency})`}
                  value={offerPrice}
                  onChangeText={setOfferPrice}
                  keyboardType="numeric"
                  placeholder="0"
                  error={offerError ?? undefined}
                  autoFocus
                />
                <Button
                  label={offerSending ? "Sending..." : "Send Offer"}
                  onPress={handleSubmitOffer}
                  loading={offerSending}
                  style={styles.modalButton}
                />
                <AppText variant="caption" style={styles.modalHint}>
                  Your offer will be sent privately to the consignor.
                </AppText>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  heroImage: {
    width,
    aspectRatio: 4 / 5,
    backgroundColor: colors.secondary,
  },
  thumbRow: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  thumb: {
    width: 56,
    height: 70,
    marginRight: spacing.sm,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: "transparent",
  },
  thumbActive: {
    borderColor: colors.primary,
  },
  body: {
    padding: spacing.md,
  },
  status: {
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleColumn: {
    flex: 1,
  },
  wishlistButton: {
    padding: spacing.xs,
  },
  title: {
    marginTop: spacing.xs,
    fontSize: 24,
  },
  price: {
    marginTop: spacing.sm,
  },
  addToCartButton: {
    marginTop: spacing.md,
  },
  offerButton: {
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(26, 26, 26, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalClose: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  modalBadge: {
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 22,
    marginBottom: spacing.md,
  },
  modalText: {
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  modalButton: {
    marginTop: spacing.sm,
  },
  modalHint: {
    marginTop: spacing.sm,
    textAlign: "center",
    textTransform: "none",
  },
  conditionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  conditionLabel: {
    textTransform: "uppercase",
  },
  conditionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  conditionBars: {
    flexDirection: "row",
    gap: 4,
  },
  conditionBar: {
    width: 24,
    height: 6,
    backgroundColor: colors.borderLight,
  },
  conditionBarFilled: {
    backgroundColor: colors.gold,
  },
  accordionSection: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  accordionLine: {
    marginTop: spacing.xs,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  detailItem: {
    minWidth: "40%",
  },
  descriptionWrapper: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  descriptionLabel: {
    marginBottom: spacing.sm,
  },
  description: {
    lineHeight: 22,
  },
  trustRow: {
    flexDirection: "row",
    marginTop: spacing.xl,
    paddingTop: spacing.md,
  },
  trustItem: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  trustLabel: {
    textAlign: "center",
    lineHeight: 14,
  },
});

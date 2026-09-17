import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import type { Product } from "@/api/types";
import { colors, spacing } from "@/theme";
import { AppText } from "./AppText";

const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const badge = product.isReserved ? "Reserved" : product.isNew ? "New In" : null;
  // Mirrors the storefront's ProductCard: the shared order-creation route
  // doesn't always flip isSoldOut when stock hits 0 for older data, so fall
  // back to the raw stock count too.
  const isSoldOut = product.isSoldOut || product.stock <= 0;

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: product.images[0]?.url }}
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
        {badge ? (
          <View style={styles.badge}>
            <AppText variant="caption" style={styles.badgeText}>
              {badge}
            </AppText>
          </View>
        ) : null}
        {isSoldOut ? (
          <View style={styles.soldOutOverlay}>
            <AppText variant="label" style={styles.soldOutText}>
              Sold Out
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <AppText variant="caption" numberOfLines={1}>
          {product.brandName}
        </AppText>
        <AppText variant="displayItalic" numberOfLines={1} style={styles.title}>
          {product.title}
        </AppText>
        <AppText variant="bodyMedium" style={styles.price}>
          {product.currency} {priceFormatter.format(product.priceAmount)}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageWrapper: {
    aspectRatio: 4 / 5,
    backgroundColor: colors.secondary,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.gold,
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(249, 248, 246, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  soldOutText: {
    color: colors.primary,
  },
  info: {
    paddingTop: spacing.sm,
    alignItems: "center",
  },
  title: {
    marginTop: 2,
    fontSize: 16,
    textAlign: "center",
  },
  price: {
    marginTop: spacing.xs,
  },
});

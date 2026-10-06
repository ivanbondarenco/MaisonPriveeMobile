import { Image, type ImageSource } from "expo-image";
import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";

import type { Brand, Product } from "@/api/types";
import { AppText } from "@/components/AppText";
import { ProductCard } from "@/components/ProductCard";
import { colors, fontFamily, letterSpacing, spacing } from "@/theme";

// Building blocks of the Home, modelled on TheRealReal's app: full-bleed promo
// banners, editorial cards and horizontal product rails, in the storefront's
// own palette and type (sharp corners, Bodoni headings, tracked uppercase labels).

/** Uppercase, tracked call to action with a thin underline ("SHOP NOW"). */
export function TextLink({ label, onPress, light }: { label: string; onPress: () => void; light?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8} style={styles.textLink}>
      <AppText style={[styles.textLinkLabel, light && styles.lightText]}>{label}</AppText>
      <View style={[styles.textLinkLine, light && styles.textLinkLineLight]} />
    </Pressable>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.sectionTitleRow}>
      <AppText style={styles.sectionTitle}>{title}</AppText>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="link" style={styles.seeAll}>
          <AppText style={styles.seeAllLabel}>{action.label}</AppText>
          <ChevronRight size={14} color={colors.primary} strokeWidth={1.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Solid charcoal banner — the "Sell & Earn" slot at the top of TheRealReal's home. */
export function PromoBanner(props: {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  footnote: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.promo}>
      <AppText style={styles.promoEyebrow}>{props.eyebrow}</AppText>
      <AppText style={styles.promoTitle}>{props.title}</AppText>
      <AppText style={styles.promoBody}>{props.body}</AppText>
      <Pressable onPress={props.onPress} accessibilityRole="button" style={styles.promoButton}>
        <AppText style={styles.promoButtonLabel}>{props.cta}</AppText>
      </Pressable>
      <AppText style={styles.promoFootnote}>{props.footnote}</AppText>
    </View>
  );
}

/** Image on top, serif headline, short copy and a text link ("No Waitlist" card). */
export function EditorialCard(props: {
  image: ImageSource;
  aspectRatio?: number;
  eyebrow?: string;
  title: string;
  body: string;
  cta?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.editorial}>
      <Image
        source={props.image}
        style={[styles.editorialImage, { aspectRatio: props.aspectRatio ?? 4 / 3 }]}
        contentFit="cover"
        transition={200}
      />
      {props.eyebrow ? <AppText style={styles.eyebrow}>{props.eyebrow}</AppText> : null}
      <AppText style={styles.editorialTitle}>{props.title}</AppText>
      <AppText style={styles.editorialBody}>{props.body}</AppText>
      {props.cta ? <TextLink label={props.cta.label} onPress={props.cta.onPress} /> : null}
    </View>
  );
}

/** Tall photo with the copy laid over a dark scrim (membership "First Look"). */
export function ImageBanner(props: {
  image: ImageSource;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={props.onPress} accessibilityRole="button" style={styles.imageBanner}>
      <Image source={props.image} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
      <View style={styles.scrim} />
      <View style={styles.imageBannerCopy}>
        <AppText style={[styles.eyebrow, styles.lightText]}>{props.eyebrow}</AppText>
        <AppText style={[styles.editorialTitle, styles.lightText]}>{props.title}</AppText>
        <AppText style={[styles.editorialBody, styles.lightText]}>{props.body}</AppText>
        <View style={styles.outlineButton}>
          <AppText style={[styles.promoButtonLabel, styles.lightText]}>{props.cta}</AppText>
        </View>
      </View>
    </Pressable>
  );
}

const RAIL_CARD_WIDTH = 156;

export function ProductRail({
  products,
  loading,
  onPressProduct,
}: {
  products: Product[];
  loading: boolean;
  onPressProduct: (product: Product) => void;
}) {
  if (loading) {
    return (
      <View style={styles.railPlaceholderRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.railPlaceholder} />
        ))}
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={products}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.railContent}
      renderItem={({ item }) => (
        <View style={styles.railCard}>
          <ProductCard product={item} onPress={() => onPressProduct(item)} />
        </View>
      )}
    />
  );
}

export type CategoryTile = { id: string; label: string; imageUrl: string | null };

export function CategoryGrid({ tiles, onPress }: { tiles: CategoryTile[]; onPress: (id: string) => void }) {
  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <Pressable key={tile.id} style={styles.gridItem} onPress={() => onPress(tile.id)} accessibilityRole="link">
          <View style={styles.gridImageWrapper}>
            {tile.imageUrl ? (
              <Image source={{ uri: tile.imageUrl }} style={styles.gridImage} contentFit="cover" transition={150} />
            ) : null}
          </View>
          <AppText style={styles.gridLabel} numberOfLines={1}>
            {tile.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

export function DesignerList({ brands, onPress }: { brands: Brand[]; onPress: (brand: Brand) => void }) {
  return (
    <View style={styles.designers}>
      {brands.map((brand) => (
        <Pressable key={brand.id} style={styles.designerRow} onPress={() => onPress(brand)} accessibilityRole="link">
          <AppText style={styles.designerName}>{brand.name}</AppText>
          <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.5} />
        </Pressable>
      ))}
    </View>
  );
}

export type OfferCard = { key: string; badge: string; title: string; body: string; cta: string; onPress: () => void };

/** Black cards, like TheRealReal's "Your Exclusive Offers" drawer. */
export function OffersRow({ offers }: { offers: OfferCard[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offersContent}>
      {offers.map((offer) => (
        <Pressable key={offer.key} style={styles.offerCard} onPress={offer.onPress} accessibilityRole="button">
          <AppText style={styles.offerBadge}>{offer.badge}</AppText>
          <AppText style={styles.offerTitle}>{offer.title}</AppText>
          <AppText style={styles.offerBody}>{offer.body}</AppText>
          <TextLink label={offer.cta} onPress={offer.onPress} light />
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Section({ children, spaced = true }: { children: ReactNode; spaced?: boolean }) {
  return <View style={spaced ? styles.section : undefined}>{children}</View>;
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xxl,
  },
  lightText: {
    color: colors.white,
  },
  eyebrow: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 11,
    letterSpacing: letterSpacing.labelWide,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  textLink: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
  },
  textLinkLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: letterSpacing.labelWide,
    textTransform: "uppercase",
    color: colors.primary,
  },
  textLinkLine: {
    height: 1,
    marginTop: 4,
    backgroundColor: colors.primary,
  },
  textLinkLineLight: {
    backgroundColor: colors.white,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamily.displayRegular,
    fontSize: 28,
    color: colors.primary,
    flexShrink: 1,
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: letterSpacing.label,
    textTransform: "uppercase",
    color: colors.primary,
  },
  promo: {
    backgroundColor: colors.primary,
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  promoEyebrow: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 12,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: colors.gold,
    textAlign: "center",
  },
  promoTitle: {
    fontFamily: fontFamily.displayRegular,
    fontSize: 40,
    lineHeight: 46,
    color: colors.white,
    textAlign: "center",
    marginTop: spacing.md,
  },
  promoBody: {
    fontFamily: fontFamily.bodyLight,
    fontSize: 15,
    color: colors.white,
    textAlign: "center",
    marginTop: spacing.sm,
    opacity: 0.85,
  },
  promoButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    minWidth: 200,
    alignItems: "center",
  },
  promoButtonLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: colors.primary,
  },
  promoFootnote: {
    fontFamily: fontFamily.bodyLight,
    fontSize: 10,
    color: colors.white,
    opacity: 0.6,
    marginTop: spacing.md,
  },
  editorial: {
    paddingHorizontal: spacing.md,
  },
  editorialImage: {
    width: "100%",
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.lg,
  },
  editorialTitle: {
    fontFamily: fontFamily.displayRegular,
    fontSize: 32,
    lineHeight: 38,
    color: colors.primary,
  },
  editorialBody: {
    fontFamily: fontFamily.bodyLight,
    fontSize: 16,
    lineHeight: 24,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  imageBanner: {
    marginHorizontal: spacing.md,
    height: 520,
    justifyContent: "flex-end",
    overflow: "hidden",
    backgroundColor: colors.primary,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(26, 26, 26, 0.35)",
  },
  imageBannerCopy: {
    padding: spacing.lg,
  },
  outlineButton: {
    alignSelf: "flex-start",
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.white,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
  },
  railContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  railCard: {
    width: RAIL_CARD_WIDTH,
  },
  railPlaceholderRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  railPlaceholder: {
    width: RAIL_CARD_WIDTH,
    aspectRatio: 4 / 5,
    backgroundColor: colors.surfaceMuted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  // Fixed half width (no flexGrow) so an odd last tile keeps its size instead of
  // stretching across the row.
  gridItem: {
    width: "47.5%",
  },
  gridImageWrapper: {
    aspectRatio: 1,
    backgroundColor: colors.surfaceMuted,
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: letterSpacing.label,
    textTransform: "uppercase",
    color: colors.primary,
    marginTop: spacing.sm,
  },
  designers: {
    marginHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  designerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  designerName: {
    fontFamily: fontFamily.displayRegular,
    fontSize: 18,
    color: colors.primary,
  },
  offersContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  offerCard: {
    width: 280,
    backgroundColor: colors.primary,
    padding: spacing.lg,
  },
  offerBadge: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 11,
    letterSpacing: letterSpacing.labelWide,
    textTransform: "uppercase",
    color: colors.gold,
  },
  offerTitle: {
    fontFamily: fontFamily.displayRegular,
    fontSize: 24,
    lineHeight: 30,
    color: colors.white,
    marginTop: spacing.sm,
  },
  offerBody: {
    fontFamily: fontFamily.bodyLight,
    fontSize: 14,
    lineHeight: 20,
    color: colors.white,
    opacity: 0.85,
    marginTop: spacing.xs,
  },
});

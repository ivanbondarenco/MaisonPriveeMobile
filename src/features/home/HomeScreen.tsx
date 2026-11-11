import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { getBrands, getProducts } from "@/api/products";
import { AppHeader } from "@/components/AppHeader";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useDepartments } from "@/features/catalog/useDepartments";
import { useI18n } from "@/i18n";
import { filterByCategory, isAvailable, sectionOf, visibleSections } from "@/lib/sections";
import { colors, fontFamily, spacing } from "@/theme";
import {
  CategoryGrid,
  type CategoryTile,
  DesignerList,
  EditorialCard,
  ImageBanner,
  ProductRail,
  PromoBanner,
  Section,
  SectionTitle,
} from "./HomeSections";
import { HomeFooter } from "./HomeFooter";

const NEW_ARRIVALS_LIMIT = 10;
const CATEGORY_TILES_LIMIT = 6;
const DESIGNERS_LIMIT = 8;

export function HomeScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  // The Home spans the whole catalogue; picking a section (Women/Men) is the Shop's job.
  const { tree, refetch: refetchCategories } = useDepartments();

  // Same list the Shop tab starts from; the backend returns it newest first.
  const products = useQuery({ queryKey: ["products", "home"], queryFn: () => getProducts() });
  const brands = useQuery({ queryKey: ["brands"], queryFn: getBrands });

  const newArrivals = useMemo(
    () => (products.data ?? []).filter(isAvailable).slice(0, NEW_ARRIVALS_LIMIT),
    [products.data]
  );

  // With a single live section the sections themselves would be one lonely tile,
  // so its categories are shown instead. Each tile borrows the photo of the
  // newest piece in it, and empty ones are skipped.
  const categoryTiles = useMemo<CategoryTile[]>(() => {
    const sections = visibleSections(tree);
    const nodes = sections.length === 1 ? sections[0].children ?? [] : sections;
    const sectionNames = t.home.sectionNames as Record<string, string>;
    return nodes
      .map((node) => {
        const items = filterByCategory(products.data ?? [], node.id);
        const cover = items.find(isAvailable) ?? items[0];
        return {
          id: node.id,
          label: node.translations?.[locale] || sectionNames[node.name.toLowerCase()] || node.name,
          imageUrl: cover?.images[0]?.url ?? null,
          count: items.length,
        };
      })
      .filter((tile) => tile.count > 0)
      .slice(0, CATEGORY_TILES_LIMIT);
  }, [tree, products.data, t, locale]);

  const topDesigners = useMemo(() => {
    const all = brands.data ?? [];
    const top = all.filter((b) => b.tier === "TOP");
    return (top.length ? top : all).slice(0, DESIGNERS_LIMIT);
  }, [brands.data]);

  // A category opens the Shop on its section tab, with that category's chip selected.
  const openShop = (params: { category?: string; brand?: string } = {}) => {
    const section = params.category ? sectionOf(tree, params.category) : null;
    router.navigate({
      pathname: "/shop",
      params: {
        section: section ?? "",
        category: params.category && params.category !== section ? params.category : "",
        brand: params.brand ?? "",
      },
    });
  };

  // The footer's "Shop" column: the live sections (Women, Men, …), like the
  // storefront's Men / Women links, each opening the Shop on that tab.
  const footerSections = useMemo(() => {
    const sectionNames = t.home.sectionNames as Record<string, string>;
    return visibleSections(tree).map((node) => ({
      label: node.translations?.[locale] || sectionNames[node.name.toLowerCase()] || node.name,
      onPress: () =>
        router.navigate({ pathname: "/shop", params: { section: node.id, category: "", brand: "" } }),
    }));
  }, [tree, t, locale, router]);

  const refreshing = products.isRefetching || brands.isRefetching;
  const onRefresh = () => {
    products.refetch();
    brands.refetch();
    refetchCategories();
  };

  return (
    <Screen>
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.tagline}>
          <AppText style={styles.taglineText}>{t.home.tagline}</AppText>
        </View>

        <PromoBanner
          eyebrow={t.home.promoEyebrow}
          title={t.home.promoTitle}
          body={t.home.promoBody}
          cta={t.home.requestValuation}
          onPress={() => router.navigate("/sell")}
        />

        <Section>
          <EditorialCard
            image={require("../../../assets/home/curated.jpg")}
            // The photo is square (1600×1600); the default 4:3 frame cut the
            // model's head off.
            aspectRatio={1}
            title={t.home.editTitle}
            body={t.home.editBody}
            cta={{ label: t.home.shopNow, onPress: () => openShop() }}
          />
        </Section>

        {products.isLoading || newArrivals.length > 0 ? (
          <Section>
            <SectionTitle title={t.home.newArrivals} action={{ label: t.home.seeAll, onPress: () => openShop() }} />
            <ProductRail
              products={newArrivals}
              loading={products.isLoading}
              onPressProduct={(product) => router.push(`/product/${product.id}`)}
            />
          </Section>
        ) : null}

        {categoryTiles.length > 0 ? (
          <Section>
            <SectionTitle title={t.home.shopByCategory} />
            <CategoryGrid tiles={categoryTiles} onPress={(id) => openShop({ category: id })} />
          </Section>
        ) : null}

        <Section>
          <ImageBanner
            image={require("../../../assets/home/membership.jpg")}
            eyebrow={t.home.memberBadge}
            title={t.home.memberTitle}
            body={t.home.memberBody}
            cta={t.home.memberCta}
            onPress={() => router.navigate("/membership")}
          />
        </Section>

        {topDesigners.length > 0 ? (
          <Section>
            <SectionTitle title={t.home.topDesigners} />
            <DesignerList brands={topDesigners} onPress={(brand) => openShop({ brand: brand.id })} />
          </Section>
        ) : null}

        <Section>
          <EditorialCard
            image={require("../../../assets/home/consign.jpg")}
            aspectRatio={1}
            title={t.home.consignTitle}
            body={t.home.consignBody}
            cta={{ label: t.home.submitPiece, onPress: () => router.push("/consign/new") }}
          />
        </Section>

        {/* Personal Sourcing, like the storefront home's SourcingBlock. */}
        <Section>
          <View style={styles.sourcing}>
            <AppText variant="caption" style={styles.sourcingEyebrow}>
              {t.sourcing.label}
            </AppText>
            <AppText variant="display" style={styles.sourcingTitle}>
              {t.sourcing.title}
            </AppText>
            <AppText variant="body" style={styles.sourcingBody}>
              {t.sourcing.description}
            </AppText>
            <Button label={t.sourcing.submit} variant="outline" onPress={() => router.push("/sourcing")} />
          </View>
        </Section>

        <Section>
          <EditorialCard
            image={require("../../../assets/home/editorial.jpg")}
            aspectRatio={16 / 9}
            eyebrow={t.home.editorialLabel}
            title={t.home.editorialTitle}
            body={t.home.editorialBody}
          />
        </Section>

        <HomeFooter sections={footerSections} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The footer closes the page, so no extra space after it.
  content: {
    paddingBottom: 0,
  },
  tagline: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  taglineText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.primary,
    textAlign: "center",
  },
  sourcing: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
  },
  sourcingEyebrow: {
    color: colors.gold,
  },
  sourcingTitle: {
    marginTop: spacing.sm,
    textAlign: "center",
    fontSize: 26,
  },
  sourcingBody: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    textAlign: "center",
    color: colors.textMuted,
  },
});

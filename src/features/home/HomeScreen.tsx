import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { getBrands, getProducts } from "@/api/products";
import { AppHeader } from "@/components/AppHeader";
import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import { useDepartments } from "@/features/catalog/useDepartments";
import { useT } from "@/i18n";
import { filterByCategory, isAvailable, sectionOf } from "@/lib/sections";
import { colors, fontFamily, spacing } from "@/theme";
import {
  CategoryGrid,
  type CategoryTile,
  DesignerList,
  EditorialCard,
  ImageBanner,
  OffersRow,
  ProductRail,
  PromoBanner,
  Section,
  SectionTitle,
} from "./HomeSections";

const NEW_ARRIVALS_LIMIT = 10;
const CATEGORY_TILES_LIMIT = 6;
const DESIGNERS_LIMIT = 8;

export function HomeScreen() {
  const t = useT();
  const router = useRouter();
  // The Home spans the whole catalogue; picking a section (Women/Men/Kids) is the Shop's job.
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
    const nodes = tree.length === 1 ? tree[0].children ?? [] : tree;
    const sectionNames = t.home.sectionNames as Record<string, string>;
    return nodes
      .map((node) => {
        const items = filterByCategory(products.data ?? [], tree, node.id);
        const cover = items.find(isAvailable) ?? items[0];
        return {
          id: node.id,
          label: sectionNames[node.name.toLowerCase()] ?? node.name,
          imageUrl: cover?.images[0]?.url ?? null,
          count: items.length,
        };
      })
      .filter((tile) => tile.count > 0)
      .slice(0, CATEGORY_TILES_LIMIT);
  }, [tree, products.data, t]);

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
          cta={t.home.sellNow}
          footnote={t.home.termsApply}
          onPress={() => router.navigate("/sell")}
        />

        <Section>
          <EditorialCard
            image={require("../../../assets/home/curated.jpg")}
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
          <SectionTitle title={t.home.offersTitle} />
          <OffersRow
            offers={[
              {
                key: "sell",
                badge: t.home.sellOfferBadge,
                title: t.home.sellOfferTitle,
                body: t.home.sellOfferBody,
                cta: t.home.sellNow,
                onPress: () => router.navigate("/sell"),
              },
              {
                key: "refer",
                badge: t.home.referOfferBadge,
                title: t.home.referOfferTitle,
                body: t.home.referOfferBody,
                cta: t.home.referNow,
                onPress: () => router.push("/refer"),
              },
            ]}
          />
        </Section>

        <Section>
          <EditorialCard
            image={require("../../../assets/home/consign.jpg")}
            aspectRatio={1}
            title={t.home.consignTitle}
            body={t.home.consignBody}
            cta={{ label: t.home.submitPiece, onPress: () => router.push("/consign/new") }}
          />
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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
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
});

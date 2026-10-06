import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SlidersHorizontal, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { getBrands, getFilterOptions, getProducts } from "@/api/products";
import { AppHeader } from "@/components/AppHeader";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { DepartmentTabs } from "@/components/DepartmentTabs";
import { ProductCard } from "@/components/ProductCard";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useT } from "@/i18n";
import { filterByCategory, findCategory } from "@/lib/sections";
import { colors, fontFamily, letterSpacing, spacing } from "@/theme";
import { useDepartments } from "./useDepartments";

type DraftFilters = {
  brands: string[];
  sizes: string[];
  colors: string[];
  minPrice: string;
  maxPrice: string;
};

const EMPTY_FILTERS: DraftFilters = { brands: [], sizes: [], colors: [], minPrice: "", maxPrice: "" };

// Params come from the Home (and deep links): ?section=&category=&brand= narrow
// the list, ?focus=1 opens with the search field active.
type ShopParams = { section?: string; category?: string; brand?: string; focus?: string };

export function CatalogScreen() {
  const t = useT();
  const router = useRouter();
  const params = useLocalSearchParams<ShopParams>();
  const { tree, departments } = useDepartments();
  const [search, setSearch] = useState("");
  const [sectionId, setSectionId] = useState<string | null>(params.section || null);
  const [categoryId, setCategoryId] = useState<string | null>(params.category || null);
  const [showFilters, setShowFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<DraftFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(EMPTY_FILTERS);

  // Every visit from the Home re-applies its selection, replacing what was picked here.
  useEffect(() => {
    setSectionId(params.section || null);
    setCategoryId(params.category || null);
    if (params.brand) setAppliedFilters({ ...EMPTY_FILTERS, brands: [params.brand] });
  }, [params.section, params.category, params.brand]);

  const { data: brands } = useQuery({ queryKey: ["brands"], queryFn: getBrands });
  const { data: filterOptions } = useQuery({ queryKey: ["filterOptions"], queryFn: getFilterOptions });

  const activeFilterCount =
    appliedFilters.brands.length +
    appliedFilters.sizes.length +
    appliedFilters.colors.length +
    (appliedFilters.minPrice || appliedFilters.maxPrice ? 1 : 0);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["products", { search, ...appliedFilters }],
    queryFn: () =>
      getProducts({
        search: search || undefined,
        brand: appliedFilters.brands.length ? appliedFilters.brands.join(",") : undefined,
        size: appliedFilters.sizes.length ? appliedFilters.sizes.join(",") : undefined,
        color: appliedFilters.colors.length ? appliedFilters.colors.join(",") : undefined,
        minPrice: appliedFilters.minPrice ? Number(appliedFilters.minPrice) : undefined,
        maxPrice: appliedFilters.maxPrice ? Number(appliedFilters.maxPrice) : undefined,
      }),
  });

  const openFilters = () => {
    setDraftFilters(appliedFilters);
    setShowFilters(true);
  };

  const toggleDraftValue = (key: "brands" | "sizes" | "colors", value: string) => {
    setDraftFilters((current) => {
      const list = current[key];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...current, [key]: next };
    });
  };

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setShowFilters(false);
  };

  // With numColumns=2 and flex:1 cards, an odd-length last row would stretch
  // its single card to fill both columns. Pad with an invisible spacer instead.
  // Sections and categories are narrowed on the client, like the storefront —
  // the products endpoint has no category filter.
  const visible = useMemo(
    () => filterByCategory(data ?? [], tree, categoryId ?? sectionId),
    [data, tree, categoryId, sectionId]
  );

  const subcategories = useMemo(
    () => (sectionId ? findCategory(tree, sectionId)?.children ?? [] : []),
    [tree, sectionId]
  );

  const selectSection = (id: string | null) => {
    setSectionId(id);
    setCategoryId(null);
  };

  const gridData = useMemo(() => {
    if (visible.length % 2 === 0) return visible;
    return [...visible, null];
  }, [visible]);

  return (
    <Screen>
      <AppHeader search={{ value: search, onChangeText: setSearch, autoFocus: params.focus === "1" }} />
      <DepartmentTabs departments={departments} value={sectionId} onChange={selectSection} />

      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subcategoryScroll}
          contentContainerStyle={styles.subcategories}
        >
          {subcategories.length > 0 ? (
            <Pressable
              style={[styles.chip, !categoryId && styles.chipActive]}
              onPress={() => setCategoryId(null)}
            >
              <AppText variant="caption" style={[styles.chipText, !categoryId && styles.chipTextActive]}>
                {t.home.all}
              </AppText>
            </Pressable>
          ) : null}
          {subcategories.map((category) => (
            <Pressable
              key={category.id}
              style={[styles.chip, categoryId === category.id && styles.chipActive]}
              onPress={() => setCategoryId(category.id)}
            >
              <AppText
                variant="caption"
                style={[styles.chipText, categoryId === category.id && styles.chipTextActive]}
              >
                {category.name}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          style={styles.filterButton}
          onPress={openFilters}
          accessibilityRole="button"
          accessibilityLabel={t.catalog.filters}
        >
          <SlidersHorizontal size={18} color={colors.primary} strokeWidth={1.5} />
          <AppText style={styles.filterLabel}>{t.catalog.filters}</AppText>
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <AppText variant="caption" style={styles.filterBadgeText}>
                {activeFilterCount}
              </AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      {isError ? (
        <View style={styles.centered}>
          <AppText variant="body">{t.catalog.error}</AppText>
        </View>
      ) : (
        <FlatList
          data={gridData}
          key={2}
          numColumns={2}
          keyExtractor={(item, index) => item?.id ?? `spacer-${index}`}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.centered}>
                <AppText variant="body">{t.catalog.empty}</AppText>
              </View>
            ) : null
          }
          renderItem={({ item }) =>
            item ? (
              <View style={styles.cardWrapper}>
                <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
              </View>
            ) : (
              <View style={styles.cardWrapper} />
            )
          }
        />
      )}

      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <AppText variant="label">{t.catalog.filters}</AppText>
              <Pressable onPress={() => setShowFilters(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t.catalog.close}>
                <X size={20} color={colors.primary} strokeWidth={1.5} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {brands && brands.length > 0 ? (
                <View style={styles.filterSection}>
                  <AppText variant="caption" style={styles.filterSectionLabel}>{t.catalog.brand}</AppText>
                  <View style={styles.chipRow}>
                    {brands.map((brand) => (
                      <Pressable
                        key={brand.id}
                        style={[styles.chip, draftFilters.brands.includes(brand.id) && styles.chipActive]}
                        onPress={() => toggleDraftValue("brands", brand.id)}
                      >
                        <AppText
                          variant="caption"
                          style={[styles.chipText, draftFilters.brands.includes(brand.id) && styles.chipTextActive]}
                        >
                          {brand.name}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {filterOptions && filterOptions.sizes.length > 0 ? (
                <View style={styles.filterSection}>
                  <AppText variant="caption" style={styles.filterSectionLabel}>{t.catalog.size}</AppText>
                  <View style={styles.chipRow}>
                    {filterOptions.sizes.map((size) => (
                      <Pressable
                        key={size}
                        style={[styles.chip, draftFilters.sizes.includes(size) && styles.chipActive]}
                        onPress={() => toggleDraftValue("sizes", size)}
                      >
                        <AppText
                          variant="caption"
                          style={[styles.chipText, draftFilters.sizes.includes(size) && styles.chipTextActive]}
                        >
                          {size}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {filterOptions && filterOptions.colors.length > 0 ? (
                <View style={styles.filterSection}>
                  <AppText variant="caption" style={styles.filterSectionLabel}>{t.catalog.color}</AppText>
                  <View style={styles.chipRow}>
                    {filterOptions.colors.map((color) => (
                      <Pressable
                        key={color}
                        style={[styles.chip, draftFilters.colors.includes(color) && styles.chipActive]}
                        onPress={() => toggleDraftValue("colors", color)}
                      >
                        <AppText
                          variant="caption"
                          style={[styles.chipText, draftFilters.colors.includes(color) && styles.chipTextActive]}
                        >
                          {color}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.filterSection}>
                <AppText variant="caption" style={styles.filterSectionLabel}>{t.catalog.price}</AppText>
                <View style={styles.priceRow}>
                  <View style={styles.priceInput}>
                    <TextField
                      label={t.catalog.min}
                      value={draftFilters.minPrice}
                      onChangeText={(v) => setDraftFilters((c) => ({ ...c, minPrice: v.replace(/[^0-9]/g, "") }))}
                      keyboardType="numeric"
                      placeholder={filterOptions ? String(filterOptions.priceRange.min) : "0"}
                    />
                  </View>
                  <View style={styles.priceInput}>
                    <TextField
                      label={t.catalog.max}
                      value={draftFilters.maxPrice}
                      onChangeText={(v) => setDraftFilters((c) => ({ ...c, maxPrice: v.replace(/[^0-9]/g, "") }))}
                      keyboardType="numeric"
                      placeholder={filterOptions ? String(filterOptions.priceRange.max) : "10000"}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button label={t.catalog.clear} variant="outline" onPress={handleClearFilters} style={styles.modalFooterButton} />
              <Button label={t.catalog.apply} onPress={handleApplyFilters} style={styles.modalFooterButton} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  subcategoryScroll: {
    flex: 1,
  },
  subcategories: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: 36,
    paddingLeft: spacing.sm,
  },
  filterLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: letterSpacing.label,
    textTransform: "uppercase",
    color: colors.primary,
  },
  filterBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: 9,
  },
  row: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  cardWrapper: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xxl,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(26, 26, 26, 0.5)",
  },
  modalSheet: {
    maxHeight: "80%",
    backgroundColor: colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalContent: {
    padding: spacing.md,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterSectionLabel: {
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textLight,
  },
  chipTextActive: {
    color: colors.white,
  },
  priceRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  priceInput: {
    flex: 1,
  },
  modalFooter: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  modalFooterButton: {
    flex: 1,
  },
});

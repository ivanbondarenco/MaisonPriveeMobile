import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { SlidersHorizontal, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { getBrands, getFilterOptions, getProducts } from "@/api/products";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { ProductCard } from "@/components/ProductCard";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { colors, spacing } from "@/theme";

type DraftFilters = {
  brands: string[];
  sizes: string[];
  colors: string[];
  minPrice: string;
  maxPrice: string;
};

const EMPTY_FILTERS: DraftFilters = { brands: [], sizes: [], colors: [], minPrice: "", maxPrice: "" };

export function CatalogScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<DraftFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(EMPTY_FILTERS);

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
  const gridData = useMemo(() => {
    if (!data || data.length % 2 === 0) return data;
    return [...data, null];
  }, [data]);

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="display" style={styles.logo}>
          MAISON PRIVÉE
        </AppText>
        <AppText variant="labelWide" style={styles.subLogo}>
          ATELIER
        </AppText>
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchInput}>
          <TextField
            label="Search"
            placeholder="Search products, brands..."
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
        <Pressable
          style={styles.filterButton}
          onPress={openFilters}
          accessibilityRole="button"
          accessibilityLabel="Filters"
        >
          <SlidersHorizontal size={18} color={colors.primary} strokeWidth={1.5} />
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
          <AppText variant="body">Couldn't load products.</AppText>
        </View>
      ) : (
        <FlatList
          data={gridData ?? []}
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
                <AppText variant="body">No products found.</AppText>
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
              <AppText variant="label">Filters</AppText>
              <Pressable onPress={() => setShowFilters(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <X size={20} color={colors.primary} strokeWidth={1.5} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {brands && brands.length > 0 ? (
                <View style={styles.filterSection}>
                  <AppText variant="caption" style={styles.filterSectionLabel}>Brand</AppText>
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
                  <AppText variant="caption" style={styles.filterSectionLabel}>Size</AppText>
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
                  <AppText variant="caption" style={styles.filterSectionLabel}>Color</AppText>
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
                <AppText variant="caption" style={styles.filterSectionLabel}>Price</AppText>
                <View style={styles.priceRow}>
                  <View style={styles.priceInput}>
                    <TextField
                      label="Min"
                      value={draftFilters.minPrice}
                      onChangeText={(v) => setDraftFilters((c) => ({ ...c, minPrice: v.replace(/[^0-9]/g, "") }))}
                      keyboardType="numeric"
                      placeholder={filterOptions ? String(filterOptions.priceRange.min) : "0"}
                    />
                  </View>
                  <View style={styles.priceInput}>
                    <TextField
                      label="Max"
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
              <Button label="Clear" variant="outline" onPress={handleClearFilters} style={styles.modalFooterButton} />
              <Button label="Apply" onPress={handleApplyFilters} style={styles.modalFooterButton} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  logo: {
    fontSize: 22,
    letterSpacing: 2,
  },
  subLogo: {
    marginTop: 2,
    fontSize: 9,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  searchInput: {
    flex: 1,
  },
  filterButton: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterBadge: {
    position: "absolute",
    top: 0,
    right: 0,
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

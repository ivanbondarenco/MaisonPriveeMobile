import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { Product } from "@/api/types";
import { AppText } from "@/components/AppText";
import { colors, spacing } from "@/theme";

// Same sort choices, size list and colour palette as the storefront's
// FilterDrawer (components/store/FilterDrawer.tsx).

export type SortOption = "our-picks" | "newest" | "price-desc" | "price-asc";

export const SORT_OPTIONS: SortOption[] = ["our-picks", "newest", "price-desc", "price-asc"];

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL"];

// `name` is what products store (the backend matches it case-insensitively);
// the label shown comes from t.catalog.colorNames.
export const COLOR_OPTIONS: { name: ColorName; swatch: string | string[]; border?: boolean }[] = [
  { name: "Black", swatch: "#000000" },
  { name: "White", swatch: "#FFFFFF", border: true },
  { name: "Grey", swatch: "#9CA3AF" },
  { name: "Silver", swatch: "#C0C0C0" },
  { name: "Gold", swatch: "#C5A572" },
  { name: "Neutrals", swatch: "#E8DCC8" },
  { name: "Brown", swatch: "#8B4513" },
  { name: "Green", swatch: "#059669" },
  { name: "Blue", swatch: "#3B82F6" },
  { name: "Red", swatch: "#EF4444" },
  { name: "Pink", swatch: "#EC4899" },
  { name: "Purple", swatch: "#8B5CF6" },
  { name: "Orange", swatch: "#F97316" },
  { name: "Yellow", swatch: "#FDE047" },
  // The web paints these two as CSS gradients; bands of the same colours here.
  { name: "Metallic", swatch: ["#C0C0C0", "#E8E8E8", "#A0A0A0"] },
  { name: "Multicolour", swatch: ["#3B82F6", "#EC4899", "#FDE047"] },
];

export type ColorName =
  | "Black" | "White" | "Grey" | "Silver" | "Gold" | "Neutrals" | "Brown" | "Green"
  | "Blue" | "Red" | "Pink" | "Purple" | "Orange" | "Yellow" | "Metallic" | "Multicolour";

/** The storefront's applyFiltersAndSort ordering. The API already returns newest first. */
export function sortProducts(products: Product[], sort: SortOption): Product[] {
  switch (sort) {
    case "newest":
      return products;
    case "price-asc":
      return [...products].sort((a, b) => a.priceAmount - b.priceAmount);
    case "price-desc":
      return [...products].sort((a, b) => b.priceAmount - a.priceAmount);
    case "our-picks":
    default:
      // New arrivals first, otherwise keep the API's (newest first) order.
      return [...products].sort((a, b) => Number(b.isNew) - Number(a.isNew));
  }
}

export function ColorSwatch({ swatch, border }: { swatch: string | string[]; border?: boolean }) {
  const bands = Array.isArray(swatch) ? swatch : [swatch];
  return (
    <View style={[styles.swatch, border && styles.swatchBorder]}>
      {bands.map((color, index) => (
        <View key={index} style={[styles.swatchBand, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

/** A collapsible filter group, like the storefront drawer's FilterSection. */
export function FilterGroup({
  title,
  selectedCount = 0,
  initiallyOpen = false,
  children,
}: {
  title: string;
  selectedCount?: number;
  initiallyOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen || selectedCount > 0);
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View style={styles.group}>
      <Pressable
        style={styles.groupHeader}
        onPress={() => setOpen((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <AppText variant="body">
          {title}
          {selectedCount > 0 ? ` (${selectedCount})` : ""}
        </AppText>
        <Chevron size={18} color={colors.textMuted} strokeWidth={1.5} />
      </Pressable>
      {open ? <View style={styles.groupBody}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  groupBody: {
    paddingBottom: spacing.md,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "row",
  },
  swatchBorder: {
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  swatchBand: {
    flex: 1,
  },
});

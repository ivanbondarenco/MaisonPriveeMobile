import { useRouter } from "expo-router";
import { Search, ShoppingBag } from "lucide-react-native";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { useCart } from "@/context/CartContext";
import { useT } from "@/i18n";
import { colors, fontFamily, fontSize, letterSpacing, radius, spacing } from "@/theme";
import { AppText } from "./AppText";

type Props = {
  // Shop passes a live search field; elsewhere the box is a shortcut into Shop.
  search?: {
    value: string;
    onChangeText: (value: string) => void;
    autoFocus?: boolean;
  };
};

// Logo · search · bag, the top bar TheRealReal keeps on Home and Shop.
export function AppHeader({ search }: Props) {
  const t = useT();
  const router = useRouter();
  const { lines } = useCart();
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.navigate("/")} accessibilityRole="link" style={styles.logo}>
        <AppText style={styles.logoText}>MAISON PRIVÉE</AppText>
        <AppText style={styles.logoSub}>ATELIER</AppText>
      </Pressable>

      {search ? (
        <View style={styles.searchBox}>
          <TextInput
            value={search.value}
            onChangeText={search.onChangeText}
            autoFocus={search.autoFocus}
            placeholder={t.home.searchPlaceholder}
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={styles.searchInput}
          />
          <Search size={18} color={colors.primary} strokeWidth={1.5} />
        </View>
      ) : (
        <Pressable
          style={styles.searchBox}
          onPress={() => router.navigate({ pathname: "/shop", params: { focus: "1" } })}
          accessibilityRole="search"
        >
          <AppText style={styles.searchPlaceholder}>{t.home.searchPlaceholder}</AppText>
          <Search size={18} color={colors.primary} strokeWidth={1.5} />
        </Pressable>
      )}

      <Pressable
        onPress={() => router.navigate("/cart")}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${t.home.cart} (${itemCount})`}
        style={styles.cart}
      >
        <ShoppingBag size={24} color={colors.primary} strokeWidth={1.4} />
        {itemCount > 0 ? (
          <View style={styles.cartBadge}>
            <AppText style={styles.cartBadgeText}>{itemCount > 99 ? "99+" : itemCount}</AppText>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundLight,
  },
  logo: {
    alignItems: "center",
  },
  logoText: {
    fontFamily: fontFamily.displayRegular,
    fontSize: 17,
    letterSpacing: 1.5,
    color: colors.primary,
  },
  logoSub: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 7,
    letterSpacing: letterSpacing.labelWide,
    color: colors.primary,
    marginTop: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    paddingHorizontal: spacing.sm + 4,
    backgroundColor: colors.surfaceMuted,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  cart: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 9,
    color: colors.white,
  },
});

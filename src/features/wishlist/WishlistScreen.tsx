import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { getWishlist, removeFromWishlist } from "@/api/wishlist";
import { AppText } from "@/components/AppText";
import { ProductCard } from "@/components/ProductCard";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/i18n";
import { colors, spacing } from "@/theme";

export function WishlistScreen() {
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["wishlist"],
    queryFn: getWishlist,
    enabled: !!user,
  });

  const gridData = useMemo(() => {
    if (!data || data.length % 2 === 0) return data;
    return [...data, null];
  }, [data]);

  const handleRemove = async (productId: string) => {
    // Optimistic: this list is small and personal, a failed remove just gets
    // corrected on the next refetch.
    queryClient.setQueryData<typeof data>(["wishlist"], (current) =>
      current?.filter((p) => p.id !== productId)
    );
    try {
      await removeFromWishlist(productId);
    } catch {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    }
  };

  if (!user) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="body">{t.wishlist.signInPrompt}</AppText>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="body">{t.wishlist.error}</AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="display" style={styles.title}>
          {t.wishlist.title}
        </AppText>
      </View>

      <FlatList
        data={gridData ?? []}
        key={2}
        numColumns={2}
        keyExtractor={(item, index) => item?.id ?? `spacer-${index}`}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.centered}>
              <AppText variant="body">{t.wishlist.empty}</AppText>
            </View>
          ) : null
        }
        renderItem={({ item }) =>
          item ? (
            <View style={styles.cardWrapper}>
              <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
              <Pressable style={styles.removeButton} onPress={() => handleRemove(item.id)}>
                <X size={16} color={colors.white} strokeWidth={2} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.cardWrapper} />
          )
        }
      />
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
  title: {
    fontSize: 22,
  },
  row: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  cardWrapper: {
    flex: 1,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
    position: "relative",
  },
  removeButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(26, 26, 26, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
});

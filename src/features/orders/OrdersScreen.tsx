import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { getMyOrders } from "@/api/orders";
import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { dateLocale, useI18n } from "@/i18n";
import { colors, spacing } from "@/theme";

const priceFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function OrdersScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user } = useAuth();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["orders"],
    queryFn: getMyOrders,
    enabled: !!user,
  });

  if (!user) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="body">{t.orders.signInPrompt}</AppText>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="body">{t.orders.error}</AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={data ?? []}
        keyExtractor={(order) => order.id}
        contentContainerStyle={styles.listContent}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.centered}>
              <AppText variant="body">{t.orders.empty}</AppText>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/orders/${item.id}`)}>
            <View>
              <AppText variant="bodyMedium">#{item.id.slice(0, 8).toUpperCase()}</AppText>
              <AppText variant="caption">{new Date(item.createdAt).toLocaleDateString(dateLocale[locale])}</AppText>
            </View>
            <View style={styles.rowRight}>
              <AppText variant="caption" style={styles.status}>
                {t.orders.status[item.status as keyof typeof t.orders.status] ?? item.status}
              </AppText>
              <AppText variant="body">USD {priceFormatter.format(item.totalAmount)}</AppText>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowRight: {
    alignItems: "flex-end",
  },
  status: {
    color: colors.gold,
    marginBottom: 2,
  },
});

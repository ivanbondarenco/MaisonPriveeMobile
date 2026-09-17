import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Truck } from "lucide-react-native";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { getMyOrders } from "@/api/orders";
import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import { colors, spacing } from "@/theme";

const priceFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  SHIPPED: "Shipped",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function OrderDetailScreen({ orderId }: { orderId: string }) {
  // Reuses the "orders" query cache from OrdersScreen instead of a separate
  // per-order endpoint — GET /api/orders/mine already returns items.
  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: getMyOrders,
  });

  const order = data?.find((o) => o.id === orderId);

  if (isLoading) {
    return <Screen style={styles.centered} />;
  }

  if (!order) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="body">Order not found.</AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="caption">Order #{order.id.slice(0, 8).toUpperCase()}</AppText>
        <AppText variant="display" style={styles.status}>
          {STATUS_LABEL[order.status] ?? order.status}
        </AppText>
        <AppText variant="body" style={styles.date}>
          {new Date(order.createdAt).toLocaleDateString()}
        </AppText>

        <View style={styles.shippingBox}>
          <View style={styles.shippingRow}>
            <AppText variant="label">Shipping</AppText>
            <AppText variant="body">
              {order.shippingProvider
                ? `${order.shippingProvider}${order.shippingMethod ? ` · ${order.shippingMethod}` : ""}`
                : "—"}
            </AppText>
          </View>
          <View style={styles.shippingRow}>
            <AppText variant="label">Tracking</AppText>
            {order.trackingUrl && order.trackingNumber ? (
              <Pressable onPress={() => Linking.openURL(order.trackingUrl!)}>
                <AppText variant="body" style={styles.trackingLink}>
                  {order.trackingNumber}
                </AppText>
              </Pressable>
            ) : (
              <View style={styles.notShippedRow}>
                <Truck size={14} color={colors.textMuted} strokeWidth={1.5} />
                <AppText variant="body" style={styles.notShippedText}>
                  Not yet shipped
                </AppText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.itemsSection}>
          <AppText variant="label" style={styles.sectionLabel}>
            Items
          </AppText>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Image source={{ uri: item.product.images[0]?.url }} style={styles.itemImage} contentFit="cover" />
              <View style={styles.itemInfo}>
                <AppText variant="body" numberOfLines={2}>
                  {item.product.title}
                </AppText>
                <AppText variant="caption">Qty {item.quantity}</AppText>
              </View>
              <AppText variant="body">USD {priceFormatter.format(item.price)}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <AppText variant="label">Shipping</AppText>
            <AppText variant="body">USD {priceFormatter.format(order.shippingCost)}</AppText>
          </View>
          <View style={styles.summaryRow}>
            <AppText variant="bodyMedium">Total</AppText>
            <AppText variant="bodyMedium">USD {priceFormatter.format(order.totalAmount)}</AppText>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  status: {
    marginTop: spacing.xs,
    fontSize: 22,
  },
  date: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  shippingBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  shippingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trackingLink: {
    color: colors.gold,
    textDecorationLine: "underline",
  },
  notShippedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  notShippedText: {
    color: colors.textMuted,
    textTransform: "none",
  },
  itemsSection: {
    marginTop: spacing.xl,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  itemImage: {
    width: 56,
    height: 70,
    backgroundColor: colors.secondary,
  },
  itemInfo: {
    flex: 1,
  },
  summary: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

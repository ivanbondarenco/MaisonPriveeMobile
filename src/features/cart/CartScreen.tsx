import { useRouter } from "expo-router";
import { Minus, Plus, Trash2 } from "lucide-react-native";
import { Image } from "expo-image";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { useCart, type CartLine } from "@/context/CartContext";
import { colors, spacing } from "@/theme";

const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function CartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { lines, isReady, setQuantity, removeItem, subtotal } = useCart();

  const handleCheckout = () => {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    router.push("/checkout");
  };

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="display" style={styles.title}>
          Cart
        </AppText>
      </View>

      <FlatList
        data={lines}
        keyExtractor={(line) => line.product.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          isReady ? (
            <View style={styles.centered}>
              <AppText variant="body">Your cart is empty.</AppText>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <CartRow line={item} onSetQuantity={setQuantity} onRemove={removeItem} />
        )}
      />

      {lines.length > 0 ? (
        <View style={styles.footer}>
          <View style={styles.subtotalRow}>
            <AppText variant="label">Subtotal</AppText>
            <AppText variant="bodyMedium">USD {priceFormatter.format(subtotal)}</AppText>
          </View>
          <Button label="Checkout" onPress={handleCheckout} />
        </View>
      ) : null}
    </Screen>
  );
}

function CartRow({
  line,
  onSetQuantity,
  onRemove,
}: {
  line: CartLine;
  onSetQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}) {
  const { product, quantity } = line;
  return (
    <View style={styles.row}>
      <Image source={{ uri: product.images[0]?.url }} style={styles.image} contentFit="cover" />
      <View style={styles.rowInfo}>
        <AppText variant="caption" numberOfLines={1}>
          {product.brandName}
        </AppText>
        <AppText variant="bodyMedium" numberOfLines={1} style={styles.rowTitle}>
          {product.title}
        </AppText>
        <AppText variant="body" style={styles.rowPrice}>
          {product.currency} {priceFormatter.format(product.priceAmount)}
        </AppText>

        <View style={styles.rowActions}>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepperButton}
              onPress={() => onSetQuantity(product.id, quantity - 1)}
            >
              <Minus size={14} color={colors.primary} />
            </Pressable>
            <AppText variant="body" style={styles.stepperValue}>
              {quantity}
            </AppText>
            <Pressable
              style={styles.stepperButton}
              onPress={() => onSetQuantity(product.id, quantity + 1)}
            >
              <Plus size={14} color={colors.primary} />
            </Pressable>
          </View>
          <Pressable onPress={() => onRemove(product.id)}>
            <Trash2 size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
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
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xxl,
  },
  row: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  image: {
    width: 80,
    height: 100,
    backgroundColor: colors.secondary,
  },
  rowInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  rowTitle: {
    marginTop: 2,
  },
  rowPrice: {
    marginTop: spacing.xs,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepperButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    minWidth: 24,
    textAlign: "center",
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
});

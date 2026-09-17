import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { colors, spacing } from "@/theme";

export function ProfileScreen() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return <Screen style={styles.centered} />;
  }

  if (!user) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="display" style={styles.title}>
          Welcome
        </AppText>
        <AppText variant="body" style={styles.subtitle}>
          Sign in to access your orders, wishlist and offers.
        </AppText>
        <View style={styles.actions}>
          <Button label="Sign In" onPress={() => router.push("/(auth)/login")} />
          <Button
            label="Create Account"
            variant="outline"
            onPress={() => router.push("/(auth)/register")}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="caption">Signed in as</AppText>
        <AppText variant="display" style={styles.name}>
          {user.name}
        </AppText>
        <AppText variant="body" style={styles.email}>
          {user.email}
        </AppText>
      </View>

      <View style={styles.footerActions}>
        <Button label="My Orders" variant="outline" onPress={() => router.push("/orders")} style={styles.ordersButton} />
        <Button label="Sign Out" variant="outline" onPress={logout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  actions: {
    width: "100%",
    gap: spacing.sm,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  name: {
    marginTop: spacing.xs,
    fontSize: 24,
  },
  email: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  footerActions: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  ordersButton: {
    marginBottom: 0,
  },
});

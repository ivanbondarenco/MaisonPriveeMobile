import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useAuth } from "@/context/AuthContext";
import { LOCALES, useI18n } from "@/i18n";
import { colors, spacing } from "@/theme";
import { SiteCreditCard } from "./SiteCreditCard";

export function ProfileScreen() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();

  // Offered signed in or not: the language shouldn't depend on having an account.
  const languagePicker = (
    <View style={styles.languageBlock}>
      <AppText variant="label" style={styles.languageLabel}>
        {t.profile.language}
      </AppText>
      {/* wrap: five languages never fit on one row */}
      <SegmentedControl options={LOCALES} value={locale} onChange={setLocale} wrap />
    </View>
  );

  if (isLoading) {
    return <Screen style={styles.centered} />;
  }

  if (!user) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="display" style={styles.title}>
          {t.profile.welcome}
        </AppText>
        <AppText variant="body" style={styles.subtitle}>
          {t.profile.signInPrompt}
        </AppText>
        <View style={styles.actions}>
          <Button label={t.common.signIn} onPress={() => router.push("/(auth)/login")} />
          <Button
            label={t.common.createAccount}
            variant="outline"
            onPress={() => router.push("/(auth)/register")}
          />
        </View>
        {languagePicker}
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <View style={styles.header}>
          <AppText variant="caption">{t.profile.signedInAs}</AppText>
          <AppText variant="display" style={styles.name}>
            {user.name}
          </AppText>
          <AppText variant="body" style={styles.email}>
            {user.email}
          </AppText>
        </View>

        <SiteCreditCard />

        <View style={styles.footerActions}>
          {languagePicker}
          <Button
            label={t.screenTitles.membership}
            variant="outline"
            onPress={() => router.push("/membership")}
            style={styles.ordersButton}
          />
          <Button
            label={t.screenTitles.orders}
            variant="outline"
            onPress={() => router.push("/orders")}
            style={styles.ordersButton}
          />
          <Button label={t.profile.signOut} variant="outline" onPress={logout} />
        </View>
      </ScrollView>
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
  languageBlock: {
    width: "100%",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  languageLabel: {
    marginBottom: spacing.sm,
  },
  ordersButton: {
    marginBottom: 0,
  },
});

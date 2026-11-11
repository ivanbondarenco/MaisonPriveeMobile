import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/i18n";
import { ApiError } from "@/lib/apiClient";
import { colors, spacing } from "@/theme";

// In-app account deletion, required by App Store Review Guideline 5.1.1(v).
// The password is asked again so a phone left unlocked can't wipe the account,
// and a native confirmation comes before anything is sent.
export function DeleteAccountScreen() {
  const t = useT();
  const router = useRouter();
  const { user, deleteAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const performDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteAccount(password);
      router.dismissAll();
      router.replace("/");
      Alert.alert(t.account.deleteDone);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t.auth.somethingWrong);
      setIsDeleting(false);
    }
  };

  const handleDelete = () => {
    setFormError(null);
    if (!password) {
      setPasswordError(t.account.passwordRequired);
      return;
    }
    setPasswordError(undefined);
    Alert.alert(t.account.deleteAlertTitle, t.account.deleteAlertBody, [
      { text: t.common.cancel, style: "cancel" },
      { text: t.account.deleteConfirm, style: "destructive", onPress: performDelete },
    ]);
  };

  if (!user) return <Screen />;

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="display" style={styles.title}>
            {t.account.deleteTitle}
          </AppText>
          <AppText variant="body" style={styles.paragraph}>
            {t.account.deleteBody}
          </AppText>
          <AppText variant="body" style={styles.paragraph}>
            {t.account.deleteRecords}
          </AppText>
          <AppText variant="body" style={styles.paragraph}>
            {t.account.deleteActive}
          </AppText>

          <View style={styles.form}>
            <TextField
              label={t.account.deletePassword}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              error={passwordError}
            />
            {formError ? (
              <AppText variant="body" style={styles.formError}>
                {formError}
              </AppText>
            ) : null}
            <Button label={t.account.deleteConfirm} onPress={handleDelete} loading={isDeleting} style={styles.deleteButton} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 26,
  },
  paragraph: {
    marginTop: spacing.md,
    color: colors.textMuted,
  },
  form: {
    marginTop: spacing.xl,
  },
  formError: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  deleteButton: {
    backgroundColor: colors.danger,
  },
});

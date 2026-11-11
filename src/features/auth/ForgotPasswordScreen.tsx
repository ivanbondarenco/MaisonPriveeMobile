import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { z } from "zod";

import { requestPasswordReset } from "@/api/account";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { fill, useT } from "@/i18n";
import { ApiError } from "@/lib/apiClient";
import { colors, spacing } from "@/theme";

const emailSchema = z.string().trim().email();

// Asks the backend for a reset email. The link in it opens the storefront's
// /reset-password page (the new password is chosen there), then the person
// comes back and signs in here as usual.
export function ForgotPasswordScreen() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setFormError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError(t.account.invalidEmail);
      return;
    }
    setEmailError(undefined);

    try {
      setIsSubmitting(true);
      await requestPasswordReset(parsed.data);
      setSentTo(parsed.data);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t.auth.somethingWrong);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="display" style={styles.title}>
            {sentTo ? t.account.forgotSentTitle : t.account.forgotTitle}
          </AppText>

          {sentTo ? (
            <>
              <AppText variant="body" style={styles.subtitle}>
                {fill(t.account.forgotSentBody, { email: sentTo })}
              </AppText>
              <Button label={t.account.backToSignIn} onPress={() => router.back()} />
            </>
          ) : (
            <>
              <AppText variant="body" style={styles.subtitle}>
                {t.account.forgotSubtitle}
              </AppText>
              <View style={styles.form}>
                <TextField
                  label={t.auth.email}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  keyboardType="email-address"
                  error={emailError}
                />
                {formError ? (
                  <AppText variant="body" style={styles.formError}>
                    {formError}
                  </AppText>
                ) : null}
                <Button label={t.account.forgotSubmit} onPress={handleSubmit} loading={isSubmitting} />
                <Button label={t.account.backToSignIn} variant="outline" onPress={() => router.back()} />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    color: colors.textMuted,
  },
  form: {
    gap: spacing.sm,
  },
  formError: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});

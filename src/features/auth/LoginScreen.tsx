import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { loginSchema } from "@/api/schemas";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/i18n";
import { ApiError } from "@/lib/apiClient";
import { spacing } from "@/theme";

export function LoginScreen() {
  const t = useT();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setFormError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[String(issue.path[0])] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      setIsSubmitting(true);
      await login(result.data);
      router.back();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t.auth.somethingWrong);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="display" style={styles.title}>
          {t.auth.signInTitle}
        </AppText>
        <AppText variant="body" style={styles.subtitle}>
          {t.auth.loginSubtitle}
        </AppText>

        <View style={styles.form}>
          <TextField
            label={t.auth.email}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="username"
            textContentType="username"
            keyboardType="email-address"
            error={fieldErrors.email}
          />
          <TextField
            label={t.auth.password}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            error={fieldErrors.password}
          />

          {formError ? (
            <AppText variant="body" style={styles.formError}>
              {formError}
            </AppText>
          ) : null}

          <Button label={t.common.signIn} onPress={handleSubmit} loading={isSubmitting} />
        </View>

        <View style={styles.footer}>
          <AppText variant="body">{t.auth.noAccount} </AppText>
          <Link href="/(auth)/register" replace asChild>
            <AppText variant="bodyMedium">{t.auth.register}</AppText>
          </Link>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  },
  form: {
    gap: spacing.sm,
  },
  formError: {
    color: "#B3261E",
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
});

import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { registerSchema } from "@/api/schemas";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/i18n";
import { ApiError } from "@/lib/apiClient";
import { spacing } from "@/theme";

const initialForm = {
  name: "",
  email: "",
  password: "",
  phoneNumber: "",
  country: "",
  province: "",
  city: "",
  profession: "",
  instagram: "",
};

export function RegisterScreen() {
  const t = useT();
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (key: keyof typeof initialForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setFormError(null);

    const result = registerSchema.safeParse(form);
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
      await register(result.data);
      router.back();
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
            {t.auth.registerTitle}
          </AppText>
          <AppText variant="body" style={styles.subtitle}>
            {t.auth.registerSubtitle}
          </AppText>

          <View style={styles.form}>
            <TextField label={t.auth.name} value={form.name} onChangeText={setField("name")} error={fieldErrors.name} />
            <TextField
              label={t.auth.email}
              value={form.email}
              onChangeText={setField("email")}
              autoCapitalize="none"
              autoComplete="username"
              textContentType="username"
              keyboardType="email-address"
              error={fieldErrors.email}
            />
            <TextField
              label={t.auth.password}
              value={form.password}
              onChangeText={setField("password")}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              error={fieldErrors.password}
            />
            <TextField
              label={t.auth.phone}
              value={form.phoneNumber}
              onChangeText={setField("phoneNumber")}
              keyboardType="phone-pad"
              error={fieldErrors.phoneNumber}
            />
            <TextField label={t.auth.country} value={form.country} onChangeText={setField("country")} error={fieldErrors.country} />
            <TextField label={t.auth.province} value={form.province} onChangeText={setField("province")} error={fieldErrors.province} />
            <TextField label={t.auth.city} value={form.city} onChangeText={setField("city")} error={fieldErrors.city} />
            <TextField
              label={t.auth.profession}
              value={form.profession}
              onChangeText={setField("profession")}
              error={fieldErrors.profession}
            />
            <TextField
              label={t.auth.instagram}
              value={form.instagram}
              onChangeText={setField("instagram")}
              autoCapitalize="none"
              error={fieldErrors.instagram}
            />

            {formError ? (
              <AppText variant="body" style={styles.formError}>
                {formError}
              </AppText>
            ) : null}

            <Button label={t.common.createAccount} onPress={handleSubmit} loading={isSubmitting} />
          </View>

          <View style={styles.footer}>
            <AppText variant="body">{t.auth.haveAccount} </AppText>
            <Link href="/(auth)/login" replace asChild>
              <AppText variant="bodyMedium">{t.common.signIn}</AppText>
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
    marginBottom: spacing.xl,
  },
});

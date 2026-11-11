import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { submitSourcingRequest, type SourcingInput } from "@/api/sourcing";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { SegmentedControl } from "@/components/SegmentedControl";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/i18n";
import { colors, spacing } from "@/theme";

// The values the storefront's SourcingBlock sends; the admin reads them as-is,
// so they stay in English and only the labels are translated.
const CATEGORIES = ["Bag", "Jacket", "Watch", "Shoes", "Jewelry", "Accessories", "Clothing"] as const;
const CONDITIONS = ["New", "Excellent", "Very Good"] as const;

const EMPTY_FORM: SourcingInput = { request: "", brand: "", category: "", budget: "", condition: "" };

// Personal Sourcing: a signed-in client describes a piece and the Maison looks for it.
export function SourcingScreen() {
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = (key: keyof SourcingInput) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  // Optional choices: tapping the selected one again clears it.
  const toggle = (key: "category" | "condition") => (value: string) =>
    setForm((current) => ({ ...current, [key]: current[key] === value ? "" : value }));

  const conditionLabels: Record<(typeof CONDITIONS)[number], string> = {
    New: t.sourcing.conditionNew,
    Excellent: t.sourcing.conditionExcellent,
    "Very Good": t.sourcing.conditionVeryGood,
  };

  const handleSubmit = async () => {
    if (!form.request.trim()) {
      setFormError(t.sourcing.required);
      return;
    }
    setFormError(null);
    setIsSending(true);
    try {
      await submitSourcingRequest(form);
      setIsSent(true);
    } catch {
      setFormError(t.sourcing.error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="caption" style={styles.eyebrow}>
            {t.sourcing.label}
          </AppText>
          <AppText variant="display" style={styles.title}>
            {t.sourcing.title}
          </AppText>
          <AppText variant="body" style={styles.muted}>
            {t.sourcing.description}
          </AppText>

          {isSent ? (
            <View style={styles.sentBox}>
              <AppText variant="body" style={styles.sentText}>
                {t.sourcing.success}
              </AppText>
            </View>
          ) : !user ? (
            <View style={styles.signIn}>
              <AppText variant="body" style={styles.muted}>
                {t.sourcing.signInPrompt}
              </AppText>
              <Button label={t.common.signIn} onPress={() => router.push("/(auth)/login")} />
            </View>
          ) : (
            <View style={styles.form}>
              <TextField
                label={t.sourcing.request}
                value={form.request}
                onChangeText={set("request")}
                placeholder={t.sourcing.requestExample}
                multiline
                maxLength={2000}
                style={styles.requestInput}
              />
              <TextField label={`${t.sourcing.brand} (${t.common.optional})`} value={form.brand} onChangeText={set("brand")} maxLength={120} />
              <TextField
                label={`${t.sourcing.budget} (${t.common.optional})`}
                value={form.budget}
                onChangeText={set("budget")}
                placeholder={t.sourcing.budgetPlaceholder}
                maxLength={60}
              />

              <AppText variant="caption" style={styles.choiceLabel}>
                {`${t.sourcing.category} (${t.common.optional})`}
              </AppText>
              <SegmentedControl
                options={CATEGORIES.map((value) => ({ value, label: t.sourcing.categories[value] }))}
                value={form.category}
                onChange={toggle("category")}
                wrap
              />

              <AppText variant="caption" style={styles.choiceLabel}>
                {`${t.sourcing.condition} (${t.common.optional})`}
              </AppText>
              <SegmentedControl
                options={CONDITIONS.map((value) => ({ value, label: conditionLabels[value] }))}
                value={form.condition}
                onChange={toggle("condition")}
              />

              {formError ? (
                <AppText variant="body" style={styles.errorText}>
                  {formError}
                </AppText>
              ) : null}

              <Button label={t.sourcing.submit} onPress={handleSubmit} loading={isSending} style={styles.submitButton} />
              <AppText variant="caption" style={styles.microcopy}>
                {t.sourcing.microcopy}
              </AppText>
            </View>
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
    paddingBottom: spacing.xxl,
  },
  eyebrow: {
    color: colors.gold,
  },
  title: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  muted: {
    color: colors.textMuted,
  },
  form: {
    marginTop: spacing.xl,
  },
  requestInput: {
    height: 88,
    paddingTop: spacing.sm,
    textAlignVertical: "top",
  },
  choiceLabel: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    marginTop: spacing.md,
    color: colors.danger,
  },
  submitButton: {
    marginTop: spacing.xl,
  },
  microcopy: {
    marginTop: spacing.md,
    textAlign: "center",
    color: colors.textMuted,
    textTransform: "none",
  },
  signIn: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  sentBox: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  sentText: {
    textAlign: "center",
  },
});

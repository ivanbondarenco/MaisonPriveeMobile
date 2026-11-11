import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { sendAuthenticityInquiry } from "@/api/contact";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/i18n";
import { env } from "@/lib/env";
import { colors, spacing } from "@/theme";

// The question form from the storefront's /authenticity page. The long-form
// guarantee stays on the website and opens from here, so its copy is edited in
// one place.
export function AuthenticityScreen() {
  const t = useT();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Signed in, the Maison already knows who is asking.
  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      name: current.name || user.name || "",
      email: current.email || user.email || "",
    }));
  }, [user]);

  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setFormError(t.authenticity.required);
      return;
    }
    setFormError(null);
    setIsSending(true);
    try {
      await sendAuthenticityInquiry({ name: form.name.trim(), email: form.email.trim(), message: form.message.trim() });
      setIsSent(true);
    } catch {
      setFormError(t.authenticity.error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="caption" style={styles.eyebrow}>
            {t.authenticity.eyebrow}
          </AppText>
          <AppText variant="display" style={styles.title}>
            {t.authenticity.heading}
          </AppText>
          <AppText variant="body" style={styles.muted}>
            {t.authenticity.intro}
          </AppText>
          <Pressable
            accessibilityRole="link"
            onPress={() => WebBrowser.openBrowserAsync(`${env.siteUrl}/authenticity`).catch(() => {})}
            style={styles.guaranteeLink}
          >
            <AppText variant="label" style={styles.underline}>
              {t.authenticity.guaranteeLink}
            </AppText>
          </Pressable>

          <AppText variant="display" style={styles.formTitle}>
            {t.authenticity.formTitle}
          </AppText>

          {isSent ? (
            <View style={styles.sentBox}>
              <AppText variant="displayItalic" style={styles.centered}>
                {t.authenticity.sentTitle}
              </AppText>
              <AppText variant="body" style={[styles.centered, styles.muted, styles.sentBody]}>
                {t.authenticity.sentBody}
              </AppText>
            </View>
          ) : (
            <>
              <TextField label={t.authenticity.name} value={form.name} onChangeText={set("name")} maxLength={120} />
              <TextField
                label={t.authenticity.email}
                value={form.email}
                onChangeText={set("email")}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                maxLength={200}
              />
              <TextField
                label={t.authenticity.message}
                value={form.message}
                onChangeText={set("message")}
                placeholder={t.authenticity.messagePlaceholder}
                multiline
                maxLength={5000}
                style={styles.messageInput}
              />
              {formError ? (
                <AppText variant="body" style={styles.errorText}>
                  {formError}
                </AppText>
              ) : null}
              <Button label={t.authenticity.send} onPress={handleSubmit} loading={isSending} style={styles.submitButton} />
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
  guaranteeLink: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  underline: {
    textDecorationLine: "underline",
  },
  formTitle: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    fontSize: 26,
  },
  messageInput: {
    height: 120,
    paddingTop: spacing.sm,
    textAlignVertical: "top",
  },
  errorText: {
    marginTop: spacing.sm,
    color: colors.danger,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
  sentBox: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  centered: {
    textAlign: "center",
  },
  sentBody: {
    marginTop: spacing.sm,
  },
});

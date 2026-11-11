import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { sendPrivateReferral } from "@/api/contact";
import type { PrivateReferralInput } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/i18n";
import { colors, spacing } from "@/theme";

const EMPTY_FORM: PrivateReferralInput = { hostName: "", hostContact: "", guestName: "", guestContact: "", pieces: "" };

// The Private Consignment Circle: a host introduces a collector. There is no cash
// bonus — the Maison grants the privileges by hand once the introduced collector
// completes a first consignment. Open to guests too, like the storefront's form.
export function ReferralScreen() {
  const t = useT();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Signed-in hosts do not retype what the Maison already knows.
  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      hostName: current.hostName || user.name || "",
      hostContact: current.hostContact || user.email || "",
    }));
  }, [user]);

  const set = (key: keyof PrivateReferralInput) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async () => {
    if (!form.hostName.trim() || !form.hostContact.trim() || !form.guestName.trim() || !form.guestContact.trim()) {
      setFormError(t.referral.required);
      return;
    }
    setFormError(null);
    setIsSending(true);
    try {
      await sendPrivateReferral(form);
      setIsSent(true);
    } catch {
      setFormError(t.referral.error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="caption" style={styles.eyebrow}>
            {t.referral.eyebrow}
          </AppText>
          <AppText variant="display" style={styles.title}>
            {t.referral.title}
          </AppText>
          <AppText variant="displayItalic" style={styles.subtitle}>
            {t.referral.subtitle}
          </AppText>
          <AppText variant="body" style={styles.intro}>
            {t.referral.intro}
          </AppText>

          <AppText variant="label" style={styles.sectionLabel}>
            {t.referral.privilegesLabel}
          </AppText>
          <View style={styles.privileges}>
            {t.referral.privileges.map((privilege, index) => (
              <View key={privilege.title} style={styles.privilege}>
                <AppText variant="display" style={styles.privilegeNumber}>
                  {`0${index + 1}`}
                </AppText>
                <View style={styles.privilegeText}>
                  <AppText variant="bodyMedium">{privilege.title}</AppText>
                  <AppText variant="body" style={styles.muted}>
                    {privilege.body}
                  </AppText>
                </View>
              </View>
            ))}
          </View>

          <AppText variant="display" style={styles.formTitle}>
            {t.referral.formTitle}
          </AppText>

          {isSent ? (
            <View style={styles.sentBox}>
              <AppText variant="displayItalic" style={styles.sentTitle}>
                {t.referral.sentTitle}
              </AppText>
              <AppText variant="body" style={styles.sentBody}>
                {t.referral.sentBody}
              </AppText>
            </View>
          ) : (
            <>
              <AppText variant="label" style={styles.legend}>
                {t.referral.hostLegend}
              </AppText>
              <TextField label={t.referral.hostName} value={form.hostName} onChangeText={set("hostName")} maxLength={120} />
              <TextField
                label={t.referral.hostContact}
                value={form.hostContact}
                onChangeText={set("hostContact")}
                autoCapitalize="none"
                maxLength={200}
              />

              <AppText variant="label" style={styles.legend}>
                {t.referral.guestLegend}
              </AppText>
              <TextField label={t.referral.guestName} value={form.guestName} onChangeText={set("guestName")} maxLength={120} />
              <TextField
                label={t.referral.guestContact}
                value={form.guestContact}
                onChangeText={set("guestContact")}
                autoCapitalize="none"
                maxLength={200}
              />

              <TextField
                label={t.referral.pieces}
                value={form.pieces}
                onChangeText={set("pieces")}
                placeholder={t.referral.piecesPlaceholder}
                multiline
                maxLength={2000}
                style={styles.piecesInput}
              />

              {formError ? (
                <AppText variant="body" style={styles.errorText}>
                  {formError}
                </AppText>
              ) : null}

              <Button label={t.referral.submit} onPress={handleSubmit} loading={isSending} style={styles.submitButton} />
            </>
          )}

          <AppText variant="caption" style={styles.note}>
            {t.referral.note}
          </AppText>
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
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.textMuted,
  },
  intro: {
    marginTop: spacing.md,
    color: colors.textMuted,
  },
  muted: {
    color: colors.textMuted,
  },
  sectionLabel: {
    marginTop: spacing.xl,
    color: colors.gold,
  },
  privileges: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  privilege: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  privilegeNumber: {
    fontSize: 22,
    color: colors.gold,
  },
  privilegeText: {
    flex: 1,
    gap: spacing.xs,
  },
  formTitle: {
    marginTop: spacing.xxl,
    fontSize: 26,
  },
  legend: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.textMuted,
  },
  piecesInput: {
    height: 88,
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
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  sentTitle: {
    textAlign: "center",
  },
  sentBody: {
    marginTop: spacing.sm,
    textAlign: "center",
    color: colors.textMuted,
  },
  note: {
    marginTop: spacing.xl,
    textAlign: "center",
    color: colors.textMuted,
    textTransform: "none",
  },
});

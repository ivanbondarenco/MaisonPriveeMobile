import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import type { ProfileInput } from "@/api/account";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { CountryPicker, countryCodeFromName, countryName } from "@/components/CountryPicker";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { ApiError } from "@/lib/apiClient";
import { colors, spacing } from "@/theme";

type Form = Omit<ProfileInput, "linkedin"> & { linkedin: string };

// The same fields the storefront's profile page edits (PUT /users/profile).
// The email is the login and can't be changed from either client.
export function EditProfileScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const [form, setForm] = useState<Form>(() => ({
    name: user?.name ?? "",
    phoneNumber: user?.phoneNumber ?? "",
    country: user?.country ?? "",
    province: user?.province ?? "",
    city: user?.city ?? "",
    profession: user?.profession ?? "",
    instagram: user?.instagram ?? "",
    linkedin: user?.linkedin ?? "",
  }));
  // The picker works with ISO codes; the backend stores the country's name.
  const [countryCode, setCountryCode] = useState(() => countryCodeFromName(user?.country));
  const [nameError, setNameError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const setField = (key: keyof Form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setFormError(null);
    if (!form.name.trim()) {
      setNameError(t.account.nameRequired);
      return;
    }
    setNameError(undefined);

    try {
      setIsSaving(true);
      await updateProfile({
        ...form,
        name: form.name.trim(),
        linkedin: form.linkedin.trim() || null,
      });
      Alert.alert(t.account.saved);
      router.back();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t.auth.somethingWrong);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return <Screen />;

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField label={t.auth.email} value={user.email} editable={false} style={styles.locked} />
          <AppText variant="caption" style={styles.lockedHint}>
            {t.account.emailLocked}
          </AppText>

          <View style={styles.form}>
            <TextField label={t.auth.name} value={form.name} onChangeText={setField("name")} maxLength={100} error={nameError} />
            <TextField
              label={t.auth.phone}
              value={form.phoneNumber}
              onChangeText={setField("phoneNumber")}
              keyboardType="phone-pad"
              maxLength={30}
            />
            <CountryPicker
              label={t.auth.country}
              value={countryCode}
              onChange={(code) => {
                setCountryCode(code);
                setField("country")(countryName(code, locale));
              }}
            />
            <TextField label={t.auth.province} value={form.province} onChangeText={setField("province")} maxLength={100} />
            <TextField label={t.auth.city} value={form.city} onChangeText={setField("city")} maxLength={100} />
            <TextField label={t.auth.profession} value={form.profession} onChangeText={setField("profession")} maxLength={100} />
            <TextField
              label={t.auth.instagram}
              value={form.instagram}
              onChangeText={setField("instagram")}
              autoCapitalize="none"
              maxLength={100}
            />
            <TextField
              label={t.account.linkedin}
              value={form.linkedin}
              onChangeText={setField("linkedin")}
              autoCapitalize="none"
              maxLength={255}
            />

            {formError ? (
              <AppText variant="body" style={styles.formError}>
                {formError}
              </AppText>
            ) : null}

            <Button label={t.account.save} onPress={handleSave} loading={isSaving} />
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
  locked: {
    color: colors.textMuted,
  },
  lockedHint: {
    marginTop: -spacing.sm,
    color: colors.textMuted,
    textTransform: "none",
  },
  form: {
    marginTop: spacing.lg,
  },
  formError: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});

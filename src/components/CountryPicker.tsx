import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import es from "i18n-iso-countries/langs/es.json";
import fr from "i18n-iso-countries/langs/fr.json";
import pt from "i18n-iso-countries/langs/pt.json";
import zh from "i18n-iso-countries/langs/zh.json";
import { Check, ChevronDown, Search, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useI18n } from "@/i18n";
import { colors, fontFamily, fontSize, letterSpacing, spacing } from "@/theme";
import { AppText } from "./AppText";

// Hermes has no Intl.DisplayNames (what the storefront uses), so the names
// ship with the app instead, one table per supported locale.
[en, es, fr, pt, zh].forEach((data) => countries.registerLocale(data));

type Country = { code: string; name: string; englishName: string };

// Lowercased and stripped of accents, so "peru" finds "Perú" and "cote" finds "Côte d'Ivoire".
function normalize(text: string) {
  try {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  } catch {
    return text.toLowerCase();
  }
}

export function countryName(code: string, locale: string) {
  return countries.getName(code, locale) ?? countries.getName(code, "en") ?? code;
}

/**
 * ISO code for a country stored by name. The backend keeps free text, written in
 * whatever language the person signed up in, so every registered language is tried.
 */
export function countryCodeFromName(name: string | null | undefined): string {
  if (!name) return "";
  for (const lang of ["en", "es", "fr", "pt", "zh"]) {
    const code = countries.getAlpha2Code(name, lang);
    if (code) return code;
  }
  return "";
}

type CountryPickerProps = {
  label: string;
  /** ISO 3166-1 alpha-2 code, e.g. "AR". */
  value: string;
  onChange: (code: string) => void;
  error?: string;
};

/**
 * Dropdown of every country, named in the app's language, with a search box
 * that matches the local name, the English name or the ISO code. Hands back
 * the ISO-2 code, like the storefront's checkout <select>.
 */
export function CountryPicker({ label, value, onChange, error }: CountryPickerProps) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo<Country[]>(() => {
    const localNames = countries.getNames(locale, { select: "official" });
    const englishNames = countries.getNames("en", { select: "official" });
    return Object.keys(englishNames)
      .map((code) => ({ code, name: localNames[code] ?? englishNames[code]!, englishName: englishNames[code]! }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options;
    return options.filter(
      (c) => normalize(c.name).includes(q) || normalize(c.englishName).includes(q) || c.code.toLowerCase() === q
    );
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const select = (code: string) => {
    onChange(code);
    close();
  };

  const selectedName = value ? countryName(value, locale) : "";

  return (
    <View style={styles.container}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <Pressable
        style={[styles.field, error && styles.fieldError]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selectedName || t.common.selectCountry }}
      >
        <AppText variant="body" style={[styles.fieldText, !selectedName && styles.placeholder]} numberOfLines={1}>
          {selectedName || t.common.selectCountry}
        </AppText>
        <ChevronDown size={18} color={colors.textMuted} strokeWidth={1.5} />
      </Pressable>
      {error ? (
        <AppText variant="caption" style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <SafeAreaView style={styles.sheet} edges={["bottom", "left", "right"]}>
          <View style={styles.sheetHeader}>
            <AppText variant="label">{label}</AppText>
            <Pressable onPress={close} hitSlop={8} accessibilityRole="button" accessibilityLabel={t.common.cancel}>
              <X size={20} color={colors.primary} strokeWidth={1.5} />
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <Search size={18} color={colors.textMuted} strokeWidth={1.5} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t.common.searchCountry}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus
              clearButtonMode="while-editing"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (filtered.length === 1) select(filtered[0]!.code);
              }}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(c) => c.code}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={20}
            ListEmptyComponent={
              <AppText variant="body" style={styles.empty}>
                {t.common.noCountryResults}
              </AppText>
            }
            renderItem={({ item }) => {
              const selected = item.code === value;
              return (
                <Pressable
                  style={styles.option}
                  onPress={() => select(item.code)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <AppText variant={selected ? "bodyMedium" : "body"} style={styles.optionText} numberOfLines={1}>
                    {item.name}
                  </AppText>
                  {selected ? <Check size={18} color={colors.primary} strokeWidth={1.5} /> : null}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
  },
  field: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  fieldError: {
    borderBottomColor: colors.danger,
  },
  fieldText: {
    flex: 1,
    color: colors.textLight,
  },
  placeholder: {
    color: colors.textMuted,
  },
  error: {
    marginTop: spacing.xs,
    color: colors.danger,
    textTransform: "none",
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.body,
    color: colors.textLight,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  optionText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});

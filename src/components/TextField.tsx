import { TextInput, type TextInputProps, View, StyleSheet } from "react-native";

import { colors, fontFamily, fontSize, letterSpacing, spacing } from "@/theme";
import { AppText } from "./AppText";

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error && styles.inputError, style]}
        {...props}
      />
      {error ? (
        <AppText variant="caption" style={styles.error}>
          {error}
        </AppText>
      ) : null}
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
  input: {
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.body,
    color: colors.textLight,
  },
  inputError: {
    borderBottomColor: colors.danger,
  },
  error: {
    marginTop: spacing.xs,
    color: colors.danger,
    textTransform: "none",
  },
});

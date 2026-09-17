import { ActivityIndicator, Pressable, type PressableProps, StyleSheet } from "react-native";

import { colors, fontFamily, fontSize, letterSpacing, radius, spacing } from "@/theme";
import { AppText } from "./AppText";

type Variant = "primary" | "outline";

type ButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
};

export function Button({ label, variant = "primary", loading, disabled, style, ...props }: ButtonProps) {
  const isOutline = variant === "outline";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isOutline ? styles.outline : styles.primary,
        pressed && !disabled && (isOutline ? styles.outlinePressed : styles.primaryPressed),
        (disabled || loading) && styles.disabled,
        typeof style === "function" ? undefined : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.primary : colors.white} />
      ) : (
        <AppText
          variant="label"
          style={[styles.label, isOutline ? styles.outlineLabel : styles.primaryLabel]}
        >
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.none,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.gold,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outlinePressed: {
    borderColor: colors.gold,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.labelWide,
  },
  primaryLabel: {
    color: colors.white,
  },
  outlineLabel: {
    color: colors.primary,
  },
});

import { Text, type TextProps, type TextStyle } from "react-native";

import { colors, fontFamily, fontSize, letterSpacing } from "@/theme";

type Variant = "display" | "displayItalic" | "label" | "labelWide" | "body" | "bodyMedium" | "caption";

const variantStyles: Record<Variant, TextStyle> = {
  display: {
    fontFamily: fontFamily.displayRegular,
    fontSize: fontSize.xxl,
    color: colors.textLight,
  },
  displayItalic: {
    fontFamily: fontFamily.displayItalic,
    fontSize: fontSize.xl,
    color: colors.textLight,
  },
  label: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.label,
    textTransform: "uppercase",
    color: colors.textLight,
  },
  labelWide: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.labelWide,
    textTransform: "uppercase",
    color: colors.textLight,
  },
  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.body,
    color: colors.textLight,
  },
  bodyMedium: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.body,
    color: colors.textLight,
  },
  caption: {
    fontFamily: fontFamily.bodyLight,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.label,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
};

type AppTextProps = TextProps & { variant?: Variant };

export function AppText({ variant = "body", style, ...props }: AppTextProps) {
  return <Text {...props} style={[variantStyles[variant], style]} />;
}

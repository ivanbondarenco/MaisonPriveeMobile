// Display font: Bodoni Moda (serif headings, matches --font-display on the storefront).
// Body font: Inter (matches --font-inter). Both loaded via useFonts in app/_layout.tsx.
export const fontFamily = {
  displayRegular: "BodoniModa_400Regular",
  displayMedium: "BodoniModa_500Medium",
  displayItalic: "BodoniModa_400Regular_Italic",
  bodyLight: "Inter_300Light",
  bodyRegular: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
} as const;

// Storefront applies a global 0.05em letter-spacing on body text and heavier
// tracking (0.15em-0.25em) on uppercase nav/labels — replicate both here.
export const letterSpacing = {
  body: 0.4, // ~0.05em at 14-16px
  label: 1.8, // ~0.15em at 12px
  labelWide: 3, // ~0.25em at 12px
} as const;

export const fontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
} as const;

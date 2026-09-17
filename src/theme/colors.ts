// Mirrors storefront/src/app/globals.css so the app reads as the same brand.
export const colors = {
  primary: "#1A1A1A", // rich charcoal — text, dark buttons, active states
  secondary: "#E5E1DA", // warm sand
  backgroundLight: "#F9F8F6", // soft alabaster — page background
  borderLight: "#E5E1DA",
  textLight: "#1A1A1A",
  textMuted: "rgba(26, 26, 26, 0.7)",
  terracotta: "#A67B5B", // sold-out / soft accent
  slate: "#333333", // hover state
  gold: "#A68B67", // CTA hover, discount badges, accents
  white: "#FFFFFF",
  danger: "#B3261E",
} as const;

export type ColorToken = keyof typeof colors;

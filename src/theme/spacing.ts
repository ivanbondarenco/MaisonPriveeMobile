export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// The storefront hard-codes --rounded-lg: 0px — sharp corners are a deliberate
// brand cue, not an oversight. Keep radius at 0 everywhere except where noted.
export const radius = {
  none: 0,
  pill: 999, // reserved for badges/avatars only
} as const;

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and point it at the backend."
  );
}

// Public site the referral links point at — the storefront owns /vende?ref=,
// so the link a seller shares from the app has to be a web URL, not a deep link.
const siteUrl = process.env.EXPO_PUBLIC_SITE_URL ?? "https://maisonpriveeatelier.com";

export const env = {
  apiUrl,
  siteUrl,
};

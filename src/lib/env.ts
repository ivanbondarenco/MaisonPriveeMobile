const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and point it at the backend."
  );
}

// Public site the referral links point at — the storefront owns /vende?ref=,
// so the link a seller shares from the app has to be a web URL, not a deep link.
const siteUrl = process.env.EXPO_PUBLIC_SITE_URL ?? "https://maisonpriveeatelier.com";

// The web admin panel the app embeds for ADMIN accounts. Defaults to the live
// site; for local testing point it at the storefront dev server on your LAN IP
// (the phone can't reach "localhost"), e.g. http://192.168.0.4:3000/admin.
const adminUrl = process.env.EXPO_PUBLIC_ADMIN_URL ?? `${siteUrl}/admin`;

export const env = {
  apiUrl,
  siteUrl,
  adminUrl,
};

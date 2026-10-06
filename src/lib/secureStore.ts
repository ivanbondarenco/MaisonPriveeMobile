import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "mp_auth_token";
const AUTH_REFRESH_TOKEN_KEY = "mp_auth_refresh_token";
const AUTH_USER_KEY = "mp_auth_user";
const CART_LINES_KEY = "mp_cart_lines";
const LOCALE_KEY = "mp_locale";

export const tokenStore = {
  get: () => SecureStore.getItemAsync(AUTH_TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(AUTH_TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
};

// Refresh token: only set for mobile sessions (backend issues it when platform:"ios"
// is sent on login/register). Web has no equivalent — nothing to migrate here.
export const refreshTokenStore = {
  get: () => SecureStore.getItemAsync(AUTH_REFRESH_TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(AUTH_REFRESH_TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(AUTH_REFRESH_TOKEN_KEY),
};

export const userStore = {
  get: async <T,>(): Promise<T | null> => {
    const raw = await SecureStore.getItemAsync(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  set: (user: unknown) => SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user)),
  clear: () => SecureStore.deleteItemAsync(AUTH_USER_KEY),
};

// Only {productId, quantity} pairs are persisted — never full product objects,
// which are too large/stale-prone for SecureStore. Full product data is
// re-fetched on hydration so price/stock stay current.
export const cartLinesStore = {
  get: async <T,>(): Promise<T | null> => {
    const raw = await SecureStore.getItemAsync(CART_LINES_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  set: (lines: unknown) => SecureStore.setItemAsync(CART_LINES_KEY, JSON.stringify(lines)),
  clear: () => SecureStore.deleteItemAsync(CART_LINES_KEY),
};

// Language choice: not a secret, but SecureStore is already the app's only
// persistence layer — no need to pull in AsyncStorage for one key.
export const localeStore = {
  get: () => SecureStore.getItemAsync(LOCALE_KEY),
  set: (locale: string) => SecureStore.setItemAsync(LOCALE_KEY, locale),
};

// Referrer's user id captured from an incoming ?ref= link (same role as the
// storefront's localStorage "mp_ref"); sent as referredBy on register, then cleared.
const REFERRAL_KEY = "mp_ref";

export const referralStore = {
  get: () => SecureStore.getItemAsync(REFERRAL_KEY),
  set: (ref: string) => SecureStore.setItemAsync(REFERRAL_KEY, ref),
  clear: () => SecureStore.deleteItemAsync(REFERRAL_KEY),
};

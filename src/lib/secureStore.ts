import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "mp_auth_token";
const AUTH_REFRESH_TOKEN_KEY = "mp_auth_refresh_token";
const AUTH_USER_KEY = "mp_auth_user";
const CART_LINES_KEY = "mp_cart_lines";

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

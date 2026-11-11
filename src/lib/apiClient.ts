import { env } from "./env";
import { tokenStore, refreshTokenStore } from "./secureStore";

export class ApiError extends Error {
  constructor(public status: number, message: string, public payload?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
  }
}

// Optional-auth routes (the catalogue) treat an expired token as anonymous
// instead of answering 403, so the retry below never fires for them: check the
// expiry up front. Malformed tokens count as live and fall back to the 403 path.
function isExpired(token: string, marginMs = 0) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now() + marginMs;
  } catch {
    return false;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean; // attach the stored bearer token, default true
};

async function rawRequest(path: string, method: string, headers: Record<string, string>, body: unknown) {
  const response = await fetch(`${env.apiUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : undefined;
  return { response, payload };
}

// Called when the backend rejects the refresh token: the tokens are already
// wiped here, and AuthContext must drop the stored user too — otherwise the UI
// keeps showing a signed-in account whose every request goes out unauthenticated.
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

// Single-flight refresh: concurrent 401s while a refresh is already in progress
// wait on the same promise instead of each firing their own /users/refresh call.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const storedRefreshToken = await refreshTokenStore.get();
      if (!storedRefreshToken) return null;

      const { response, payload } = await rawRequest(
        "/users/refresh",
        "POST",
        { "Content-Type": "application/json" },
        { refreshToken: storedRefreshToken }
      );

      if (!response.ok) {
        // Refresh token itself is invalid/expired/revoked — session is over.
        await Promise.all([tokenStore.clear(), refreshTokenStore.clear()]);
        sessionExpiredHandler?.();
        return null;
      }

      await Promise.all([tokenStore.set(payload.token), refreshTokenStore.set(payload.refreshToken)]);
      return payload.token as string;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * An access token good for at least `minValidityMs` more, refreshing it first
 * if needed — for code that hands the token to something that can't refresh it
 * itself (the embedded web admin). Null when the session is over.
 */
export async function getValidAccessToken(minValidityMs = 5 * 60 * 1000): Promise<string | null> {
  const token = await tokenStore.get();
  if (token && !isExpired(token, minValidityMs)) return token;
  return refreshAccessToken();
}

/** Whether `token` still has at least `minValidityMs` to live. */
export function isTokenFresh(token: string, minValidityMs = 0) {
  return !isExpired(token, minValidityMs);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    let token = await tokenStore.get();
    if (token && isExpired(token) && path !== "/users/refresh") token = await refreshAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let { response, payload } = await rawRequest(path, method, headers, body);

  // A short-lived mobile access token expired mid-session — refresh once and retry.
  if (!response.ok && response.status === 403 && auth && path !== "/users/refresh") {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      ({ response, payload } = await rawRequest(path, method, headers, body));
    }
  }

  if (!response.ok) {
    const message = payload?.error ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}

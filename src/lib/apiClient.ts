import { env } from "./env";
import { tokenStore, refreshTokenStore } from "./secureStore";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
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

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = await tokenStore.get();
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
    throw new ApiError(response.status, message);
  }

  return payload as T;
}

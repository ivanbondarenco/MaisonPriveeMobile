import { apiRequest } from "@/lib/apiClient";
import type { AuthResponse } from "./types";
import type { LoginInput, RegisterInput } from "./schemas";

export const login = (input: LoginInput) =>
  apiRequest<AuthResponse>("/users/login", {
    method: "POST",
    body: { ...input, platform: "ios" },
    auth: false,
  });

// referredBy: the referrer's user id from a ?ref= link. The backend ignores ids
// that don't match a user, so a stale one can't block the sign-up.
export const register = (input: RegisterInput, referredBy?: string | null) =>
  apiRequest<AuthResponse>("/users/register", {
    method: "POST",
    body: { ...input, referredBy: referredBy ?? null, platform: "ios" },
    auth: false,
  });

export const refresh = (refreshToken: string) =>
  apiRequest<{ token: string; refreshToken: string }>("/users/refresh", {
    method: "POST",
    body: { refreshToken },
    auth: false,
  });

export const logout = (refreshToken: string) =>
  apiRequest<{ ok: true }>("/users/logout", { method: "POST", body: { refreshToken }, auth: false });

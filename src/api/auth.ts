import { apiRequest } from "@/lib/apiClient";
import type { AuthResponse } from "./types";
import type { LoginInput, RegisterInput } from "./schemas";

export const login = (input: LoginInput) =>
  apiRequest<AuthResponse>("/users/login", {
    method: "POST",
    body: { ...input, platform: "ios" },
    auth: false,
  });

export const register = (input: RegisterInput) =>
  apiRequest<AuthResponse>("/users/register", {
    method: "POST",
    body: { ...input, platform: "ios" },
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

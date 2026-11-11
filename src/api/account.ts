import { apiRequest } from "@/lib/apiClient";
import type { User } from "./types";

// The backend always answers success here, whether or not the email has an
// account, so the response never reveals who is registered. The reset link in
// the email opens the storefront's /reset-password page.
export const requestPasswordReset = (email: string) =>
  apiRequest<{ message: string }>("/users/forgot-password", {
    method: "POST",
    body: { email },
    auth: false,
  });

// PUT /users/profile: same fields the storefront's profile page edits. The email
// can't be changed from either client.
export type ProfileInput = {
  name: string;
  phoneNumber: string;
  country: string;
  province: string;
  city: string;
  profession: string;
  instagram: string;
  linkedin: string | null;
};

export const updateProfile = (input: ProfileInput) =>
  apiRequest<{ user: User }>("/users/profile", { method: "PUT", body: input });

// DELETE /users/me: anonymizes the account (orders and consignments stay as
// records, everything identifying is wiped) and revokes every session.
// Required by App Store Review Guideline 5.1.1(v).
export const deleteAccount = (password: string) =>
  apiRequest<{ ok: true }>("/users/me", { method: "DELETE", body: { password } });

import { apiRequest } from "@/lib/apiClient";
import type { PrivateReferralInput } from "./types";

export const sendPrivateReferral = (input: PrivateReferralInput) =>
  apiRequest<{ ok: true }>("/contact/private-referral", { method: "POST", body: input });

// The question form on the storefront's /authenticity page; emailed to the Maison.
export const sendAuthenticityInquiry = (input: { name: string; email: string; message: string }) =>
  apiRequest<{ ok: true }>("/contact/authenticity", { method: "POST", body: input, auth: false });

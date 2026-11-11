import { apiRequest } from "@/lib/apiClient";
import type { PrivateReferralInput } from "./types";

export const sendPrivateReferral = (input: PrivateReferralInput) =>
  apiRequest<{ ok: true }>("/contact/private-referral", { method: "POST", body: input });

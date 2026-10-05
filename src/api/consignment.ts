import { File } from "expo-file-system";
import { fetch } from "expo/fetch";

import { ApiError, apiRequest } from "@/lib/apiClient";
import { env } from "@/lib/env";
import type { Consignment } from "./types";

export type ConsignmentSubmission = {
  name: string;
  email: string;
  brand: string;
  category: string;
  size: string;
  condition: string;
  material: string;
  color: string;
  yearCollection: string;
  serialNumber: string;
  packaging: string;
  priceExpectation: string;
  notes: string;
  acceptOffers: boolean;
  submissionType: "CONSIGNMENT" | "INSTANT_LIQUIDITY";
  payoutMethod: "CASH" | "CREDIT";
  photoUris: string[];
};

// POST /api/consignment is public and multer-backed (upload.array('photos', 10)),
// so it only reads text fields and files out of a multipart body — the same
// FormData the storefront's ConsignFormModal sends. expo-file-system's File
// implements Blob, which is what expo/fetch's multipart encoder needs (a bare
// {uri,type,name} part is not supported there).
export async function submitConsignment(input: ConsignmentSubmission) {
  const form = new FormData();

  form.append("name", input.name);
  form.append("email", input.email);
  form.append("brand", input.brand);
  form.append("category", input.category);
  form.append("size", input.size);
  form.append("condition", input.condition);
  form.append("material", input.material);
  form.append("color", input.color);
  form.append("yearCollection", input.yearCollection);
  form.append("serialNumber", input.serialNumber);
  form.append("packaging", input.packaging);
  form.append("priceExpectation", input.priceExpectation);
  form.append("notes", input.notes);
  form.append("acceptOffers", input.acceptOffers ? "true" : "false");
  form.append("submissionType", input.submissionType);
  form.append("payoutMethod", input.payoutMethod);

  for (const uri of input.photoUris) {
    form.append("photos", new File(uri) as unknown as Blob);
  }

  // No Content-Type header on purpose: the encoder sets it with its boundary.
  const response = await fetch(`${env.apiUrl}/consignment`, { method: "POST", body: form });
  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new ApiError(response.status, payload?.error ?? "Failed to send submission. Please try again.");
  }

  return payload as { success: true; id: string };
}

export const getMyConsignments = () => apiRequest<Consignment[]>("/consignment/mine");

// Uploaded photos are served by the backend's static /uploads route, which sits
// at the host root rather than under /api.
export const consignmentPhotoUrl = (photoPath: string) =>
  `${env.apiUrl.replace(/\/api\/?$/, "")}${photoPath}`;

export const MAX_CONSIGNMENT_PHOTOS = 10; // multer caps the array at 10 server-side

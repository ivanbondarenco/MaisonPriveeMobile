import { File, UploadType } from "expo-file-system";

import { apiRequest } from "@/lib/apiClient";
import { env } from "@/lib/env";
import type { CouponValidation, Order, ShippingAddress, ShippingRate } from "./types";

export const getMyOrders = () => apiRequest<Order[]>("/orders/mine");

export const getShippingRates = (payload: {
  zip: string;
  country: string;
  city?: string;
  address?: string;
  items: { productId: string; quantity: number }[];
}) =>
  apiRequest<{ rates: ShippingRate[] }>("/shipping/rates", {
    method: "POST",
    body: payload,
    auth: false,
  });

export const validateCoupon = (code: string, subtotal: number) =>
  apiRequest<CouponValidation>("/coupons/validate", { method: "POST", body: { code, subtotal } });

export const createOrder = (payload: {
  totalAmount: number;
  shippingProvider?: string;
  shippingMethod?: string;
  shippingCost?: number;
  shippingAddress: ShippingAddress;
  recipientName: string;
  recipientPhone: string;
  recipientTaxId?: string;
  paymentType: "TRANSFER";
  transferProofUrl?: string | null;
  couponCode?: string;
  items: { productId: string; quantity: number; price: number }[];
}) => apiRequest<Order>("/orders", { method: "POST", body: payload });

export async function uploadTransferProof(fileUri: string, mimeType: string) {
  // Hand-rolled FormData + fetch with a {uri,type,name} part is the classic RN
  // pattern, but expo/fetch's multipart encoder explicitly doesn't support
  // uri-based parts (only real Blob/File) — expo-file-system's File.upload()
  // is the SDK's dedicated API for this and handles the native multipart body itself.
  const file = new File(fileUri);
  const result = await file.upload(`${env.apiUrl}/upload/public`, {
    uploadType: UploadType.MULTIPART,
    fieldName: "image",
    mimeType,
  });
  const payload = result.body ? JSON.parse(result.body) : undefined;
  if (result.status < 200 || result.status >= 300) {
    throw new Error(payload?.error ?? "Upload failed");
  }
  return payload as { url: string; filename: string };
}

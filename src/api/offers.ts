import { apiRequest } from "@/lib/apiClient";

export const submitOffer = (productId: string, offeredPrice: number) =>
  apiRequest<{ message?: string }>(`/consignment/offer/${productId}`, {
    method: "POST",
    body: { offeredPrice },
  });

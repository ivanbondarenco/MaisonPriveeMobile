import { apiRequest } from "@/lib/apiClient";
import type { ReceivedOffer } from "./types";

export const submitOffer = (productId: string, offeredPrice: number) =>
  apiRequest<{ message?: string }>(`/consignment/offer/${productId}`, {
    method: "POST",
    body: { offeredPrice },
  });

export const getReceivedOffers = () => apiRequest<ReceivedOffer[]>("/offers/received");

// Accepting is a server-side transaction: it reprices the piece to the offered
// amount and auto-rejects every other pending offer on it. Nothing to mirror here.
export const respondToOffer = (id: string, action: "ACCEPT" | "REJECT") =>
  apiRequest<ReceivedOffer>(`/offers/${id}/respond`, { method: "PATCH", body: { action } });

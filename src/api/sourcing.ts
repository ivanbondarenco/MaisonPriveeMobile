import { apiRequest } from "@/lib/apiClient";

// Personal Sourcing: a signed-in client describes a piece they're looking for and
// the Maison searches for it (storefront: components/store/SourcingBlock.tsx).
export type SourcingInput = {
  request: string;
  brand: string;
  category: string;
  budget: string;
  condition: string;
};

export const submitSourcingRequest = (input: SourcingInput) =>
  apiRequest<{ success: true; id: string }>("/sourcing", { method: "POST", body: input });

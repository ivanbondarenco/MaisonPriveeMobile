import { apiRequest } from "@/lib/apiClient";

export const syncCart = (items: { productId: string; quantity: number }[]) =>
  apiRequest<{ message: string }>("/carts/sync", { method: "POST", body: { items } });

export const getCart = () =>
  apiRequest<{ items: { productId: string; quantity: number }[] }>("/carts/mine");

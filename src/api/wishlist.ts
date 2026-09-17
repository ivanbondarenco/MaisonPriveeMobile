import { apiRequest } from "@/lib/apiClient";
import type { Product } from "./types";

export const getWishlist = () => apiRequest<Product[]>("/wishlists");

export const addToWishlist = (productId: string) =>
  apiRequest("/wishlists", { method: "POST", body: { productId } });

export const removeFromWishlist = (productId: string) =>
  apiRequest(`/wishlists/${productId}`, { method: "DELETE" });

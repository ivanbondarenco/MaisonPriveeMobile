import { apiRequest } from "@/lib/apiClient";
import type { Brand, FilterOptions, Product, ProductFilters } from "./types";

function toQueryString(filters: ProductFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const getProducts = (filters: ProductFilters = {}) =>
  apiRequest<Product[]>(`/products${toQueryString(filters)}`, { auth: false });

export const getProduct = (id: string) =>
  apiRequest<Product>(`/products/${id}`, { auth: false });

export const getFilterOptions = () =>
  apiRequest<FilterOptions>("/products/filters/options", { auth: false });

export const getBrands = () => apiRequest<Brand[]>("/brands?onlyLive=true", { auth: false });

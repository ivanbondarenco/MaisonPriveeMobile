import { ApiError, apiRequest } from "@/lib/apiClient";
import type { Brand, CatalogProduct, FilterOptions, Product, ProductFilters } from "./types";

function toQueryString(filters: ProductFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// Signed in, the session goes along: Private Client Registry members (and admins)
// also get the pieces still inside their 24-hour private window.
export const getProducts = (filters: ProductFilters = {}) =>
  apiRequest<CatalogProduct[]>(`/products${toQueryString(filters)}`);

export const getProduct = (id: string) => apiRequest<Product>(`/products/${id}`);

/** The piece exists but is still reserved for the Private Client Registry. */
export const isPrivateReleaseError = (error: unknown) =>
  error instanceof ApiError && error.status === 404 && error.payload?.privateRelease === true;

/** Still inside its 24-hour private window, so only members can see it. */
export const isPrivateRelease = (product: Product) =>
  !!product.publicAt && new Date(product.publicAt).getTime() > Date.now();

export const getFilterOptions = () =>
  apiRequest<FilterOptions>("/products/filters/options", { auth: false });

export const getBrands = () => apiRequest<Brand[]>("/brands?onlyLive=true", { auth: false });

import { apiRequest } from "@/lib/apiClient";
import type { CategoryNode } from "./types";

// Up to three levels (section → category → subcategory). onlyLive drops branches
// with no published product, same as the storefront's navigation.
export const getCategoryTree = () =>
  apiRequest<CategoryNode[]>("/categories?onlyLive=true", { auth: false });

export const categoryTreeQueryKey = ["categories", "tree"] as const;

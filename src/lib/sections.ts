import type { CatalogProduct, Category, CategoryNode, Product } from "@/api/types";

// The storefront's sections (Women / Men) are simply the top-level categories.
// Which categories a piece shows under (descendants, plus the unisex mirror:
// a unisex piece in Women > Shoes also shows under Men > Shoes) is decided by
// the backend and sent as matchCategoryIds, so the web and the app can't disagree.

// Kids was retired from the storefront's navigation. Until the admin empties and
// deletes it, its pieces stay reachable under "All", but it gets no tab or tile.
const RETIRED_SECTIONS = ["kids"];

export const visibleSections = (tree: CategoryNode[]) =>
  tree.filter((node) => !RETIRED_SECTIONS.includes(node.name.toLowerCase()));

/** Category name in the active language; without an admin translation, the base name. */
export const categoryLabel = (category: Pick<Category, "name" | "translations">, locale: string) =>
  category.translations?.[locale] || category.name;

export function findCategory(tree: CategoryNode[], id: string): CategoryNode | undefined {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findCategory(node.children ?? [], id);
    if (found) return found;
  }
  return undefined;
}

function findPath(tree: CategoryNode[], id: string): CategoryNode[] {
  for (const node of tree) {
    if (node.id === id) return [node];
    const rest = findPath(node.children ?? [], id);
    if (rest.length) return [node, ...rest];
  }
  return [];
}

/** Top-level section a category belongs to (itself, if it is one). */
export function sectionOf(tree: CategoryNode[], id: string): string | null {
  return findPath(tree, id)[0]?.id ?? null;
}

/** Products listed under a category (all of them when none is picked). */
export function filterByCategory<P extends CatalogProduct>(products: P[], categoryId: string | null) {
  if (!categoryId) return products;
  return products.filter((p) => p.matchCategoryIds.includes(categoryId));
}

export const isAvailable = (p: Product) => !p.isSoldOut && p.stock > 0;

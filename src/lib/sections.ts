import type { CategoryNode, Product } from "@/api/types";

// The storefront's sections (Women / Men / Kids) are simply the top-level
// categories, and the backend has no section filter: the web narrows the full
// product list on the client, so the app does the same with the same rules.

// Men and Women mirror each other: a unisex piece filed under Women > Shoes also
// shows under Men > Shoes (matched by name path, like ProductsListView on the web).
const UNISEX_SECTIONS = ["men", "women"];

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

function collectIds(node: CategoryNode, into = new Set<string>()) {
  into.add(node.id);
  (node.children ?? []).forEach((child) => collectIds(child, into));
  return into;
}

function mirrorIds(tree: CategoryNode[], categoryId: string) {
  const ids = new Set<string>();
  const path = findPath(tree, categoryId);
  const sectionName = path[0]?.name.toLowerCase();
  if (!sectionName || !UNISEX_SECTIONS.includes(sectionName)) return ids;

  for (const other of tree) {
    const otherName = other.name.toLowerCase();
    if (otherName === sectionName || !UNISEX_SECTIONS.includes(otherName)) continue;
    let node: CategoryNode | undefined = other;
    for (const step of path.slice(1)) {
      node = node?.children?.find((c) => c.name.toLowerCase() === step.name.toLowerCase());
      if (!node) break;
    }
    if (node) collectIds(node, ids);
  }
  return ids;
}

/** Products in a category or any of its descendants (plus unisex mirrors). */
export function filterByCategory(products: Product[], tree: CategoryNode[], categoryId: string | null) {
  if (!categoryId) return products;
  const node = findCategory(tree, categoryId);
  if (!node) return [];
  const ids = collectIds(node);
  const mirrors = mirrorIds(tree, categoryId);
  return products.filter((p) => ids.has(p.categoryId) || (p.isUnisex && mirrors.has(p.categoryId)));
}

export const isAvailable = (p: Product) => !p.isSoldOut && p.stock > 0;

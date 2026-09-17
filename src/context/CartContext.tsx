import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { getProduct } from "@/api/products";
import { syncCart, getCart } from "@/api/cart";
import type { Product } from "@/api/types";
import { cartLinesStore } from "@/lib/secureStore";
import { useAuth } from "./AuthContext";

export type CartLine = { product: Product; quantity: number };
type StoredLine = { productId: string; quantity: number };

type Action =
  | { type: "hydrate"; lines: CartLine[] }
  | { type: "merge"; lines: CartLine[] }
  | { type: "add"; product: Product; quantity: number }
  | { type: "remove"; productId: string }
  | { type: "setQuantity"; productId: string; quantity: number }
  | { type: "clear" };

function reducer(state: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case "hydrate":
      return action.lines;
    case "merge": {
      const merged = [...state];
      for (const incoming of action.lines) {
        const idx = merged.findIndex((l) => l.product.id === incoming.product.id);
        if (idx === -1) merged.push(incoming);
        else merged[idx] = { ...merged[idx], quantity: Math.max(merged[idx].quantity, incoming.quantity) };
      }
      return merged;
    }
    case "add": {
      const existing = state.find((l) => l.product.id === action.product.id);
      if (existing) {
        return state.map((l) =>
          l.product.id === action.product.id ? { ...l, quantity: l.quantity + action.quantity } : l
        );
      }
      return [...state, { product: action.product, quantity: action.quantity }];
    }
    case "remove":
      return state.filter((l) => l.product.id !== action.productId);
    case "setQuantity":
      if (action.quantity <= 0) return state.filter((l) => l.product.id !== action.productId);
      return state.map((l) => (l.product.id === action.productId ? { ...l, quantity: action.quantity } : l));
    case "clear":
      return [];
    default:
      return state;
  }
}

type CartContextValue = {
  lines: CartLine[];
  isReady: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lines, dispatch] = useReducer(reducer, []);
  const [isReady, setIsReady] = useState(false);
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  // The cart belongs to whoever is signed in. If the account changes (logout,
  // or a different user logs in) drop whatever is left over from the last
  // one instead of carrying it — otherwise it leaks into the new account's
  // cart via the sync-to-server effect below. A guest cart (no user yet)
  // is intentionally spared, so it can still merge into an account on login.
  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    const currentUserId = user?.id ?? null;
    if (previousUserId !== undefined && previousUserId !== null && previousUserId !== currentUserId) {
      dispatch({ type: "clear" });
      cartLinesStore.clear().catch(() => {});
    }
    previousUserIdRef.current = currentUserId;
  }, [user]);

  useEffect(() => {
    (async () => {
      const stored = await cartLinesStore.get<StoredLine[]>();
      if (stored && stored.length > 0) {
        const results = await Promise.allSettled(stored.map((l) => getProduct(l.productId)));
        const restored: CartLine[] = [];
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            restored.push({ product: result.value, quantity: stored[index]!.quantity });
          }
        });
        dispatch({ type: "hydrate", lines: restored });
      }
      setIsReady(true);
    })();
  }, []);

  // Pull the server-side cart and merge it in, so items added from another
  // client (e.g. the web storefront) show up here too. Runs on login AND
  // every time the app comes back to the foreground, since a session left
  // running otherwise never learns about cart changes made elsewhere while
  // it was backgrounded.
  const pullServerCart = useCallback(async () => {
    try {
      const { items } = await getCart();
      if (!items.length) return;
      const results = await Promise.allSettled(items.map((i) => getProduct(i.productId)));
      const merged: CartLine[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          merged.push({ product: result.value, quantity: items[index]!.quantity });
        }
      });
      if (merged.length) dispatch({ type: "merge", lines: merged });
    } catch {
      // silent fail, local cart stays as-is
    }
  }, []);

  useEffect(() => {
    if (!user || !isReady) return;
    pullServerCart();
  }, [user, isReady, pullServerCart]);

  useEffect(() => {
    if (!user) return;
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") pullServerCart();
    });
    return () => subscription.remove();
  }, [user, pullServerCart]);

  // Persist locally + push to the server cart once hydrated.
  useEffect(() => {
    if (!isReady) return;
    const storedLines: StoredLine[] = lines.map((l) => ({ productId: l.product.id, quantity: l.quantity }));
    cartLinesStore.set(storedLines).catch(() => {});
    if (user) syncCart(storedLines).catch(() => {});
  }, [lines, isReady, user]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.product.priceAmount * l.quantity, 0),
    [lines]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      isReady,
      addItem: (product, quantity = 1) => dispatch({ type: "add", product, quantity }),
      removeItem: (productId) => dispatch({ type: "remove", productId }),
      setQuantity: (productId, quantity) => dispatch({ type: "setQuantity", productId, quantity }),
      clear: () => dispatch({ type: "clear" }),
      subtotal,
    }),
    [lines, isReady, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}

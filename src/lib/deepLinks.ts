// Maps incoming links onto app routes. Two sources reach the app:
//  - Universal Links: storefront URLs (https://maisonpriveeatelier.com/...) that the
//    apple-app-site-association file hands to the app. They carry the web's Spanish
//    paths, which don't match the route files here, so each one is rewritten.
//  - The custom scheme (maisonprivee://...), e.g. the card-payment return
//    maisonprivee://order/:id/confirmed. Paths that already match a route pass through.

export type ResolvedLink = {
  path: string;
  // Referrer's user id from ?ref=, on any page — the storefront's ReferralCapture
  // reads it site-wide, not only on /vende.
  ref: string | null;
};

// Storefront /profile?tab=... → the app screen showing the same thing. Tabs with
// no mobile equivalent ("membership" loyalty, buyer "offers") fall back to the profile.
const PROFILE_TABS: Record<string, string> = {
  purchases: "/orders",
  consignments: "/consignments",
  subscription: "/membership",
  wishlist: "/wishlist",
};

function splitUrl(raw: string): { segments: string[]; query: Record<string, string> } {
  let rest = raw.trim();
  const hashIndex = rest.indexOf("#");
  if (hashIndex >= 0) rest = rest.slice(0, hashIndex);

  // maisonprivee://order/1 → order/1: with the app's own scheme the "host" is the
  // first path segment. Any other scheme (https, exp:// in Expo Go, the dev client)
  // has a real host, which is dropped.
  if (/^maisonprivee:\/\//i.test(rest)) {
    rest = rest.replace(/^maisonprivee:\/\//i, "");
  } else {
    rest = rest.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?]*/i, "");
  }

  const [pathPart, queryPart = ""] = rest.split("?", 2);
  let segments = pathPart.split("/").filter(Boolean).map(safeDecode);
  // Expo Go / dev builds put the app path after "/--/" (exp://host:8081/--/orders).
  const separator = segments.indexOf("--");
  if (separator >= 0) segments = segments.slice(separator + 1);

  // Manual parse: URLSearchParams is only partially implemented in React Native.
  const query: Record<string, string> = {};
  for (const pair of queryPart.split("&")) {
    if (!pair) continue;
    const [key, value = ""] = pair.split("=", 2);
    query[safeDecode(key)] = safeDecode(value.replace(/\+/g, " "));
  }
  return { segments, query };
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function resolveIncomingLink(raw: string): ResolvedLink {
  const { segments, query } = splitUrl(raw);
  const ref = query.ref?.trim() || null;
  const [first, second] = segments;

  const path = (() => {
    switch (first) {
      case undefined:
        return "/";
      // Storefront web paths
      case "products":
        return second ? `/product/${encodeURIComponent(second)}` : "/shop";
      case "vende":
        return "/sell";
      case "refer-a-seller":
        return "/refer";
      case "mis-pedidos":
        return "/orders";
      case "membership":
      case "subscription":
        return "/membership";
      case "profile":
        return PROFILE_TABS[query.tab] ?? "/profile";
      case "checkout":
        return "/cart";
      // maisonprivee://order/:id/confirmed — return from the card-payment browser session
      case "order":
        return second ? `/orders/${encodeURIComponent(second)}` : "/orders";
      default:
        // Already an app route (maisonprivee://orders/123, /consignments, ...).
        return `/${segments.map(encodeURIComponent).join("/")}`;
    }
  })();

  return { path, ref };
}

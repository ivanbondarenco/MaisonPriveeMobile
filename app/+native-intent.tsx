import { resolveIncomingLink } from "@/lib/deepLinks";
import { referralStore } from "@/lib/secureStore";

// Runs for every URL the OS hands the app (Universal Links and maisonprivee://),
// before Expo Router matches it to a route. See src/lib/deepLinks.ts for the mapping.
export async function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const { path: target, ref } = resolveIncomingLink(path);
    // Kept until the next sign-up, like the storefront's mp_ref in localStorage.
    if (ref) await referralStore.set(ref).catch(() => {});
    return target;
  } catch {
    // Never crash on a malformed link — land on the catalog instead.
    return "/";
  }
}

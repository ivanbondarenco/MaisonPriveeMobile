import { useQuery } from "@tanstack/react-query";

import { flagQueryKey, getFlag, type FlagKey } from "@/api/settings";

/**
 * Whether a backend feature flag is on. False while loading, so a feature never
 * flashes on and then off. Ship the code behind the flag in both web and app,
 * then turn it on from the admin once both are live.
 */
export function useFeatureFlag(key: FlagKey) {
  const { data } = useQuery({ queryKey: flagQueryKey(key), queryFn: () => getFlag(key) });
  return data ?? false;
}

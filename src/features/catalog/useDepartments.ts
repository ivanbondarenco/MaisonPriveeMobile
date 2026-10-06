import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { categoryTreeQueryKey, getCategoryTree } from "@/api/categories";
import type { Department } from "@/components/DepartmentTabs";
import { useT } from "@/i18n";

// The sections come from the live category tree, so a new top-level category
// on the backend shows up as a tab without an app release. Known names get the
// translated label; anything else shows as the admin typed it.
export function useDepartments() {
  const t = useT();
  const query = useQuery({ queryKey: categoryTreeQueryKey, queryFn: getCategoryTree });
  const tree = useMemo(() => query.data ?? [], [query.data]);

  const departments = useMemo<Department[]>(() => {
    const names = t.home.sectionNames as Record<string, string>;
    return [
      { id: null, label: t.home.all },
      ...tree.map((node) => ({ id: node.id, label: names[node.name.toLowerCase()] ?? node.name })),
    ];
  }, [tree, t]);

  return { tree, departments, refetch: query.refetch };
}

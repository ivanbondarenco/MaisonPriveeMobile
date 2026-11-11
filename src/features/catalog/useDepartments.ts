import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { categoryTreeQueryKey, getCategoryTree } from "@/api/categories";
import type { Department } from "@/components/DepartmentTabs";
import { useI18n } from "@/i18n";
import { visibleSections } from "@/lib/sections";

// The sections come from the live category tree, so a new top-level category
// on the backend shows up as a tab without an app release. The admin's own
// translation wins; otherwise known names get the dictionary label and anything
// else shows as the admin typed it.
export function useDepartments() {
  const { t, locale } = useI18n();
  const query = useQuery({ queryKey: categoryTreeQueryKey, queryFn: getCategoryTree });
  const tree = useMemo(() => query.data ?? [], [query.data]);

  const departments = useMemo<Department[]>(() => {
    const names = t.home.sectionNames as Record<string, string>;
    return [
      { id: null, label: t.home.all },
      ...visibleSections(tree).map((node) => ({
        id: node.id,
        label: node.translations?.[locale] || names[node.name.toLowerCase()] || node.name,
      })),
    ];
  }, [tree, t, locale]);

  return { tree, departments, refetch: query.refetch };
}

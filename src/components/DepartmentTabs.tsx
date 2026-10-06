import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { colors, fontFamily, letterSpacing, spacing } from "@/theme";
import { AppText } from "./AppText";

export type Department = { id: string | null; label: string };

type Props = {
  departments: Department[];
  value: string | null;
  onChange: (id: string | null) => void;
};

// ALL · WOMEN · MEN · KIDS strip under the header, underlined when active.
export function DepartmentTabs({ departments, value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {departments.map((dept) => {
          const active = dept.id === value;
          return (
            <Pressable
              key={dept.id ?? "all"}
              onPress={() => onChange(dept.id)}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <AppText style={[styles.label, active && styles.labelActive]}>{dept.label}</AppText>
              <View style={[styles.underline, active && styles.underlineActive]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  content: {
    paddingHorizontal: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  label: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    letterSpacing: letterSpacing.body,
    textTransform: "uppercase",
    color: colors.textMuted,
    paddingBottom: spacing.sm + 2,
  },
  labelActive: {
    fontFamily: fontFamily.bodyMedium,
    color: colors.primary,
  },
  underline: {
    height: 3,
    backgroundColor: "transparent",
  },
  underlineActive: {
    backgroundColor: colors.primary,
  },
});

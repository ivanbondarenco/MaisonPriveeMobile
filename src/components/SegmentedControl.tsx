import { Pressable, StyleSheet, View } from "react-native";

import { colors, spacing } from "@/theme";
import { AppText } from "./AppText";

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Gold fill instead of charcoal for the selected segment (opt-in choices). */
  accent?: boolean;
  /** Two segments per row instead of one — for 3+ options with long labels. */
  wrap?: boolean;
};

// Same two-button pattern the storefront uses for payout method / accept offers:
// a filled segment for the active choice, hairline outline for the rest.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accent = false,
  wrap = false,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.row, wrap && styles.rowWrap]}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              wrap && styles.segmentWrapped,
              isSelected && (accent ? styles.segmentAccent : styles.segmentSelected),
            ]}
          >
            <AppText
              variant="label"
              numberOfLines={2}
              style={isSelected ? styles.labelSelected : styles.label}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rowWrap: {
    flexWrap: "wrap",
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentWrapped: {
    flex: 0,
    flexBasis: "47%",
    flexGrow: 1,
  },
  segmentSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentAccent: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  label: {
    color: colors.primary,
    fontSize: 11,
    textAlign: "center",
  },
  labelSelected: {
    color: colors.white,
    fontSize: 11,
    textAlign: "center",
  },
});

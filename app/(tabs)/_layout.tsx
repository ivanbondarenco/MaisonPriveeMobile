import { Tabs } from "expo-router";
import { CircleDollarSign, Heart, House, Tag, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "@/i18n";
import { colors, fontFamily, radius, spacing } from "@/theme";

const BAR_HEIGHT = 66;

// Same order as TheRealReal: Home · Shop · Wishlist · Profile · Sell. The cart
// lives behind the bag icon in the header, so its tab stays routable but hidden.
//
// Floating pill, inset from the screen edges like TheRealReal's: a full-width,
// square bar gets its corners clipped by the rounded display. This is the one
// deliberate exception to the storefront's sharp-corner rule.
export default function TabsLayout() {
  const t = useT();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarActiveBackgroundColor: colors.secondary,
        tabBarStyle: {
          height: BAR_HEIGHT,
          paddingBottom: 0,
          paddingHorizontal: 6,
          marginHorizontal: spacing.lg,
          // Sits just above the home indicator instead of padding over it.
          marginBottom: Math.max(insets.bottom - spacing.sm, spacing.sm),
          borderRadius: radius.pill,
          borderTopWidth: 0,
          backgroundColor: colors.white,
          shadowColor: colors.primary,
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        },
        // The active colour is painted on an inner button with a hard-coded square
        // radius, so the rounding has to come from clipping this outer item.
        tabBarItemStyle: {
          marginVertical: 5,
          marginHorizontal: 2,
          borderRadius: radius.pill,
          overflow: "hidden",
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.bodyMedium,
          fontSize: 10,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.home,
          tabBarIcon: ({ color }) => <House color={color} size={22} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: t.tabs.shop,
          tabBarIcon: ({ color }) => <Tag color={color} size={22} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: t.tabs.wishlist,
          tabBarIcon: ({ color }) => <Heart color={color} size={22} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: ({ color }) => <User color={color} size={22} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: t.tabs.sell,
          tabBarIcon: ({ color }) => <CircleDollarSign color={color} size={22} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen name="cart" options={{ href: null, title: t.tabs.cart }} />
    </Tabs>
  );
}

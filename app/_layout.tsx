import { BodoniModa_400Regular, BodoniModa_400Regular_Italic, BodoniModa_500Medium } from "@expo-google-fonts/bodoni-moda";
import { Inter_300Light, Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { I18nProvider, useT } from "@/i18n";
import { queryClient } from "@/lib/queryClient";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync();

// Navigator backgrounds follow the page colour, so the gap around the floating
// tab bar reads as the screen, not as React Navigation's default grey.
const navigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.backgroundLight, card: colors.backgroundLight },
};

// Separate component so the header titles re-render when the language changes.
function RootStack() {
  const t = useT();

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.backgroundLight },
          headerTintColor: colors.primary,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: "Inter_500Medium" },
          contentStyle: { backgroundColor: colors.backgroundLight },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ presentation: "modal", title: "" }} />
        <Stack.Screen name="(auth)/register" options={{ presentation: "modal", title: "" }} />
        <Stack.Screen name="product/[id]" options={{ title: "" }} />
        <Stack.Screen name="checkout" options={{ title: t.screenTitles.checkout }} />
        <Stack.Screen name="orders/index" options={{ title: t.screenTitles.orders }} />
        <Stack.Screen name="orders/[id]" options={{ title: t.screenTitles.order }} />
        <Stack.Screen name="consign/new" options={{ title: t.screenTitles.consignNew }} />
        <Stack.Screen name="consignments/index" options={{ title: t.screenTitles.consignments }} />
        <Stack.Screen name="consignments/[id]" options={{ title: t.screenTitles.consignment }} />
        <Stack.Screen name="offers/index" options={{ title: t.screenTitles.offers }} />
        <Stack.Screen name="refer" options={{ title: t.screenTitles.refer }} />
        <Stack.Screen name="membership/index" options={{ title: t.screenTitles.membership }} />
        <Stack.Screen name="membership/subscribe" options={{ title: t.screenTitles.subscribe }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BodoniModa_400Regular,
    BodoniModa_500Medium,
    BodoniModa_400Regular_Italic,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <CartProvider>
              <RootStack />
            </CartProvider>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

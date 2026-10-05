import { BodoniModa_400Regular, BodoniModa_400Regular_Italic, BodoniModa_500Medium } from "@expo-google-fonts/bodoni-moda";
import { Inter_300Light, Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { queryClient } from "@/lib/queryClient";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync();

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
        <AuthProvider>
          <CartProvider>
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
              <Stack.Screen
                name="(auth)/login"
                options={{ presentation: "modal", title: "" }}
              />
              <Stack.Screen
                name="(auth)/register"
                options={{ presentation: "modal", title: "" }}
              />
              <Stack.Screen name="product/[id]" options={{ title: "" }} />
              <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
              <Stack.Screen name="orders/index" options={{ title: "My Orders" }} />
              <Stack.Screen name="orders/[id]" options={{ title: "Order" }} />
              <Stack.Screen name="consign/new" options={{ title: "Submit a Piece" }} />
              <Stack.Screen name="consignments/index" options={{ title: "My Submissions" }} />
              <Stack.Screen name="consignments/[id]" options={{ title: "Submission" }} />
              <Stack.Screen name="offers/index" options={{ title: "Offers Received" }} />
              <Stack.Screen name="refer" options={{ title: "Refer a Seller" }} />
            </Stack>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

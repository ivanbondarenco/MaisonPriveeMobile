import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import * as authApi from "@/api/auth";
import type { LoginInput, RegisterInput } from "@/api/schemas";
import type { User } from "@/api/types";
import { referralStore, tokenStore, refreshTokenStore, userStore } from "@/lib/secureStore";
import { registerPushToken, unregisterPushToken } from "@/lib/pushNotifications";
import { queryClient } from "@/lib/queryClient";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    userStore.get<User>().then((storedUser) => {
      setUser(storedUser);
      setIsLoading(false);
    });
  }, []);

  const persistSession = async (token: string, refreshToken: string | undefined, sessionUser: User) => {
    await Promise.all([
      tokenStore.set(token),
      refreshToken ? refreshTokenStore.set(refreshToken) : refreshTokenStore.clear(),
      userStore.set(sessionUser),
    ]);
    setUser(sessionUser);
    // Fire-and-forget: a denied permission or missing EAS project shouldn't block login.
    registerPushToken().catch(() => {});
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: async (input) => {
        const { token, refreshToken, user: sessionUser } = await authApi.login(input);
        await persistSession(token, refreshToken, sessionUser);
      },
      register: async (input) => {
        const referredBy = await referralStore.get();
        const { token, refreshToken, user: sessionUser } = await authApi.register(input, referredBy);
        await persistSession(token, refreshToken, sessionUser);
        // One-shot attribution, like the storefront dropping mp_ref after sign-up.
        if (referredBy) referralStore.clear().catch(() => {});
      },
      logout: async () => {
        const storedRefreshToken = await refreshTokenStore.get();
        if (storedRefreshToken) {
          authApi.logout(storedRefreshToken).catch(() => {});
        }
        unregisterPushToken().catch(() => {});
        await Promise.all([tokenStore.clear(), refreshTokenStore.clear(), userStore.clear()]);
        // Wipe every cached query (wishlist, orders, etc.) — it belongs to the
        // account that just logged out and must not leak into whoever logs in next.
        queryClient.clear();
        setUser(null);
      },
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

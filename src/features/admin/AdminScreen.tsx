import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/i18n";
import { getValidAccessToken, isTokenFresh } from "@/lib/apiClient";
import { env } from "@/lib/env";
import { tokenStore } from "@/lib/secureStore";
import { colors, spacing } from "@/theme";

// The admin is the storefront's own /admin panel, embedded. It authenticates
// with whatever bearer token sits in localStorage["admin_token"] (see the web's
// lib/admin-fetch.ts), so the app hands it the signed-in admin's access token.
// That token is short-lived (30 min) and the web panel has no refresh flow, so
// the app keeps it topped up from here while the panel is open.

// react-native-webview types the component as `class WebView<P = undefined>`
// with props `WebViewProps & P`, and TypeScript 6 reduces `X & undefined` to
// never — so the generic is always spelled out as `WebView<object>` here.
type AdminWebView = WebView<object>;

const ADMIN_ORIGIN =env.adminUrl.match(/^https?:\/\/[^/]+/)?.[0] ?? env.adminUrl;
const TOKEN_CHECK_INTERVAL_MS = 60 * 1000;
const TOKEN_MIN_VALIDITY_MS = 10 * 60 * 1000;

const setTokenScript = (token: string) => `localStorage.setItem("admin_token", ${JSON.stringify(token)});`;

// Runs in the page before its own scripts. The panel was written for a desktop
// browser; three things it does don't work inside a WebView, so they're routed
// to the app instead:
//  - <a download href="data:application/pdf…"> (DHL label / invoice) → share sheet
//  - window.open("") + document.write + print() (barcode label) → native print
//  - target="_blank" / window.open(url) links → in-app browser
const BRIDGE_SCRIPT = `
(function () {
  if (window.__mpBridge) return;
  window.__mpBridge = true;
  var post = function (message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); };

  // The panel is a fixed-height shell whose sidebar <nav> and <main> scroll on
  // their own. On iOS a swipe that hits the end of one of those chains into the
  // page behind it, so the background moves instead of the menu: keep each
  // scroll area's gestures to itself.
  var addAppStyles = function () {
    if (document.getElementById("mp-app-styles")) return;
    var style = document.createElement("style");
    style.id = "mp-app-styles";
    style.textContent =
      "html,body{overscroll-behavior:none;}" +
      ".admin-layout nav,.admin-layout main,.admin-layout [class*='overflow-y-auto']" +
      "{overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}";
    (document.body || document.documentElement).appendChild(style);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addAppStyles);
  else addAppStyles();

  document.addEventListener("click", function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest("a") : null;
    if (!anchor) return;
    var href = anchor.getAttribute("href") || "";
    if (href.indexOf("data:") === 0 || href.indexOf("blob:") === 0 || anchor.hasAttribute("download")) {
      event.preventDefault();
      post({ type: "download", url: anchor.href, filename: anchor.getAttribute("download") || "" });
    } else if (anchor.target === "_blank") {
      event.preventDefault();
      post({ type: "external", url: anchor.href });
    }
  }, true);

  window.open = function (url) {
    if (url && url !== "about:blank") {
      post({ type: "external", url: new URL(url, window.location.href).href });
      return null;
    }
    var html = "";
    var doc = {
      write: function (chunk) { html += chunk; },
      writeln: function (chunk) { html += chunk + "\\n"; },
      open: function () {},
      close: function () {},
    };
    return {
      document: doc,
      focus: function () {},
      close: function () {},
      print: function () { post({ type: "print", html: html }); },
    };
  };
  window.print = function () { post({ type: "print", html: document.documentElement.outerHTML }); };
})();
true;
`;

type BridgeMessage =
  | { type: "download"; url: string; filename: string }
  | { type: "external"; url: string }
  | { type: "print"; html: string };

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "text/csv": "csv",
};

async function shareDataUrl(dataUrl: string, filename: string) {
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/);
  if (!match) throw new Error("Unsupported data URL");
  const [, mimeType, isBase64, payload] = match;
  const extension = EXTENSIONS[mimeType!] ?? "bin";
  const base = (filename || "archivo").replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_");
  const file = new File(Paths.cache, `${base}.${extension}`);
  file.create({ overwrite: true });
  await (isBase64
    ? file.write(payload!, { encoding: "base64" })
    : file.write(decodeURIComponent(payload!)));
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: base });
}

export function AdminScreen() {
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const webViewRef = useRef<AdminWebView>(null);
  const tokenRef = useRef<string | null>(null);
  // Where to come back to after re-authenticating behind the panel's back.
  const lastAdminUrlRef = useRef(env.adminUrl);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "expired" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const pushToken = useCallback((next: string) => {
    tokenRef.current = next;
    setToken(next);
    webViewRef.current?.injectJavaScript(`${setTokenScript(next)} true;`);
  }, []);

  // Initial token, then keep it at least TOKEN_MIN_VALIDITY_MS from expiring.
  useEffect(() => {
    let cancelled = false;
    const ensureToken = async () => {
      const fresh = await getValidAccessToken(TOKEN_MIN_VALIDITY_MS).catch(() => null);
      if (cancelled) return;
      if (!fresh) {
        setStatus("expired");
        return;
      }
      if (fresh !== tokenRef.current) pushToken(fresh);
      setStatus((current) => (current === "loading" ? "ready" : current));
    };
    ensureToken();
    const interval = setInterval(ensureToken, TOKEN_CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pushToken, reloadKey]);

  // The panel sends itself to /admin-login both when the API rejects the token
  // and when the admin taps "Cerrar sesión". A token that's still good means
  // the latter, so leave; otherwise refresh it and put the admin back.
  const handleLoginRedirect = useCallback(async () => {
    const current = await tokenStore.get();
    if (current && isTokenFresh(current, 60 * 1000)) {
      router.back();
      return;
    }
    const fresh = await getValidAccessToken(TOKEN_MIN_VALIDITY_MS).catch(() => null);
    if (!fresh) {
      setStatus("expired");
      return;
    }
    pushToken(fresh);
    webViewRef.current?.injectJavaScript(
      `${setTokenScript(fresh)} window.location.replace(${JSON.stringify(lastAdminUrlRef.current)}); true;`
    );
  }, [pushToken, router]);

  const openExternal = useCallback((url: string) => {
    if (/^https?:/i.test(url)) WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url).catch(() => {}));
    else Linking.openURL(url).catch(() => {});
  }, []);

  const handleShouldStartLoad = useCallback(
    (request: ShouldStartLoadRequest) => {
      const { url } = request;
      if (url.startsWith("about:") || url.startsWith("blob:")) return true;
      if (url.startsWith("data:")) {
        shareDataUrl(url, "").catch(() => Alert.alert(t.admin.fileError));
        return false;
      }
      if (url.startsWith(ADMIN_ORIGIN)) {
        const path = url.slice(ADMIN_ORIGIN.length);
        if (path.startsWith("/admin-login")) {
          handleLoginRedirect();
          return false;
        }
        return true;
      }
      // Sub-frames (embeds, captchas) load normally; anything else the admin
      // navigates to — mailto:, wa.me, another site — opens outside the panel.
      if (request.isTopFrame === false) return true;
      openExternal(url);
      return false;
    },
    [handleLoginRedirect, openExternal, t]
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: BridgeMessage;
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (message.type === "download") {
        if (message.url.startsWith("data:")) {
          shareDataUrl(message.url, message.filename).catch(() => Alert.alert(t.admin.fileError));
        } else {
          openExternal(message.url);
        }
      } else if (message.type === "external") {
        openExternal(message.url);
      } else if (message.type === "print") {
        Print.printAsync({ html: message.html }).catch(() => Alert.alert(t.admin.printError));
      }
    },
    [openExternal, t]
  );

  if (user?.role !== "ADMIN") return null;

  if (status === "expired" || status === "error") {
    return (
      <View style={styles.centered}>
        <AppText variant="body" style={styles.message}>
          {status === "expired" ? t.admin.sessionExpired : t.admin.loadError}
        </AppText>
        {status === "expired" ? (
          <Button label={t.common.signIn} onPress={() => router.replace("/(auth)/login")} />
        ) : (
          <Button
            label={t.common.tryAgain}
            onPress={() => {
              setStatus("loading");
              setReloadKey((k) => k + 1);
            }}
          />
        )}
      </View>
    );
  }

  if (!token) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <WebView<object>
      key={reloadKey}
      ref={webViewRef}
      source={{ uri: env.adminUrl }}
      style={styles.webView}
      originWhitelist={["*"]}
      injectedJavaScriptBeforeContentLoaded={`${setTokenScript(token)}\n${BRIDGE_SCRIPT}`}
      onShouldStartLoadWithRequest={handleShouldStartLoad}
      onMessage={handleMessage}
      onNavigationStateChange={(nav: WebViewNavigation) => {
        if (nav.url.startsWith(`${ADMIN_ORIGIN}/admin`)) lastAdminUrlRef.current = nav.url;
      }}
      onError={() => setStatus("error")}
      onContentProcessDidTerminate={() => webViewRef.current?.reload()}
      startInLoadingState
      renderLoading={() => (
        <View style={[StyleSheet.absoluteFill, styles.centered]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
      allowsBackForwardNavigationGestures
      // The page itself never needs to scroll (the panel scrolls inside its own
      // sidebar and main areas); letting it scroll is what made swipes on the
      // menu move the background instead.
      scrollEnabled={false}
      bounces={false}
      webviewDebuggingEnabled={__DEV__}
    />
  );
}

const styles = StyleSheet.create({
  webView: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.backgroundLight,
  },
  message: {
    textAlign: "center",
  },
});

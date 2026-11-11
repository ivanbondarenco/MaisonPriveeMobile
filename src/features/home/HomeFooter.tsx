import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { MapPin } from "lucide-react-native";
import { Linking, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/i18n";
import { env } from "@/lib/env";
import { colors, fontFamily, letterSpacing, spacing } from "@/theme";

// A shorter take on the storefront footer (components/layout/Footer.tsx): the
// same identity, shop and Maison columns and bottom bar, keeping the links
// that matter on a phone. Pages the app doesn't have open the website.

const LOCATION_URL = "https://maps.app.goo.gl/u21UUWht9MEHnR978?g_st=iw";
const INSTAGRAM_URL = "https://www.instagram.com/maisonpriveeatelier/";

const INK = "#F9F8F6";

type FooterLink = { label: string; onPress: () => void };

export function HomeFooter({ sections }: { sections: FooterLink[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const openSite = (path: string) => WebBrowser.openBrowserAsync(`${env.siteUrl}${path}`).catch(() => {});

  const maisonLinks: FooterLink[] = [
    { label: t.footer.consignment, onPress: () => router.navigate("/sell") },
    { label: t.screenTitles.membership, onPress: () => router.navigate("/membership") },
    { label: t.footer.referFriend, onPress: () => router.push("/refer") },
    { label: t.footer.concierge, onPress: () => openSite("/concierge") },
    { label: t.footer.faq, onPress: () => openSite("/info") },
  ];

  return (
    <View style={styles.footer}>
      <View style={styles.logo}>
        <AppText style={styles.logoText}>MAISON</AppText>
        <AppText style={styles.logoText}>PRIVÉE</AppText>
        <AppText style={styles.logoSub}>ATELIER</AppText>
      </View>
      <AppText style={styles.desc}>
        {t.footer.desc1}
        {"\n"}
        {t.footer.desc2}
      </AppText>
      <AppText style={styles.tagline}>{t.footer.tagline}</AppText>

      <View style={styles.columns}>
        {sections.length > 0 ? (
          <LinkColumn title={t.footer.shop} links={sections} />
        ) : null}
        <LinkColumn title={t.footer.maison} links={maisonLinks} />
      </View>

      <View style={styles.divider} />

      <AppText style={styles.serving}>{t.footer.serving}</AppText>
      <AppText style={styles.rights}>
        © {new Date().getFullYear()} {t.footer.rights}
      </AppText>

      <View style={styles.bottomRow}>
        <Pressable
          style={styles.bottomLink}
          onPress={() => Linking.openURL(LOCATION_URL).catch(() => {})}
          accessibilityRole="link"
        >
          <MapPin size={14} color={INK} strokeWidth={1.5} />
          <AppText style={styles.bottomLinkText}>{t.footer.location}</AppText>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(INSTAGRAM_URL).catch(() => {})} accessibilityRole="link">
          <AppText style={styles.bottomLinkText}>{t.footer.follow}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

function LinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <View style={styles.column}>
      <AppText style={styles.columnTitle}>{title}</AppText>
      {links.map((link) => (
        <Pressable key={link.label} onPress={link.onPress} accessibilityRole="link" hitSlop={4}>
          <AppText style={styles.link}>{link.label}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  logo: {
    alignSelf: "flex-start",
  },
  logoText: {
    fontFamily: fontFamily.displayRegular,
    fontSize: 20,
    lineHeight: 22,
    letterSpacing: 0.8,
    color: INK,
  },
  logoSub: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 8,
    letterSpacing: letterSpacing.labelWide,
    color: INK,
    opacity: 0.6,
    marginTop: spacing.xs,
  },
  desc: {
    marginTop: spacing.lg,
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    lineHeight: 22,
    color: INK,
    opacity: 0.6,
  },
  tagline: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.bodyLight,
    fontStyle: "italic",
    fontSize: 11,
    letterSpacing: 0.3,
    color: INK,
    opacity: 0.4,
  },
  columns: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  column: {
    flex: 1,
    gap: spacing.md,
  },
  columnTitle: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: letterSpacing.labelWide,
    textTransform: "uppercase",
    color: INK,
    opacity: 0.4,
  },
  link: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: INK,
    opacity: 0.75,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: INK,
    opacity: 0.2,
    marginVertical: spacing.lg,
  },
  serving: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: INK,
    opacity: 0.5,
  },
  rights: {
    marginTop: spacing.xs,
    fontFamily: fontFamily.bodyRegular,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: INK,
    opacity: 0.3,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  bottomLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  bottomLinkText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: INK,
    opacity: 0.6,
  },
});

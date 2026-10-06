import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { consignmentPhotoUrl, getMyConsignments } from "@/api/consignment";
import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import { dateLocale, fill, useI18n } from "@/i18n";
import { colors, spacing } from "@/theme";
import { isProductViewable, STATUS_COLOR } from "./status";

const priceFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" });

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

export function ConsignmentDetailScreen({ consignmentId }: { consignmentId: string }) {
  const router = useRouter();
  const { t, locale } = useI18n();

  // Reuses the list's cache: GET /api/consignment/mine already returns every
  // field, and GET /api/consignment/:id is admin-only.
  const { data, isLoading } = useQuery({
    queryKey: ["consignments", "mine"],
    queryFn: getMyConsignments,
  });

  const consignment = data?.find((c) => c.id === consignmentId);

  if (isLoading) {
    return <Screen style={styles.centered} />;
  }

  if (!consignment) {
    return (
      <Screen style={styles.centered}>
        <AppText variant="body">{t.consignments.notFound}</AppText>
      </Screen>
    );
  }

  const statusColor = STATUS_COLOR[consignment.status] ?? colors.gold;
  const photos = consignment.photos ?? [];
  const product = consignment.product;
  const productViewable = product ? isProductViewable(product) : false;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="caption">
          {consignment.submissionType === "INSTANT_LIQUIDITY"
            ? t.consignment.instantLiquidity
            : t.consignment.consignmentType}
        </AppText>
        <AppText variant="display" style={styles.title}>
          {consignment.brand}
        </AppText>
        <View style={styles.metaRow}>
          <AppText variant="body" style={styles.muted}>
            {fill(t.consignments.submitted, { date: formatDate(consignment.createdAt, dateLocale[locale]) })}
          </AppText>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <AppText variant="caption" style={{ color: statusColor }}>
              {t.consignments.status[consignment.status] ?? consignment.status}
            </AppText>
          </View>
        </View>

        {photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
            {photos.map((photo) => (
              <Image
                key={photo}
                source={{ uri: consignmentPhotoUrl(photo) }}
                style={styles.photo}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        ) : null}

        {product ? (
          <View style={styles.box}>
            <AppText variant="label">
              {productViewable ? t.consignments.livePiece : t.consignments.piecePreparing}
            </AppText>
            {productViewable ? (
              <Pressable onPress={() => router.push(`/product/${product.id}`)}>
                <AppText variant="body" style={styles.link}>
                  {product.title}
                </AppText>
              </Pressable>
            ) : (
              <>
                <AppText variant="body">{product.title}</AppText>
                <AppText variant="body" style={styles.muted}>
                  {t.consignments.preparingHint}
                </AppText>
              </>
            )}
          </View>
        ) : null}

        <View style={styles.box}>
          <AppText variant="label">{t.consignments.payout}</AppText>
          <DetailRow
            label={t.consignments.method}
            value={consignment.payoutMethod === "CREDIT" ? t.consignment.siteCredit : t.consignment.cash}
          />
          <DetailRow label={t.consignments.priceExpectation} value={consignment.priceExpectation} />
          <DetailRow
            label={t.consignments.payoutAmount}
            value={consignment.payoutAmount != null ? `USD ${priceFormatter.format(consignment.payoutAmount)}` : null}
          />
          <DetailRow
            label={t.consignments.paidOut}
            value={consignment.paidOutAt ? formatDate(consignment.paidOutAt, dateLocale[locale]) : null}
          />
          {consignment.submissionType === "CONSIGNMENT" ? (
            <DetailRow
              label={t.consignments.privateOffers}
              value={consignment.acceptOffers ? t.consignments.offersAccepted : t.consignments.offersNotAccepted}
            />
          ) : null}
        </View>

        <View style={styles.box}>
          <AppText variant="label">{t.consignment.thePiece}</AppText>
          <DetailRow label={t.consignment.category} value={consignment.category} />
          <DetailRow label={t.consignment.size} value={consignment.size} />
          <DetailRow label={t.consignment.condition} value={consignment.condition} />
          <DetailRow label={t.consignment.material} value={consignment.material} />
          <DetailRow label={t.consignment.color} value={consignment.color} />
          <DetailRow label={t.consignment.yearCollection} value={consignment.yearCollection} />
          <DetailRow label={t.consignment.serialNumber} value={consignment.serialNumber} />
          <DetailRow label={t.consignment.packaging} value={consignment.packaging} />
          <DetailRow label={t.consignment.notes} value={consignment.notes} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  muted: {
    color: colors.textMuted,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  photos: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  photo: {
    width: 120,
    height: 120,
    backgroundColor: colors.secondary,
  },
  box: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  detailRow: {
    gap: 2,
  },
  link: {
    color: colors.gold,
  },
});

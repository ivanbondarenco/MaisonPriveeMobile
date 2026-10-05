import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { consignmentPhotoUrl, getMyConsignments } from "@/api/consignment";
import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import { colors, spacing } from "@/theme";
import { isProductViewable, STATUS_COLOR, STATUS_LABEL } from "./status";

const priceFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

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
        <AppText variant="body">Submission not found.</AppText>
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
          {consignment.submissionType === "INSTANT_LIQUIDITY" ? "Instant Liquidity" : "Consignment"}
        </AppText>
        <AppText variant="display" style={styles.title}>
          {consignment.brand}
        </AppText>
        <View style={styles.metaRow}>
          <AppText variant="body" style={styles.muted}>
            Submitted {formatDate(consignment.createdAt)}
          </AppText>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <AppText variant="caption" style={{ color: statusColor }}>
              {STATUS_LABEL[consignment.status] ?? consignment.status}
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
            <AppText variant="label">{productViewable ? "Live Piece" : "Piece in Preparation"}</AppText>
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
                  Our team is preparing the listing. It will be viewable once published.
                </AppText>
              </>
            )}
          </View>
        ) : null}

        <View style={styles.box}>
          <AppText variant="label">Payout</AppText>
          <DetailRow label="Method" value={consignment.payoutMethod === "CREDIT" ? "Site Credit" : "Cash"} />
          <DetailRow label="Price Expectation" value={consignment.priceExpectation} />
          <DetailRow
            label="Payout Amount"
            value={consignment.payoutAmount != null ? `USD ${priceFormatter.format(consignment.payoutAmount)}` : null}
          />
          <DetailRow label="Paid Out" value={consignment.paidOutAt ? formatDate(consignment.paidOutAt) : null} />
          {consignment.submissionType === "CONSIGNMENT" ? (
            <DetailRow label="Private Offers" value={consignment.acceptOffers ? "Accepted" : "Not accepted"} />
          ) : null}
        </View>

        <View style={styles.box}>
          <AppText variant="label">The Piece</AppText>
          <DetailRow label="Category" value={consignment.category} />
          <DetailRow label="Size" value={consignment.size} />
          <DetailRow label="Condition" value={consignment.condition} />
          <DetailRow label="Material" value={consignment.material} />
          <DetailRow label="Color" value={consignment.color} />
          <DetailRow label="Year / Collection" value={consignment.yearCollection} />
          <DetailRow label="Authentication Details" value={consignment.serialNumber} />
          <DetailRow label="Original Packaging" value={consignment.packaging} />
          <DetailRow label="Additional Notes" value={consignment.notes} />
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

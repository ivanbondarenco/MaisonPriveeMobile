import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { createOrder, getShippingRates, uploadTransferProof, validateCoupon as validateCouponRequest } from "@/api/orders";
import { checkoutSchema } from "@/api/schemas";
import type { ShippingRate } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useCart } from "@/context/CartContext";
import { ApiError } from "@/lib/apiClient";
import { colors, spacing } from "@/theme";

const priceFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CheckoutScreen() {
  const router = useRouter();
  const { lines, subtotal, clear } = useCart();

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientTaxId, setRecipientTaxId] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("AR");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [rates, setRates] = useState<ShippingRate[] | null>(null);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const shippingCost = selectedRate?.price ?? 0;
  const total = Math.max(0, subtotal + shippingCost - couponDiscount);

  const validateAddress = () => {
    const result = checkoutSchema.safeParse({
      recipientName,
      recipientPhone,
      recipientTaxId: recipientTaxId || undefined,
      line1,
      line2: line2 || undefined,
      city,
      state,
      postalCode,
      country,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[String(issue.path[0])] = issue.message;
      });
      setFieldErrors(errors);
      return null;
    }
    setFieldErrors({});
    return result.data;
  };

  const handleGetRates = async () => {
    const address = validateAddress();
    if (!address) return;

    setFormError(null);
    setIsLoadingRates(true);
    setSelectedRate(null);
    try {
      const { rates: fetched } = await getShippingRates({
        zip: address.postalCode,
        country: address.country,
        city: address.city,
        address: address.line1,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      });
      setRates(fetched);
      if (fetched.length === 0) setFormError("No shipping options available for this address.");
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Couldn't calculate shipping.");
    } finally {
      setIsLoadingRates(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError(null);
    setIsValidatingCoupon(true);
    try {
      const result = await validateCouponRequest(couponCode.trim(), subtotal);
      setCouponDiscount(result.discount);
    } catch (error) {
      setCouponDiscount(0);
      setCouponError(error instanceof ApiError ? error.message : "Invalid coupon.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const uploadProof = async (uri: string, mimeType: string) => {
    setIsUploadingProof(true);
    setFormError(null);
    try {
      const uploaded = await uploadTransferProof(uri, mimeType);
      setProofUrl(uploaded.url);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Couldn't upload the receipt.");
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handlePickProofPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError("Photo library access is required to attach your transfer receipt.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    await uploadProof(asset.uri, asset.mimeType ?? "image/jpeg");
  };

  const handlePickProofDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    await uploadProof(asset.uri, asset.mimeType ?? "application/pdf");
  };

  const handlePlaceOrder = async () => {
    const address = validateAddress();
    if (!address) return;
    if (!selectedRate) {
      setFormError("Choose a shipping option before placing your order.");
      return;
    }
    if (lines.length === 0) {
      setFormError("Your cart is empty.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await createOrder({
        totalAmount: total,
        shippingProvider: selectedRate.provider,
        shippingMethod: selectedRate.method,
        shippingCost: selectedRate.price,
        shippingAddress: {
          line1: address.line1,
          line2: address.line2 || null,
          postalCode: address.postalCode,
          city: address.city,
          state: address.state,
          country: address.country,
        },
        recipientName: address.recipientName,
        recipientPhone: address.recipientPhone,
        recipientTaxId: address.recipientTaxId,
        paymentType: "TRANSFER",
        transferProofUrl: proofUrl,
        couponCode: couponDiscount > 0 ? couponCode.trim() : undefined,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity, price: l.product.priceAmount })),
      });
      clear();
      router.replace("/orders");
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Couldn't place your order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="label" style={styles.sectionLabel}>
            Shipping Address
          </AppText>
          <TextField label="Recipient Name" value={recipientName} onChangeText={setRecipientName} error={fieldErrors.recipientName} />
          <TextField label="Phone" value={recipientPhone} onChangeText={setRecipientPhone} keyboardType="phone-pad" error={fieldErrors.recipientPhone} />
          <TextField label="Tax ID (optional)" value={recipientTaxId} onChangeText={setRecipientTaxId} />
          <TextField label="Address Line 1" value={line1} onChangeText={setLine1} error={fieldErrors.line1} />
          <TextField label="Address Line 2 (optional)" value={line2} onChangeText={setLine2} />
          <TextField label="City" value={city} onChangeText={setCity} error={fieldErrors.city} />
          <TextField label="State / Province" value={state} onChangeText={setState} error={fieldErrors.state} />
          <TextField label="Postal Code" value={postalCode} onChangeText={setPostalCode} error={fieldErrors.postalCode} />
          <TextField
            label="Country (2-letter code)"
            value={country}
            onChangeText={(v) => setCountry(v.toUpperCase())}
            autoCapitalize="characters"
            maxLength={2}
            error={fieldErrors.country}
          />

          <Button
            label="Calculate Shipping"
            variant="outline"
            onPress={handleGetRates}
            loading={isLoadingRates}
            style={styles.sectionButton}
          />

          {rates && rates.length > 0 ? (
            <View style={styles.ratesList}>
              {rates.map((rate) => {
                const isSelected = selectedRate?.method === rate.method && selectedRate?.productCode === rate.productCode;
                return (
                  <Pressable
                    key={`${rate.provider}-${rate.productCode}`}
                    style={[styles.rateRow, isSelected && styles.rateRowSelected]}
                    onPress={() => setSelectedRate(rate)}
                  >
                    <View>
                      <AppText variant="body">{rate.method}</AppText>
                      <AppText variant="caption">{rate.estimatedDays} day(s)</AppText>
                    </View>
                    <AppText variant="bodyMedium">{rate.currency} {priceFormatter.format(rate.price)}</AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <AppText variant="label" style={styles.sectionLabel}>
            Coupon
          </AppText>
          <View style={styles.couponRow}>
            <View style={styles.couponInput}>
              <TextField label="Code" value={couponCode} onChangeText={setCouponCode} autoCapitalize="characters" />
            </View>
            <Button label="Apply" variant="outline" onPress={handleApplyCoupon} loading={isValidatingCoupon} style={styles.couponButton} />
          </View>
          {couponError ? <AppText variant="caption" style={styles.errorText}>{couponError}</AppText> : null}
          {couponDiscount > 0 ? (
            <AppText variant="body" style={styles.couponApplied}>Discount applied: -USD {priceFormatter.format(couponDiscount)}</AppText>
          ) : null}

          <AppText variant="label" style={styles.sectionLabel}>
            Bank Transfer Receipt
          </AppText>
          {proofUrl ? (
            <Button label="Receipt Uploaded ✓" variant="outline" onPress={handlePickProofPhoto} style={styles.sectionButton} />
          ) : (
            <View style={styles.proofRow}>
              <Button
                label="Photo"
                variant="outline"
                onPress={handlePickProofPhoto}
                loading={isUploadingProof}
                style={styles.proofButton}
              />
              <Button
                label="PDF"
                variant="outline"
                onPress={handlePickProofDocument}
                loading={isUploadingProof}
                style={styles.proofButton}
              />
            </View>
          )}
          <AppText variant="caption" style={styles.proofHint}>
            You can also send it separately after placing the order.
          </AppText>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <AppText variant="label">Subtotal</AppText>
              <AppText variant="body">USD {priceFormatter.format(subtotal)}</AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText variant="label">Shipping</AppText>
              <AppText variant="body">USD {priceFormatter.format(shippingCost)}</AppText>
            </View>
            {couponDiscount > 0 ? (
              <View style={styles.summaryRow}>
                <AppText variant="label">Discount</AppText>
                <AppText variant="body">-USD {priceFormatter.format(couponDiscount)}</AppText>
              </View>
            ) : null}
            <View style={styles.summaryRow}>
              <AppText variant="bodyMedium">Total</AppText>
              <AppText variant="bodyMedium">USD {priceFormatter.format(total)}</AppText>
            </View>
          </View>

          {formError ? <AppText variant="body" style={styles.errorText}>{formError}</AppText> : null}

          <Button label="Place Order" onPress={handlePlaceOrder} loading={isSubmitting} style={styles.placeOrderButton} />
          {isUploadingProof ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionButton: {
    marginTop: spacing.xs,
  },
  ratesList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  rateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rateRowSelected: {
    borderColor: colors.primary,
  },
  proofRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  proofButton: {
    flex: 1,
  },
  couponRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  couponInput: {
    flex: 1,
  },
  couponButton: {
    marginTop: 20,
  },
  couponApplied: {
    color: colors.gold,
    marginTop: -spacing.xs,
  },
  proofHint: {
    marginTop: spacing.xs,
    textTransform: "none",
  },
  summary: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  errorText: {
    color: colors.danger,
    marginTop: spacing.sm,
    textTransform: "none",
  },
  placeOrderButton: {
    marginTop: spacing.lg,
  },
  spinner: {
    marginTop: spacing.sm,
  },
});

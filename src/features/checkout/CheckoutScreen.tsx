import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Landmark } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";

import { getMyCredits, myCreditsQueryKey } from "@/api/credits";
import { createOrder, getShippingRates, uploadTransferProof } from "@/api/orders";
import {
  bankAccountsQueryKey,
  exchangeRateQueryKey,
  getBankAccounts,
  getExchangeRate,
  getPaymentsEnabled,
  paymentsEnabledQueryKey,
} from "@/api/payments";
import { checkoutSchema } from "@/api/schemas";
import type { ShippingRate } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { CountryPicker } from "@/components/CountryPicker";
import { TextField } from "@/components/TextField";
import { useCart } from "@/context/CartContext";
import { fill, useT } from "@/i18n";
import { ApiError } from "@/lib/apiClient";
import { colors, spacing } from "@/theme";

const priceFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const arsFormatter = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Same contact channels the storefront offers while payments are switched off.
const CONTACT_EMAIL = "maisonpriveeatelier@gmail.com";
const CONTACT_INSTAGRAM = "maisonpriveeatelier";

export function CheckoutScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { lines, subtotal, clear } = useCart();
  const t = useT();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientTaxId, setRecipientTaxId] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [rates, setRates] = useState<ShippingRate[] | null>(null);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(false);

  // The storefront always offers collecting the piece in person, first and
  // free, ahead of whatever DHL quotes — and alone if the quote fails.
  const pickupRate = useMemo<ShippingRate>(
    () => ({ provider: "Maison Privée", method: t.checkout.pickup, price: 0, currency: "USD", estimatedDays: 0 }),
    [t]
  );

  // A quote is only valid for the destination it was made for: changing the
  // postal code or country forces a new one, as on the storefront.
  useEffect(() => {
    setRates(null);
    setSelectedRate(null);
  }, [postalCode, country]);

  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [useCredit, setUseCredit] = useState(false);
  const { data: credits } = useQuery({ queryKey: myCreditsQueryKey, queryFn: getMyCredits });
  const creditBalance = credits?.balance ?? 0;

  // Same arithmetic as the storefront checkout; the server re-derives all of it.
  const shippingCost = selectedRate?.price ?? 0;
  const total = Math.max(0, subtotal + shippingCost);
  const creditApplied = useCredit ? Math.min(creditBalance, total) : 0;
  const amountToPay = Math.max(0, total - creditApplied);
  const fullyCoveredByCredit = creditApplied > 0 && amountToPay <= 0;

  // Payment side, mirroring the storefront: the admin's switch gates buying at
  // all, and a transfer needs a bank account in the chosen currency.
  const { data: paymentsEnabled, isLoading: isLoadingPayments } = useQuery({
    queryKey: paymentsEnabledQueryKey,
    queryFn: getPaymentsEnabled,
    staleTime: 0,
  });
  const { data: bankAccounts = [] } = useQuery({ queryKey: bankAccountsQueryKey, queryFn: getBankAccounts });
  const { data: exchangeRate } = useQuery({ queryKey: exchangeRateQueryKey, queryFn: getExchangeRate, staleTime: 0 });
  const availableCurrencies = useMemo(() => [...new Set(bankAccounts.map((a) => a.currency))], [bankAccounts]);
  const [pickedCurrency, setPickedCurrency] = useState<string | null>(null);
  // Defaults to the first account's currency, as the storefront does.
  const selectedCurrency = pickedCurrency ?? bankAccounts[0]?.currency ?? "ARS";
  const selectedBankAccount = bankAccounts.find((a) => a.currency === selectedCurrency);
  const amountInArs = exchangeRate ? amountToPay * exchangeRate.sell : null;
  const formatTransferAmount = (currency: string) =>
    currency === "ARS" && amountInArs !== null
      ? `ARS ${arsFormatter.format(amountInArs)}`
      : `USD ${priceFormatter.format(amountToPay)}`;

  const validateAddress = () => {
    const result = checkoutSchema.safeParse({
      firstName,
      lastName,
      recipientPhone,
      recipientTaxId: recipientTaxId || undefined,
      line1,
      line2: line2 || undefined,
      city,
      state: state || undefined,
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

  // Like the storefront's fetchRates: a quote only needs the destination
  // country and postal code; the full address is checked when ordering.
  const handleGetRates = async () => {
    if (!postalCode.trim() || !country) {
      setFormError(t.checkout.ratesNeedZip);
      return;
    }

    setFormError(null);
    setIsLoadingRates(true);
    setSelectedRate(null);
    try {
      const { rates: fetched } = await getShippingRates({
        zip: postalCode,
        country,
        city,
        address: line1,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        declaredValue: subtotal,
        declaredValueCurrency: "USD",
      });
      // Same filter as the storefront checkout: DHL can quote free placeholder
      // products and "Express Easy" (drop-off at a DHL point), neither offered here.
      const offered = fetched.filter((r) => r.price > 0 && !/express\s*easy/i.test(r.method));
      setRates([pickupRate, ...offered]);
    } catch {
      setRates([pickupRate]);
      setFormError(t.checkout.ratesErrorPickup);
    } finally {
      setIsLoadingRates(false);
    }
  };

  const uploadProof = async (uri: string, mimeType: string) => {
    setIsUploadingProof(true);
    setFormError(null);
    try {
      const uploaded = await uploadTransferProof(uri, mimeType);
      setProofUrl(uploaded.url);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t.checkout.uploadFailed);
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handlePickProofPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError(t.checkout.receiptPermission);
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
    if (!paymentsEnabled) return;
    const address = validateAddress();
    if (!address) return;
    if (!selectedRate) {
      setFormError(t.checkout.chooseShipping);
      return;
    }
    if (lines.length === 0) {
      setFormError(t.checkout.emptyCart);
      return;
    }
    const unavailable = lines.filter((l) => l.product.isSoldOut || l.product.isReserved || l.product.stock <= 0);
    if (unavailable.length > 0) {
      setFormError(fill(t.checkout.unavailableItems, { names: unavailable.map((l) => l.product.title).join(", ") }));
      return;
    }
    if (!fullyCoveredByCredit && !selectedBankAccount) {
      setFormError(t.checkout.noBankAccounts);
      return;
    }
    // A transfer order is only actionable with its receipt, and there's no way
    // to attach one after the fact. Credit-only orders have nothing to prove.
    if (!fullyCoveredByCredit && !proofUrl) {
      setFormError(t.checkout.receiptRequired);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await createOrder({
        totalAmount: subtotal + selectedRate.price,
        shippingProvider: selectedRate.provider,
        shippingMethod: selectedRate.method,
        shippingCost: selectedRate.price,
        shippingAddress: {
          line1: address.line1,
          line2: address.line2 || undefined,
          postalCode: address.postalCode,
          city: address.city,
          state: address.state || undefined,
          country: address.country,
        },
        recipientName: `${address.firstName} ${address.lastName}`.trim(),
        recipientPhone: address.recipientPhone,
        // Digits only, like the storefront: it's printed on the DHL label as-is.
        recipientTaxId: address.recipientTaxId?.replace(/\D/g, "") || undefined,
        paymentType: "TRANSFER",
        transferProofUrl: fullyCoveredByCredit ? null : proofUrl,
        creditApplied: creditApplied > 0 ? creditApplied : undefined,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity, price: l.product.priceAmount })),
      });
      if (creditApplied > 0) queryClient.invalidateQueries({ queryKey: myCreditsQueryKey });
      clear();
      router.replace("/orders");
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t.checkout.orderFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="label" style={styles.sectionLabel}>
            {t.checkout.shippingAddress}
          </AppText>
          {/* Same fields, order and required set as the storefront checkout. */}
          <TextField label={t.checkout.firstName} value={firstName} onChangeText={setFirstName} textContentType="givenName" error={fieldErrors.firstName} />
          <TextField label={t.checkout.lastName} value={lastName} onChangeText={setLastName} textContentType="familyName" error={fieldErrors.lastName} />
          <TextField label={t.checkout.line1} value={line1} onChangeText={setLine1} textContentType="streetAddressLine1" error={fieldErrors.line1} />
          <TextField label={t.checkout.line2} value={line2} onChangeText={setLine2} textContentType="streetAddressLine2" />
          <TextField label={t.checkout.city} value={city} onChangeText={setCity} textContentType="addressCity" error={fieldErrors.city} />
          <TextField label={t.checkout.state} value={state} onChangeText={setState} textContentType="addressState" />
          <TextField label={t.checkout.postalCode} value={postalCode} onChangeText={setPostalCode} textContentType="postalCode" error={fieldErrors.postalCode} />
          <CountryPicker
            label={t.checkout.country}
            value={country}
            onChange={setCountry}
            error={fieldErrors.country}
          />
          <TextField label={t.checkout.phone} value={recipientPhone} onChangeText={setRecipientPhone} keyboardType="phone-pad" textContentType="telephoneNumber" error={fieldErrors.recipientPhone} />
          <TextField
            label={t.checkout.taxId}
            value={recipientTaxId}
            onChangeText={(v) => setRecipientTaxId(v.replace(/\D/g, ""))}
            keyboardType="number-pad"
          />

          <Button
            label={rates ? t.checkout.recalculate : t.checkout.calculateShipping}
            variant="outline"
            onPress={handleGetRates}
            loading={isLoadingRates}
            style={styles.sectionButton}
          />
          {!rates ? (
            <AppText variant="caption" style={styles.proofHint}>
              {t.checkout.quoteHint}
            </AppText>
          ) : null}

          {rates && rates.length > 0 ? (
            <View style={styles.ratesList}>
              {rates.map((rate, index) => {
                const isSelected = selectedRate?.provider === rate.provider && selectedRate?.method === rate.method;
                return (
                  <Pressable
                    key={`${rate.provider}-${rate.method}-${index}`}
                    style={[styles.rateRow, isSelected && styles.rateRowSelected]}
                    onPress={() => setSelectedRate(rate)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.rateInfo}>
                      <AppText variant="body">
                        {rate.provider} — {rate.method}
                      </AppText>
                      {rate.estimatedDays > 0 ? (
                        <AppText variant="caption">
                          {rate.estimatedDays} {t.checkout.days}
                        </AppText>
                      ) : null}
                    </View>
                    <AppText variant="bodyMedium">
                      {rate.price === 0 ? t.checkout.free : `${rate.currency} ${priceFormatter.format(rate.price)}`}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {isLoadingPayments ? (
            <ActivityIndicator color={colors.primary} style={styles.spinner} />
          ) : !paymentsEnabled ? (
            <View style={styles.paymentsDisabled}>
              <AppText variant="display" style={styles.paymentsDisabledTitle}>
                {t.checkout.paymentsDisabledTitle}
              </AppText>
              <AppText variant="body" style={styles.centeredText}>
                {t.checkout.paymentsDisabledBody}
              </AppText>
              <Pressable onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} accessibilityRole="link">
                <AppText variant="bodyMedium" style={styles.centeredText}>
                  {CONTACT_EMAIL}
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => Linking.openURL(`https://www.instagram.com/${CONTACT_INSTAGRAM}/`)}
                accessibilityRole="link"
              >
                <AppText variant="body" style={[styles.centeredText, styles.mutedText]}>
                  @{CONTACT_INSTAGRAM}
                </AppText>
              </Pressable>
            </View>
          ) : (
          <>
          {creditBalance > 0 ? (
            <>
              <AppText variant="label" style={styles.sectionLabel}>
                {t.checkout.siteCredit}
              </AppText>
              <View style={styles.creditRow}>
                <View style={styles.creditText}>
                  <AppText variant="body">{t.checkout.applyCredit}</AppText>
                  <AppText variant="caption" style={styles.proofHint}>
                    {t.checkout.available} USD {priceFormatter.format(creditBalance)}
                  </AppText>
                </View>
                <Switch
                  value={useCredit}
                  onValueChange={setUseCredit}
                  trackColor={{ false: colors.borderLight, true: colors.gold }}
                  thumbColor={colors.white}
                />
              </View>
              {creditApplied > 0 ? (
                <AppText variant="body" style={styles.creditApplied}>
                  {fill(t.checkout.creditDeducted, { amount: `USD ${priceFormatter.format(creditApplied)}` })}
                </AppText>
              ) : null}
            </>
          ) : null}

          {fullyCoveredByCredit ? null : (
            <>
              <AppText variant="label" style={styles.sectionLabel}>
                {t.checkout.paymentMethod}
              </AppText>
              {availableCurrencies.length > 0 ? (
                <View style={styles.currencyRow}>
                  {availableCurrencies.map((currency) => {
                    const isSelected = currency === selectedCurrency;
                    return (
                      <Pressable
                        key={currency}
                        style={[styles.currencyOption, isSelected && styles.currencyOptionSelected]}
                        onPress={() => setPickedCurrency(currency)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Landmark size={20} color={isSelected ? colors.primary : colors.textMuted} strokeWidth={1.5} />
                        <AppText variant={isSelected ? "bodyMedium" : "body"} style={styles.centeredText}>
                          {fill(t.checkout.transferIn, { currency })}
                        </AppText>
                        {currency === "ARS" && amountInArs === null ? null : (
                          <AppText variant="caption" style={styles.mutedText}>
                            {formatTransferAmount(currency)}
                          </AppText>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <AppText variant="label" style={styles.sectionLabel}>
                {t.checkout.transferDetails}
              </AppText>
              <AppText variant="caption" style={styles.proofHint}>
                {t.checkout.transferDesc}
              </AppText>
              {selectedBankAccount ? (
                <View style={styles.bankCard}>
                  {(
                    [
                      [t.checkout.bankName, selectedBankAccount.bankName],
                      [t.checkout.cbu, selectedBankAccount.cbu],
                      [t.checkout.alias, selectedBankAccount.alias],
                      [t.checkout.holderName, selectedBankAccount.holderName],
                    ] as const
                  ).map(([label, value], index) => (
                    <View key={label} style={[styles.bankRow, index > 0 && styles.bankRowDivider]}>
                      <AppText variant="caption">{label}</AppText>
                      {/* Selectable so the CBU / alias can be long-pressed and copied. */}
                      <AppText variant="bodyMedium" style={styles.bankValue} selectable>
                        {value}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noBankCard}>
                  <AppText variant="body" style={styles.noBankText}>
                    {t.checkout.noBankAccounts}
                  </AppText>
                </View>
              )}

              <View style={styles.amountCard}>
                <AppText variant="caption">{t.checkout.amountToTransfer}</AppText>
                <AppText variant="display" style={styles.amountValue}>
                  {formatTransferAmount(selectedCurrency)}
                </AppText>
                {selectedCurrency === "ARS" && exchangeRate ? (
                  <AppText variant="caption" style={styles.mutedText}>
                    USD {priceFormatter.format(amountToPay)} x {arsFormatter.format(exchangeRate.sell)} (cripto)
                  </AppText>
                ) : null}
              </View>

              <AppText variant="label" style={styles.sectionLabel}>
                {t.checkout.receipt}
              </AppText>
              {proofUrl ? (
                <Button label={t.checkout.receiptUploaded} variant="outline" onPress={handlePickProofPhoto} style={styles.sectionButton} />
              ) : (
                <View style={styles.proofRow}>
                  <Button
                    label={t.common.photo}
                    variant="outline"
                    onPress={handlePickProofPhoto}
                    loading={isUploadingProof}
                    style={styles.proofButton}
                  />
                  <Button
                    label={t.common.pdf}
                    variant="outline"
                    onPress={handlePickProofDocument}
                    loading={isUploadingProof}
                    style={styles.proofButton}
                  />
                </View>
              )}
              <AppText variant="caption" style={styles.proofHint}>
                {t.checkout.receiptHint}
              </AppText>
            </>
          )}
          </>
          )}

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <AppText variant="label">{t.checkout.subtotal}</AppText>
              <AppText variant="body">USD {priceFormatter.format(subtotal)}</AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText variant="label">{t.checkout.shipping}</AppText>
              <AppText variant="body">USD {priceFormatter.format(shippingCost)}</AppText>
            </View>
            {creditApplied > 0 ? (
              <View style={styles.summaryRow}>
                <AppText variant="label">{t.checkout.siteCredit}</AppText>
                <AppText variant="body">-USD {priceFormatter.format(creditApplied)}</AppText>
              </View>
            ) : null}
            <View style={styles.summaryRow}>
              <AppText variant="bodyMedium">{creditApplied > 0 ? t.checkout.toPay : t.checkout.total}</AppText>
              <AppText variant="bodyMedium">USD {priceFormatter.format(amountToPay)}</AppText>
            </View>
          </View>
          {fullyCoveredByCredit ? (
            <AppText variant="caption" style={styles.proofHint}>
              {t.checkout.creditCovers}
            </AppText>
          ) : null}

          {formError ? <AppText variant="body" style={styles.errorText}>{formError}</AppText> : null}

          {paymentsEnabled ? (
            <Button
              label={t.checkout.placeOrder}
              onPress={handlePlaceOrder}
              loading={isSubmitting}
              disabled={isUploadingProof || (!fullyCoveredByCredit && !selectedBankAccount)}
              style={styles.placeOrderButton}
            />
          ) : null}
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
  rateInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rateRowSelected: {
    borderColor: colors.primary,
  },
  paymentsDisabled: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
  },
  paymentsDisabledTitle: {
    textAlign: "center",
  },
  centeredText: {
    textAlign: "center",
  },
  mutedText: {
    color: colors.textMuted,
    textTransform: "none",
  },
  currencyRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  currencyOption: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  currencyOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  bankCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceMuted,
  },
  bankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  bankRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  bankValue: {
    flexShrink: 1,
    textAlign: "right",
  },
  noBankCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  noBankText: {
    color: colors.danger,
  },
  amountCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  amountValue: {
    textAlign: "center",
  },
  proofRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  proofButton: {
    flex: 1,
  },
  creditRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  creditText: {
    flex: 1,
  },
  creditApplied: {
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

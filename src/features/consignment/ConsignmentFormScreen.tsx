import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { MAX_CONSIGNMENT_PHOTOS, submitConsignment } from "@/api/consignment";
import { consignmentSchema } from "@/api/schemas";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { SegmentedControl } from "@/components/SegmentedControl";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { colors, spacing } from "@/theme";

// Same four tiers the storefront's ConsignFormModal offers.
const CONDITIONS = ["New", "Excellent", "Very Good", "Good"] as const;
type Condition = (typeof CONDITIONS)[number];

const SUBMISSION_TYPES = [
  { value: "CONSIGNMENT" as const, label: "Consignment" },
  { value: "INSTANT_LIQUIDITY" as const, label: "Instant Liquidity" },
];

const PAYOUT_METHODS = [
  { value: "CASH" as const, label: "Cash" },
  { value: "CREDIT" as const, label: "Site Credit" },
];

const OFFER_CHOICES = [
  { value: "yes" as const, label: "Accept Offers" },
  { value: "no" as const, label: "No Offers" },
];

const INSTANT_LIQUIDITY_NOTE =
  "Submit your piece for review. Our team coordinates an in-person appraisal at Maison Privée Atelier and agrees the final price with you directly.";

const CONSIGNMENT_NOTE = "Please provide the following details for evaluation.";

export function ConsignmentFormScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [submissionType, setSubmissionType] = useState<"CONSIGNMENT" | "INSTANT_LIQUIDITY">("CONSIGNMENT");
  const [payoutMethod, setPayoutMethod] = useState<"CASH" | "CREDIT">("CASH");
  const [acceptOffers, setAcceptOffers] = useState(false);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState<Condition | "">("");
  const [material, setMaterial] = useState("");
  const [color, setColor] = useState("");
  const [yearCollection, setYearCollection] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [packaging, setPackaging] = useState("");
  const [priceExpectation, setPriceExpectation] = useState("");
  const [notes, setNotes] = useState("");

  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const remainingPhotos = MAX_CONSIGNMENT_PHOTOS - photoUris.length;

  const handlePickFromLibrary = async () => {
    if (remainingPhotos <= 0) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError("Photo library access is required to attach photos of your piece.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      selectionLimit: remainingPhotos,
      quality: 0.8,
    });
    if (result.canceled) return;
    setFormError(null);
    setPhotoUris((current) =>
      [...current, ...result.assets.map((asset) => asset.uri)].slice(0, MAX_CONSIGNMENT_PHOTOS)
    );
  };

  const handleTakePhoto = async () => {
    if (remainingPhotos <= 0) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setFormError("Camera access is required to photograph your piece.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.8 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    setFormError(null);
    setPhotoUris((current) => [...current, asset.uri].slice(0, MAX_CONSIGNMENT_PHOTOS));
  };

  const removePhoto = (uri: string) => setPhotoUris((current) => current.filter((u) => u !== uri));

  const handleSubmit = async () => {
    const parsed = consignmentSchema.safeParse({ name, email, brand });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        errors[String(issue.path[0])] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      await submitConsignment({
        name: parsed.data.name,
        email: parsed.data.email,
        brand: parsed.data.brand,
        category,
        size,
        condition,
        material,
        color,
        yearCollection,
        serialNumber,
        packaging,
        priceExpectation,
        notes,
        // Instant liquidity is priced in person, so the offers flow never applies to it.
        acceptOffers: submissionType === "CONSIGNMENT" && acceptOffers,
        submissionType,
        payoutMethod,
        photoUris,
      });
      // The backend links the submission to the account matching the email, so a
      // signed-in seller should see it under "My Submissions" right away.
      queryClient.invalidateQueries({ queryKey: ["consignments", "mine"] });
      setIsSent(true);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "Couldn't send your submission. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <Screen style={styles.successScreen}>
        <AppText variant="caption" style={styles.successEyebrow}>
          Submission Received
        </AppText>
        <AppText variant="display" style={styles.successTitle}>
          Thank You
        </AppText>
        <AppText variant="body" style={styles.successBody}>
          Our team will review your submission and revert with a valuation and next steps.
        </AppText>
        <Button label="Done" onPress={() => router.back()} style={styles.successButton} />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="caption">Maison Privée Atelier</AppText>
          <AppText variant="display" style={styles.heading}>
            Private Submission
          </AppText>

          <SegmentedControl
            options={SUBMISSION_TYPES}
            value={submissionType}
            onChange={setSubmissionType}
          />
          <AppText variant="body" style={styles.typeNote}>
            {submissionType === "INSTANT_LIQUIDITY" ? INSTANT_LIQUIDITY_NOTE : CONSIGNMENT_NOTE}
          </AppText>

          <AppText variant="label" style={styles.sectionLabel}>
            Your Details
          </AppText>
          {/* Locked to the signed-in account, like the storefront form: the backend
              links the submission to the user whose email matches. */}
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            editable={!user?.name}
            style={user?.name ? styles.lockedInput : undefined}
            error={fieldErrors.name}
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            editable={!user?.email}
            style={user?.email ? styles.lockedInput : undefined}
            keyboardType="email-address"
            autoCapitalize="none"
            error={fieldErrors.email}
          />

          <AppText variant="label" style={styles.sectionLabel}>
            The Piece
          </AppText>
          <TextField
            label="Brand"
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g. Hermès, Chanel, Rolex"
            error={fieldErrors.brand}
          />
          <TextField
            label="Category"
            value={category}
            onChangeText={setCategory}
            placeholder="Handbag, Shoes, Watch, Jewelry..."
          />
          <TextField label="Size" value={size} onChangeText={setSize} placeholder="e.g. 30cm, EU 42" />

          <AppText variant="caption" style={styles.inlineLabel}>
            Condition
          </AppText>
          <SegmentedControl
            options={CONDITIONS.map((value) => ({ value, label: value }))}
            value={condition as Condition}
            onChange={setCondition}
            wrap
          />

          <View style={styles.spacer} />
          <TextField label="Material" value={material} onChangeText={setMaterial} placeholder="e.g. Leather, Gold" />
          <TextField label="Color" value={color} onChangeText={setColor} placeholder="e.g. Black, Gold, Etoupe" />
          <TextField
            label="Year / Collection"
            value={yearCollection}
            onChangeText={setYearCollection}
            placeholder="If known"
          />
          <TextField
            label="Authentication Details"
            value={serialNumber}
            onChangeText={setSerialNumber}
            placeholder="Serial number, stamps, etc."
          />
          <TextField
            label="Original Packaging"
            value={packaging}
            onChangeText={setPackaging}
            placeholder="Box, Dust Bag, Card, Receipt"
          />
          <TextField
            label="Price Expectation"
            value={priceExpectation}
            onChangeText={setPriceExpectation}
            placeholder="Your expected price (USD)"
          />
          <TextField
            label="Additional Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional details about the piece..."
            multiline
            style={styles.notesInput}
          />

          <AppText variant="label" style={styles.sectionLabel}>
            Photos
          </AppText>
          <AppText variant="body" style={styles.hint}>
            Front, back, interior, logo/branding, details and serial number (if applicable). Up to{" "}
            {MAX_CONSIGNMENT_PHOTOS} photos.
          </AppText>
          <View style={styles.photoButtons}>
            <Button
              label="Take Photo"
              variant="outline"
              onPress={handleTakePhoto}
              disabled={remainingPhotos <= 0}
              style={styles.photoButton}
            />
            <Button
              label="From Library"
              variant="outline"
              onPress={handlePickFromLibrary}
              disabled={remainingPhotos <= 0}
              style={styles.photoButton}
            />
          </View>

          {photoUris.length > 0 ? (
            <View style={styles.thumbnails}>
              {photoUris.map((uri) => (
                <View key={uri} style={styles.thumbnailWrapper}>
                  <Image source={{ uri }} style={styles.thumbnail} contentFit="cover" />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo"
                    onPress={() => removePhoto(uri)}
                    style={styles.removePhoto}
                    hitSlop={8}
                  >
                    <X size={12} color={colors.primary} strokeWidth={1.5} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <AppText variant="label" style={styles.sectionLabel}>
            Payout Method
          </AppText>
          <AppText variant="body" style={styles.hint}>
            Choose how you would like to be paid.
          </AppText>
          <SegmentedControl
            options={PAYOUT_METHODS}
            value={payoutMethod}
            onChange={setPayoutMethod}
            accent={payoutMethod === "CREDIT"}
          />

          {submissionType === "CONSIGNMENT" ? (
            <>
              <AppText variant="label" style={styles.sectionLabel}>
                Private Offers
              </AppText>
              <AppText variant="body" style={styles.hint}>
                Allow other Maison Privée Atelier clients to send you private offers for this piece.
              </AppText>
              <SegmentedControl
                options={OFFER_CHOICES}
                value={acceptOffers ? "yes" : "no"}
                onChange={(value) => setAcceptOffers(value === "yes")}
                accent={acceptOffers}
              />
            </>
          ) : null}

          {formError ? (
            <AppText variant="body" style={styles.errorText}>
              {formError}
            </AppText>
          ) : null}

          <Button
            label={submissionType === "INSTANT_LIQUIDITY" ? "Request Instant Liquidity" : "Submit for Review"}
            onPress={handleSubmit}
            loading={isSubmitting}
            style={styles.submitButton}
          />
          <AppText variant="body" style={styles.footerNote}>
            {submissionType === "INSTANT_LIQUIDITY"
              ? "Our team will coordinate an in-person appraisal and agree the final price with you."
              : "Your submission will be reviewed discreetly by our team."}
          </AppText>
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
  heading: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  typeNote: {
    marginTop: spacing.sm,
    color: colors.textMuted,
  },
  sectionLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  inlineLabel: {
    marginBottom: spacing.sm,
  },
  spacer: {
    height: spacing.md,
  },
  hint: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    color: colors.textMuted,
  },
  lockedInput: {
    color: colors.textMuted,
  },
  notesInput: {
    height: 88,
    textAlignVertical: "top",
    paddingTop: spacing.sm,
  },
  photoButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  photoButton: {
    flex: 1,
  },
  thumbnails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  thumbnailWrapper: {
    width: 72,
    height: 72,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.secondary,
  },
  removePhoto: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  errorText: {
    marginTop: spacing.lg,
    color: colors.danger,
  },
  submitButton: {
    marginTop: spacing.xl,
  },
  footerNote: {
    marginTop: spacing.md,
    textAlign: "center",
    color: colors.textMuted,
  },
  successScreen: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  successEyebrow: {
    color: colors.gold,
  },
  successTitle: {
    marginTop: spacing.sm,
  },
  successBody: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    textAlign: "center",
    color: colors.textMuted,
  },
  successButton: {
    alignSelf: "stretch",
  },
});

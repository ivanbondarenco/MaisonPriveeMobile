import { z } from "zod";

// Mirrors backend/src/routes/users.ts registerSchema / loginSchema so the
// client fails fast with the same messages instead of round-tripping to the API.
export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  phoneNumber: z.string().min(1, "Phone number is required").max(30),
  country: z.string().min(1, "Country is required").max(100),
  province: z.string().min(1, "Province is required").max(100),
  city: z.string().min(1, "City is required").max(100),
  profession: z.string().min(1, "Profession is required").max(100),
  instagram: z.string().min(1, "Instagram is required").max(100),
});

export const checkoutSchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientPhone: z.string().min(1, "Phone is required"),
  recipientTaxId: z.string().optional(),
  line1: z.string().min(1, "Address is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z
    .string()
    .min(2, "Use a 2-letter country code (e.g. AR)")
    .max(2, "Use a 2-letter country code (e.g. AR)"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// Mirrors the only server-side requirement on POST /api/consignment
// (name + email + brand); every other field is optional there too.
export const consignmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  brand: z.string().min(1, "Brand is required"),
});

export type ConsignmentInput = z.infer<typeof consignmentSchema>;

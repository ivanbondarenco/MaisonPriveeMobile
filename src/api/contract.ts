import { z } from "zod";

import type { BankAccount, ExchangeRate } from "./payments";
import type {
  AuthResponse,
  Brand,
  CatalogProduct,
  Category,
  CategoryNode,
  Consignment,
  FilterOptions,
  LoyaltyStanding,
  LoyaltyTier,
  MyMembership,
  Order,
  Product,
  ReceivedOffer,
  SiteCredit,
} from "./types";

// What the app needs from each backend response, as runtime schemas.
//
// The backend is deployed by someone else, and the published app keeps running
// against whatever it ships. scripts/check-api.ts validates the live API against
// these schemas, so a breaking backend change shows up there instead of in the
// app. Each schema `satisfies` its type in types.ts: add a field to a type and
// TypeScript makes you add it here too, so the two can't drift apart.
//
// Unknown fields are ignored on purpose: the backend may add fields freely,
// only removing or reshaping what's listed here breaks the app.
//
// No path aliases and type-only imports from app code: Node runs the check
// script directly (type stripping), outside Metro.

const image = z.object({ url: z.string(), altText: z.string() });
const isoDate = z.string();

export const brandSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.enum(["TOP", "TRENDING", "EMERGING"]).nullable(),
}) satisfies z.ZodType<Brand>;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  translations: z.record(z.string(), z.string()).nullable().optional(),
}) satisfies z.ZodType<Category>;

export const categoryNodeSchema: z.ZodType<CategoryNode> = categorySchema.extend({
  get children() {
    return z.array(categoryNodeSchema).optional();
  },
});

export const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  brandId: z.string(),
  categoryId: z.string(),
  priceAmount: z.number(),
  currency: z.string(),
  images: z.array(image),
  stock: z.number(),
  height: z.number().nullable(),
  width: z.number().nullable(),
  weight: z.number().nullable(),
  condition: z.string(),
  isNew: z.boolean(),
  isUnisex: z.boolean(),
  isReserved: z.boolean(),
  isSoldOut: z.boolean(),
  size: z.string().nullable(),
  color: z.string().nullable(),
  sleeveLength: z.string().nullable(),
  neckline: z.string().nullable(),
  status: z.string(),
  acceptOffers: z.boolean(),
  publicAt: isoDate.nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
  brand: brandSchema,
  category: categorySchema,
  brandName: z.string(),
  categoryName: z.string(),
}) satisfies z.ZodType<Product>;

// GET /products: the list also carries the categories each piece shows under.
export const catalogProductSchema = productSchema.extend({
  matchCategoryIds: z.array(z.string()),
}) satisfies z.ZodType<CatalogProduct>;

export const filterOptionsSchema = z.object({
  sizes: z.array(z.string()),
  colors: z.array(z.string()),
  sleeveLengths: z.array(z.string()),
  necklines: z.array(z.string()),
  priceRange: z.object({ min: z.number(), max: z.number() }),
}) satisfies z.ZodType<FilterOptions>;

// GET /settings/:key answers { key, value: null } for a key that was never set.
export const settingSchema = z.object({ key: z.string(), value: z.string().nullable() });

export const bankAccountSchema = z.object({
  id: z.string(),
  currency: z.string(),
  bankName: z.string(),
  cbu: z.string(),
  alias: z.string(),
  holderName: z.string(),
}) satisfies z.ZodType<BankAccount>;

export const exchangeRateSchema = z.object({
  currency: z.string(),
  source: z.string(),
  buy: z.number(),
  sell: z.number(),
  updatedAt: z.string(),
}) satisfies z.ZodType<ExchangeRate>;

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  country: z.string(),
  province: z.string(),
  city: z.string(),
  profession: z.string(),
  instagram: z.string(),
  linkedin: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(["USER", "ADMIN"]),
  createdAt: isoDate,
});

export const authResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  user: userSchema,
}) satisfies z.ZodType<AuthResponse>;

export const orderSchema = z.object({
  id: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  paymentType: z.string(),
  paymentStatus: z.string(),
  shippingProvider: z.string().nullable(),
  shippingMethod: z.string().nullable(),
  shippingCost: z.number(),
  trackingNumber: z.string().nullable(),
  trackingUrl: z.string().nullable(),
  createdAt: isoDate,
  items: z.array(
    z.object({
      id: z.string(),
      productId: z.string(),
      quantity: z.number(),
      price: z.number(),
      product: z.object({ id: z.string(), title: z.string(), images: z.array(image) }),
    })
  ),
}) satisfies z.ZodType<Order>;

const membershipPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  tagline: z.string().nullable(),
  priceAmount: z.number(),
  currency: z.string(),
  interval: z.enum(["MONTH", "YEAR"]),
  benefits: z.array(z.object({ text: z.string(), bold: z.boolean().optional() })),
  badgeLabel: z.string().nullable(),
  badgeColor: z.string().nullable(),
  cardColor: z.string().nullable(),
  isPopular: z.boolean(),
  sortOrder: z.number(),
});

const userMembershipSchema = z.object({
  id: z.string(),
  planId: z.string(),
  status: z.enum(["PENDING", "ACTIVE", "CANCELLED", "EXPIRED"]),
  pricePaid: z.number(),
  currency: z.string(),
  interval: z.enum(["MONTH", "YEAR"]),
  autoRenew: z.boolean(),
  startedAt: isoDate,
  currentPeriodEnd: isoDate,
  cancelledAt: isoDate.nullable(),
  createdAt: isoDate,
  plan: membershipPlanSchema,
  order: z
    .object({
      id: z.string(),
      totalAmount: z.number(),
      creditApplied: z.number(),
      paymentType: z.string(),
      paymentStatus: z.string(),
      transferProofUrl: z.string().nullable(),
      transferExpiresAt: isoDate.nullable(),
    })
    .nullable(),
});

export const myMembershipSchema = z.object({
  active: userMembershipSchema.nullable(),
  pending: userMembershipSchema.nullable(),
  history: z.array(userMembershipSchema),
}) satisfies z.ZodType<MyMembership>;

export const siteCreditSchema = z.object({
  balance: z.number(),
  transactions: z.array(
    z.object({
      id: z.string(),
      amount: z.number(),
      type: z.enum(["EARNED", "SPENT", "ADJUSTMENT"]),
      reason: z.string(),
      consignmentId: z.string().nullable(),
      orderId: z.string().nullable(),
      createdAt: isoDate,
    })
  ),
}) satisfies z.ZodType<SiteCredit>;

export const loyaltyTierSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  minSales: z.number(),
  bonusPct: z.number(),
  accent: z.string(),
  cardColor: z.string(),
  benefits: z.record(z.string(), z.array(z.string())),
  sortOrder: z.number(),
  isActive: z.boolean(),
}) satisfies z.ZodType<LoyaltyTier>;

export const loyaltyTiersSchema = z.object({
  tiers: z.array(loyaltyTierSchema),
  bonusMinSale: z.number(),
});

export const loyaltyStandingSchema = z.object({
  currency: z.string(),
  periodStart: isoDate,
  netSales12m: z.number(),
  salesCount12m: z.number(),
  netSalesLifetime: z.number(),
  salesCountLifetime: z.number(),
  firstSaleAt: isoDate.nullable(),
  tier: loyaltyTierSchema.nullable(),
}) satisfies z.ZodType<LoyaltyStanding>;

export const cartSchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number() })),
});

export const consignmentSchema = z.object({
  id: z.string(),
  brand: z.string(),
  category: z.string().nullable(),
  size: z.string().nullable(),
  condition: z.string().nullable(),
  material: z.string().nullable(),
  color: z.string().nullable(),
  yearCollection: z.string().nullable(),
  serialNumber: z.string().nullable(),
  packaging: z.string().nullable(),
  notes: z.string().nullable(),
  photos: z.array(z.string()).nullable(),
  status: z.enum(["PENDING", "REVIEWING", "ACCEPTED", "REJECTED", "PAID_OUT"]),
  submissionType: z.enum(["CONSIGNMENT", "INSTANT_LIQUIDITY"]),
  payoutMethod: z.enum(["CASH", "CREDIT"]),
  priceExpectation: z.string().nullable(),
  payoutAmount: z.number().nullable(),
  paidOutAt: isoDate.nullable(),
  acceptOffers: z.boolean(),
  createdAt: isoDate,
  product: z
    .object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      priceAmount: z.number(),
      currency: z.string(),
      images: z.array(image),
    })
    .nullable(),
}) satisfies z.ZodType<Consignment>;

export const receivedOfferSchema = z.object({
  id: z.string(),
  amount: z.number(),
  status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]),
  createdAt: isoDate,
  respondedAt: isoDate.nullable(),
  user: z.object({ id: z.string(), name: z.string().nullable(), email: z.string() }),
  product: z.object({
    id: z.string(),
    title: z.string(),
    priceAmount: z.number(),
    currency: z.string(),
    status: z.string(),
    images: z.array(image),
    brand: z.object({ id: z.string(), name: z.string() }),
  }),
}) satisfies z.ZodType<ReceivedOffer>;

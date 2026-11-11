// Mirrors backend/src/routes/users.ts buildSafeUser() and products.ts response shapes.
export type User = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  country: string;
  province: string;
  city: string;
  profession: string;
  instagram: string;
  linkedin: string | null;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
};

export type AuthResponse = {
  token: string;
  refreshToken?: string;
  user: User;
};

export type Brand = {
  id: string;
  name: string;
  tier: "TOP" | "TRENDING" | "EMERGING" | null;
};

export type Category = {
  id: string;
  name: string;
  parentId: string | null;
  // Admin-set name per locale (es, pt, fr, zh, ar); null = same name in every language.
  translations?: Partial<Record<string, string>> | null;
};

// GET /api/categories?onlyLive=true — top-level nodes are the sections (Women/Men).
export type CategoryNode = Category & { children?: CategoryNode[] };

export type Product = {
  id: string;
  title: string;
  description: string;
  brandId: string;
  categoryId: string;
  priceAmount: number;
  currency: string;
  images: { url: string; altText: string }[];
  stock: number;
  height: number | null;
  width: number | null;
  weight: number | null;
  condition: string;
  isNew: boolean;
  isUnisex: boolean;
  isReserved: boolean;
  isSoldOut: boolean;
  size: string | null;
  color: string | null;
  sleeveLength: string | null;
  neckline: string | null;
  status: string;
  acceptOffers: boolean;
  // Opens to the public at this time; until then only the Private Client Registry sees it.
  publicAt: string | null;
  createdAt: string;
  updatedAt: string;
  brand: Brand;
  category: Category;
  brandName: string;
  categoryName: string;
};

export type ShippingAddress = {
  line1: string;
  line2?: string | null;
  postalCode: string;
  city: string;
  state?: string; // optional, like the storefront checkout
  country: string; // ISO2
};

export type ShippingRate = {
  provider: string;
  method: string;
  /** DHL product code; absent on the in-person pickup option. */
  productCode?: string;
  price: number;
  currency: string;
  estimatedDays: number;
};

export type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: { id: string; title: string; images: { url: string; altText: string }[] };
};

export type Order = {
  id: string;
  totalAmount: number;
  status: string;
  paymentType: string;
  paymentStatus: string;
  shippingProvider: string | null;
  shippingMethod: string | null;
  shippingCost: number;
  trackingNumber: string | null;
  trackingUrl: string | null;
  createdAt: string;
  items: OrderItem[];
};

export type FilterOptions = {
  sizes: string[];
  colors: string[];
  sleeveLengths: string[];
  necklines: string[];
  priceRange: { min: number; max: number };
};

export type ProductFilters = {
  search?: string;
  brand?: string; // comma-separated brand IDs
  size?: string;
  color?: string;
  sleeveLength?: string;
  neckline?: string;
  minPrice?: number;
  maxPrice?: number;
};

// Mirrors backend/prisma/schema.prisma model Consignment as returned by
// GET /api/consignment/mine (with its linked product, if one was created).
export type ConsignmentStatus = "PENDING" | "REVIEWING" | "ACCEPTED" | "REJECTED" | "PAID_OUT";

export type Consignment = {
  id: string;
  brand: string;
  category: string | null;
  size: string | null;
  condition: string | null;
  material: string | null;
  color: string | null;
  yearCollection: string | null;
  serialNumber: string | null;
  packaging: string | null;
  notes: string | null;
  // Paths relative to the backend host ("/uploads/consignment/..."), not absolute URLs.
  photos: string[] | null;
  status: ConsignmentStatus;
  submissionType: "CONSIGNMENT" | "INSTANT_LIQUIDITY";
  payoutMethod: "CASH" | "CREDIT";
  priceExpectation: string | null;
  payoutAmount: number | null;
  paidOutAt: string | null;
  acceptOffers: boolean;
  createdAt: string;
  product: {
    id: string;
    title: string;
    status: string;
    priceAmount: number;
    currency: string;
    images: { url: string; altText: string }[];
  } | null;
};

export type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED";

// GET /api/offers/received — offers other clients made on pieces this user owns.
export type ReceivedOffer = {
  id: string;
  amount: number;
  status: OfferStatus;
  createdAt: string;
  respondedAt: string | null;
  user: { id: string; name: string | null; email: string };
  product: {
    id: string;
    title: string;
    priceAmount: number;
    currency: string;
    status: string;
    images: { url: string; altText: string }[];
    brand: { id: string; name: string };
  };
};

// POST /api/contact/private-referral — a host introduces a collector to the
// Private Consignment Circle. Public: a signed-in host is linked by the backend.
export type PrivateReferralInput = {
  hostName: string;
  hostContact: string;
  guestName: string;
  guestContact: string;
  pieces: string;
};

// GET /api/credits/me — balance in USD (1 credit = 1 USD) plus the latest 50 movements.
export type CreditTransaction = {
  id: string;
  amount: number; // signed: positive = earned, negative = spent
  type: "EARNED" | "SPENT" | "ADJUSTMENT";
  reason: string;
  consignmentId: string | null;
  orderId: string | null;
  createdAt: string;
};

export type SiteCredit = {
  balance: number;
  transactions: CreditTransaction[];
};

// GET /api/loyalty/tiers — Le Cercle, the earned ladder (distinct from the
// Private Client Registry). A tier is reached by net consignment payouts over
// the last twelve months; its bonus is added on top of the commission rate.
export type LoyaltyTier = {
  id: string;
  key: string;
  name: string;
  minSales: number;
  bonusPct: number;
  accent: string;
  cardColor: string;
  benefits: Partial<Record<string, string[]>>;
  sortOrder: number;
  isActive: boolean;
};

// GET /api/loyalty/me
export type LoyaltyStanding = {
  currency: string;
  periodStart: string;
  netSales12m: number;
  salesCount12m: number;
  netSalesLifetime: number;
  salesCountLifetime: number;
  firstSaleAt: string | null;
  tier: LoyaltyTier | null;
};

// GET /api/memberships/plans — already resolved for one locale by the backend,
// so nameByLocale/benefitsByLocale never reach the client.
export type MembershipBenefit = { text: string; bold?: boolean };

export type MembershipPlan = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  priceAmount: number;
  currency: string;
  interval: "MONTH" | "YEAR";
  benefits: MembershipBenefit[];
  badgeLabel: string | null;
  badgeColor: string | null;
  cardColor: string | null;
  isPopular: boolean;
  sortOrder: number;
};

export type MembershipStatus = "PENDING" | "ACTIVE" | "CANCELLED" | "EXPIRED";

export type UserMembership = {
  id: string;
  planId: string;
  status: MembershipStatus;
  pricePaid: number;
  currency: string;
  interval: "MONTH" | "YEAR";
  autoRenew: boolean;
  startedAt: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  createdAt: string;
  plan: MembershipPlan;
  order: {
    id: string;
    totalAmount: number;
    creditApplied: number;
    paymentType: string;
    paymentStatus: string;
    transferProofUrl: string | null;
    transferExpiresAt: string | null;
  } | null;
};

// GET /api/memberships/me — "pending" is a Private Client Registry request awaiting
// approval, or (legacy paid plans, which carry an order) a transfer awaiting confirmation.
export type MyMembership = {
  active: UserMembership | null;
  pending: UserMembership | null;
  history: UserMembership[];
};

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
};

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
  state: string;
  country: string; // ISO2
};

export type ShippingRate = {
  provider: string;
  method: string;
  productCode: string;
  price: number;
  currency: string;
  estimatedDays: number;
};

export type CouponValidation = {
  code: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  discount: number;
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

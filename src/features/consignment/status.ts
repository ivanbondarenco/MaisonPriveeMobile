import type { Consignment, ConsignmentStatus } from "@/api/types";
import { colors } from "@/theme";

export const STATUS_LABEL: Record<ConsignmentStatus, string> = {
  PENDING: "Pending",
  REVIEWING: "Reviewing",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  PAID_OUT: "Paid Out",
};

// The storefront tints these with Tailwind's palette; here they map onto the
// brand tokens so the list still reads as Maison Privée.
export const STATUS_COLOR: Record<ConsignmentStatus, string> = {
  PENDING: colors.gold,
  REVIEWING: colors.gold,
  ACCEPTED: colors.primary,
  REJECTED: colors.danger,
  PAID_OUT: colors.terracotta,
};

// GET /api/products/:id 404s on DRAFT products, so a piece the team is still
// preparing can't be opened yet — only link it once it has been published.
export const isProductViewable = (product: NonNullable<Consignment["product"]>) =>
  product.status !== "DRAFT";
